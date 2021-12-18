import { BlockMode, Profile } from "../models/profile.interface";

export default class ActiveProfiles {

  activeProfiles: Profile[];
  activeMode: BlockMode;
  
  /**
   * @param activeList Profiles in the list will be added to active profiles
   */
  constructor(activeList?: Profile[]) {
    this.activeMode = BlockMode.ALLOW_SITES;
    this.activeProfiles = [];
    activeList?.forEach(p => this.add(p, true));
  }

  /**
   * @returns true if there are not active profiles
   */
  isEmpty(): boolean {
    return !this.activeProfiles.length;
  }

  /**
   * @returns the list of active profiles
   */
  getList(): Profile[] {
    return this.activeProfiles;
  }

  /**
   * @returns the last profile in the list of active profiles
   */
  last(): Profile | undefined {
    return this.activeProfiles[this.activeProfiles.length - 1];
  }

  /**
   * @returns block mode of active profiles
   */
  getActiveMode(): BlockMode {
    return this.activeMode;
  }

  /**
   * @param profile the target profile
   * @returns whether the target profile exists in the list of active profiles
   */
  has(profile: Profile): boolean {
    return this.hasName(profile.name);
  }

  /**
   * @param profileName the target profile name
   * @returns whether a profile with the target name exists in the list of
   * active profiles
   */
  hasName(profileName: string): boolean {
    return !!this.find(profileName);
  }

  /**
   * @param profileName the target profile name
   * @returns the profile in the active profile list matching the target name
   */
  find(profileName: string): Profile | undefined {
    return this.activeProfiles.find(p => p.name === profileName);
  }

  /**
   * 
   * @param profile the profile to be added
   * @param force forces a profile to become active, even if that means
   * disabling other profiles with challenges enabled
   * @returns whether the add was successful
   */
  add(profile: Profile, force: boolean = false): void {
    if (this.has(profile)) {
      return;
    }
    if (this.activeMode !== profile.options.blockMode) {
      if (!force) {
        const activeWithChallenge = 
        !!this.activeProfiles.find(p => p.options.challenge.waitTimeEnabled);
        if (activeWithChallenge) {
          throw new Error(
            'Cannot enable profile while another profile with challenge is active');
        }
      }
      this.activeProfiles.forEach(p => p.options.isActive = false);
      this.activeProfiles = [];
      this.activeMode = profile.options.blockMode;
    }
    profile.options.isActive = true;
    this.activeProfiles.push(profile);
  }

  /**
   * Removes the target profile from the list of active profiles
   * @param profile the target profile to be removed
   * @returns whether the removal was successful
   */
  remove(profile: Profile): Profile | undefined {
    return this.removeWithName(profile.name);
  }

  /**
   * Removes the profile with the target profile name from the list of
   * active profiles
   * @param profileName the target profile name
   * @returns whether the removal was successful
   */
  removeWithName(profileName: string): Profile | undefined {
    const targetIndex = this.activeProfiles.findIndex(p => p.name === profileName);
    if (targetIndex === -1) {
      return;
    }
    const targetProfile = this.activeProfiles[targetIndex];
    this.activeProfiles.splice(targetIndex, 1);
    return targetProfile;
  }

}
