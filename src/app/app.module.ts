import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BlockPageComponent } from './block-page/block-page.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { HashLocationStrategy, LocationStrategy } from '@angular/common';
import { ProfileComponent } from './profile/profile.component';
import { ModalComponent } from './modal/modal.component';

@NgModule({
  declarations: [
    AppComponent,
    BlockPageComponent,
    DashboardComponent,
    ProfileComponent,
    ModalComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule
  ],
  providers: [
    { provide: LocationStrategy, useClass: HashLocationStrategy }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
