import { ChangeDetectorRef, Component, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Profile } from 'src/models/profile.interface';
import { ProfileService } from '../profile.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {

  @ViewChild('profileNameInput') profileNameInput: any;
  @Output() onCreateProfile = new EventEmitter<void>();
  selectedProfile: Profile | undefined;
  modifiedProfile: Profile | undefined;
  newSiteUrl: string = '';
  editedProfileName: string = '';
  isEditingName: boolean = false;

  constructor(
    private profileService: ProfileService,
    private router: Router,
    private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.profileService.onActiveProfileUpdated().subscribe((activeProfile) => {
      if (!this.selectedProfile || !this.modifiedProfile) {
        return;
      }
      if (activeProfile?.name == this.selectedProfile.name) {
        this.selectedProfile.options.isActive = true;
        this.modifiedProfile.options.isActive = true;
        this.selectedProfile.options.schedule = activeProfile.options.schedule;
      }

      this.cdr.detectChanges();
    });

    this.profileService.onProfileUpdated().subscribe((profile) => {
      this.selectedProfile = profile;
      this.resetModifiedProfile();
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
    if (!await this.profileService.updateProfile(this.modifiedProfile!)) {
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
    if (await this.profileService.updateProfileName(trimmedName, this.selectedProfile!.name)) {
      this.selectedProfile!.name = trimmedName;
      this.router.navigate(['.'], { queryParams: { profile: trimmedName }});
      this.isEditingName = false;
    }
  }

  handleCancelEditName(): void {
    this.isEditingName = false;
  }
}
