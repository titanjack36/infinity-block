import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { BlockMode, Profile, Site } from '../models/profile.interface';
import { sendAction } from '../utils/utils';
import { Action, Response, Request } from '../models/message.interface';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {

  profilesUpdated: BehaviorSubject<Profile[] | undefined> = 
    new BehaviorSubject<Profile[] | undefined>(undefined);
  error: BehaviorSubject<string> = new BehaviorSubject('');

  _profiles: Profile[] | undefined;
  _pendingProfilesResponse: Promise<Response> | undefined;
  
  /**
   * initialize profile service and listen for profile updates
   * from background
   */
  constructor() {
    chrome.runtime.onMessage.addListener(
      (request: Request, sender: chrome.runtime.MessageSender, _) => {
        // only accept messages from back end
        if (sender.tab !== undefined) {
          return true;
        }

        if (request?.action === Action.NOTIFY_PROFILES_UPDATED) {
          this._profiles = request.body;
          this.profilesUpdated.next(this._profiles);
        }
        return true;
      }
    );
  }

  /**
   * @returns the updated profiles
   */
  onProfilesUpdated(): Observable<Profile[] | undefined> {
    return this.profilesUpdated.asObservable();
  }

  /**
   * @returns the broadcasted error message
   */
  onError(): Observable<string> {
    return this.error.asObservable();
  }

  /**
   * @param errorMsg the error message to be broadcasted
   */
  broadcastError(errorMsg: string): void {
    this.error.next(errorMsg);
  }

  /**
   * If local list of profiles exists, return it
   * Otherwise, fetch the list of profiles from background
   * @returns a list of profiles
   */
  async getProfiles(): Promise<Profile[]> {
    if (this._profiles) {
      return this._profiles;
    }
    // if multiple getProfile calls occur at once, only one
    // request will be sent
    if (!this._pendingProfilesResponse) {
      this._pendingProfilesResponse = sendAction(Action.GET_PROFILES);
    }
    const response: Response = await this._pendingProfilesResponse;

    if (response.error || !response.body) {
      this.error.next(`Failed to fetch profiles: ${response.error?.message}`);
      return [];
    }
    this._profiles = response.body;
    return this._profiles!;
  }
  
  /**
   * Construct new profile
   * @param profileName the name of the profile to be added
   * @returns whether the profile has been successfully added
   */
  async addProfile(profileName: string): Promise<boolean> {
    if (profileName.length == 0) {
      this.error.next('New profile name cannot be empty');
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
    const response: Response = await sendAction(Action.ADD_PROFILE, newProfile);
    if (response.error) {
      this.error.next(`Failed to add profile: ${response.error.message}`);
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
      this.error.next('New site URL cannot be empty');
      return false;
    }
    if (profile.sites.find(s => s.url === siteUrl)) {
      this.error.next('Site with URL already exists');
      return false;
    }
    const modifiedProfile: Profile = JSON.parse(JSON.stringify(profile));
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
    const modifiedProfile: Profile = JSON.parse(JSON.stringify(profile));
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
      this.error.next(`Failed to update profile: ${response.error.message}`);
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
      this.error.next('Profile name cannot be empty');
      return false;
    }
    const modifiedProfile: Profile = JSON.parse(JSON.stringify(profile));
    modifiedProfile.name = newProfileName;
    return await this.updateProfile(modifiedProfile, profile);
  }

  /**
   * @param profile the profile to be removed
   * @returns whether the profile was successfully removed
   */
  async removeProfile(profile: Profile): Promise<boolean> {
    const response: Response = await sendAction(Action.REMOVE_PROFILE, profile.name);
    if (response.error) {
      this.error.next(`Failed to remove profile: ${response.error.message}`);
      return false;
    }
    return true;
  }
}
