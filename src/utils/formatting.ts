/**
 * Response formatting utilities
 */

import type {
  Person,
  Family,
  Event,
  Place,
  Source,
  Citation,
  Note,
  Media,
  Repository,
  PersonName,
  DateObject,
  GrampsEntity,
} from "../types.js";

/**
 * Format a person name for display
 */
export function formatPersonName(name?: PersonName): string {
  if (!name) return "Unknown";

  const parts: string[] = [];

  if (name.title) parts.push(name.title);

  // Use call_name (nickname) if available, otherwise first_name
  if (name.call_name) {
    parts.push(name.call_name);
  } else if (name.first_name) {
    parts.push(name.first_name);
  }

  // Handle surname - prefer surname_list if available
  if (name.surname_list && name.surname_list.length > 0) {
    // Get primary surname or first surname
    const primarySurname = name.surname_list.find((s) => s.primary) || name.surname_list[0];
    if (primarySurname) {
      const surnameParts: string[] = [];
      if (primarySurname.prefix) surnameParts.push(primarySurname.prefix);
      if (primarySurname.surname) surnameParts.push(primarySurname.surname);
      if (surnameParts.length > 0) {
        parts.push(surnameParts.join(" "));
      }
    }
  } else if (name.surname) {
    parts.push(name.surname);
  }

  if (name.suffix) parts.push(name.suffix);

  return parts.length > 0 ? parts.join(" ") : "Unknown";
}

/**
 * Format a date object for display
 */
export function formatDate(date?: DateObject): string {
  if (!date) return "";

  if (date.text) return date.text;

  if (date.dateval && date.dateval.length >= 3) {
    const [day, month, year] = date.dateval;
    const parts: string[] = [];

    if (year) parts.push(String(year));
    if (month) parts.unshift(String(month).padStart(2, "0"));
    if (day) parts.unshift(String(day).padStart(2, "0"));

    return parts.join("-");
  }

  return "";
}

/**
 * Format a person entity for display
 */
export function formatPerson(person: Person): string {
  const lines: string[] = [];

  lines.push(`Person: ${formatPersonName(person.primary_name)}`);
  lines.push(`  Handle: ${person.handle}`);
  lines.push(`  Gramps ID: ${person.gramps_id}`);

  if (person.gender !== undefined) {
    const genderMap: Record<number, string> = {
      0: "Female",
      1: "Male",
      2: "Unknown",
    };
    lines.push(`  Gender: ${genderMap[person.gender] || "Unknown"}`);
  }

  if (person.alternate_names && person.alternate_names.length > 0) {
    lines.push(
      `  Alternate names: ${person.alternate_names.map(formatPersonName).join(", ")}`
    );
  }

  return lines.join("\n");
}

/**
 * Format a family entity for display
 */
export function formatFamily(family: Family): string {
  const lines: string[] = [];

  lines.push(`Family: ${family.gramps_id}`);
  lines.push(`  Handle: ${family.handle}`);

  if (family.father_handle) {
    lines.push(`  Father handle: ${family.father_handle}`);
  }
  if (family.mother_handle) {
    lines.push(`  Mother handle: ${family.mother_handle}`);
  }
  if (family.child_ref_list && family.child_ref_list.length > 0) {
    lines.push(`  Children: ${family.child_ref_list.length}`);
  }
  if (family.type) {
    lines.push(`  Type: ${family.type}`);
  }

  return lines.join("\n");
}

/**
 * Format an event entity for display
 */
export function formatEvent(event: Event): string {
  const lines: string[] = [];

  lines.push(`Event: ${event.type || "Unknown type"}`);
  lines.push(`  Handle: ${event.handle}`);
  lines.push(`  Gramps ID: ${event.gramps_id}`);

  const dateStr = formatDate(event.date);
  if (dateStr) {
    lines.push(`  Date: ${dateStr}`);
  }

  if (event.place) {
    lines.push(`  Place handle: ${event.place}`);
  }

  if (event.description) {
    lines.push(`  Description: ${event.description}`);
  }

  return lines.join("\n");
}

/**
 * Format a place entity for display
 */
export function formatPlace(place: Place): string {
  const lines: string[] = [];

  const name = place.name?.value || place.title || "Unknown";
  lines.push(`Place: ${name}`);
  lines.push(`  Handle: ${place.handle}`);
  lines.push(`  Gramps ID: ${place.gramps_id}`);

  if (place.place_type) {
    lines.push(`  Type: ${place.place_type}`);
  }

  if (place.lat && place.long) {
    lines.push(`  Coordinates: ${place.lat}, ${place.long}`);
  }

  return lines.join("\n");
}

/**
 * Format a source entity for display
 */
export function formatSource(source: Source): string {
  const lines: string[] = [];

  lines.push(`Source: ${source.title || "Untitled"}`);
  lines.push(`  Handle: ${source.handle}`);
  lines.push(`  Gramps ID: ${source.gramps_id}`);

  if (source.author) {
    lines.push(`  Author: ${source.author}`);
  }

  if (source.pubinfo) {
    lines.push(`  Publication: ${source.pubinfo}`);
  }

  return lines.join("\n");
}

/**
 * Format a citation entity for display
 */
export function formatCitation(citation: Citation): string {
  const lines: string[] = [];

  lines.push(`Citation: ${citation.gramps_id}`);
  lines.push(`  Handle: ${citation.handle}`);

  if (citation.source_handle) {
    lines.push(`  Source handle: ${citation.source_handle}`);
  }

  if (citation.page) {
    lines.push(`  Page: ${citation.page}`);
  }

  if (citation.confidence !== undefined) {
    const confidenceMap: Record<number, string> = {
      0: "Very Low",
      1: "Low",
      2: "Normal",
      3: "High",
      4: "Very High",
    };
    lines.push(
      `  Confidence: ${confidenceMap[citation.confidence] || "Unknown"}`
    );
  }

  return lines.join("\n");
}

/**
 * Format a note entity for display
 */
export function formatNote(note: Note): string {
  const lines: string[] = [];

  lines.push(`Note: ${note.gramps_id}`);
  lines.push(`  Handle: ${note.handle}`);

  if (note.type) {
    lines.push(`  Type: ${note.type}`);
  }

  if (note.text) {
    const preview =
      note.text.length > 100 ? note.text.substring(0, 100) + "..." : note.text;
    lines.push(`  Text: ${preview}`);
  }

  return lines.join("\n");
}

/**
 * Format a media entity for display
 */
export function formatMedia(media: Media): string {
  const lines: string[] = [];

  lines.push(`Media: ${media.desc || media.path || "Untitled"}`);
  lines.push(`  Handle: ${media.handle}`);
  lines.push(`  Gramps ID: ${media.gramps_id}`);

  if (media.mime) {
    lines.push(`  Type: ${media.mime}`);
  }

  if (media.path) {
    lines.push(`  Path: ${media.path}`);
  }

  return lines.join("\n");
}

/**
 * Format a repository entity for display
 */
export function formatRepository(repo: Repository): string {
  const lines: string[] = [];

  lines.push(`Repository: ${repo.name || "Unnamed"}`);
  lines.push(`  Handle: ${repo.handle}`);
  lines.push(`  Gramps ID: ${repo.gramps_id}`);

  if (repo.type) {
    lines.push(`  Type: ${repo.type}`);
  }

  return lines.join("\n");
}

/**
 * Format any entity based on its type
 */
export function formatEntity(entity: GrampsEntity, type: string): string {
  switch (type.toLowerCase()) {
    case "person":
    case "people":
      return formatPerson(entity as Person);
    case "family":
    case "families":
      return formatFamily(entity as Family);
    case "event":
    case "events":
      return formatEvent(entity as Event);
    case "place":
    case "places":
      return formatPlace(entity as Place);
    case "source":
    case "sources":
      return formatSource(entity as Source);
    case "citation":
    case "citations":
      return formatCitation(entity as Citation);
    case "note":
    case "notes":
      return formatNote(entity as Note);
    case "media":
      return formatMedia(entity as Media);
    case "repository":
    case "repositories":
      return formatRepository(entity as Repository);
    default:
      return JSON.stringify(entity, null, 2);
  }
}

/**
 * Format search results for display
 */
export function formatSearchResults(
  results: Array<{ object_type: string; object: GrampsEntity }>
): string {
  if (results.length === 0) {
    return "No results found.";
  }

  const lines: string[] = [`Found ${results.length} result(s):`, ""];

  for (const result of results) {
    lines.push(formatEntity(result.object, result.object_type));
    lines.push("");
  }

  return lines.join("\n");
}
