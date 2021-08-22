import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Action, Response } from 'src/models/message.interface';
import { Profile, BlockMode, Site } from 'src/models/profile.interface';
import { isValidUrl, sendAction } from 'src/utils/utils';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit, OnChanges {

  @ViewChild('profileNameInput') profileNameInput: any; 
  @Input() selectedProfileName: string | undefined;
  @Input() profileNameSet: Set<string> | undefined;
  @Output() onError = new EventEmitter<string>();
  @Output() onProfileUpdated = new EventEmitter<void>();
  @Output() onCreateProfile = new EventEmitter<void>();
  selectedProfile: Profile | undefined;
  newSiteUrl: string = '';
  siteUrlSet: Set<string> = new Set();
  editedProfileName: string = '';
  isEditingName: boolean = false;
  confirmDeleteModalOpen: boolean = false;

  constructor(private router: Router) { }

  ngOnInit(): void {
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    const profileNameChange = changes.selectedProfileName;
    if (profileNameChange) {
      if (profileNameChange.currentValue) {
        const response = await sendAction(Action.GET_PROFILE, profileNameChange.currentValue);
        if (response.error) {
          this.onError.emit(`Failed to fetch profile: ${response.error.message}`);
          this.router.navigate(['.']);
        } else {
          this.selectedProfile = response.body;
          this.siteUrlSet = new Set(this.selectedProfile?.sites.map(site => site.url));
        }
      } else {
        this.selectedProfile = undefined;
      }
    }
  }

  async handleAddSite(): Promise<void> {
    const siteUrl = this.newSiteUrl.trim();
    if (siteUrl.length == 0) {
      this.onError.emit('New site URL cannot be empty');
      return;
    }
    if (!isValidUrl(siteUrl)) {
      this.onError.emit('New site URL is invalid');
      return;
    }
    if (this.siteUrlSet.has(siteUrl)) {
      this.onError.emit('Site with URL already exists');
      return;
    }
    if (await this.updateSites([...this.selectedProfile!.sites, { url: siteUrl }])) {
      this.newSiteUrl = '';
    }
  }

  async handleUpdateOptions(): Promise<void> {
    const response: Response = await sendAction(Action.UPDATE_PROFILE, {
      profileName: this.selectedProfile!.name,
      profile: this.selectedProfile!
    });
    if (response.error) {
      this.onError.emit(`Failed to update profile options: ${response.error.message}`);
      return;
    }
    this.onProfileUpdated.emit();
  }

  handleRemoveSite(siteIdx: number): void {
    const updatedSites = this.selectedProfile!.sites.filter((_site, idx) => idx != siteIdx);
    this.updateSites(updatedSites);
  }

  async updateSites(updatedSites: Site[]): Promise<boolean> {
    const response: Response = await sendAction(Action.UPDATE_SITES, {
      profileName: this.selectedProfile!.name,
      sites: updatedSites
    });
    if (response.error) {
      this.onError.emit(`Failed to update profile sites: ${response.error.message}`);
      return false;
    }
    this.selectedProfile = response.body;
    this.siteUrlSet = new Set(this.selectedProfile!.sites.map(site => site.url));
    return true;
  }

  handleEditName(): void {
    this.editedProfileName = this.selectedProfileName || '';
    this.isEditingName = true;
    setTimeout(() => this.profileNameInput.nativeElement.focus(), 0);
  }

  async handleSaveEditName(): Promise<void> {
    const newProfileName = this.editedProfileName.trim();
    if (!newProfileName) {
      this.onError.emit('Profile name cannot be empty');
      return;
    }
    if (!this.selectedProfile || !this.profileNameSet) {
      this.onError.emit('selectedProfile or profileNameSet is undefined');
      return;
    }
    if (this.profileNameSet.has(newProfileName)) {
      this.onError.emit('Profile with name already exists');
      return;
    }
    const response: Response = await sendAction(Action.UPDATE_PROFILE_NAME, 
      { prevProfileName: this.selectedProfile.name, newProfileName });
    if (response.error) {
      this.onError.emit(`Failed to update profile name: ${response.error}`);
      return;
    }
    this.onProfileUpdated.emit();
    this.router.navigate(['.'], { queryParams: { profile: newProfileName }});
    this.isEditingName = false;
  }

  handleCancelEditName(): void {
    this.isEditingName = false;
  }

  async handleRemoveProfile(): Promise<void> {
    if (!this.selectedProfile) {
      return;
    }
    const response: Response = await sendAction(Action.REMOVE_PROFILE, this.selectedProfile.name);
    if (response.error) {
      this.onError.emit(`Failed to remove profile: ${response.error.message}`);
    }
    this.onProfileUpdated.emit();
    this.hideConfirmDeleteModal();
  }

  showConfirmDeleteModal(): void {
    this.confirmDeleteModalOpen = true;
  }

  hideConfirmDeleteModal(): void {
    this.confirmDeleteModalOpen = false;
  }

  get BlockMode() {
    return BlockMode;
  }
}
