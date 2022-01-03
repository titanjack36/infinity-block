import { Component, Input, NgZone, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { format, formatDistanceToNow } from 'date-fns';
import { Profile, Site } from '../../models/profile.interface';
import { ProfileService } from '../profile.service';

@Component({
  selector: 'app-site-list',
  templateUrl: './site-list.component.html',
  styleUrls: ['./site-list.component.css']
})
export class SiteListComponent implements OnInit, OnChanges {

  @Input() selectedProfileName!: string;
  _selectedProfile: Profile | undefined;
  modifiedProfile: Profile | undefined;
  newSiteUrl: string = '';
  columnOrders: SiteColumnOrders;
  columnComparators: ColumnComparators = {
    sites: function (a: Site, b: Site) { return a.url.localeCompare(b.url) },
    dateCreated: function (a: Site, b: Site) {
      if (!a.dateCreated) {
        return -1;
      }
      if (! b.dateCreated) {
        return 1;
      }
      return new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime();
    }
  };

  set selectedProfile(profile: Profile | undefined) {
    this._selectedProfile = profile;
    this.resetModifiedProfile();
  }

  get selectedProfile(): Profile | undefined {
    return this._selectedProfile;
  }

  constructor(
    private profileService: ProfileService,
    private ngZone: NgZone
  ) {
    this.columnOrders = {
      sites: SortOrder.NONE,
      dateCreated: SortOrder.DESC
    }
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (changes.selectedProfileName) {
      const profiles = await this.profileService.getProfiles();
      this.selectedProfile = profiles.find(p => p.name === this.selectedProfileName);
    }
  }

  async ngOnInit(): Promise<void> {
    this.ngZone.run(() => {
      this.profileService.onProfilesUpdated().subscribe(profiles => {
        if (!profiles) {
          return;
        }
        this.selectedProfile = profiles.find(p => p.name === this.selectedProfileName);
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

  async handleAddSite(): Promise<void> {
    const trimmedUrl = this.newSiteUrl.trim();
    if (await this.profileService.addSite(this.selectedProfile!, trimmedUrl)) {
      this.newSiteUrl = '';
    }
  }

  handleRemoveSite(site: Site): void {
    this.profileService.removeSite(this.selectedProfile!, site)
  }

  async handleUpdateProfile(): Promise<void> {
    const success = await this.profileService.updateProfile(
      this.modifiedProfile!, this.selectedProfile!);
    if (!success) {
      this.resetModifiedProfile();
    }
  }

  getElapsedTime(date?: string): string {
    if (!date) {
      return 'unknown';
    } else {
      return `${formatDistanceToNow(new Date(date))} ago`;
    }
  }

  getFormattedDate(date?: string): string {
    if (!date) {
      return 'unknown';
    } else {
      return format(new Date(date), "yyyy-MM-dd hh:mm aaa");
    }
  }

  getSortIconPath(colName: string): string {
    const order: SortOrder = this.columnOrders[colName];
    switch (order) {
      case SortOrder.ASC:
        return 'assets/sort-asc.svg';
      case SortOrder.DESC:
        return 'assets/sort-desc.svg';
      default:
        return 'assets/sort-none.svg';
    }
  }

  handleToggleSort(colName: string): void {
    const currentOrder: SortOrder = this.columnOrders[colName];
    switch (currentOrder) {
      case SortOrder.ASC:
        this.columnOrders[colName] = SortOrder.DESC;
        break;
      case SortOrder.DESC:
        this.columnOrders[colName] = SortOrder.ASC;
        break;
      default:
        this.columnOrders[colName] = SortOrder.DESC
        break;
    }
    for (let otherColName in this.columnOrders) {
      if (otherColName === colName) {
        continue;
      }
      this.columnOrders[otherColName] = SortOrder.NONE;
    }
  }

  getSortedSites(): Site[] {
    if (!this.modifiedProfile) {
      return [];
    }
    let sortColumnName: string | undefined = undefined;
    let sortOrder: SortOrder | undefined = undefined;
    for (let colName in this.columnOrders) {
      if (this.columnOrders[colName] !== SortOrder.NONE) {
        sortColumnName = colName;
        sortOrder = this.columnOrders[colName];
      }
    }
    if (!sortColumnName) {
      return this.modifiedProfile!.sites;
    }
    
    const columnComparator = this.columnComparators[sortColumnName];
    return this.modifiedProfile!.sites.sort((a: Site, b: Site) => {
      if (sortOrder === SortOrder.ASC) {
        return columnComparator(a, b);
      } else {
        return columnComparator(b, a);
      }
    });
  }
}

interface ColumnOrders {
  [key: string]: SortOrder
}

interface SiteColumnOrders extends ColumnOrders {
  sites: SortOrder,
  dateCreated: SortOrder
}

interface ColumnComparators {
  [key: string]: (a: any, b: any) => number;
}

enum SortOrder {
  ASC,
  DESC,
  NONE
}