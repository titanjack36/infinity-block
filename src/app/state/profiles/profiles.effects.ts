import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { ProfileService } from '../../profile.service';
import { getProfiles, setProfiles, profilesError } from './profiles.actions';
import { switchMap, catchError, map } from 'rxjs/operators';
import { from, of } from 'rxjs';
import { RxNgZoneScheduler } from 'ngx-rxjs-zone-scheduler';

@Injectable()
export class ProfilesEffects {
 
  getProfiles$ = createEffect(() => this.actions$.pipe(
    ofType(getProfiles),
    switchMap(() => this.profileService.getProfiles()
      .pipe(
        this.zoneScheduler.observeOnNgZone(),
        map(profiles => setProfiles({ profiles })),
        catchError(error => of(profilesError({ error })))
      )
    )
  ));
 
  constructor(
    private actions$: Actions,
    private profileService: ProfileService,
    private zoneScheduler: RxNgZoneScheduler
  ) {}
}