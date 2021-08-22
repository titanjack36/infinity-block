import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BlockPageComponent } from './block-page/block-page.component';
import { DashboardComponent } from './dashboard/dashboard.component';

const routes: Routes = [
  { path: 'block', component: BlockPageComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: '**', redirectTo: 'dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
