/**
 * Search and retrieval tools
 */

import { z } from "zod";
import { grampsClient } from "../client.js";
import { API_ENDPOINTS, ENTITY_ENDPOINT_MAP } from "../constants.js";
import { searchSchema, findSchema, getEntitySchema } from "../schemas/search.js";
import { formatSearchResults, formatEntity } from "../utils/formatting.js";
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
    gramps: query,
    page,
    pagesize,
  });

  // Format response
  if (!response || (Array.isArray(response) && response.length === 0)) {
    return `No ${entity_type} found matching query: ${query}`;
  }

  const results = (Array.isArray(response) ? response : [response]).map((obj) => ({
    object_type: entity_type,
    object: obj,
  }));

  return formatSearchResults(results);
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
    return `No results found for: ${query}`;
  }

  let result = formatSearchResults(response.data);

  if (response.total_count !== undefined) {
    result += `\n\nTotal results: ${response.total_count}`;
  }

  return result;
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
    return formatEntity(response, entity_type);
  } catch (error) {
    // If not found by handle, try searching by gramps_id
    if (error instanceof Error && error.message.includes("404")) {
      const searchResponse = await grampsClient.get<GrampsEntity[]>(endpoint, {
        gramps: `gramps_id=${handle}`,
      });

      if (searchResponse && searchResponse.length > 0) {
        return formatEntity(searchResponse[0], entity_type);
      }
    }
    throw error;
  }
}

// Tool definitions for MCP
export const searchTools = {
  gramps_search: {
    name: "gramps_search",
    description:
      "Search for Gramps entities using GQL (Gramps Query Language). " +
      "Examples: 'surname=Smith', 'gender=M', 'birth.date.year>1900'. " +
      "Use for structured queries on specific entity types.",
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
      "Full-text search across all Gramps records. " +
      "Use for finding people, places, sources, etc. by name or keyword. " +
      "Returns results from all entity types.",
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
      "Get full details of a specific Gramps entity by its handle or Gramps ID. " +
      "Use after finding an entity with search to get complete information.",
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
