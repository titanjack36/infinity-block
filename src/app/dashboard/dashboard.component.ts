import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import ActiveProfiles from '../../core/active-profile';
import { Action, Response } from '../../models/message.interface';
import { BlockMode, Profile } from '../../models/profile.interface';
import { sendAction } from '../../utils/utils';
import { ProfileService } from '../profile.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  profileNames: string[] = [];
  newProfileName: string = '';
  activeProfiles: ActiveProfiles = new ActiveProfiles();
  errorMsg: string = '';
  newProfileModalOpen: boolean = false;
  errorModalOpen: boolean = false;

  constructor(
    private profileService: ProfileService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef) { }

  async ngOnInit(): Promise<void> {

    this.profileService.onProfileNamesUpdated().subscribe((profileNames) => {
      this.profileNames = profileNames;
    });
    this.profileService.onActiveProfilesUpdated().subscribe((activeProfiles) => {
      this.activeProfiles = activeProfiles;
      this.cdr.detectChanges();
    });
    this.profileService.onError().subscribe((errorMsg) => {
      if (errorMsg) {
        this.showErrorModal(errorMsg);
      }
    });

    // profile names and active profile must be up to date before reading params
    await this.profileService.updateProfileNames();
    await this.profileService.updateActiveProfiles();
    this.activatedRoute.queryParams.subscribe(async (params) => {
      if (params.profile) {
        const response: Response = await sendAction(Action.GET_PROFILE, params.profile);
        if (!response.error) {
          this.profileService.selectedProfile = response.body;
          return;
        } else {
          this.profileService.sendError(`Failed to fetch profile: ${response.error.message}`);
        }
      }

      this.profileNames = this.profileService.profileNames;
      this.activeProfiles = this.profileService.activeProfiles;
      const redirectProfile = this.activeProfiles.last()?.name ?? this.profileNames[0];
      if (redirectProfile) {
        this.router.navigate(['.'], { queryParams: { profile: redirectProfile }});
      } else {
        this.profileService.selectedProfile = undefined;
      }
    });
  }

  async handleAddProfile(): Promise<void> {
    const trimmedName = this.newProfileName.trim();
    if (await this.profileService.addProfile(trimmedName)) {
      this.newProfileName = '';
      this.router.navigate(['.'], { queryParams: { profile: trimmedName }});
      this.hideNewProfileModal();
      this.cdr.detectChanges();
    }
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

  getSelectedProfileName(): string | undefined {
    return this.profileService.selectedProfile?.name;
  }
}
