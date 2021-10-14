import { BlockMode, Profile, SchedEvent, SchedEventType, Site } from '../models/profile.interface';
import { Action, Request } from '../models/message.interface';
import { getAllTabs, getTab, getTimeInSecs, receiveMessage, sendAction } from '../utils/utils';
import { isSameDay } from 'date-fns';
import ActiveProfiles from '../models/active-profile';

const defaultRedirectUrl: string = `${chrome.extension.getURL('app/index.html')}#/block`

var profiles: Profile[] = [];
var activeProfiles: ActiveProfiles = new ActiveProfiles();
var blockedTabIdMap: Map<number, string> = new Map();
var pendingSchedEvents: SchedEvent[] = [];
var prevSavedDate: Date | undefined = undefined;

chrome.storage.local.get(['profiles', 'prevSavedDate'], result => {
  if (!result) {
    return;
  }
  if (result.profiles) {
    profiles = result.profiles;
    activeProfiles = new ActiveProfiles(
      profiles.filter(profile => profile.options.isActive));
  }
  if (result.prevSavedDate) {
    prevSavedDate = new Date(JSON.parse(result.prevSavedDate));
  } else {
    prevSavedDate = new Date();
  }

  checkIfNewDay();
  checkSchedEvents();
});

receiveMessage(async (request: Request, sender): Promise<any> => {
  if (!request?.action == undefined) {
    throw new Error('Request must specify an action');
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
      if (activeProfiles.hasName(request.body.profileName)) {
        activeProfiles.removeWithName(request.body.profileName);
      }
      if (profile.options.isActive) {
        activeProfiles.add(profile);
      }
      restoreBlockedTabs();
      blockTabsMatchingActive();
      updatePendingSchedEvents();
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
      // filter events without date object, and sort by time
      const processedEvents = events.filter(event => event.time)
        .sort((ev1, ev2) => {
          return getTimeInSecs(ev1.time!) - getTimeInSecs(ev2.time!);
        });
      profiles[profileIdx].options.schedule.events = processedEvents;
      updatePendingSchedEvents();
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
  if (activeProfiles.isEmpty() || !(changeInfo.url && tabId && tab)) {
    return;
  }
  if (isSiteBlocked(changeInfo.url)) {
    try {
      redirectTab(tab);
    } catch (err) {
      console.error(err);
    }
  }
});

function getProfile(profileName: string): Profile {
  const profileIdx = getProfileIndexFromName(profileName);
  return profiles[profileIdx];
}

function getProfileIndexFromName(profileName: string): number {
  if (!profileName) {
    throw new Error('Profile name is not specified');
  }
  const targetProfileIdx = profiles.findIndex(profile => profile.name == profileName);
  if (targetProfileIdx === -1) {
    throw new Error(`Could not find profile with name "${profileName}"`);
  }
  return targetProfileIdx;
}

async function blockTabsMatchingActive(): Promise<void> {
  const tabs = await getAllTabs();
  const matchedTabs = tabs.filter(tab => isSiteBlocked(tab.url!));
  matchedTabs.forEach(tab => redirectTab(tab));
}

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

function isSiteBlocked(siteUrl: string): boolean {
  if (activeProfiles.isEmpty()) {
    return false;
  }
  if (!(siteUrl.includes('http://') || siteUrl.includes('https://'))) {
    return false;
  }
  let matched: boolean = false;
  for (const profile of activeProfiles.getList()) {
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
  const blockMode = activeProfiles.getActiveMode();
  return (matched && blockMode === BlockMode.BLOCK_SITES)
    || (!matched && blockMode === BlockMode.ALLOW_SITES);
}

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

function saveProfiles(): void {
  chrome.storage.local.set({ profiles }, () => {});
}

function updatePendingSchedEvents(): void {
  pendingSchedEvents = [];
  profiles.forEach(profile => {
    const schedule = profile.options.schedule;
    if (schedule.isEnabled) {
      pendingSchedEvents.push(...schedule.events.filter(events => !events.executed));
    }
  });
}

async function checkSchedEvents(): Promise<void> {
  const remainingEvents = [];
  for (const event of pendingSchedEvents) {
    if (getTimeInSecs(event.time!) < getTimeInSecs(new Date())) {
      try {
        if (event.eventType === SchedEventType.ENABLE) {
          activeProfiles.add(getProfile(event.profileName));
          restoreBlockedTabs();
          blockTabsMatchingActive();
        } else if (activeProfiles.hasName(event.profileName)) {
          const profile = activeProfiles.removeWithName(event.profileName)!;
          profile.options.isActive = false;
          restoreBlockedTabs();
        }
      } catch (err) {
        console.error(err);
      }
      event.executed = true;
    } else {
      remainingEvents.push(event);
    }
  }
  if (remainingEvents.length !== pendingSchedEvents.length) {
    pendingSchedEvents = remainingEvents;
    sendAction(Action.NOTIFY_SCHEDULE_TRIGGER).catch((err) => { });
    saveProfiles();
  }
}

function checkIfNewDay() {
  if (!prevSavedDate) {
    return;
  }
  // reset all events if new day
  const newDate = new Date();
  if (!isSameDay(prevSavedDate, newDate)) {
    profiles.forEach(profile => {
      profile.options.schedule.events.forEach(event => {
        event.executed = false;
      });
    });
    saveProfiles();
    updatePendingSchedEvents();
  }
  prevSavedDate = newDate;
  chrome.storage.local.set({ prevSavedDate: JSON.stringify(prevSavedDate) }, () => {});
}

setInterval(() => {
  checkIfNewDay();
  checkSchedEvents();
}, 5000);