import { BlockMode, Profile, SchedEvent, SchedEventType, Site } from '../models/profile.interface';
import { Action, Request } from '../models/message.interface';
import { getAllTabs, getTab, getTimeInSecs, receiveMessage, sendAction } from '../utils/utils';
import ActiveProfiles from './active-profile';
import EventScheduler from './event-scheduler';

const defaultRedirectUrl: string = `${chrome.extension.getURL('app/index.html')}#/block`

let profiles: Profile[] | undefined = undefined;
let activeProfiles: ActiveProfiles | undefined = undefined;
let eventScheduler: EventScheduler | undefined = undefined;
let blockedTabIdMap: Map<number, string> = new Map();

chrome.storage.local.get(['profiles', 'lastRecordedDate'], result => {
  if (!result) {
    return;
  }
  init(result);
});

receiveMessage(async (request: Request, _): Promise<any> => {
  if (!request?.action == undefined) {
    throw new Error('Request must specify an action');
  }
  if (!profiles || !activeProfiles || !eventScheduler) {
    throw new Error('Failed to access profiles.');
  }

  let responseBody: any = undefined;
  let profileIdx: number | undefined;

  switch(request.action) {
    case Action.UPDATE_PROFILE:
      const profile: Profile | undefined = request.body.profile;
      if (!profile) {
        throw new Error('Updated profile is undefined');
      }
      profileIdx = getProfileIndexFromName(request.body?.profileName);
      profiles[profileIdx] = profile;
      // remove the old profile from the list of active profiles if 
      // it was previously active
      if (activeProfiles.hasName(request.body.profileName)) {
        activeProfiles.removeWithName(request.body.profileName);
      }
      // if profile is active, add it to the list of active profiles
      if (profile.options.isActive) {
        activeProfiles.add(profile);
      }
      restoreBlockedTabs();
      blockTabsMatchingActive();
      eventScheduler.onProfilesUpdated(profiles);
      saveProfiles();
      break;

    case Action.GET_PROFILE_NAMES:
      responseBody = profiles.map(profile => profile.name);
      break;

    case Action.ADD_PROFILE:
      if (!request.body) {
        throw new Error('New profile is undefined');
      }
      profiles.push(request.body);
      saveProfiles();
      break;

    case Action.GET_PROFILE:
      profileIdx = getProfileIndexFromName(request.body);
      responseBody = profiles[profileIdx];
      break;

    case Action.REMOVE_PROFILE:
      profileIdx = getProfileIndexFromName(request.body);
      profiles.splice(profileIdx, 1);
      saveProfiles();
      break;

    case Action.UPDATE_PROFILE_NAME:
      if (!request.body.prevProfileName) {
        throw new Error("Previous profile name is undefined");
      }
      if (!request.body.newProfileName) {
        throw new Error("New profile name is undefined");
      }
      profileIdx = getProfileIndexFromName(request.body.prevProfileName);
      profiles[profileIdx].name = request.body.newProfileName;
      responseBody = profiles[profileIdx];
      saveProfiles();
      break;

    case Action.UPDATE_SCHEDULE_EVENTS:
      const events: SchedEvent[] | undefined = request.body.events;
      if (!events) {
        throw new Error('Events is undefined');
      }
      profileIdx = getProfileIndexFromName(request.body?.profileName);
      // filter out events without date object, and sort by time
      const processedEvents = events.filter(event => event.time)
        .sort((ev1, ev2) => {
          return getTimeInSecs(ev1.time!) - getTimeInSecs(ev2.time!);
        });
      profiles[profileIdx].options.schedule.events = processedEvents;
      eventScheduler.onProfilesUpdated(profiles);
      responseBody = profiles[profileIdx];
      saveProfiles();
      break;

    case Action.GET_ACTIVE_PROFILES:
      responseBody = activeProfiles.getList();
      break;
  }
  return responseBody;
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (activeProfiles?.isEmpty() || !(changeInfo.url && tabId && tab)) {
    return;
  }
  // when user navigates to a new site on a tab, check whether
  // the site should be blocked
  if (isSiteBlocked(changeInfo.url)) {
    try {
      // block the site
      redirectTab(tab);
    } catch (err) {
      console.error(err);
    }
  }
});

/**
 * Initializes the profiles, active profiles and event scheduler
 * using saved data.
 * @param savedState saved profile and application data
 */
function init(savedState: any) {
  if (savedState.profiles) {
    profiles = savedState.profiles;
    const activeProfileList = profiles!.filter(profile => profile.options.isActive);
    activeProfiles = new ActiveProfiles(activeProfileList);
    blockTabsMatchingActive();
  }
  let lastRecordedDate;
  if (savedState.lastRecordedDate) {
    lastRecordedDate = new Date(JSON.parse(savedState.lastRecordedDate));
  } else {
    lastRecordedDate = new Date();
  }
  eventScheduler = new EventScheduler(lastRecordedDate);

  eventScheduler.onEventTrigger((event: SchedEvent) => {
    if (event.eventType === SchedEventType.ENABLE) {
      // (forcefully) set profile containing event to active
      activeProfiles!.add(getProfile(event.profileName), true);
      restoreBlockedTabs();
      blockTabsMatchingActive();
    } else if (activeProfiles!.hasName(event.profileName)) {
      // set profile containing event to inactive
      const profile = activeProfiles!.removeWithName(event.profileName)!;
      profile.options.isActive = false;
      restoreBlockedTabs();
    }
    event.executed = true;
    sendAction(Action.NOTIFY_SCHEDULE_TRIGGER).catch((err) => { });
    saveProfiles();
  });

  eventScheduler.onEventReset(() => {
    // set all scheduled events to the unexecuted state
    profiles!.forEach(profile => {
      profile.options.schedule.events.forEach(event => {
        event.executed = false;
      });
    });
    saveProfiles();
    eventScheduler!.onProfilesUpdated(profiles!);
    // the next time the extension starts, it will compare
    // the time with this saved time to determine whether to reset
    // if dates are different
    chrome.storage.local.set({ 
      lastRecordedDate: JSON.stringify(new Date()) 
    }, () => {});
  });
}

/**
 * Fetch specific profile by name
 * @param profileName the target profile name
 * @returns the target profile
 */
function getProfile(profileName: string): Profile {
  const profileIdx = getProfileIndexFromName(profileName);
  return profiles![profileIdx];
}

/**
 * Fetch index of specific profile in profiles list by name
 * @param profileName the target profile name
 * @returns index of target profile in profiles list
 */
function getProfileIndexFromName(profileName: string): number {
  if (!profileName) {
    throw new Error('Profile name is not specified');
  }
  const targetProfileIdx = profiles!.findIndex(profile => profile.name == profileName);
  if (targetProfileIdx === -1) {
    throw new Error(`Could not find profile with name "${profileName}"`);
  }
  return targetProfileIdx;
}

/**
 * If any open tab has a site matching the active profile block sites,
 * then it will be blocked.
 */
async function blockTabsMatchingActive(): Promise<void> {
  const tabs = await getAllTabs();
  const matchedTabs = tabs.filter(tab => isSiteBlocked(tab.url!));
  matchedTabs.forEach(tab => redirectTab(tab));
}

/**
 * Unblock open sites that were previously blocked.
 * Called when the profiles or active profiles have been updated.
 */
async function restoreBlockedTabs() {
  for (const [tabId, siteUrl] of blockedTabIdMap) {
    if (!isSiteBlocked(siteUrl)) {
      try {
        const tab = await getTab(tabId);
        if (tab.url?.includes("chrome-extension://")) {
          redirectTab(tab, siteUrl, false);
        }
      } catch { }
      blockedTabIdMap.delete(tabId);
    }
  }
}

/**
 * Returns whether a given site is blocked by an active profile
 * @param siteUrl the url of the target site
 * @returns whether the target site is blocked
 */
function isSiteBlocked(siteUrl: string): boolean {
  if (activeProfiles!.isEmpty()) {
    return false;
  }
  // block http and https urls only
  if (!(siteUrl.includes('http://') || siteUrl.includes('https://'))) {
    return false;
  }
  let matched: boolean = false;
  for (const profile of activeProfiles!.getList()) {
    matched = !!profile.sites.find(site => {
      if (site.useRegex) {
        const urlRegex = new RegExp(site.url);
        return urlRegex.test(siteUrl);
      } else {
        return siteUrl.includes(site.url);
      }
    });
    if (matched) {
      break;
    }
  }
  const blockMode = activeProfiles!.getActiveMode();
  return (matched && blockMode === BlockMode.BLOCK_SITES)
    || (!matched && blockMode === BlockMode.ALLOW_SITES);
}

/**
 * Redirect a site to another URL
 * @param tab the tab which the site is open on
 * @param redirectUrl the URL to redirect to
 * @param includeOrigUrl add the URL of the original site as a parameter
 * in the redirected URL
 */
function redirectTab(tab: chrome.tabs.Tab, redirectUrl = defaultRedirectUrl, 
    includeOrigUrl = true): void {
  if (!tab.id) {
    throw new Error('Tab ID is undefined');
  }
  if (!tab.url) {
    throw new Error('Tab URL is undefined');
  }
  blockedTabIdMap.set(tab.id, tab.url);
  const params = includeOrigUrl ? `?url=${encodeURIComponent(tab.url)}` : '';
  chrome.tabs.update(tab.id, { url: `${redirectUrl}${params}` }, );
}

/**
 * Save profile data to chrome storage
 */
function saveProfiles(): void {
  chrome.storage.local.set({ profiles }, () => {});
}