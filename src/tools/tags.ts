/**
 * Tag management tools
 */

import { z } from "zod";
import { grampsClient } from "../client.js";
import { API_ENDPOINTS, ENTITY_ENDPOINT_MAP } from "../constants.js";
import { formatToolResponse } from "../utils/response.js";
import type { Tag, GrampsEntity } from "../types.js";

// Schema for creating a tag
const createTagSchema = z.object({
  name: z.string().describe("Tag name"),
  color: z
    .string()
    .optional()
    .describe("Hex color for the tag (e.g., '#FF5500')"),
  priority: z.number().optional().describe("Priority (lower = higher priority)"),
});

// Schema for tagging/untagging an entity
const tagEntitySchema = z.object({
  entity_type: z
    .string()
    .describe("Entity type: people, families, events, places, sources, citations, repositories, media, notes"),
  handle: z.string().describe("Handle of the entity to tag/untag"),
  tag_handle: z.string().describe("Handle of the tag to add/remove"),
});

/**
 * List all tags in the database
 */
export async function grampsListTags(): Promise<string> {
  const tags = await grampsClient.get<Tag[]>(API_ENDPOINTS.TAGS);

  if (!tags || tags.length === 0) {
    return formatToolResponse({
      status: "success",
      summary: "No tags found",
      data: {
        count: 0,
        tags: [],
      },
      details: "Create tags using gramps_create_tag to organize your records.",
    });
  }

  const tagList = tags.map((tag) => ({
    handle: tag.handle,
    gramps_id: tag.gramps_id,
    name: tag.name,
    color: tag.color || null,
    priority: tag.priority ?? null,
  }));

  return formatToolResponse({
    status: "success",
    summary: `Found ${tags.length} tag(s)`,
    data: {
      count: tags.length,
      tags: tagList,
    },
    details: "Use tag handles to tag entities with gramps_tag_entity.",
  });
}

/**
 * Create a new tag
 */
export async function grampsCreateTag(
  params: z.infer<typeof createTagSchema>
): Promise<string> {
  const validated = createTagSchema.parse(params);

  const tag = {
    _class: "Tag",
    name: validated.name,
    color: validated.color,
    priority: validated.priority,
  };

  const rawResponse = await grampsClient.post<GrampsEntity | GrampsEntity[]>(
    API_ENDPOINTS.TAGS,
    tag
  );

  const response = Array.isArray(rawResponse) ? rawResponse[0] : rawResponse;

  if (!response?.handle) {
    throw new Error(
      `API did not return entity handle after creating tag. Response: ${JSON.stringify(rawResponse)}`
    );
  }

  return formatToolResponse({
    status: "success",
    summary: `Created tag "${validated.name}"`,
    data: {
      handle: response.handle,
      gramps_id: response.gramps_id,
      name: validated.name,
      color: validated.color || null,
    },
    details: `Use handle "${response.handle}" to tag entities with gramps_tag_entity.`,
  });
}

/**
 * Add a tag to an entity
 */
export async function grampsTagEntity(
  params: z.infer<typeof tagEntitySchema>
): Promise<string> {
  const { entity_type, handle, tag_handle } = tagEntitySchema.parse(params);

  // Validate entity type
  const endpoint = ENTITY_ENDPOINT_MAP[entity_type.toLowerCase()];
  if (!endpoint) {
    throw new Error(
      `Invalid entity type "${entity_type}". Valid types: people, families, events, places, sources, citations, repositories, media, notes`
    );
  }

  // Fetch the existing entity
  const entity = await grampsClient.get<GrampsEntity & { tag_list?: string[] }>(
    `${endpoint}${handle}`
  );

  // Check if tag is already applied
  const existingTags = entity.tag_list || [];
  if (existingTags.includes(tag_handle)) {
    return formatToolResponse({
      status: "success",
      summary: `Tag already applied to ${entity_type.replace(/s$/, "")}`,
      data: {
        entity_type,
        entity_handle: handle,
        tag_handle,
        tag_count: existingTags.length,
      },
      details: "No changes were made - tag was already applied.",
    });
  }

  // Build updated entity with new tag
  const updatedEntity = {
    ...entity,
    tag_list: [...existingTags, tag_handle],
  };

  // PUT the updated entity
  const rawResponse = await grampsClient.put<GrampsEntity | GrampsEntity[]>(
    `${endpoint}${handle}`,
    updatedEntity
  );

  const response = Array.isArray(rawResponse) ? rawResponse[0] : rawResponse;

  return formatToolResponse({
    status: "success",
    summary: `Tagged ${entity_type.replace(/s$/, "")} ${entity.gramps_id}`,
    data: {
      entity_type,
      entity_handle: handle,
      entity_gramps_id: entity.gramps_id,
      tag_handle,
      tag_count: existingTags.length + 1,
    },
    details: `Tag added successfully. Entity now has ${existingTags.length + 1} tag(s).`,
  });
}

/**
 * Remove a tag from an entity
 */
export async function grampsUntagEntity(
  params: z.infer<typeof tagEntitySchema>
): Promise<string> {
  const { entity_type, handle, tag_handle } = tagEntitySchema.parse(params);

  // Validate entity type
  const endpoint = ENTITY_ENDPOINT_MAP[entity_type.toLowerCase()];
  if (!endpoint) {
    throw new Error(
      `Invalid entity type "${entity_type}". Valid types: people, families, events, places, sources, citations, repositories, media, notes`
    );
  }

  // Fetch the existing entity
  const entity = await grampsClient.get<GrampsEntity & { tag_list?: string[] }>(
    `${endpoint}${handle}`
  );

  // Check if tag exists
  const existingTags = entity.tag_list || [];
  if (!existingTags.includes(tag_handle)) {
    return formatToolResponse({
      status: "success",
      summary: `Tag not found on ${entity_type.replace(/s$/, "")}`,
      data: {
        entity_type,
        entity_handle: handle,
        tag_handle,
        tag_count: existingTags.length,
      },
      details: "No changes were made - tag was not applied to this entity.",
    });
  }

  // Build updated entity without the tag
  const updatedEntity = {
    ...entity,
    tag_list: existingTags.filter((t) => t !== tag_handle),
  };

  // PUT the updated entity
  const rawResponse = await grampsClient.put<GrampsEntity | GrampsEntity[]>(
    `${endpoint}${handle}`,
    updatedEntity
  );

  const response = Array.isArray(rawResponse) ? rawResponse[0] : rawResponse;

  return formatToolResponse({
    status: "success",
    summary: `Removed tag from ${entity_type.replace(/s$/, "")} ${entity.gramps_id}`,
    data: {
      entity_type,
      entity_handle: handle,
      entity_gramps_id: entity.gramps_id,
      tag_handle,
      tag_count: existingTags.length - 1,
    },
    details: `Tag removed successfully. Entity now has ${existingTags.length - 1} tag(s).`,
  });
}

// Tool definitions for MCP
export const tagTools = {
  gramps_list_tags: {
    name: "gramps_list_tags",
    description:
      "List all tags in the database. " +
      "RETURNS: Tag names, handles, colors, and priorities. " +
      "USE FOR: Finding tag handles before tagging entities.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
    handler: grampsListTags,
  },

  gramps_create_tag: {
    name: "gramps_create_tag",
    description:
      "Create a new tag for organizing records. " +
      "REQUIRED: name. " +
      "OPTIONAL: color (hex format), priority. " +
      "RETURNS: Handle to use with gramps_tag_entity.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Tag name (e.g., 'Needs Research', 'Verified')",
        },
        color: {
          type: "string",
          description: "Hex color for the tag (e.g., '#FF5500', '#00FF00')",
        },
        priority: {
          type: "number",
          description: "Priority (lower number = higher priority)",
        },
      },
      required: ["name"],
    },
    handler: grampsCreateTag,
  },

  gramps_tag_entity: {
    name: "gramps_tag_entity",
    description:
      "Add a tag to any entity. " +
      "REQUIRED: entity_type, handle, tag_handle. " +
      "USE FOR: Categorizing, marking records for review, or organizing. " +
      "NOTE: Safe to call if tag is already applied.",
    inputSchema: {
      type: "object" as const,
      properties: {
        entity_type: {
          type: "string",
          enum: [
            "people",
            "families",
            "events",
            "places",
            "sources",
            "citations",
            "repositories",
            "media",
            "notes",
          ],
          description: "Type of entity to tag",
        },
        handle: {
          type: "string",
          description: "Handle of the entity to tag",
        },
        tag_handle: {
          type: "string",
          description: "Handle of the tag to apply (from gramps_list_tags or gramps_create_tag)",
        },
      },
      required: ["entity_type", "handle", "tag_handle"],
    },
    handler: grampsTagEntity,
  },

  gramps_untag_entity: {
    name: "gramps_untag_entity",
    description:
      "Remove a tag from an entity. " +
      "REQUIRED: entity_type, handle, tag_handle. " +
      "NOTE: Safe to call if tag is not applied.",
    inputSchema: {
      type: "object" as const,
      properties: {
        entity_type: {
          type: "string",
          enum: [
            "people",
            "families",
            "events",
            "places",
            "sources",
            "citations",
            "repositories",
            "media",
            "notes",
          ],
          description: "Type of entity to untag",
        },
        handle: {
          type: "string",
          description: "Handle of the entity to untag",
        },
        tag_handle: {
          type: "string",
          description: "Handle of the tag to remove",
        },
      },
      required: ["entity_type", "handle", "tag_handle"],
    },
    handler: grampsUntagEntity,
  },
};
