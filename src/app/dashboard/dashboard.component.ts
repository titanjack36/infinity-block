import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import ActiveProfiles from '../../core/active-profile';
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
  selectedProfileName: string | undefined;
  errorMsg: string = '';
  newProfileModalOpen: boolean = false;
  errorModalOpen: boolean = false;

  constructor(
    private profileService: ProfileService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone) { }

  async ngOnInit(): Promise<void> {
    const profiles = await this.profileService.getProfiles();
    this.profileNames = profiles.map(p => p.name);
    this.activeProfiles = new ActiveProfiles(
      profiles.filter(p => p.options.isActive)
    );

    this.ngZone.run(() => {
      this.profileService.onProfilesUpdated().subscribe(profiles => {
        if (!profiles) {
          return;
        }
        this.profileNames = profiles.map(p => p.name);
        this.activeProfiles = new ActiveProfiles(
          profiles.filter(p => p.options.isActive)
        );
      });
    });

    this.profileService.onError().subscribe((errorMsg) => {
      if (errorMsg) {
        this.showErrorModal(errorMsg);
      }
    });

    this.activatedRoute.queryParams.subscribe(async (params) => {
      if (params.profile) {
        if (this.profileNames.find(name => name == params.profile)) {
          this.selectedProfileName = params.profile;
          return;
        } else {
          this.profileService.broadcastError(`No such profile: ${params.profile}`);
        }
      }

      // if no profiles selected, select the last activated profile. If there are
      // no active profiles, select the first profile in the list.
      const redirectProfile = this.activeProfiles.last()?.name ?? this.profileNames[0];
      if (redirectProfile) {
        this.router.navigate(['.'], { queryParams: { profile: redirectProfile }});
      } else {
        this.selectedProfileName = undefined;
      }
    });
  }

  async handleAddProfile(): Promise<void> {
    const trimmedName = this.newProfileName.trim();
    if (await this.profileService.addProfile(trimmedName)) {
      this.newProfileName = '';
      this.router.navigate(['.'], { queryParams: { profile: trimmedName }});
      this.hideNewProfileModal();
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
}
