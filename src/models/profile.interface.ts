export enum BlockMode {
  ALLOW_SITES,
  BLOCK_SITES
}

export interface Profile {
  name: string;
  sites: Site[];
  options: Options;
}

export interface Site {
  url: string;
  redirectUrl?: string;
}

export interface Options {
  isActive: boolean;
  blockMode: BlockMode;
}