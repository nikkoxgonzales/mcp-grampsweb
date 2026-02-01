/**
 * Entity creation tools
 */

import { z } from "zod";
import { grampsClient } from "../client.js";
import { API_ENDPOINTS } from "../constants.js";
import {
  createPersonSchema,
  createFamilySchema,
  createEventSchema,
  createPlaceSchema,
  createSourceSchema,
  createCitationSchema,
  createNoteSchema,
  createMediaSchema,
  createRepositorySchema,
} from "../schemas/entities.js";
import { formatCreatedEntity } from "../utils/response.js";
import { formatPersonName } from "../utils/formatting.js";
import type { GrampsEntity } from "../types.js";

// Gender string to number mapping
function mapGender(gender?: string): number | undefined {
  if (!gender) return undefined;
  switch (gender.toLowerCase()) {
    case "male":
      return 1;
    case "female":
      return 0;
    default:
      return 2;
  }
}

/**
 * Create a person
 */
export async function grampsCreatePerson(
  params: z.infer<typeof createPersonSchema>
): Promise<string> {
  const validated = createPersonSchema.parse(params);

  // Build the person object with proper class markers
  const person = {
    _class: "Person",
    gramps_id: validated.gramps_id,
    primary_name: validated.primary_name
      ? { _class: "Name", ...validated.primary_name }
      : undefined,
    alternate_names: validated.alternate_names?.map((n) => ({
      _class: "Name",
      ...n,
    })),
    gender: mapGender(validated.gender),
    event_ref_list: validated.event_ref_list?.map((e) => ({
      _class: "EventRef",
      ...e,
    })),
    family_list: validated.family_list,
    parent_family_list: validated.parent_family_list,
    media_list: validated.media_list?.map((m) => ({ _class: "MediaRef", ...m })),
    citation_list: validated.citation_list,
    note_list: validated.note_list,
    attribute_list: validated.attribute_list?.map((a) => ({
      _class: "Attribute",
      ...a,
    })),
    tag_list: validated.tag_list,
    private: validated.private,
  };

  const response = await grampsClient.post<GrampsEntity>(
    API_ENDPOINTS.PEOPLE,
    person
  );

  const genderMap: Record<number, string> = {
    0: "female",
    1: "male",
    2: "unknown",
  };

  const mappedGender = mapGender(validated.gender);
  const genderStr = mappedGender !== undefined ? genderMap[mappedGender] : "unknown";

  return formatCreatedEntity(
    "person",
    formatPersonName(validated.primary_name),
    {
      handle: response.handle,
      gramps_id: response.gramps_id,
      name: formatPersonName(validated.primary_name),
      gender: genderStr,
    },
    `Use handle "${response.handle}" to link this person to families or events with gramps_create_family.`
  );
}

/**
 * Create a family
 */
export async function grampsCreateFamily(
  params: z.infer<typeof createFamilySchema>
): Promise<string> {
  const validated = createFamilySchema.parse(params);

  const family = {
    _class: "Family",
    gramps_id: validated.gramps_id,
    father_handle: validated.father_handle,
    mother_handle: validated.mother_handle,
    child_ref_list: validated.child_ref_list?.map((c) => ({
      _class: "ChildRef",
      ...c,
    })),
    type: validated.type,
    event_ref_list: validated.event_ref_list?.map((e) => ({
      _class: "EventRef",
      ...e,
    })),
    media_list: validated.media_list?.map((m) => ({ _class: "MediaRef", ...m })),
    citation_list: validated.citation_list,
    note_list: validated.note_list,
    attribute_list: validated.attribute_list?.map((a) => ({
      _class: "Attribute",
      ...a,
    })),
    tag_list: validated.tag_list,
    private: validated.private,
  };

  const response = await grampsClient.post<GrampsEntity>(
    API_ENDPOINTS.FAMILIES,
    family
  );

  const members: string[] = [];
  if (validated.father_handle) members.push("father");
  if (validated.mother_handle) members.push("mother");
  if (validated.child_ref_list?.length) members.push(`${validated.child_ref_list.length} child(ren)`);

  return formatCreatedEntity(
    "family",
    response.gramps_id,
    {
      handle: response.handle,
      gramps_id: response.gramps_id,
      father_handle: validated.father_handle || null,
      mother_handle: validated.mother_handle || null,
      children_count: validated.child_ref_list?.length || 0,
      type: validated.type || "Unknown",
    },
    members.length > 0
      ? `Family links ${members.join(", ")}. Add marriage/events with gramps_create_event.`
      : "Add family members by updating with person handles."
  );
}

/**
 * Create an event
 */
export async function grampsCreateEvent(
  params: z.infer<typeof createEventSchema>
): Promise<string> {
  const validated = createEventSchema.parse(params);

  const event = {
    _class: "Event",
    gramps_id: validated.gramps_id,
    type: validated.type,
    date: validated.date ? { _class: "Date", ...validated.date } : undefined,
    place: validated.place,
    description: validated.description,
    media_list: validated.media_list?.map((m) => ({ _class: "MediaRef", ...m })),
    citation_list: validated.citation_list,
    note_list: validated.note_list,
    attribute_list: validated.attribute_list?.map((a) => ({
      _class: "Attribute",
      ...a,
    })),
    tag_list: validated.tag_list,
    private: validated.private,
  };

  const response = await grampsClient.post<GrampsEntity>(
    API_ENDPOINTS.EVENTS,
    event
  );

  return formatCreatedEntity(
    "event",
    `${validated.type} (${response.gramps_id})`,
    {
      handle: response.handle,
      gramps_id: response.gramps_id,
      type: validated.type,
      date: validated.date || null,
      place_handle: validated.place || null,
      description: validated.description || null,
    },
    `Link this event to a person or family using event_ref_list with handle "${response.handle}".`
  );
}

/**
 * Create a place
 */
export async function grampsCreatePlace(
  params: z.infer<typeof createPlaceSchema>
): Promise<string> {
  const validated = createPlaceSchema.parse(params);

  const place = {
    _class: "Place",
    gramps_id: validated.gramps_id,
    title: validated.title,
    name: validated.name
      ? { _class: "PlaceName", ...validated.name }
      : undefined,
    alt_names: validated.alt_names?.map((n) => ({ _class: "PlaceName", ...n })),
    lat: validated.lat,
    long: validated.long,
    placeref_list: validated.placeref_list?.map((p) => ({
      _class: "PlaceRef",
      ...p,
    })),
    place_type: validated.place_type,
    media_list: validated.media_list?.map((m) => ({ _class: "MediaRef", ...m })),
    citation_list: validated.citation_list,
    note_list: validated.note_list,
    tag_list: validated.tag_list,
    private: validated.private,
  };

  const response = await grampsClient.post<GrampsEntity>(
    API_ENDPOINTS.PLACES,
    place
  );

  const placeName = validated.name?.value || validated.title || response.gramps_id;

  return formatCreatedEntity(
    "place",
    placeName,
    {
      handle: response.handle,
      gramps_id: response.gramps_id,
      name: placeName,
      type: validated.place_type || null,
      coordinates: validated.lat && validated.long ? { lat: validated.lat, long: validated.long } : null,
    },
    `Use handle "${response.handle}" when creating events to link them to this place.`
  );
}

/**
 * Create a source
 */
export async function grampsCreateSource(
  params: z.infer<typeof createSourceSchema>
): Promise<string> {
  const validated = createSourceSchema.parse(params);

  const source = {
    _class: "Source",
    gramps_id: validated.gramps_id,
    title: validated.title,
    author: validated.author,
    pubinfo: validated.pubinfo,
    abbrev: validated.abbrev,
    reporef_list: validated.reporef_list?.map((r) => ({
      _class: "RepoRef",
      ...r,
    })),
    media_list: validated.media_list?.map((m) => ({ _class: "MediaRef", ...m })),
    note_list: validated.note_list,
    tag_list: validated.tag_list,
    private: validated.private,
  };

  const response = await grampsClient.post<GrampsEntity>(
    API_ENDPOINTS.SOURCES,
    source
  );

  return formatCreatedEntity(
    "source",
    validated.title,
    {
      handle: response.handle,
      gramps_id: response.gramps_id,
      title: validated.title,
      author: validated.author || null,
      publication: validated.pubinfo || null,
    },
    `Create citations referencing this source with gramps_create_citation using source_handle "${response.handle}".`
  );
}

/**
 * Create a citation
 */
export async function grampsCreateCitation(
  params: z.infer<typeof createCitationSchema>
): Promise<string> {
  const validated = createCitationSchema.parse(params);

  const citation = {
    _class: "Citation",
    gramps_id: validated.gramps_id,
    source_handle: validated.source_handle,
    page: validated.page,
    confidence: validated.confidence,
    date: validated.date ? { _class: "Date", ...validated.date } : undefined,
    media_list: validated.media_list?.map((m) => ({ _class: "MediaRef", ...m })),
    note_list: validated.note_list,
    tag_list: validated.tag_list,
    private: validated.private,
  };

  const response = await grampsClient.post<GrampsEntity>(
    API_ENDPOINTS.CITATIONS,
    citation
  );

  const confidenceMap: Record<number, string> = {
    0: "Very Low",
    1: "Low",
    2: "Normal",
    3: "High",
    4: "Very High",
  };

  return formatCreatedEntity(
    "citation",
    response.gramps_id,
    {
      handle: response.handle,
      gramps_id: response.gramps_id,
      source_handle: validated.source_handle,
      page: validated.page || null,
      confidence: validated.confidence !== undefined ? confidenceMap[validated.confidence] || "Normal" : "Normal",
    },
    `Add this citation to entities using citation_list with handle "${response.handle}".`
  );
}

/**
 * Create a note
 */
export async function grampsCreateNote(
  params: z.infer<typeof createNoteSchema>
): Promise<string> {
  const validated = createNoteSchema.parse(params);

  const note = {
    _class: "Note",
    gramps_id: validated.gramps_id,
    text: validated.text,
    format: validated.format,
    type: validated.type,
    tag_list: validated.tag_list,
    private: validated.private,
  };

  const response = await grampsClient.post<GrampsEntity>(
    API_ENDPOINTS.NOTES,
    note
  );

  const preview = validated.text.length > 50 ? validated.text.substring(0, 50) + "..." : validated.text;

  return formatCreatedEntity(
    "note",
    response.gramps_id,
    {
      handle: response.handle,
      gramps_id: response.gramps_id,
      type: validated.type || "General",
      preview,
    },
    `Attach this note to entities using note_list with handle "${response.handle}".`
  );
}

/**
 * Create a media object
 */
export async function grampsCreateMedia(
  params: z.infer<typeof createMediaSchema>
): Promise<string> {
  const validated = createMediaSchema.parse(params);

  const media = {
    _class: "Media",
    gramps_id: validated.gramps_id,
    path: validated.path,
    mime: validated.mime,
    desc: validated.desc,
    date: validated.date ? { _class: "Date", ...validated.date } : undefined,
    citation_list: validated.citation_list,
    note_list: validated.note_list,
    attribute_list: validated.attribute_list?.map((a) => ({
      _class: "Attribute",
      ...a,
    })),
    tag_list: validated.tag_list,
    private: validated.private,
  };

  const response = await grampsClient.post<GrampsEntity>(
    API_ENDPOINTS.MEDIA,
    media
  );

  const displayName = validated.desc || validated.path;

  return formatCreatedEntity(
    "media",
    displayName,
    {
      handle: response.handle,
      gramps_id: response.gramps_id,
      path: validated.path,
      mime_type: validated.mime || null,
      description: validated.desc || null,
    },
    `Link this media to entities using media_list with handle "${response.handle}".`
  );
}

/**
 * Create a repository
 */
export async function grampsCreateRepository(
  params: z.infer<typeof createRepositorySchema>
): Promise<string> {
  const validated = createRepositorySchema.parse(params);

  const repository = {
    _class: "Repository",
    gramps_id: validated.gramps_id,
    name: validated.name,
    type: validated.type,
    address_list: validated.address_list?.map((a) => ({
      _class: "Address",
      ...a,
    })),
    urls: validated.urls?.map((u) => ({ _class: "Url", ...u })),
    note_list: validated.note_list,
    tag_list: validated.tag_list,
    private: validated.private,
  };

  const response = await grampsClient.post<GrampsEntity>(
    API_ENDPOINTS.REPOSITORIES,
    repository
  );

  return formatCreatedEntity(
    "repository",
    validated.name,
    {
      handle: response.handle,
      gramps_id: response.gramps_id,
      name: validated.name,
      type: validated.type || null,
    },
    `Link sources to this repository using reporef_list with handle "${response.handle}".`
  );
}

// Tool definitions for MCP
export const createTools = {
  gramps_create_person: {
    name: "gramps_create_person",
    description:
      "Create a new person record. " +
      "REQUIRED: primary_name with first_name or surname. " +
      "RETURNS: handle (for linking) and gramps_id (display ID). " +
      "NEXT STEP: Use handle with gramps_create_family to add relationships.",
    inputSchema: {
      type: "object" as const,
      properties: {
        gramps_id: {
          type: "string",
          description: "Gramps ID (auto-generated if not provided)",
        },
        primary_name: {
          type: "object",
          description: "Primary name",
          properties: {
            first_name: { type: "string" },
            surname: { type: "string" },
            suffix: { type: "string" },
            title: { type: "string" },
          },
        },
        gender: {
          type: "string",
          enum: ["male", "female", "unknown"],
          description: "Gender",
        },
        private: {
          type: "boolean",
          description: "Mark as private",
        },
      },
      required: ["primary_name"],
    },
    handler: grampsCreatePerson,
  },

  gramps_create_family: {
    name: "gramps_create_family",
    description:
      "Create a family linking parents and children. " +
      "USE FOR: Connecting existing people into family relationships. " +
      "REQUIRED: At least one of father_handle, mother_handle, or child_ref_list. " +
      "NEXT STEP: Add marriage event with gramps_create_event.",
    inputSchema: {
      type: "object" as const,
      properties: {
        gramps_id: {
          type: "string",
          description: "Gramps ID (auto-generated if not provided)",
        },
        father_handle: {
          type: "string",
          description: "Father's person handle",
        },
        mother_handle: {
          type: "string",
          description: "Mother's person handle",
        },
        child_ref_list: {
          type: "array",
          items: {
            type: "object",
            properties: {
              ref: { type: "string", description: "Child's person handle" },
              frel: { type: "string", description: "Father relationship type" },
              mrel: { type: "string", description: "Mother relationship type" },
            },
            required: ["ref"],
          },
          description: "List of child references",
        },
        type: {
          type: "string",
          description: "Relationship type (e.g., 'Married', 'Unknown')",
        },
      },
      required: [],
    },
    handler: grampsCreateFamily,
  },

  gramps_create_event: {
    name: "gramps_create_event",
    description:
      "Create a life event (Birth, Death, Marriage, Burial, Baptism, etc.). " +
      "REQUIRED: type (event type string). " +
      "OPTIONAL: date, place handle, description. " +
      "NEXT STEP: Link to person/family via their event_ref_list.",
    inputSchema: {
      type: "object" as const,
      properties: {
        gramps_id: {
          type: "string",
          description: "Gramps ID (auto-generated if not provided)",
        },
        type: {
          type: "string",
          description: "Event type (e.g., 'Birth', 'Death', 'Marriage', 'Burial')",
        },
        date: {
          type: "object",
          description: "Event date",
          properties: {
            dateval: {
              type: "array",
              items: { type: "number" },
              description: "Date as [day, month, year]",
            },
            text: { type: "string", description: "Date as text" },
          },
        },
        place: {
          type: "string",
          description: "Place handle",
        },
        description: {
          type: "string",
          description: "Event description",
        },
      },
      required: ["type"],
    },
    handler: grampsCreateEvent,
  },

  gramps_create_place: {
    name: "gramps_create_place",
    description:
      "Create a location (city, country, address, cemetery, etc.). " +
      "OPTIONAL: title, name, coordinates (lat/long), place_type. " +
      "USE FOR: Linking to events via place handle. " +
      "RETURNS: handle to use when creating events.",
    inputSchema: {
      type: "object" as const,
      properties: {
        gramps_id: {
          type: "string",
          description: "Gramps ID (auto-generated if not provided)",
        },
        title: {
          type: "string",
          description: "Place title",
        },
        name: {
          type: "object",
          properties: {
            value: { type: "string", description: "Place name" },
          },
          description: "Primary place name",
        },
        lat: {
          type: "string",
          description: "Latitude",
        },
        long: {
          type: "string",
          description: "Longitude",
        },
        place_type: {
          type: "string",
          description: "Place type (e.g., 'City', 'Country', 'State')",
        },
      },
      required: [],
    },
    handler: grampsCreatePlace,
  },

  gramps_create_source: {
    name: "gramps_create_source",
    description:
      "Create a source documenting where information comes from (books, websites, records). " +
      "REQUIRED: title. " +
      "OPTIONAL: author, pubinfo, abbrev. " +
      "NEXT STEP: Create citations referencing this source.",
    inputSchema: {
      type: "object" as const,
      properties: {
        gramps_id: {
          type: "string",
          description: "Gramps ID (auto-generated if not provided)",
        },
        title: {
          type: "string",
          description: "Source title",
        },
        author: {
          type: "string",
          description: "Author",
        },
        pubinfo: {
          type: "string",
          description: "Publication information",
        },
        abbrev: {
          type: "string",
          description: "Abbreviation",
        },
      },
      required: ["title"],
    },
    handler: grampsCreateSource,
  },

  gramps_create_citation: {
    name: "gramps_create_citation",
    description:
      "Create a citation pointing to a specific location within a source. " +
      "REQUIRED: source_handle (from gramps_create_source). " +
      "OPTIONAL: page, confidence level. " +
      "USE FOR: Attaching proof to facts via entity citation_list.",
    inputSchema: {
      type: "object" as const,
      properties: {
        gramps_id: {
          type: "string",
          description: "Gramps ID (auto-generated if not provided)",
        },
        source_handle: {
          type: "string",
          description: "Source handle",
        },
        page: {
          type: "string",
          description: "Page or location within source",
        },
        confidence: {
          type: "number",
          description: "Confidence level (0=Very Low to 4=Very High)",
        },
      },
      required: ["source_handle"],
    },
    handler: grampsCreateCitation,
  },

  gramps_create_note: {
    name: "gramps_create_note",
    description:
      "Create a text note that can be attached to any entity. " +
      "REQUIRED: text content. " +
      "OPTIONAL: type (General, Research, Transcript), format. " +
      "USE FOR: Adding research notes, transcripts, or comments to records.",
    inputSchema: {
      type: "object" as const,
      properties: {
        gramps_id: {
          type: "string",
          description: "Gramps ID (auto-generated if not provided)",
        },
        text: {
          type: "string",
          description: "Note text content",
        },
        type: {
          type: "string",
          description: "Note type (e.g., 'General', 'Research', 'Transcript')",
        },
        format: {
          type: "number",
          description: "Format (0=flowed, 1=preformatted)",
        },
      },
      required: ["text"],
    },
    handler: grampsCreateNote,
  },

  gramps_create_media: {
    name: "gramps_create_media",
    description:
      "Create a media object reference (photo, document, audio, video). " +
      "REQUIRED: path (file path or URL). " +
      "OPTIONAL: mime type, description. " +
      "USE FOR: Attaching images/documents to people, events, etc.",
    inputSchema: {
      type: "object" as const,
      properties: {
        gramps_id: {
          type: "string",
          description: "Gramps ID (auto-generated if not provided)",
        },
        path: {
          type: "string",
          description: "File path or URL",
        },
        mime: {
          type: "string",
          description: "MIME type",
        },
        desc: {
          type: "string",
          description: "Description",
        },
      },
      required: ["path"],
    },
    handler: grampsCreateMedia,
  },

  gramps_create_repository: {
    name: "gramps_create_repository",
    description:
      "Create a repository where sources are stored (library, archive, website). " +
      "REQUIRED: name. " +
      "OPTIONAL: type (Library, Archive, Website). " +
      "USE FOR: Organizing sources by their holding institution.",
    inputSchema: {
      type: "object" as const,
      properties: {
        gramps_id: {
          type: "string",
          description: "Gramps ID (auto-generated if not provided)",
        },
        name: {
          type: "string",
          description: "Repository name",
        },
        type: {
          type: "string",
          description: "Repository type (e.g., 'Library', 'Archive', 'Website')",
        },
      },
      required: ["name"],
    },
    handler: grampsCreateRepository,
  },
};
