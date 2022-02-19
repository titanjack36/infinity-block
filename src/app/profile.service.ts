import { Injectable } from "@angular/core";
import { Store } from "@ngrx/store";
import { Observable } from "rxjs";
import { Action, Response, Request } from "src/models/message.interface";
import { BlockMode, Profile, Site } from "src/models/profile.interface";
import { deepCopy, sendAction } from "src/utils/utils";
import { profilesError } from "./state/profiles/profiles.actions";

@Injectable({
  providedIn: 'root'
})
export class ProfileService {

  constructor(private store: Store) {}

  getProfiles(): Observable<Profile[]> {
    return new Observable(subscriber => {
      sendAction(Action.GET_PROFILES).then(response => {
        if (response.error || !response.body) {
          subscriber.error(`Failed to fetch profiles: ${response.error?.message}`);
        }
        subscriber.next(response.body);
      });
      
      chrome.runtime.onMessage.addListener(
        (request: Request, sender: chrome.runtime.MessageSender, sendResponse) => {
          // ignore messages that do not come from background script
          if (sender.tab !== undefined) {
            return true;
          }
  
          if (request?.action === Action.NOTIFY_PROFILES_UPDATED) {
            subscriber.next(request.body);
          }
          sendResponse();
          return true;
        }
      );
    });
  }

  dispatchError(errorMsg: string | undefined): void {
    this.store.dispatch(profilesError({ error: errorMsg }));
  }

  /**
   * Construct new profile
   * @param profileName the name of the profile to be added
   * @returns whether the profile has been successfully added
   */
  async addEmptyProfile(profileName: string): Promise<boolean> {
    if (profileName.length == 0) {
      this.dispatchError('New profile name cannot be empty');
      return false;
    }
    const newProfile: Profile = {
      name: profileName,
      sites: [],
      options: {
        isActive: false,
        blockMode: BlockMode.BLOCK_SITES,
        schedule: {
          isEnabled: false,
          events: []
        },
        challenge: {
          waitTimeEnabled: false,
          waitTime: 30
        }
      }
    }
    return await this.addProfile(newProfile);
  }

  async addProfile(newProfile: Profile): Promise<boolean> {
    const response: Response = await sendAction(Action.ADD_PROFILE, newProfile);
    if (response.error) {
      this.dispatchError(`Failed to add profile: ${response.error.message}`);
      return false;
    }
    return true;
  }

  /**
   * Adds a site to the profile site list
   * @param profile the profile where the new site will be added
   * @param siteUrl the URL of the site to be added
   * @returns whether the site was successfully added to the profile site list
   */
  async addSite(profile: Profile, siteUrl: string): Promise<boolean> {
    if (siteUrl.length == 0) {
      this.dispatchError('New site URL cannot be empty');
      return false;
    }
    if (profile.sites.find(s => s.url === siteUrl)) {
      this.dispatchError('Site with URL already exists');
      return false;
    }
    const modifiedProfile: Profile = deepCopy(profile);
    modifiedProfile.sites.push({
      url: siteUrl,
      useRegex: false,
      dateCreated: new Date().toString()
    });
    return this.updateProfile(modifiedProfile, profile);
  }

  /**
   * Removes a site from the profile site list
   * @param profile the profile where the site will be removed
   * @param siteIdx the list index of the site to be removed
   * @returns whether the site was successfully removed from the profile site list
   */
  async removeSite(profile: Profile, site: Site): Promise<boolean> {
    const modifiedProfile: Profile = deepCopy(profile);
    modifiedProfile.sites = profile.sites.filter(s => s.url !== site.url);
    return await this.updateProfile(modifiedProfile, profile);
  }

  /**
   * @param modifiedProfile the profile with modifications
   * @param origProfile the profile before modifications
   * @param doNotNotify if true, background will not notify others that 
   * the profie was updated
   * @returns whether the profile was successfully updated with modifications
   */
  async updateProfile(modifiedProfile: Profile, origProfile: Profile, 
      doNotNotify: boolean = false): Promise<boolean> {
    const response: Response = await sendAction(Action.UPDATE_PROFILE, {
      profileName: origProfile.name,
      profile: modifiedProfile,
      origProfile: origProfile,
      doNotNotify
    });
    if (response.error) {
      this.dispatchError(`Failed to update profile: ${response.error.message}`);
      return false;
    }
    return true;
  }

  /**
   * @param profile the profile to updated with the new name
   * @param newProfileName the new name for the profile
   * @returns whether the profile was successfully updated with the new name
   */
  async updateProfileName(profile: Profile, newProfileName: string): Promise<boolean> {
    if (!newProfileName) {
      this.dispatchError('Profile name cannot be empty');
      return false;
    }
    const modifiedProfile: Profile = deepCopy(profile);
    modifiedProfile.name = newProfileName;
    modifiedProfile.options.schedule.events.forEach(ev => ev.profileName = newProfileName);
    return await this.updateProfile(modifiedProfile, profile);
  }

  /**
   * @param profile the profile to be removed
   * @returns whether the profile was successfully removed
   */
  async removeProfile(profile: Profile): Promise<boolean> {
    const response: Response = await sendAction(Action.REMOVE_PROFILE, profile.name);
    if (response.error) {
      this.dispatchError(`Failed to remove profile: ${response.error.message}`);
      return false;
    }
    return true;
  }
}
