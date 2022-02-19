import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { ProfileService } from '../profile.service';
import { CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import { sendAction } from 'src/utils/utils';
import { Action } from 'src/models/message.interface';
import manifest from '../../manifest.json';
import config from '../../data/config.json';
import { Store } from '@ngrx/store';
import { clearError, getProfiles, setSelectedProfile } from '../state/profiles/profiles.actions';
import { selectActiveProfiles, selectError, selectIsLoading, selectProfileNames } from '../state/profiles/profiles.selector';
import { Subscription } from 'rxjs';
import { Profile } from 'src/models/profile.interface';
import { filter, take } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  @ViewChild('selector') selector: any;
  @ViewChild('newProfileInput') newProfileInput: any;
  @ViewChild('profileImport') profileImport: any;
  profileNames: string[] = [];
  newProfileName: string = '';
  activeProfiles: string[] = [];
  selectedProfileName: string | undefined;
  errorMsg: string = '';
  errorModalOpen: boolean = false;
  isDragging: boolean = false;
  newProfileModalOpen: boolean = false;
  profileImportFileName: string = '';
  importedProfile: Profile | undefined;

  constructor(
    private profileService: ProfileService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private store: Store) {}

  get version() {
    return manifest['version'] || 'unknown';
  }

  get reportFormUrl() {
    return `${config['reportFormUrl']}${this.version}`;
  }

  async ngOnInit(): Promise<void> {

    this.store.dispatch(getProfiles());
    this.store.select(selectActiveProfiles).subscribe(x => this.activeProfiles = x);
    this.store.select(selectProfileNames).subscribe(x => this.profileNames = x);
    this.store.select(selectError).subscribe(error => {
      if (error) {
        this.showErrorModal(error);
      }
    });
    
    let routeSub: Subscription | undefined;
    this.store.select(selectIsLoading).subscribe(isLoading => {
      if (!isLoading) {
        // based on URL query parameters, decide on which profile to show
        routeSub = this.activatedRoute.queryParams.subscribe(async (params) => {
          this.selectedProfileName = this.getSelectedProfileName(params);
          if (this.selectedProfileName) {
            this.router.navigate(['.'], {
              queryParams: { profile: this.selectedProfileName }
            });
          } else {
            this.router.navigate(['.']);
          }
          this.store.dispatch(setSelectedProfile({
            profileName: this.selectedProfileName
          }));
        });
      } else if (routeSub) {
        routeSub.unsubscribe();
      }
    });
  }

  getSelectedProfileName(queryParams: Params): string | undefined {
    let selectedProfileName: string | undefined = undefined;
    if (queryParams.profile) {
      const hasProfile = this.profileNames.includes(queryParams.profile);
      if (hasProfile) {
        selectedProfileName = queryParams.profile;
      } else {
        this.profileService.dispatchError(`No such profile: ${queryParams.profile}`);
      }
    }
    // if no profile selected, redirect to first active profile
    // if no profiles are active, try redirecting to the first profile
    // if no profiles exist, then no profiles are selected
    if (!selectedProfileName) {
      selectedProfileName = this.activeProfiles[0] ?? this.profileNames[0];
    }
    return selectedProfileName;
  }

  async handleAddProfile(): Promise<void> {
    let success = false;
    const trimmedName = this.newProfileName.trim();
    if (this.importedProfile) {
      this.importedProfile.name = trimmedName;
      success = await this.profileService.addProfile(this.importedProfile);
    } else {
      success = await this.profileService.addEmptyProfile(trimmedName);
    }
    if (success) {
      this.store.select(selectProfileNames)
        .pipe(filter(x => x.includes(trimmedName)), take(1))
        .subscribe(_ => {
          this.router.navigate(['.'], { queryParams: { profile: trimmedName }})
        });
      this.hideNewProfileModal();
      this.newProfileName = '';
    }
  }

  showNewProfileModal(): void {
    this.newProfileModalOpen = true;
    setTimeout(() => this.newProfileInput.nativeElement.focus(), 0);
  }

  hideNewProfileModal(): void {
    if (this.profileImport?.nativeElement) {
      this.profileImport.nativeElement.value = null;
    }
    this.newProfileModalOpen = false;
    this.newProfileName = '';
    this.profileImportFileName = '';
    this.importedProfile = undefined;
  }

  showErrorModal(errorMsg: string): void {
    this.errorMsg = errorMsg;
    this.errorModalOpen = true;
  }

  hideErrorModal(): void {
    this.errorMsg = '';
    this.errorModalOpen = false;
    this.store.dispatch(clearError());
  }

  handleSelect(event: any) {
    if (this.isDragging || !this.selector?.nativeElement || !event?.target) {
      return;
    }
    const targetRect = event.target.getBoundingClientRect();
    const targetProfileName = event.target.getAttribute('data-profile-name');
    const selectorElement = this.selector.nativeElement;
    selectorElement.style.opacity = '1';
    selectorElement.style.left = `${targetRect.x}px`;
    selectorElement.style.top = `${targetRect.y}px`;
    selectorElement.style.height = `${targetRect.height}px`;
    selectorElement.innerText = targetProfileName;
  }

  handleDeselect() {
    if (!this.selector?.nativeElement) {
      return;
    }
    const selectorElement = this.selector.nativeElement;
    selectorElement.style.opacity = '0';
  }

  handleDrop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.profileNames, event.previousIndex, event.currentIndex);
    sendAction(Action.UPDATE_PROFILE_ORDER, this.profileNames);
  }

  @HostListener('window:mouseup', ['$event'])
  handleEndDrop() {
    this.isDragging = false;
  }

  async handleImportProfile(event: any): Promise<void> {
    if (!event.target?.files?.length) {
      this.profileService.dispatchError('Import failed, file not found.');
    }
    try {
      const file = event.target.files.item(0);
      this.profileImportFileName = file.name;
      const content = await file.text();
      this.importedProfile = JSON.parse(content);
      this.newProfileName = this.importedProfile!.name;
    } catch (err: any) {
      this.profileService.dispatchError(`Failed to parse file: ${err.message}`);
    }
  }
}
