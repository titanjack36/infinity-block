import { BlockMode, Profile, Site } from '../models/profile.interface';
import { Action, Request, Response } from '../models/message.interface';
import { getAllTabs, getTab, receiveMessage } from '../utils/utils';

const defaultRedirectUrl: string = `${chrome.extension.getURL('app/index.html')}#/block`

var profiles: Profile[] = [];
var activeProfile: Profile | undefined;
var blockedTabIdMap: Map<number, string> = new Map();

chrome.storage.local.get(['profiles'], result => {
  if (!result) {
    return;
  }
  if (result.profiles) {
   profiles = result.profiles;
   activeProfile = profiles.find(profile => profile.options.isActive);
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
      if (profile.options.isActive) {
        if (activeProfile && activeProfile?.name != profiles[profileIdx].name) {
          activeProfile.options.isActive = false;
        }
        activeProfile = profile;
        const matchedTabs = await matchAllTabsWithProfile(activeProfile);
        matchedTabs.forEach(tab => redirectTab(tab));
      } else if (activeProfile?.name == profile.name) {
        activeProfile = undefined;
      }
      restoreBlockedTabs(activeProfile);
      profiles[profileIdx] = profile;
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

    case Action.UPDATE_SITES:
      const sites: Site[] | undefined = request.body.sites;
      if (!sites) {
        throw new Error('Updates sites are undefined');
      }
      profileIdx = getProfileIndexFromName(request.body.profileName);
      profiles[profileIdx].sites = sites;
      if (activeProfile) {
        restoreBlockedTabs(activeProfile);
        const matchedTabs = await matchAllTabsWithProfile(activeProfile);
        matchedTabs.forEach(tab => redirectTab(tab));
      }
      responseBody = profiles[profileIdx];
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

function saveProfiles(): void {
  chrome.storage.local.set({ profiles }, () => {});
}