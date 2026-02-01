/**
 * Search and retrieval tools
 */

import { z } from "zod";
import { grampsClient } from "../client.js";
import { API_ENDPOINTS, ENTITY_ENDPOINT_MAP, MESSAGES } from "../constants.js";
import { searchSchema, findSchema, getEntitySchema } from "../schemas/search.js";
import { formatSearchResults, formatEntity } from "../utils/formatting.js";
import { formatToolResponse, formatEntityList } from "../utils/response.js";
import type { GrampsEntity } from "../types.js";

interface SearchResponse {
  data: Array<{
    object_type: string;
    object: GrampsEntity;
  }>;
  total_count?: number;
}

/**
 * GQL-based search for entities
 */
export async function grampsSearch(params: z.infer<typeof searchSchema>): Promise<string> {
  const { query, entity_type, page, pagesize } = searchSchema.parse(params);

  const endpoint = ENTITY_ENDPOINT_MAP[entity_type];
  if (!endpoint) {
    throw new Error(`Unknown entity type: ${entity_type}`);
  }

  const response = await grampsClient.get<GrampsEntity[]>(endpoint, {
    gql: query,
    page,
    pagesize,
  });

  // Format response
  if (!response || (Array.isArray(response) && response.length === 0)) {
    return formatToolResponse({
      status: "empty",
      summary: MESSAGES.NO_RESULTS(entity_type, query),
      details: "GQL syntax: property operator value. Examples: gender = 1, primary_name.first_name ~ John",
    });
  }

  const entities = Array.isArray(response) ? response : [response];
  const formattedEntities = entities.map((obj) => ({
    handle: obj.handle,
    gramps_id: obj.gramps_id,
    // Include type-specific summary field
    ...(entity_type === "people" && { name: formatPersonSummary(obj) }),
    ...(entity_type === "places" && { name: (obj as { name?: { value?: string }; title?: string }).name?.value || (obj as { title?: string }).title }),
    ...(entity_type === "sources" && { title: (obj as { title?: string }).title }),
    ...(entity_type === "events" && { type: (obj as { type?: string }).type }),
  }));

  return formatEntityList(entity_type, formattedEntities);
}

function formatPersonSummary(person: GrampsEntity): string {
  const p = person as { primary_name?: { first_name?: string; surname?: string } };
  if (!p.primary_name) return "Unknown";
  const parts = [p.primary_name.first_name, p.primary_name.surname].filter(Boolean);
  return parts.join(" ") || "Unknown";
}

/**
 * Full-text search across all entities
 */
export async function grampsFind(params: z.infer<typeof findSchema>): Promise<string> {
  const { query, page, pagesize } = findSchema.parse(params);

  const response = await grampsClient.get<SearchResponse>(API_ENDPOINTS.SEARCH, {
    query,
    page,
    pagesize,
  });

  if (!response.data || response.data.length === 0) {
    return formatToolResponse({
      status: "empty",
      summary: MESSAGES.NO_RESULTS("records", query),
      details: MESSAGES.SEARCH_HINT,
    });
  }

  const formattedResults = response.data.map((item) => ({
    type: item.object_type,
    handle: item.object.handle,
    gramps_id: item.object.gramps_id,
  }));

  return formatEntityList("records", formattedResults, response.total_count);
}

/**
 * Get a specific entity by handle or ID
 */
export async function grampsGet(params: z.infer<typeof getEntitySchema>): Promise<string> {
  const { entity_type, handle } = getEntitySchema.parse(params);

  const endpoint = ENTITY_ENDPOINT_MAP[entity_type];
  if (!endpoint) {
    throw new Error(`Unknown entity type: ${entity_type}`);
  }

  // Try to get by handle first
  try {
    const response = await grampsClient.get<GrampsEntity>(`${endpoint}${handle}`);
    return formatToolResponse({
      status: "success",
      summary: `Found ${entity_type.replace(/s$/, "")} ${response.gramps_id}`,
      data: response as unknown as Record<string, unknown>,
      details: `Handle: ${response.handle} - use this handle to reference in other operations.`,
    });
  } catch (error) {
    // If not found by handle, try searching by gramps_id
    if (error instanceof Error && error.message.includes("404")) {
      const searchResponse = await grampsClient.get<GrampsEntity[]>(endpoint, {
        gramps: `gramps_id=${handle}`,
      });

      if (searchResponse && searchResponse.length > 0) {
        const entity = searchResponse[0];
        return formatToolResponse({
          status: "success",
          summary: `Found ${entity_type.replace(/s$/, "")} ${entity.gramps_id}`,
          data: entity as unknown as Record<string, unknown>,
          details: `Handle: ${entity.handle} - use this handle to reference in other operations.`,
        });
      }

      return formatToolResponse({
        status: "empty",
        summary: MESSAGES.NOT_FOUND(entity_type.replace(/s$/, ""), handle),
        details: "Use gramps_find to search for the correct handle or ID.",
      });
    }
    throw error;
  }
}

// Tool definitions for MCP
export const searchTools = {
  gramps_search: {
    name: "gramps_search",
    description:
      "Search using GQL (Gramps Query Language) for structured queries. " +
      "USE FOR: Finding entities by attributes (name, date, gender, etc.). " +
      "SYNTAX: property operator value, combined with 'and'/'or'. " +
      "EXAMPLES: primary_name.surname_list[0].surname ~ Smith, gender = 1 (male=1, female=0). " +
      "RETURNS: List of handles - use handles with gramps_get for full details.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "GQL query string (e.g., 'surname=Smith', 'gender=M')",
        },
        entity_type: {
          type: "string",
          enum: ["people", "families", "events", "places", "sources", "citations", "repositories", "media", "notes"],
          description: "Type of entity to search",
        },
        page: {
          type: "number",
          description: "Page number (1-indexed)",
          default: 1,
        },
        pagesize: {
          type: "number",
          description: "Results per page (max 100)",
          default: 20,
        },
      },
      required: ["query", "entity_type"],
    },
    handler: grampsSearch,
  },

  gramps_find: {
    name: "gramps_find",
    description:
      "Full-text search across ALL entity types at once. " +
      "USE FOR: Quick lookup by name, keyword, or ID when you don't know the entity type. " +
      "RETURNS: Mixed results (people, places, sources, etc.) with handles. " +
      "NEXT STEP: Use gramps_get with handle to retrieve full entity details.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Full-text search query",
        },
        page: {
          type: "number",
          description: "Page number (1-indexed)",
          default: 1,
        },
        pagesize: {
          type: "number",
          description: "Results per page (max 100)",
          default: 20,
        },
      },
      required: ["query"],
    },
    handler: grampsFind,
  },

  gramps_get: {
    name: "gramps_get",
    description:
      "Retrieve complete details of a specific entity by handle or Gramps ID. " +
      "USE FOR: Getting full record after finding entity in search results. " +
      "REQUIRED: entity_type and handle (from search results). " +
      "RETURNS: Complete entity data including all relationships and attributes.",
    inputSchema: {
      type: "object" as const,
      properties: {
        entity_type: {
          type: "string",
          enum: ["people", "families", "events", "places", "sources", "citations", "repositories", "media", "notes"],
          description: "Type of entity to retrieve",
        },
        handle: {
          type: "string",
          description: "Entity handle or Gramps ID",
        },
      },
      required: ["entity_type", "handle"],
    },
    handler: grampsGet,
  },
};
