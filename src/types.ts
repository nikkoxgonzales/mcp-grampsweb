/**
 * Gramps Web API TypeScript interfaces
 */

// Entity types supported by Gramps
export type EntityType =
  | "people"
  | "families"
  | "events"
  | "places"
  | "sources"
  | "citations"
  | "repositories"
  | "media"
  | "notes";

// Token response from auth endpoint
export interface TokenResponse {
  access_token: string;
  token_type: string;
}

// Decoded JWT payload
export interface JWTPayload {
  exp: number;
  sub?: string;
  [key: string]: unknown;
}

// Base entity with common fields
export interface GrampsEntity {
  handle: string;
  gramps_id: string;
  change?: number;
  private?: boolean;
  _class?: string;
}

// Surname structure for surname_list
export interface Surname {
  surname?: string;
  prefix?: string;
  primary?: boolean;
  origintype?: string;
  connector?: string;
  _class?: string;
}

// Name structure for persons
export interface PersonName {
  first_name?: string;
  nickname?: string;
  call_name?: string; // API field name for nickname
  surname?: string;
  surname_list?: Surname[];
  suffix?: string;
  title?: string;
  type?: string;
  primary?: boolean;
  _class?: string;
}

// Person entity
export interface Person extends GrampsEntity {
  primary_name?: PersonName;
  alternate_names?: PersonName[];
  gender?: number;
  birth_ref_index?: number;
  death_ref_index?: number;
  event_ref_list?: EventRef[];
  family_list?: string[];
  parent_family_list?: string[];
  media_list?: MediaRef[];
  citation_list?: string[];
  note_list?: string[];
  attribute_list?: Attribute[];
  tag_list?: string[];
}

// Family entity
export interface Family extends GrampsEntity {
  father_handle?: string;
  mother_handle?: string;
  child_ref_list?: ChildRef[];
  type?: string;
  event_ref_list?: EventRef[];
  media_list?: MediaRef[];
  citation_list?: string[];
  note_list?: string[];
  attribute_list?: Attribute[];
  tag_list?: string[];
}

// Event entity
export interface Event extends GrampsEntity {
  type?: string;
  date?: DateObject;
  place?: string;
  description?: string;
  media_list?: MediaRef[];
  citation_list?: string[];
  note_list?: string[];
  attribute_list?: Attribute[];
  tag_list?: string[];
}

// Place entity
export interface Place extends GrampsEntity {
  title?: string;
  name?: PlaceName;
  alt_names?: PlaceName[];
  lat?: string;
  long?: string;
  placeref_list?: PlaceRef[];
  place_type?: string;
  media_list?: MediaRef[];
  citation_list?: string[];
  note_list?: string[];
  tag_list?: string[];
}

// Source entity
export interface Source extends GrampsEntity {
  title?: string;
  author?: string;
  pubinfo?: string;
  abbrev?: string;
  reporef_list?: RepoRef[];
  media_list?: MediaRef[];
  note_list?: string[];
  tag_list?: string[];
}

// Citation entity
export interface Citation extends GrampsEntity {
  source_handle?: string;
  page?: string;
  confidence?: number;
  date?: DateObject;
  media_list?: MediaRef[];
  note_list?: string[];
  tag_list?: string[];
}

// Repository entity
export interface Repository extends GrampsEntity {
  name?: string;
  type?: string;
  address_list?: Address[];
  urls?: Url[];
  note_list?: string[];
  tag_list?: string[];
}

// Media entity
export interface Media extends GrampsEntity {
  path?: string;
  mime?: string;
  desc?: string;
  checksum?: string;
  date?: DateObject;
  citation_list?: string[];
  note_list?: string[];
  attribute_list?: Attribute[];
  tag_list?: string[];
}

// Note entity
export interface Note extends GrampsEntity {
  text?: string;
  format?: number;
  type?: string;
  tag_list?: string[];
}

// Supporting types
export interface DateObject {
  _class?: string;
  calendar?: number;
  modifier?: number;
  quality?: number;
  dateval?: number[];
  text?: string;
  sortval?: number;
  newyear?: number;
}

export interface EventRef {
  ref?: string;
  role?: string;
  _class?: string;
}

export interface ChildRef {
  ref?: string;
  frel?: string;
  mrel?: string;
  _class?: string;
}

export interface MediaRef {
  ref?: string;
  rect?: number[];
  _class?: string;
}

export interface PlaceName {
  value?: string;
  date?: DateObject;
  lang?: string;
  _class?: string;
}

export interface PlaceRef {
  ref?: string;
  date?: DateObject;
  _class?: string;
}

export interface RepoRef {
  ref?: string;
  call_number?: string;
  media_type?: string;
  _class?: string;
}

export interface Attribute {
  type?: string;
  value?: string;
  _class?: string;
}

export interface Address {
  street?: string;
  locality?: string;
  city?: string;
  county?: string;
  state?: string;
  country?: string;
  postal?: string;
  phone?: string;
  _class?: string;
}

export interface Url {
  path?: string;
  type?: string;
  desc?: string;
  _class?: string;
}

// Search result
export interface SearchResult {
  handle: string;
  gramps_id: string;
  object_type: string;
  object: GrampsEntity;
}

// Tree statistics
export interface TreeStats {
  people: number;
  families: number;
  events: number;
  places: number;
  sources: number;
  citations: number;
  repositories: number;
  media: number;
  notes: number;
}

// Tag entity
export interface Tag extends GrampsEntity {
  name?: string;
  color?: string;
  priority?: number;
}

// API error response
export interface APIErrorResponse {
  detail?: string;
  message?: string;
}
