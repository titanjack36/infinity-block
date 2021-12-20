export enum Action {
  UPDATE_PROFILE,
  ADD_PROFILE,
  GET_PROFILES,
  REMOVE_PROFILE,
  UPDATE_PROFILE_NAME,
  NOTIFY_PROFILES_UPDATED
}

export interface Request {
  action: Action;
  body?: any;
}

export interface Response {
  error?: MessageError;
  body?: any;
}

export interface MessageError {
  message: string;
}