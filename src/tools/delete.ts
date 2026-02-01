/**
 * Entity deletion tools
 */

import { z } from "zod";
import { grampsClient } from "../client.js";
import { ENTITY_ENDPOINT_MAP } from "../constants.js";
import { formatToolResponse } from "../utils/response.js";

// Schema for deleting a single entity
const deleteEntitySchema = z.object({
  entity_type: z
    .string()
    .describe(
      "Entity type: people, families, events, places, sources, citations, repositories, media, notes, tags"
    ),
  handle: z.string().describe("Handle of the entity to delete"),
});

// Schema for batch deleting entities
const deleteBatchSchema = z.object({
  entity_type: z
    .string()
    .describe(
      "Entity type: people, families, events, places, sources, citations, repositories, media, notes, tags"
    ),
  handles: z.array(z.string()).min(1).describe("Array of handles to delete"),
});

/**
 * Delete a single entity
 */
export async function grampsDelete(
  params: z.infer<typeof deleteEntitySchema>
): Promise<string> {
  const { entity_type, handle } = deleteEntitySchema.parse(params);

  // Validate entity type
  const endpoint = ENTITY_ENDPOINT_MAP[entity_type.toLowerCase()];
  if (!endpoint) {
    throw new Error(
      `Invalid entity type "${entity_type}". Valid types: people, families, events, places, sources, citations, repositories, media, notes, tags`
    );
  }

  // Delete the entity
  await grampsClient.delete(`${endpoint}${handle}`);

  return formatToolResponse({
    status: "success",
    summary: `Deleted ${entity_type.replace(/s$/, "")} ${handle}`,
    data: {
      entity_type,
      handle,
      deleted: true,
    },
    details: `Successfully deleted the ${entity_type.replace(/s$/, "")} record.`,
  });
}

/**
 * Delete multiple entities of the same type
 */
export async function grampsDeleteBatch(
  params: z.infer<typeof deleteBatchSchema>
): Promise<string> {
  const { entity_type, handles } = deleteBatchSchema.parse(params);

  // Validate entity type
  const endpoint = ENTITY_ENDPOINT_MAP[entity_type.toLowerCase()];
  if (!endpoint) {
    throw new Error(
      `Invalid entity type "${entity_type}". Valid types: people, families, events, places, sources, citations, repositories, media, notes, tags`
    );
  }

  const results: { handle: string; success: boolean; error?: string }[] = [];

  // Delete each entity
  for (const handle of handles) {
    try {
      await grampsClient.delete(`${endpoint}${handle}`);
      results.push({ handle, success: true });
    } catch (error) {
      results.push({
        handle,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  return formatToolResponse({
    status: failCount === 0 ? "success" : successCount === 0 ? "error" : "partial",
    summary: `Deleted ${successCount}/${handles.length} ${entity_type}`,
    data: {
      entity_type,
      total: handles.length,
      deleted: successCount,
      failed: failCount,
      results,
    },
    details:
      failCount === 0
        ? `Successfully deleted all ${successCount} records.`
        : `Deleted ${successCount} records, ${failCount} failed.`,
  });
}

// Tool definitions for MCP
export const deleteTools = {
  gramps_delete: {
    name: "gramps_delete",
    description:
      "Delete a single entity from the database. " +
      "REQUIRED: entity_type and handle. " +
      "SUPPORTED TYPES: people, families, events, places, sources, citations, repositories, media, notes, tags. " +
      "WARNING: This permanently removes the record.",
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
            "tags",
          ],
          description: "Type of entity to delete",
        },
        handle: {
          type: "string",
          description: "Handle of the entity to delete",
        },
      },
      required: ["entity_type", "handle"],
    },
    handler: grampsDelete,
  },

  gramps_delete_batch: {
    name: "gramps_delete_batch",
    description:
      "Delete multiple entities of the same type. " +
      "REQUIRED: entity_type and handles array. " +
      "USE FOR: Cleaning up test data or bulk deletions. " +
      "RETURNS: Count of successful and failed deletions.",
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
            "tags",
          ],
          description: "Type of entities to delete",
        },
        handles: {
          type: "array",
          items: { type: "string" },
          description: "Array of handles to delete",
        },
      },
      required: ["entity_type", "handles"],
    },
    handler: grampsDeleteBatch,
  },
};
