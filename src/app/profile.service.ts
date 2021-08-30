import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { BlockMode, Profile, SchedEvent, Site } from '../models/profile.interface';
import { isValidUrl, receiveMessage, sendAction } from '../utils/utils';
import { Action, Response, Request } from '../models/message.interface';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {

  private profileUpdated: BehaviorSubject<Profile | undefined> = new BehaviorSubject<Profile | undefined>(undefined);
  private activeProfileUpdated: BehaviorSubject<Profile | undefined> = new BehaviorSubject<Profile | undefined>(undefined);
  private profileNamesUpdated: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);
  private error: BehaviorSubject<string> = new BehaviorSubject('');

  private profileNameSet: Set<string> = new Set();
  private siteUrlSet: Set<string> = new Set();
  private _profileNames: string[] = [];
  private _selectedProfile: Profile | undefined;
  private _activeProfile: Profile | undefined;

  constructor() {
    this.updateProfileNames();
    this.updateActiveProfile();

    receiveMessage(async (request: Request, sender): Promise<any> => {
      const responseBody = {};
      if (!request?.action) {
        return responseBody;
      }

      switch(request.action) {
        case Action.NOTIFY_SCHEDULE_TRIGGER:
          this.updateActiveProfile();
          break;
      }

      return responseBody;
    });
  }

  onProfileNamesUpdated(): Observable<string[]> {
    return this.profileNamesUpdated.asObservable();
  }

  onProfileUpdated(): Observable<Profile | undefined> {
    return this.profileUpdated.asObservable();
  }

  onActiveProfileUpdated(): Observable<Profile | undefined> {
    return this.activeProfileUpdated.asObservable();
  }

  onError(): Observable<string> {
    return this.error.asObservable();
  }

  sendError(errorMsg: string): void {
    this.error.next(errorMsg);
  }

  get selectedProfile(): Profile | undefined {
    return this._selectedProfile;
  }

  set selectedProfile(selectedProfile: Profile | undefined) {
    this._selectedProfile = selectedProfile;
    this.siteUrlSet = new Set(this.selectedProfile?.sites.map(site => site.url));
    this.profileUpdated.next(selectedProfile);
  }

  get profileNames(): string[] {
    return this._profileNames;
  }

  set profileNames(profileNames: string[]) {
    this._profileNames = profileNames;
    this.profileNamesUpdated.next(profileNames);
  }

  get activeProfile(): Profile | undefined {
    return this._activeProfile;
  }

  set activeProfile(activeProfile: Profile | undefined) {
    this._activeProfile = activeProfile;
    this.activeProfileUpdated.next(activeProfile);
  }

  async updateProfileNames(): Promise<void> {
    const response: Response = await sendAction(Action.GET_PROFILE_NAMES);
    if (response.error) {
      this.error.next(`Failed to fetch profiles: ${response.error.message}`);
      return;
    }
    this.profileNames = response.body;
    this.profileNameSet = new Set(this.profileNames);
  }

  async updateActiveProfile(): Promise<void> {
    const response: Response = await sendAction(Action.GET_ACTIVE_PROFILE);
    this.activeProfile = response.body;
  }
  
  async addProfile(profileName: string): Promise<boolean> {
    if (profileName.length == 0) {
      this.error.next('New profile name cannot be empty');
      return false;
    }
    if (this.profileNameSet.has(profileName)) {
      this.error.next('Profile with name already exists');
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
        }
      }
    }
    const response: Response = await sendAction(Action.ADD_PROFILE, newProfile);
    if (response.error) {
      this.error.next(`Failed to add profile: ${response.error.message}`);
      return false;
    }
    await Promise.all([this.updateProfileNames(), this.updateActiveProfile()]);
    return true;
  }

  async addSite(modifiedProfile: Profile, siteUrl: string): Promise<boolean> {
    if (siteUrl.length == 0) {
      this.error.next('New site URL cannot be empty');
      return false;
    }
    if (!isValidUrl(siteUrl)) {
      this.error.next('New site URL is invalid');
      return false;
    }
    if (this.siteUrlSet.has(siteUrl)) {
      this.error.next('Site with URL already exists');
      return false;
    }
    modifiedProfile.sites.push({ url: siteUrl });
    return this.updateProfile(modifiedProfile);
  }

  async removeSite(modifiedProfile: Profile, siteIdx: number): Promise<boolean> {
    modifiedProfile.sites.splice(siteIdx, 1);
    return await this.updateProfile(modifiedProfile);
  }

  async updateProfile(modifiedProfile: Profile): Promise<boolean> {
    const response: Response = await sendAction(Action.UPDATE_PROFILE, {
      profileName: modifiedProfile.name,
      profile: modifiedProfile
    });
    if (response.error) {
      this.error.next(`Failed to update profile options: ${response.error.message}`);
      return false;
    }
    this.selectedProfile = modifiedProfile;
    await Promise.all([this.updateProfileNames(), this.updateActiveProfile()]);
    return true;
  }

  async updateProfileName(newProfileName: string, origProfileName: string): Promise<boolean> {
    if (!newProfileName) {
      this.error.next('Profile name cannot be empty');
      return false;
    }
    if (this.profileNameSet.has(newProfileName)) {
      this.error.next('Profile with name already exists');
      return false;
    }
    const response: Response = await sendAction(Action.UPDATE_PROFILE_NAME, 
      { prevProfileName: origProfileName, newProfileName });
    if (response.error) {
      this.error.next(`Failed to update profile name: ${response.error}`);
      return false;
    }
    await Promise.all([this.updateProfileNames(), this.updateActiveProfile()]);
    return true;
  }

  async removeProfile(profile: Profile): Promise<boolean> {
    const response: Response = await sendAction(Action.REMOVE_PROFILE, profile.name);
    if (response.error) {
      this.error.next(`Failed to remove profile: ${response.error.message}`);
      return false;
    }
    await Promise.all([this.updateProfileNames(), this.updateActiveProfile()]);
    return true;
  }

  async updateScheduledEvents(events: SchedEvent[], profileName: string): Promise<boolean> {
    const response: Response = await sendAction(Action.UPDATE_SCHEDULE_EVENTS, {
      events, profileName
    });
    if (response.error) {
      this.error.next(`Failed to update scheduled events: ${response.error.message}`);
      return false;
    }
    return true;
  }
}
