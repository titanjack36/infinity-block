import { createReducer, on } from "@ngrx/store";
import { Profile } from "src/models/profile.interface";
import { ProfileState } from "../app.state";
import { clearError, getProfiles, profilesError, setProfiles, setSelectedProfile } from "./profiles.actions";

export const initialState: ProfileState = {
  profiles: [],
  selectedProfile: undefined,
  isLoading: true,
  error: undefined
};

export const profilesReducer = createReducer(
  initialState,
  on(setProfiles, (state, { profiles }) => {
    return {
      ...state,
      profiles: Object.freeze(profiles),
      selectedProfile: Object.freeze(profiles.find(x => x.name === state.selectedProfile?.name)),
      isLoading: false
    }
  }),
  on(getProfiles, state => ({ ...state, isLoading: true })),
  on(setSelectedProfile, (state, { profileName }) => {
    return {
      ...state,
      selectedProfile: Object.freeze(state.profiles.find(x => x.name === profileName))
    };
  }),
  on(profilesError, (state, { error }) => ({...state, error})),
  on(clearError, state => ({...state, error: undefined }))
);
