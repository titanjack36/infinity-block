import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import format from 'date-fns/format';
import { deepCopy, getTimeInSecs, parseTime } from 'src/utils/utils';
import { BlockMode, Challenge, Profile, SchedEventType, Schedule } from '../../../models/profile.interface';
import { ProfileService } from '../../profile.service';
import { Option } from '../../select-menu/select-menu.component';
import helpData from '../../../data/help.json';
import { Store } from '@ngrx/store';
import { selectProfileNames, selectSelectedProfile } from 'src/app/state/profiles/profiles.selector';
import { filter, take } from 'rxjs/operators';

@Component({
  selector: 'app-profile-options',
  templateUrl: './profile-options.component.html',
  styleUrls: ['./profile-options.component.css']
})
export class ProfileOptionsComponent implements OnInit {

  @Input() selectedProfileName!: string;
  @Output() onHideOptions = new EventEmitter<void>();
  selectedProfile: Profile | undefined;
  modifiedProfile: Profile | undefined;
  confirmDeleteModalOpen: boolean = false;
  selectedHelp: keyof typeof helpData | undefined;

  eventErrors: string[] = [];
  schedEventTypeOptions: Option[] = [
    { value: SchedEventType.ENABLE, description: 'Enable' },
    { value: SchedEventType.DISABLE, description: 'Disable' }
  ];

  constructor(
    private router: Router,
    private profileService: ProfileService,
    private sanitizer: DomSanitizer,
    private store: Store) { }

  get schedule(): Schedule | undefined {
    return this.modifiedProfile?.options.schedule;
  }

  get challenge(): Challenge | undefined {
    return this.modifiedProfile?.options.challenge;
  }

  get BlockMode() {
    return BlockMode;
  }

  get exportFileName(): string {
    return `block_sites_${this.selectedProfile!.name}.json`;
  }

  get nameChanged(): boolean {
    return this.selectedProfile!.name !== this.modifiedProfile!.name;
  }

  get helpContent(): any {
    if (!this.selectedHelp || !helpData[this.selectedHelp]) {
      return { title: '', body: '' };
    }
    return helpData[this.selectedHelp];
  }

  async ngOnInit(): Promise<void> {
    this.store.select(selectSelectedProfile).subscribe(x => {
      this.selectedProfile = x
      this.modifiedProfile = deepCopy(this.selectedProfile);
    });
  }

  async handleUpdateProfile(): Promise<void> {
    const success = await this.profileService.updateProfile(
      this.modifiedProfile!, this.selectedProfile!);
    if (!success) {
      this.modifiedProfile = deepCopy(this.selectedProfile);
    }
  }

  async handleUpdateProfileName(): Promise<void> {
    const trimmedName = this.modifiedProfile!.name.trim();
    const success = await this.profileService.updateProfileName(
      this.selectedProfile!, trimmedName);
    if (success) {
      this.store.select(selectProfileNames)
        .pipe(filter(x => x.includes(trimmedName)), take(1))
        .subscribe(_ => {
          this.router.navigate(['.'], { queryParams: { profile: trimmedName }});
        });
    }
  }

  async handleRemoveProfile(): Promise<void> {
    const removedProfileName = this.selectedProfile!.name;
    if (await this.profileService.removeProfile(this.selectedProfile!)) {
      this.hideConfirmDeleteModal();
      this.store.select(selectProfileNames)
        .pipe(filter(x => !x.includes(removedProfileName)), take(1))
        .subscribe(_ => {
          this.router.navigate(['.']);
        });
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

  handleToggleSchedule(): void {
    if (this.schedule!.isEnabled) {
      this.schedule!.events.filter(event => event.time).forEach(event => {
        event.executed = 
          getTimeInSecs(event.time!) < getTimeInSecs(new Date().toString());
      });
    }
    this.handleUpdateProfile();
  }

  handleUpdateSchedEvents(): void {
    let hasErrors = false;
    // convert inputted date strings to date objects
    const processedEvents = this.schedule!.events.map((event, idx) => {
      const parsedTime = parseTime(event.timeStr);
      let formattedTime;
      let executed = false;
      if (!event.timeStr) {
        this.eventErrors[idx] = 'Time cannot be left empty.';
        formattedTime = event.timeStr;
        hasErrors = true;
      } else if (!parsedTime) {
        this.eventErrors[idx] = 'Invalid time format.';
        formattedTime = event.timeStr;
        hasErrors = true;
      } else {
        this.eventErrors[idx] = '';
        formattedTime = format(new Date(parsedTime), "hh:mmaaaaa'm'");
        executed = getTimeInSecs(parsedTime) < getTimeInSecs(new Date().toString());
      }
      return {
        profileName: event.profileName,
        eventType: event.eventType,
        time: parsedTime,
        timeStr: formattedTime,
        executed
      };
    });
    this.modifiedProfile!.options.schedule.events = processedEvents;
    const shouldNotNotify = hasErrors;
    this.profileService.updateProfile(
      this.modifiedProfile!, this.selectedProfile!, shouldNotNotify);
  }

  showConfirmDeleteModal(): void {
    this.confirmDeleteModalOpen = true;
  }

  hideConfirmDeleteModal(): void {
    this.confirmDeleteModalOpen = false;
  }

  getDownloadHref(dataToDownload: any): SafeUrl {
    const dataStr = JSON.stringify(dataToDownload);
    return this.sanitizer.bypassSecurityTrustUrl(
      `data:text/json;charset=UTF-8,${encodeURIComponent(dataStr)}`
    );
  }

  getDownloadName(postfix: string) {
    return `infinityblock_${this.selectedProfile!.name}_${postfix}.json`;
  }

  async handleImportSites(event: any): Promise<void> {
    if (!event.target?.files?.length) {
      this.profileService.dispatchError('Import failed, file not found.');
    }
    try {
      const content = await event.target.files.item(0)?.text();
      const sites = JSON.parse(content);
      this.modifiedProfile!.sites = sites;
      this.handleUpdateProfile();
    } catch (err: any) {
      this.profileService.dispatchError(`Failed to parse file: ${err.message}`);
    }
  }

  hideHelpModal(): void {
    this.selectedHelp = undefined;
  }
}
