import { BlockMode, Profile, SchedEvent, SchedEventType, Site } from '../models/profile.interface';
import { Action, Request } from '../models/message.interface';
import { getAllTabs, getTab, getTimeInSecs, receiveMessage, sendAction } from '../utils/utils';
import { isSameDay } from 'date-fns';

const defaultRedirectUrl: string = `${chrome.extension.getURL('app/index.html')}#/block`

var profiles: Profile[] = [];
var activeProfile: Profile | undefined;
var blockedTabIdMap: Map<number, string> = new Map();
var pendingSchedEvents: SchedEvent[] = [];
var prevSavedDate: Date = new Date();

chrome.storage.local.get(['profiles'], result => {
  if (!result) {
    return;
  }
  if (result.profiles) {
   profiles = result.profiles;
   activeProfile = profiles.find(profile => profile.options.isActive);
  }
  if (result.prevSavedDate) {
    prevSavedDate = new Date(result.prevSavedDate);
  }
});

receiveMessage(async (request: Request, sender): Promise<any> => {
  if (!request?.action == undefined) {
    throw new Error('Request must specify an action');
  }

  let responseBody: any = undefined;
  let profileIdx: number | undefined;

  switch(request.action) {
    case Action.ON_TAB_UPDATE:
      if (!activeProfile) {
        break;
      }
      if (!sender.tab?.id) {
        throw new Error('Sender tab ID is undefined');
      }
      const matchedTab = await matchTabSiteWithProfile(sender.tab.id, activeProfile);
      if (matchedTab) {
        redirectTab(matchedTab);
      }
      break;

    case Action.UPDATE_PROFILE:
      const profile: Profile | undefined = request.body.profile;
      if (!profile) {
        throw new Error('Updated profile is undefined');
      }
      profileIdx = getProfileIndexFromName(request.body?.profileName);
      profiles[profileIdx] = profile;
      if (profile.options.isActive) {
        await setActiveProfile(profile.name);
      } else if (activeProfile?.name == request.body.profileName) {
        activeProfile = undefined;
        restoreBlockedTabs(activeProfile);
      }
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

    case Action.GET_ACTIVE_PROFILE:
      responseBody = activeProfile;
      break;
  }
  return responseBody;
});

function getProfileIndexFromName(profileName: string | undefined): number {
  if (!profileName) {
    throw new Error('Profile name is undefined');
  }
  const targetProfileIdx = profiles.findIndex(profile => profile.name == profileName);
  if (targetProfileIdx == -1) {
    throw new Error(`Could not find profile with name "${profileName}"`);
  }
  return targetProfileIdx;
}

async function matchTabSiteWithProfile(tabId: number, profile: Profile): Promise<chrome.tabs.Tab | undefined> {
  const tab = await getTab(tabId);
  if (!tab.url) {
    throw new Error('Failed to get sender tab URL');
  }
  return isSiteBlocked(tab.url, profile) ? tab : undefined;
}

async function matchAllTabsWithProfile(profile: Profile): Promise<(chrome.tabs.Tab)[]> {
  const tabs = await getAllTabs();
  const matchedTabPromises: Promise<chrome.tabs.Tab | undefined>[] = [];
  tabs.forEach(tab => matchedTabPromises.push(matchTabSiteWithProfile(tab.id!, profile)));
  return (await Promise.all(matchedTabPromises))
    .filter(tab => tab && (tab.url?.includes("http://") || tab.url?.includes("https://"))) as chrome.tabs.Tab[];
}

async function restoreBlockedTabs(profile?: Profile) {
  for (const [tabId, siteUrl] of blockedTabIdMap) {
    if (!profile || !isSiteBlocked(siteUrl, profile)) {
      try {
        const tab = await getTab(tabId);
        if (tab.url?.includes("chrome-extension://")) {
          redirectTab(tab, siteUrl);
        }
      } catch { }
      blockedTabIdMap.delete(tabId);
    }
  }
}

function isSiteBlocked(siteUrl: string, profile: Profile): boolean {
  const matchedSite: Site | undefined = profile.sites.find(site => siteUrl.includes(site.url));
  const blockMode = profile.options.blockMode;
  return (matchedSite && blockMode === BlockMode.BLOCK_SITES)
    || (!matchedSite && blockMode === BlockMode.ALLOW_SITES);
}

function redirectTab(tab: chrome.tabs.Tab, redirectUrl = defaultRedirectUrl): void {
  if (!tab.id) {
    throw new Error('Tab ID is undefined');
  }
  if (!tab.url) {
    throw new Error('Tab URL is undefined');
  }
  blockedTabIdMap.set(tab.id, tab.url);
  chrome.tabs.update(tab.id, { url: redirectUrl });
}

async function setActiveProfile(profileName: string): Promise<void> {
  const profileIdx = getProfileIndexFromName(profileName);
  const profile = profiles[profileIdx];
  profile.options.isActive = true;
  if (activeProfile && activeProfile.name != profile.name) {
    activeProfile.options.isActive = false;
  }
  activeProfile = profile;
  const matchedTabs = await matchAllTabsWithProfile(activeProfile);
  matchedTabs.forEach(tab => redirectTab(tab));
  restoreBlockedTabs(activeProfile);
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
    if (getTimeInSecs(event.time!) > getTimeInSecs(new Date())) {
      try {
        if (event.eventType == SchedEventType.ENABLE) {
          await setActiveProfile(event.profileName);
        } else if (event.profileName == activeProfile?.name) {
          const profileIdx = getProfileIndexFromName(event.profileName);
          profiles[profileIdx].options.isActive = false;
          activeProfile = undefined;
          restoreBlockedTabs();
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      remainingEvents.push(event);
    }
  }
  if (remainingEvents.length != pendingSchedEvents.length) {
    pendingSchedEvents = remainingEvents;
    sendAction(Action.NOTIFY_SCHEDULE_TRIGGER);
  }
}

setInterval(() => {
  checkSchedEvents();

  // reset all events if new day
  const newDate = new Date();
  if (!isSameDay(prevSavedDate, newDate)) {
    pendingSchedEvents = [];
    profiles.forEach(profile => {
      profile.options.schedule.events.forEach(event => {
        event.executed = false;
      });
    });
    updatePendingSchedEvents();
  }
  prevSavedDate = newDate;
  chrome.storage.local.set({ prevSavedDate }, () => {});
}, 5000);