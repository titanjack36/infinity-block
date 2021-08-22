import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Action, Response } from '../../models/message.interface';
import { BlockMode, Profile } from '../../models/profile.interface';
import { sendAction } from '../../utils/utils';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  profileNames: string[] = [];
  profileNameSet: Set<string> = new Set();
  newProfileName: string = '';
  selectedProfileName: string | undefined;
  activeProfile: Profile | undefined;
  errorMsg: string = '';
  newProfileModalOpen: boolean = false;
  errorModalOpen: boolean = false;

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router) { }

  ngOnInit(): void {
    this.getProfileNames();
    this.getActiveProfile();

    this.activatedRoute.queryParams.subscribe(params => {
      if (!params.profile && this.profileNames.length) {
        this.router.navigate(['.'], { queryParams: { profile: this.profileNames[0] }});
      } else {
        this.selectedProfileName = params.profile;
      }
    });
  }

  async getProfileNames(): Promise<void> {
    const response: Response = await sendAction(Action.GET_PROFILE_NAMES);
    if (response.error) {
      this.showErrorModal(`Failed to fetch profiles: ${response.error.message}`);
      return;
    }
    this.profileNames = response.body;
    this.profileNameSet = new Set(this.profileNames);
    if (this.selectedProfileName && !this.profileNames.includes(this.selectedProfileName)) {
      if (this.profileNames.length) {
        this.router.navigate(['.'], { queryParams: { profile: this.profileNames[0] }});
      } else {
        this.router.navigate(['.']);
      }
    }
  }

  async getActiveProfile(): Promise<void> {
    const response: Response = await sendAction(Action.GET_ACTIVE_PROFILE);
    this.activeProfile = response.body;
  }

  async handleAddProfile(): Promise<void> {
    const profileName = this.newProfileName.trim();
    if (profileName.length == 0) {
      this.showErrorModal('New profile name cannot be empty');
      return;
    }
    if (this.profileNameSet.has(profileName)) {
      this.showErrorModal('Profile with name already exists');
      return;
    }
    const newProfile: Profile = {
      name: profileName,
      sites: [],
      options: {
        isActive: false,
        blockMode: BlockMode.BLOCK_SITES
      }
    }
    const response: Response = await sendAction(Action.ADD_PROFILE, newProfile);
    if (response.error) {
      this.showErrorModal(`Failed to add profile: ${response.error.message}`);
      return;
    }
    this.newProfileName = '';
    this.getProfileNames();
    this.getActiveProfile();
    this.router.navigate(['.'], { queryParams: { profile: profileName }});
    this.hideNewProfileModal();
  }

  showNewProfileModal(): void {
    this.newProfileModalOpen = true;
  }

  hideNewProfileModal(): void {
    this.newProfileModalOpen = false;
  }

  showErrorModal(errorMsg: string): void {
    this.errorMsg = errorMsg;
    this.errorModalOpen = true;
  }

  hideErrorModal(): void {
    this.errorMsg = '';
    this.errorModalOpen = false;
  }
}
