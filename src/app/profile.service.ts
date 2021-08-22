import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Profile } from 'src/models/profile.interface';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {

  private profileUpdated: BehaviorSubject<void> = new BehaviorSubject<void>(undefined);
  private error: BehaviorSubject<string> = new BehaviorSubject('');

  private profileNames: string[] = [];
  private profileNameSet: Set<string> = new Set();
  private selectedProfile: Profile | undefined;

  constructor() { }

  onProfileUpdated(): Observable<void> {
    return this.profileUpdated.asObservable();
  }

  onError(): Observable<string> {
    return this.error.asObservable();
  }

  sendError(errorMsg: string): void {
    this.error.next(errorMsg);
  }

  getSelectedProfile(): Profile | undefined {
    return this.selectedProfile;
  }

  getProfileNames(): string[] {
    return this.profileNames;
  }
}
