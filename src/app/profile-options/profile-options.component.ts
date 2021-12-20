import { ChangeDetectorRef, Component, Input, NgZone, OnChanges, OnInit, SimpleChanges } from '@angular/core';
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
export class ProfileOptionsComponent implements OnInit, OnChanges {

  @Input() selectedProfileName!: string;
  _selectedProfile: Profile | undefined;
  modifiedProfile: Profile | undefined;
  confirmDeleteModalOpen: boolean = false;
  exportHref: SafeUrl = '';

  challenge: Challenge | undefined;
  eventErrors: string[] = [];
  schedEventTypeOptions: Option[] = [
    { value: SchedEventType.ENABLE, description: 'Enable' },
    { value: SchedEventType.DISABLE, description: 'Disable' }
  ];

  constructor(
    private router: Router,
    private profileService: ProfileService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone) { }

  set selectedProfile(profile: Profile | undefined) {
    this._selectedProfile = profile;
    this.resetModifiedProfile();
  }

  get selectedProfile(): Profile | undefined {
    return this._selectedProfile;
  }

  get schedule(): Schedule | undefined {
    return this.modifiedProfile?.options.schedule;
  }

  get BlockMode() {
    return BlockMode;
  }

  get exportFileName(): string {
    return `block_sites_${this.selectedProfile!.name}.json`;
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (changes.selectedProfileName) {
      const profiles = await this.profileService.getProfiles();
      this.selectedProfile = profiles.find(p => p.name === this.selectedProfileName);
      this.updateExportHref();
    }
  }

  async ngOnInit(): Promise<void> {
    this.ngZone.run(() => {
      this.profileService.onProfilesUpdated().subscribe(profiles => {
        if (!profiles) {
          return;
        }
  
        this.selectedProfile = profiles.find(p => p.name === this.selectedProfileName);
        this.updateExportHref();
      });
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
    const success = await this.profileService.updateProfile(
      this.modifiedProfile!, this.selectedProfile!);
    if (!success) {
      this.resetModifiedProfile();
    }
  }

  async handleRemoveProfile(): Promise<void> {
    if (await this.profileService.removeProfile(this.selectedProfile!)) {
      this.hideConfirmDeleteModal();
      this.router.navigate(['.']);
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
    const processedEvents = this.schedule!.events.map((event, idx) => {
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
    this.modifiedProfile!.options.schedule.events = processedEvents;
    this.profileService.updateProfile(this.modifiedProfile!, this.selectedProfile!);
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
      this.profileService.broadcastError('Import failed, file not found.');
    }
    try {
      const content = await event.target.files.item(0)?.text();
      const sites = JSON.parse(content);
      this.modifiedProfile!.sites = sites;
      this.handleUpdateProfile();
    } catch (err: any) {
      this.profileService.broadcastError(`Failed to parse file: ${err.message}`);
    }
  }
}
