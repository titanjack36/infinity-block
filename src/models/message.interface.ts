export enum Action {
  ON_TAB_UPDATE,
  UPDATE_PROFILE,
  GET_PROFILE_NAMES,
  ADD_PROFILE,
  GET_PROFILE,
  REMOVE_PROFILE,
  UPDATE_SITES,
  UPDATE_PROFILE_NAME,
  GET_ACTIVE_PROFILE
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