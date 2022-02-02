import { Profile } from "src/models/profile.interface";

export interface ProfileState {
  profiles: ReadonlyArray<Profile>;
  selectedProfile: Readonly<Profile> | undefined;
  isLoading: boolean;
  error: string | undefined;
}

export interface AppState {
  profilesState: ProfileState;
}
