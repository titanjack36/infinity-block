import { createAction, props } from "@ngrx/store";
import { Profile } from "src/models/profile.interface";

export const getProfiles = createAction(
  '[Profiles] Get Profiles'
);

export const setProfiles = createAction(
  '[Profiles] Set Profiles',
  props<{ profiles: Profile[] }>()
);

export const profilesError = createAction(
  '[Profiles] Get Profiles Error',
  props<{ error: string | undefined }>()
);

export const clearError = createAction(
  '[Profiles] Clear Error' 
);

export const setSelectedProfile = createAction(
  '[Profiles] Set Selected Profile',
  props<{ profileName: string }>()
);
