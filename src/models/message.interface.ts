export enum Action {
  ON_TAB_UPDATE,
  UPDATE_PROFILE,
  GET_PROFILE_NAMES,
  ADD_PROFILE,
  GET_PROFILE,
  REMOVE_PROFILE,
  UPDATE_PROFILE_NAME,
  GET_ACTIVE_PROFILE,
  UPDATE_SCHEDULE_EVENTS,
  NOTIFY_SCHEDULE_TRIGGER
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