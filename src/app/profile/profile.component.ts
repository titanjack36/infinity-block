import { ChangeDetectorRef, Component, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import Timer from 'src/utils/timer';
import { Profile } from '../../models/profile.interface';
import { ProfileService } from '../profile.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {

  @ViewChild('profileNameInput') profileNameInput: any;
  @Output() onCreateProfile = new EventEmitter<void>();
  _selectedProfile: Profile | undefined;
  modifiedProfile: Profile | undefined;
  newSiteUrl: string = '';
  editedProfileName: string = '';
  isEditingName: boolean = false;
  waitTimer: Timer = new Timer();
  waitTimeRemaining: number = 0;
  challengeModalOpen: boolean = false;
  allowDisable: boolean = false;

  constructor(
      private profileService: ProfileService,
      private router: Router,
      private cdr: ChangeDetectorRef) {
    this.waitTimer.attachCallback((timeInSecs: number) => {
      this.waitTimeRemaining = timeInSecs;
      if (timeInSecs === 0) {
        this.allowDisable = true;
      }
    });
  }

  set selectedProfile(profile: Profile | undefined) {
    this._selectedProfile = profile;
    this.resetModifiedProfile();
  }

  get selectedProfile(): Profile | undefined {
    return this._selectedProfile;
  }

  ngOnInit(): void {
    this.profileService.onActiveProfilesUpdated().subscribe((activeProfiles) => {
      if (!this.selectedProfile || !this.modifiedProfile) {
        return;
      }
      const updatedProfile = activeProfiles.find(this.selectedProfile.name);
      if (updatedProfile) {
        this.selectedProfile = updatedProfile;
        this.cdr.detectChanges();
      }
    });

    this.profileService.onProfileUpdated().subscribe((profile) => {
      this.selectedProfile = profile;
      this.cdr.detectChanges();
    });
  }

  resetModifiedProfile(): void {
    if (!this.selectedProfile) {
      this.modifiedProfile = undefined;
    } else {
      this.modifiedProfile = JSON.parse(JSON.stringify(this.selectedProfile));
    }
  }

  async handleAddSite(): Promise<void> {
    const trimmedUrl = this.newSiteUrl.trim();
    if (await this.profileService.addSite(this.modifiedProfile!, trimmedUrl)) {
      this.newSiteUrl = '';
    } else {
      this.resetModifiedProfile();
    }
  }

  async handleRemoveSite(siteIdx: number): Promise<void> {
    if (!await this.profileService.removeSite(this.modifiedProfile!, siteIdx)) {
      this.resetModifiedProfile();
    }
  }

  async handleUpdateProfile(): Promise<void> {
    const success = await this.profileService.updateProfile(
      this.modifiedProfile!, this.selectedProfile!);
    if (!success) {
      this.resetModifiedProfile();
    }
  }

  handleEditName(): void {
    this.editedProfileName = this.selectedProfile!.name;
    this.isEditingName = true;
    setTimeout(() => this.profileNameInput.nativeElement.focus(), 0);
  }

  async handleSaveEditName(): Promise<void> {
    const trimmedName = this.editedProfileName.trim();
    const success = await this.profileService.updateProfileName(
      this.selectedProfile!, trimmedName);
    if (success) {
      this.selectedProfile!.name = trimmedName;
      this.router.navigate(['.'], { queryParams: { profile: trimmedName }});
      this.isEditingName = false;
    }
  }

  handleCancelEditName(): void {
    this.isEditingName = false;
  }

  handleToggleEnableProfile(): void {
    const options = this.modifiedProfile!.options
    if (!options.isActive && options.challenge.waitTimeEnabled) {
      this.challengeModalOpen = true;
      this.waitTimeRemaining = options.challenge.waitTime;
      this.waitTimer.setTime(options.challenge.waitTime);
      this.waitTimer.start();
    } else {
      this.handleUpdateProfile();
    }
  }

  handleDisableProfile(): void {
    this.challengeModalOpen = false;
    this.waitTimer.stop();
    this.handleUpdateProfile();
    this.allowDisable = false;
  }

  handleHideChallengeModal() {
    this.modifiedProfile!.options.isActive = true;
    this.challengeModalOpen = false;
  }
}
