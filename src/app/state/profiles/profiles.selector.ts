import { createFeatureSelector, createSelector } from "@ngrx/store";
import ActiveProfiles from "src/core/active-profile";
import { Profile } from "src/models/profile.interface";
import { ProfileState } from "../app.state";

export const selectProfileState = createFeatureSelector<ProfileState>('profilesState');

export const selectProfiles = createSelector(
  selectProfileState,
  (state: ProfileState) => state.profiles
);

export const selectProfileNames = createSelector(
  selectProfiles,
  (profiles: ReadonlyArray<Profile>) => profiles.map(profile => profile.name)
);

export const selectActiveProfiles = createSelector(
  selectProfiles,
  (profiles: ReadonlyArray<Profile>) => {
    return profiles.filter(profile => profile.options.isActive)
      .map(profile => profile.name);
  }
);

export const selectError = createSelector(
  selectProfileState,
  (state: ProfileState) => state.error
);

export const selectIsLoading = createSelector(
  selectProfileState,
  (state: ProfileState) => state.isLoading
);

export const selectSelectedProfile = createSelector(
  selectProfileState,
  (state: ProfileState) => state.selectedProfile
);