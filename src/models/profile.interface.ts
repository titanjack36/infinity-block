export enum BlockMode {
  ALLOW_SITES,
  BLOCK_SITES
}

export enum SchedEventType {
  ENABLE,
  DISABLE
}

export interface Profile {
  name: string;
  sites: Site[];
  options: Options;
}

export interface Site {
  url: string;
  useRegex: boolean;
  redirectUrl?: string;
}

export interface Options {
  isActive: boolean;
  blockMode: BlockMode;
  schedule: Schedule;
}

export interface Schedule {
  isEnabled: boolean;
  events: SchedEvent[];
}

export interface SchedEvent {
  profileName: string;
  eventType: SchedEventType;
  time?: Date;
  timeStr: string;
  executed: boolean;
}