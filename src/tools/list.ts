/**
 * List and batch retrieval tools
 */

import { z } from "zod";
import { grampsClient } from "../client.js";
import { ENTITY_ENDPOINT_MAP } from "../constants.js";
import { formatEntityList, formatToolResponse } from "../utils/response.js";
import { formatPersonName } from "../utils/formatting.js";
import type { GrampsEntity, Person, Family, Event, Place, Source } from "../types.js";

// Schema for list operation
const listSchema = z.object({
  entity_type: z.enum([
    "people",
    "families",
    "events",
    "places",
    "sources",
    "citations",
    "repositories",
    "media",
    "notes",
  ]).describe("Type of entity to list"),
  page: z.number().int().positive().default(1).describe("Page number (1-indexed)"),
  pagesize: z.number().int().positive().max(100).default(20).describe("Results per page (max 100)"),
});

// Schema for batch retrieval
const batchSchema = z.object({
  entity_type: z.enum([
    "people",
    "families",
    "events",
    "places",
    "sources",
    "citations",
    "repositories",
    "media",
    "notes",
  ]).describe("Type of entities to retrieve"),
  handles: z.array(z.string()).min(1).max(50).describe("List of entity handles (max 50)"),
});

/**
 * Extract summary information from an entity based on its type
 */
function extractEntitySummary(entity: GrampsEntity, entityType: string): Record<string, unknown> {
  const base = {
    handle: entity.handle,
    gramps_id: entity.gramps_id,
  };

  switch (entityType) {
    case "people": {
      const person = entity as Person;
      return {
        ...base,
        name: formatPersonName(person.primary_name),
        gender: person.gender === 1 ? "male" : person.gender === 0 ? "female" : "unknown",
      };
    }
    case "families": {
      const family = entity as Family;
      return {
        ...base,
        father_handle: family.father_handle || null,
        mother_handle: family.mother_handle || null,
        children_count: family.child_ref_list?.length || 0,
        type: family.type || "Unknown",
      };
    }
    case "events": {
      const event = entity as Event;
      return {
        ...base,
        type: event.type || "Unknown",
        date: event.date?.text || (event.date?.dateval ? event.date.dateval.join("-") : null),
        place_handle: event.place || null,
      };
    }
    case "places": {
      const place = entity as Place;
      return {
        ...base,
        name: place.name?.value || place.title || "Unknown",
        type: place.place_type || null,
      };
    }
    case "sources": {
      const source = entity as Source;
      return {
        ...base,
        title: source.title || "Untitled",
        author: source.author || null,
      };
    }
    default:
      return base;
  }
}

/**
 * List all entities of a given type with pagination
 */
export async function grampsList(params: z.infer<typeof listSchema>): Promise<string> {
  const { entity_type, page, pagesize } = listSchema.parse(params);

  const endpoint = ENTITY_ENDPOINT_MAP[entity_type];
  if (!endpoint) {
    throw new Error(`Unknown entity type: ${entity_type}`);
  }

  const response = await grampsClient.get<GrampsEntity[]>(endpoint, {
    page,
    pagesize,
  });

  if (!response || (Array.isArray(response) && response.length === 0)) {
    return formatToolResponse({
      status: "empty",
      summary: `No ${entity_type} found in the database`,
      details: `Use gramps_create_${entity_type.replace(/s$/, "")} to add new records.`,
    });
  }

  const entities = Array.isArray(response) ? response : [response];
  const formattedEntities = entities.map((entity) => extractEntitySummary(entity, entity_type));

  return formatEntityList(entity_type, formattedEntities);
}

/**
 * Get multiple entities by handles in a single call
 */
export async function grampsGetBatch(params: z.infer<typeof batchSchema>): Promise<string> {
  const { entity_type, handles } = batchSchema.parse(params);

  const endpoint = ENTITY_ENDPOINT_MAP[entity_type];
  if (!endpoint) {
    throw new Error(`Unknown entity type: ${entity_type}`);
  }

  // Fetch all entities in parallel
  const fetchPromises = handles.map(async (handle) => {
    try {
      const entity = await grampsClient.get<GrampsEntity>(`${endpoint}${handle}`);
      return { handle, success: true, entity };
    } catch (error) {
      return { handle, success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  const results = await Promise.all(fetchPromises);

  const successful = results.filter((r) => r.success && r.entity) as Array<{
    handle: string;
    success: true;
    entity: GrampsEntity;
  }>;
  const failed = results.filter((r) => !r.success) as Array<{
    handle: string;
    success: false;
    error: string;
  }>;

  if (successful.length === 0) {
    return formatToolResponse({
      status: "empty",
      summary: `None of the ${handles.length} requested ${entity_type} were found`,
      data: { failed: failed.map((f) => ({ handle: f.handle, error: f.error })) },
      details: "Verify handles using gramps_find or gramps_list first.",
    });
  }

  const data: Record<string, unknown> = {
    count: successful.length,
    results: successful.map((r) => r.entity),
  };

  if (failed.length > 0) {
    data.failed = failed.map((f) => ({ handle: f.handle, error: f.error }));
  }

  return formatToolResponse({
    status: "success",
    summary: `Retrieved ${successful.length} of ${handles.length} ${entity_type}`,
    data,
    details: failed.length > 0
      ? `${failed.length} handle(s) could not be found. See failed array for details.`
      : undefined,
  });
}

// Tool definitions for MCP
export const listTools = {
  gramps_list: {
    name: "gramps_list",
    description:
      "List all entities of a given type with pagination. " +
      "USE FOR: Getting all people, events, families, etc. when you need an overview. " +
      "RETURNS: Array of entity summaries (handle, gramps_id, key identifier). " +
      "NEXT STEP: Use gramps_get with handles for full details.",
    inputSchema: {
      type: "object" as const,
      properties: {
        entity_type: {
          type: "string",
          enum: ["people", "families", "events", "places", "sources", "citations", "repositories", "media", "notes"],
          description: "Type of entity to list",
        },
        page: {
          type: "number",
          description: "Page number (1-indexed, default 1)",
          default: 1,
        },
        pagesize: {
          type: "number",
          description: "Results per page (max 100, default 20)",
          default: 20,
        },
      },
      required: ["entity_type"],
    },
    handler: grampsList,
  },

  gramps_get_batch: {
    name: "gramps_get_batch",
    description:
      "Retrieve multiple entities by their handles in a single call. " +
      "USE FOR: Getting full details of several people/events at once, reducing API calls. " +
      "REQUIRED: entity_type, handles array (max 50). " +
      "RETURNS: Array of complete entity objects with any failures noted.",
    inputSchema: {
      type: "object" as const,
      properties: {
        entity_type: {
          type: "string",
          enum: ["people", "families", "events", "places", "sources", "citations", "repositories", "media", "notes"],
          description: "Type of entities to retrieve",
        },
        handles: {
          type: "array",
          items: { type: "string" },
          description: "List of entity handles to retrieve (max 50)",
        },
      },
      required: ["entity_type", "handles"],
    },
    handler: grampsGetBatch,
  },
};
