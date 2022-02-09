import { Component, Input, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { format, formatDistanceToNow } from 'date-fns';
import { selectSelectedProfile } from 'src/app/state/profiles/profiles.selector';
import { deepCopy } from 'src/utils/utils';
import { Profile, Site } from '../../../models/profile.interface';
import { ProfileService } from '../../profile.service';

@Component({
  selector: 'app-site-list',
  templateUrl: './site-list.component.html',
  styleUrls: ['./site-list.component.css']
})
export class SiteListComponent implements OnInit {

  @Input() selectedProfileName!: string;
  selectedProfile: Profile | undefined;
  modifiedProfile: Profile | undefined;
  newSiteUrl: string = '';
  columnOrders: SiteColumnOrders;
  elapsedTimeMap: Map<string, string> = new Map();
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

  constructor(
    private profileService: ProfileService,
    private store: Store
  ) {
    this.columnOrders = {
      sites: SortOrder.NONE,
      dateCreated: SortOrder.DESC
    }
  }

  async ngOnInit(): Promise<void> {
    this.store.select(selectSelectedProfile).subscribe(x => {
      this.selectedProfile = x;
      this.modifiedProfile = deepCopy(this.selectedProfile);
    });
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
      this.modifiedProfile = deepCopy(this.selectedProfile);
    }
  }

  getElapsedTime(date?: string): string {
    if (!date) {
      return 'unknown';
    } else if (this.elapsedTimeMap.has(date)) {
      // we don't want elapsed time to change after it has been rendered
      return this.elapsedTimeMap.get(date)!;
    } else {
      const elapsedTime = `${formatDistanceToNow(new Date(date))} ago`;
      this.elapsedTimeMap.set(date, elapsedTime);
      return elapsedTime;
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