/**
 * API endpoint definitions for Gramps Web
 */

export const API_ENDPOINTS = {
  // Authentication
  TOKEN: "/token/",

  // Entity endpoints (append handle for specific entity)
  PEOPLE: "/people/",
  FAMILIES: "/families/",
  EVENTS: "/events/",
  PLACES: "/places/",
  SOURCES: "/sources/",
  CITATIONS: "/citations/",
  REPOSITORIES: "/repositories/",
  MEDIA: "/media/",
  NOTES: "/notes/",

  // Search
  SEARCH: "/search/",

  // Metadata
  METADATA: "/metadata/",

  // Trees (for multi-tree setups)
  TREES: "/trees/",

  // Recent changes
  RECENT: "/recent/",
} as const;

export type APIEndpoint = (typeof API_ENDPOINTS)[keyof typeof API_ENDPOINTS];

// Map entity type to endpoint
export const ENTITY_ENDPOINT_MAP: Record<string, string> = {
  people: API_ENDPOINTS.PEOPLE,
  person: API_ENDPOINTS.PEOPLE,
  families: API_ENDPOINTS.FAMILIES,
  family: API_ENDPOINTS.FAMILIES,
  events: API_ENDPOINTS.EVENTS,
  event: API_ENDPOINTS.EVENTS,
  places: API_ENDPOINTS.PLACES,
  place: API_ENDPOINTS.PLACES,
  sources: API_ENDPOINTS.SOURCES,
  source: API_ENDPOINTS.SOURCES,
  citations: API_ENDPOINTS.CITATIONS,
  citation: API_ENDPOINTS.CITATIONS,
  repositories: API_ENDPOINTS.REPOSITORIES,
  repository: API_ENDPOINTS.REPOSITORIES,
  media: API_ENDPOINTS.MEDIA,
  notes: API_ENDPOINTS.NOTES,
  note: API_ENDPOINTS.NOTES,
};

// Token expiration buffer (30 seconds before actual expiry)
export const TOKEN_EXPIRY_BUFFER_MS = 30 * 1000;

// Default request timeout
export const DEFAULT_TIMEOUT_MS = 30 * 1000;
