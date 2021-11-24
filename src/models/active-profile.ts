import { BlockMode, Profile } from "./profile.interface";

export default class ActiveProfiles {

  activeProfiles: Profile[];
  activeMode: BlockMode;
  
  constructor(activeList?: Profile[]) {
    this.activeMode = BlockMode.ALLOW_SITES;
    this.activeProfiles = [];
    activeList?.forEach(p => this.add(p));
  }

  isEmpty(): boolean {
    return !this.activeProfiles.length;
  }

  getList(): Profile[] {
    return this.activeProfiles;
  }

  last(): Profile | undefined {
    return this.activeProfiles[this.activeProfiles.length - 1];
  }

  getActiveMode(): BlockMode {
    return this.activeMode;
  }

  has(profile: Profile): boolean {
    return this.hasName(profile.name);
  }

  hasName(profileName: string): boolean {
    return !!this.find(profileName);
  }

  find(profileName: string): Profile | undefined {
    return this.activeProfiles.find(p => p.name === profileName);
  }

  add(profile: Profile): void {
    if (this.has(profile)) {
      return;
    }
    if (this.activeMode !== profile.options.blockMode) {
      const activeWithChallenge = 
        !!this.activeProfiles.find(p => p.options.challenge.waitTimeEnabled);
      if (activeWithChallenge) {
        throw new Error(
          'Cannot enable profile while another profile with challenge is active');
      }
      this.activeProfiles.forEach(p => p.options.isActive = false);
      this.activeProfiles = [];
      this.activeMode = profile.options.blockMode;
    }
    profile.options.isActive = true;
    this.activeProfiles.push(profile);
  }

  remove(profile: Profile): Profile | undefined {
    return this.removeWithName(profile.name);
  }

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
