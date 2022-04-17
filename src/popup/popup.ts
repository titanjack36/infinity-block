import { Action } from "../models/message.interface";
import { Profile } from "../models/profile.interface";
import { sendAction } from "../utils/utils";

document.getElementById('dashboardBtn')!.onclick = function () {
  chrome.tabs.create({ url: chrome.runtime.getURL('app/index.html') });
}

async function init(): Promise<void> {
  const response = await sendAction(Action.GET_PROFILES);
  if (response.error || !response.body) {
    console.error(`Failed to fetch profiles: ${response.error?.message}`);
    return;
  }
  const profiles: Profile[] = response.body;
  const profileTemplate = document.getElementById('profileTemplate');
  if (!profileTemplate) {
    console.error(`Cannot find profile template.`);
    return;
  }
  const profileList = document.getElementById('profileList');
  if (!profileList) {
    console.error(`Cannot find profile list.`);
    return;
  }
  profiles.forEach(profile => {
    const profileItem = profileTemplate.cloneNode(true) as HTMLElement;
    profileItem.id = '';
    const profileName = profileItem.getElementsByClassName('name')[0] as HTMLElement;
    profileName.innerText = profile.name;
    if (profile.options.isActive) {
      const statusCircle = profileItem.getElementsByClassName('status-circle')[0] as HTMLElement;
      statusCircle.classList.add('active');
    }
    profileItem.onclick = function () {
      chrome.tabs.create({ 
        url: chrome.runtime.getURL(`app/index.html#/dashboard?profile=${profile.name}`)
      });
    }
    profileList.appendChild(profileItem);
  });
}

init();