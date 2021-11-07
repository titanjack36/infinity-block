import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import format from 'date-fns/format';
import { getTimeInSecs, parseTime } from 'src/utils/utils';
import { BlockMode, Challenge, Profile, SchedEventType, Schedule } from '../../models/profile.interface';
import { ProfileService } from '../profile.service';
import { Option} from '../select-menu/select-menu.component';

@Component({
  selector: 'app-profile-options',
  templateUrl: './profile-options.component.html',
  styleUrls: ['./profile-options.component.css']
})
export class ProfileOptionsComponent implements OnInit {

  selectedProfile: Profile | undefined;
  modifiedProfile: Profile | undefined;
  confirmDeleteModalOpen: boolean = false;
  exportHref: SafeUrl = '';

  schedule: Schedule | undefined;
  challenge: Challenge | undefined;
  eventErrors: string[] = [];
  schedEventTypeOptions: Option[] = [
    { value: SchedEventType.ENABLE, description: 'Enable' },
    { value: SchedEventType.DISABLE, description: 'Disable' }
  ];

  constructor(
    private router: Router,
    private profileService: ProfileService,
    private sanitizer: DomSanitizer) { }

  ngOnInit(): void {
    this.profileService.onActiveProfilesUpdated().subscribe((activeProfiles) => {
      if (!this.selectedProfile || !this.modifiedProfile) {
        return;
      }
      const updatedProfile = activeProfiles.find(this.selectedProfile.name);
      if (updatedProfile) {
        this.selectedProfile.options.schedule = updatedProfile.options.schedule;
        this.updateExportHref();
      }
    });
    this.profileService.onProfileUpdated().subscribe((profile) => {
      this.selectedProfile = profile;
      this.updateExportHref();
      this.resetModifiedProfile();
      this.schedule = this.modifiedProfile?.options.schedule;
      if (this.schedule) {
        this.eventErrors = new Array(this.schedule.events.length).fill('');
      }
      this.challenge = this.modifiedProfile?.options.challenge;
    });
  }

  resetModifiedProfile(): void {
    if (!this.selectedProfile) {
      this.modifiedProfile = undefined;
    } else {
      this.modifiedProfile = JSON.parse(JSON.stringify(this.selectedProfile));
    }
  }

  async handleUpdateProfile(): Promise<void> {
    if (!await this.profileService.updateProfile(this.modifiedProfile!)) {
      this.resetModifiedProfile();
    }
  }

  async handleRemoveProfile(): Promise<void> {
    if (await this.profileService.removeProfile(this.selectedProfile!)) {
      this.hideConfirmDeleteModal();
      this.router.navigate(['.']);
    } else {
      this.resetModifiedProfile();
    }
  }

  handleAddSchedEvent(): void {
    this.schedule!.events.push({
      profileName: this.selectedProfile!.name,
      eventType: SchedEventType.ENABLE,
      timeStr: '',
      executed: false
    });
    this.eventErrors.push('');
  }

  handleRemoveSchedEvent(eventIdx: number): void {
    this.schedule!.events.splice(eventIdx, 1);
    this.eventErrors.splice(eventIdx, 1);
    this.handleUpdateSchedEvents();
  }

  handleUpdateSchedEvents(): void {
    // convert inputted date strings to date objects
    this.schedule!.events = this.schedule!.events.map((event, idx) => {
      const time = parseTime(event.timeStr);
      if (!event.timeStr) {
        this.eventErrors[idx] = 'Time cannot be left empty.';
      } else if (!time) {
        this.eventErrors[idx] = 'Invalid time format.';
      } else {
        this.eventErrors[idx] = '';
      }
      return {
        profileName: event.profileName,
        eventType: event.eventType,
        time,
        timeStr: time ? format(time, "hh:mmaaaaa'm'") : event.timeStr,
        executed: !!(time && getTimeInSecs(time) < getTimeInSecs(new Date()))
      };
    });
    this.profileService.updateScheduledEvents(this.schedule!.events, this.selectedProfile!.name);
  }

  showConfirmDeleteModal(): void {
    this.confirmDeleteModalOpen = true;
  }

  hideConfirmDeleteModal(): void {
    this.confirmDeleteModalOpen = false;
  }

  updateExportHref(): void {
    if (!this.selectedProfile) {
      return;
    }
    const sitesJson = JSON.stringify(this.selectedProfile.sites);
    this.exportHref = this.sanitizer.bypassSecurityTrustUrl(
      `data:text/json;charset=UTF-8,${encodeURIComponent(sitesJson)}`
    );
  }

  async handleImportSites(event: any): Promise<void> {
    if (!event.target?.files?.length) {
      this.profileService.sendError('Import failed, file not found.');
    }
    try {
      const content = await event.target.files.item(0)?.text();
      const sites = JSON.parse(content);
      this.modifiedProfile!.sites = sites;
      this.handleUpdateProfile();
    } catch (err: any) {
      this.profileService.sendError(`Failed to parse file: ${err.message}`);
    }
  }

  get BlockMode() {
    return BlockMode;
  }
}
