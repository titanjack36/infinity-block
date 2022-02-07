import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectSelectedProfile } from 'src/app/state/profiles/profiles.selector';
import Timer from 'src/utils/timer';
import { deepCopy } from 'src/utils/utils';
import { Profile } from '../../../models/profile.interface';
import { ProfileService } from '../../profile.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {

  @ViewChild('profileNameInput') profileNameInput: any;
  @Input() selectedProfileName!: string;
  @Output() onCreateProfile = new EventEmitter<void>();
  selectedProfile: Profile | undefined;
  modifiedProfile: Profile | undefined;
  newSiteUrl: string = '';
  editedProfileName: string = '';
  isEditingName: boolean = false;
  waitTimer: Timer = new Timer();
  waitTimeRemaining: number = 0;
  challengeModalOpen: boolean = false;
  allowDisable: boolean = false;
  showOptions: boolean = true;

  constructor(
      private profileService: ProfileService,
      private store: Store) {
    this.waitTimer.attachCallback((timeInSecs: number) => {
      this.waitTimeRemaining = timeInSecs;
      if (timeInSecs === 0) {
        this.allowDisable = true;
      }
    });
  }

  async ngOnInit(): Promise<void> {
    this.store.select(selectSelectedProfile).subscribe(x => {
      this.selectedProfile = x
      this.modifiedProfile = deepCopy(this.selectedProfile);
    });
  }

  async handleAddSite(): Promise<void> {
    const trimmedUrl = this.newSiteUrl.trim();
    if (await this.profileService.addSite(this.modifiedProfile!, trimmedUrl)) {
      this.newSiteUrl = '';
    } else {
      this.modifiedProfile = deepCopy(this.selectedProfile);
    }
  }

  async handleUpdateProfile(): Promise<void> {
    const success = await this.profileService.updateProfile(
      this.modifiedProfile!, this.selectedProfile!);
    if (!success) {
      this.modifiedProfile = deepCopy(this.selectedProfile);
    }
  }

  handleToggleEnableProfile(): void {
    const options = this.modifiedProfile!.options
    this.modifiedProfile!.options.isActive = !options.isActive;
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

  handleShowOptions() {
    this.showOptions = true;
  }

  handleHideOptions() {
    this.showOptions = false;
  }
}
