export type SupportType = 'OFFICIAL' | 'COMMUNITY' | 'UNOFFICIAL' | 'UNKNOWN';
export type Verification = 'VERIFIED' | 'COMMUNITY_REPORTED' | 'OUTDATED' | 'UNVERIFIED';

export interface Device {
  _id: string;
  brand: string;
  brandSlug: string;
  name: string;
  slug: string;
  codename: string;
  modelNumbers: string[];
  aliases: string[];
  image?: string;
  releaseDate?: string;
  chipset?: string;
  architecture?: string;
  bootloaderInformation?: string;
  currentAndroidVersion?: string;
  supported: boolean;
  description?: string;
  officialSource?: string;
}

export interface Rom {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  website?: string;
  repository?: string;
  documentation?: string;
  officialStatus: 'OFFICIAL' | 'COMMUNITY' | 'UNKNOWN';
  status: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED' | 'UNKNOWN';
  supportedAndroidVersions: string[];
  maintainer?: string;
  organization?: string;
  telegramUrl?: string;
  discordUrl?: string;
  statusNote?: string;
  logo?: string;
}

interface SupportBase {
  _id: string;
  supportType: SupportType;
  lifecycle?: 'ACTIVE' | 'DISCONTINUED' | 'UNKNOWN';
  androidVersion: string;
  buildType?: string;
  sourceUrl: string;
  downloadUrl?: string;
  documentationUrl?: string;
  maintainer?: string;
  lastBuildDate?: string;
  lastVerifiedAt?: string;
  verificationStatus: Verification;
  notes?: string;
  knownIssues: string[];
}
export interface SupportWithRom extends SupportBase {
  romId: Rom;
}
export interface SupportWithDevice extends SupportBase {
  deviceId: Device;
}

export interface Recovery {
  _id: string;
  name: string;
  version?: string;
  supportType: SupportType;
  sourceUrl: string;
  downloadUrl?: string;
  lastVerifiedAt?: string;
  notes?: string;
}
export interface Kernel {
  _id: string;
  name: string;
  version?: string;
  androidVersion?: string;
  sourceRepository: string;
  downloadUrl?: string;
  maintainer?: string;
  lastUpdated?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'UNKNOWN';
}
export interface Guide {
  _id: string;
  title: string;
  slug: string;
  category: string;
  difficulty?: string;
  estimatedTime?: string;
  sourceUrl: string;
  lastReviewedAt?: string;
}
export interface UpdateEvent {
  _id: string;
  updateType: string;
  previousValue?: string;
  newValue?: string;
  detectedAt: string;
  sourceUrl: string;
  deviceId?: Pick<Device, '_id' | 'name' | 'brandSlug' | 'slug' | 'codename'> | null;
  romId?: Pick<Rom, '_id' | 'name' | 'slug'> | null;
  sourceId?: { name: string; url: string } | null;
}

export interface SearchResults {
  devices: Pick<Device, '_id' | 'name' | 'brand' | 'brandSlug' | 'slug' | 'codename'>[];
  roms: Pick<Rom, '_id' | 'name' | 'slug'>[];
}
export interface PublicStats {
  devices: number;
  roms: number;
  guides: number;
  sources: number;
}
