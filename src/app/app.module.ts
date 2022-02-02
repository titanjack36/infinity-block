import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { AppRoutingModule } from './app-routing.module';

import { RxNgZoneSchedulerModule } from 'ngx-rxjs-zone-scheduler';

import { profilesReducer } from './state/profiles/profiles.reducer';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { ProfilesEffects } from './state/profiles/profiles.effects';

import { AppComponent } from './app.component';
import { BlockPageComponent } from './block-page/block-page.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { HashLocationStrategy, LocationStrategy } from '@angular/common';
import { ProfileComponent } from './dashboard/profile/profile.component';
import { ModalComponent } from './modal/modal.component';
import { SelectMenuComponent } from './select-menu/select-menu.component';
import { ProfileOptionsComponent } from './dashboard/profile-options/profile-options.component';
import { SiteListComponent } from './dashboard/site-list/site-list.component';

@NgModule({
  declarations: [
    AppComponent,
    BlockPageComponent,
    DashboardComponent,
    ProfileComponent,
    ModalComponent,
    SelectMenuComponent,
    ProfileOptionsComponent,
    SiteListComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    DragDropModule,
    StoreModule.forRoot({ profilesState: profilesReducer }),
    EffectsModule.forRoot([ProfilesEffects]),
    RxNgZoneSchedulerModule
  ],
  providers: [
    { provide: LocationStrategy, useClass: HashLocationStrategy },
    { provide: Window, useValue: window }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
