/**
 * Analysis tools for genealogy tree exploration
 */

import { z } from "zod";
import { grampsClient } from "../client.js";
import { API_ENDPOINTS } from "../constants.js";
import { formatPersonName, formatDate } from "../utils/formatting.js";
import type { Person, Family, Event, GrampsEntity, TreeStats } from "../types.js";

// Schema for ancestor/descendant queries
const lineageSchema = z.object({
  handle: z.string().describe("Person handle to start from"),
  generations: z
    .number()
    .int()
    .positive()
    .max(10)
    .default(3)
    .describe("Number of generations to retrieve (max 10)"),
});

// Schema for recent changes
const recentChangesSchema = z.object({
  page: z.number().int().positive().default(1).describe("Page number"),
  pagesize: z.number().int().positive().max(100).default(20).describe("Results per page"),
});

/**
 * Get tree statistics
 */
export async function grampsTreeStats(): Promise<string> {
  // Fetch counts for each entity type
  const entityTypes = [
    "people",
    "families",
    "events",
    "places",
    "sources",
    "citations",
    "repositories",
    "media",
    "notes",
  ];

  const stats: TreeStats = {
    people: 0,
    families: 0,
    events: 0,
    places: 0,
    sources: 0,
    citations: 0,
    repositories: 0,
    media: 0,
    notes: 0,
  };

  // Fetch metadata which includes counts
  try {
    const metadata = await grampsClient.get<Record<string, unknown>>(API_ENDPOINTS.METADATA);

    // Extract counts from metadata.object_counts
    const objectCounts = metadata.object_counts as Record<string, number> | undefined;
    if (objectCounts) {
      for (const type of entityTypes) {
        if (typeof objectCounts[type] === "number") {
          stats[type as keyof TreeStats] = objectCounts[type];
        }
      }
    }
  } catch {
    // Fallback: fetch each entity type with pagesize=1 to get total count
    for (const type of entityTypes) {
      try {
        const response = await grampsClient.get<GrampsEntity[]>(
          API_ENDPOINTS[type.toUpperCase() as keyof typeof API_ENDPOINTS] || `/${type}/`,
          { pagesize: 1 }
        );
        // The response might include total_count header or we count the array
        if (Array.isArray(response)) {
          // This is a rough estimate - actual count would need pagination
          stats[type as keyof TreeStats] = response.length;
        }
      } catch {
        // Ignore errors for individual entity types
      }
    }
  }

  const lines = [
    "Family Tree Statistics:",
    "",
    `  People:       ${stats.people.toLocaleString()}`,
    `  Families:     ${stats.families.toLocaleString()}`,
    `  Events:       ${stats.events.toLocaleString()}`,
    `  Places:       ${stats.places.toLocaleString()}`,
    `  Sources:      ${stats.sources.toLocaleString()}`,
    `  Citations:    ${stats.citations.toLocaleString()}`,
    `  Repositories: ${stats.repositories.toLocaleString()}`,
    `  Media:        ${stats.media.toLocaleString()}`,
    `  Notes:        ${stats.notes.toLocaleString()}`,
  ];

  return lines.join("\n");
}

/**
 * Get ancestors of a person
 */
export async function grampsGetAncestors(
  params: z.infer<typeof lineageSchema>
): Promise<string> {
  const { handle, generations } = lineageSchema.parse(params);

  const ancestors: Array<{
    generation: number;
    person: Person;
    relationship: string;
  }> = [];

  // Queue for BFS traversal: [personHandle, generation, relationship]
  const queue: Array<[string, number, string]> = [[handle, 0, "Self"]];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const [currentHandle, gen, rel] = queue.shift()!;

    if (visited.has(currentHandle) || gen > generations) {
      continue;
    }
    visited.add(currentHandle);

    try {
      // Get person
      const person = await grampsClient.get<Person>(
        `${API_ENDPOINTS.PEOPLE}${currentHandle}`
      );

      ancestors.push({
        generation: gen,
        person,
        relationship: rel,
      });

      // Get parent families
      if (person.parent_family_list && gen < generations) {
        for (const familyHandle of person.parent_family_list) {
          try {
            const family = await grampsClient.get<Family>(
              `${API_ENDPOINTS.FAMILIES}${familyHandle}`
            );

            if (family.father_handle && !visited.has(family.father_handle)) {
              const fatherRel =
                gen === 0
                  ? "Father"
                  : gen === 1
                    ? "Grandfather"
                    : `${gen + 1}x Great-Grandfather`;
              queue.push([family.father_handle, gen + 1, fatherRel]);
            }

            if (family.mother_handle && !visited.has(family.mother_handle)) {
              const motherRel =
                gen === 0
                  ? "Mother"
                  : gen === 1
                    ? "Grandmother"
                    : `${gen + 1}x Great-Grandmother`;
              queue.push([family.mother_handle, gen + 1, motherRel]);
            }
          } catch {
            // Family not found, skip
          }
        }
      }
    } catch {
      // Person not found, skip
    }
  }

  // Format output
  if (ancestors.length === 0) {
    return "No ancestors found.";
  }

  const lines = [`Found ${ancestors.length} ancestor(s) up to ${generations} generation(s):`, ""];

  // Group by generation
  const byGen = new Map<number, typeof ancestors>();
  for (const a of ancestors) {
    if (!byGen.has(a.generation)) {
      byGen.set(a.generation, []);
    }
    byGen.get(a.generation)!.push(a);
  }

  for (let g = 0; g <= generations; g++) {
    const genAncestors = byGen.get(g);
    if (genAncestors && genAncestors.length > 0) {
      lines.push(`Generation ${g}:`);
      for (const a of genAncestors) {
        lines.push(
          `  ${a.relationship}: ${formatPersonName(a.person.primary_name)} (${a.person.gramps_id})`
        );
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

/**
 * Get descendants of a person
 */
export async function grampsGetDescendants(
  params: z.infer<typeof lineageSchema>
): Promise<string> {
  const { handle, generations } = lineageSchema.parse(params);

  const descendants: Array<{
    generation: number;
    person: Person;
    relationship: string;
  }> = [];

  // Queue for BFS traversal
  const queue: Array<[string, number, string]> = [[handle, 0, "Self"]];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const [currentHandle, gen, rel] = queue.shift()!;

    if (visited.has(currentHandle) || gen > generations) {
      continue;
    }
    visited.add(currentHandle);

    try {
      // Get person
      const person = await grampsClient.get<Person>(
        `${API_ENDPOINTS.PEOPLE}${currentHandle}`
      );

      descendants.push({
        generation: gen,
        person,
        relationship: rel,
      });

      // Get families where this person is a parent
      if (person.family_list && gen < generations) {
        for (const familyHandle of person.family_list) {
          try {
            const family = await grampsClient.get<Family>(
              `${API_ENDPOINTS.FAMILIES}${familyHandle}`
            );

            if (family.child_ref_list) {
              for (const childRef of family.child_ref_list) {
                if (childRef.ref && !visited.has(childRef.ref)) {
                  const childRel =
                    gen === 0
                      ? "Child"
                      : gen === 1
                        ? "Grandchild"
                        : `${gen + 1}x Great-Grandchild`;
                  queue.push([childRef.ref, gen + 1, childRel]);
                }
              }
            }
          } catch {
            // Family not found, skip
          }
        }
      }
    } catch {
      // Person not found, skip
    }
  }

  // Format output
  if (descendants.length === 0) {
    return "No descendants found.";
  }

  const lines = [
    `Found ${descendants.length} descendant(s) up to ${generations} generation(s):`,
    "",
  ];

  // Group by generation
  const byGen = new Map<number, typeof descendants>();
  for (const d of descendants) {
    if (!byGen.has(d.generation)) {
      byGen.set(d.generation, []);
    }
    byGen.get(d.generation)!.push(d);
  }

  for (let g = 0; g <= generations; g++) {
    const genDescendants = byGen.get(g);
    if (genDescendants && genDescendants.length > 0) {
      lines.push(`Generation ${g}:`);
      for (const d of genDescendants) {
        lines.push(
          `  ${d.relationship}: ${formatPersonName(d.person.primary_name)} (${d.person.gramps_id})`
        );
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

/**
 * Get recent changes
 */
export async function grampsRecentChanges(
  params: z.infer<typeof recentChangesSchema>
): Promise<string> {
  const { page, pagesize } = recentChangesSchema.parse(params);

  interface RecentChange {
    handle: string;
    gramps_id: string;
    object_type: string;
    change: number;
    object?: GrampsEntity;
  }

  try {
    const response = await grampsClient.get<RecentChange[]>(API_ENDPOINTS.RECENT, {
      page,
      pagesize,
    });

    if (!response || response.length === 0) {
      return "No recent changes found.";
    }

    const lines = [`Recent Changes (page ${page}):`, ""];

    for (const change of response) {
      const date = new Date(change.change * 1000);
      const dateStr = date.toISOString().replace("T", " ").substring(0, 19);

      lines.push(`[${dateStr}] ${change.object_type}: ${change.gramps_id}`);
    }

    return lines.join("\n");
  } catch {
    // Fallback: try fetching from each entity type and sorting by change time
    const allEntities: Array<{
      type: string;
      entity: GrampsEntity;
      change: number;
    }> = [];

    const entityTypes = ["people", "families", "events", "places", "sources"];

    for (const type of entityTypes) {
      try {
        const entities = await grampsClient.get<GrampsEntity[]>(
          API_ENDPOINTS[type.toUpperCase() as keyof typeof API_ENDPOINTS] || `/${type}/`,
          { pagesize: 10 }
        );

        for (const entity of entities) {
          if (entity.change) {
            allEntities.push({
              type,
              entity,
              change: entity.change,
            });
          }
        }
      } catch {
        // Ignore errors
      }
    }

    // Sort by change time descending
    allEntities.sort((a, b) => b.change - a.change);

    const topEntities = allEntities.slice(0, pagesize);

    if (topEntities.length === 0) {
      return "No recent changes found.";
    }

    const lines = [`Recent Changes (page ${page}):`, ""];

    for (const item of topEntities) {
      const date = new Date(item.change * 1000);
      const dateStr = date.toISOString().replace("T", " ").substring(0, 19);

      lines.push(`[${dateStr}] ${item.type}: ${item.entity.gramps_id}`);
    }

    return lines.join("\n");
  }
}

// Tool definitions for MCP
export const analysisTools = {
  gramps_tree_stats: {
    name: "gramps_tree_stats",
    description:
      "Get statistics about the family tree including counts of people, " +
      "families, events, places, sources, and other record types.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
    handler: grampsTreeStats,
  },

  gramps_get_ancestors: {
    name: "gramps_get_ancestors",
    description:
      "Find ancestors of a person going back a specified number of generations. " +
      "Returns parents, grandparents, great-grandparents, etc.",
    inputSchema: {
      type: "object" as const,
      properties: {
        handle: {
          type: "string",
          description: "Person handle to start from",
        },
        generations: {
          type: "number",
          description: "Number of generations to retrieve (max 10)",
          default: 3,
        },
      },
      required: ["handle"],
    },
    handler: grampsGetAncestors,
  },

  gramps_get_descendants: {
    name: "gramps_get_descendants",
    description:
      "Find descendants of a person going forward a specified number of generations. " +
      "Returns children, grandchildren, great-grandchildren, etc.",
    inputSchema: {
      type: "object" as const,
      properties: {
        handle: {
          type: "string",
          description: "Person handle to start from",
        },
        generations: {
          type: "number",
          description: "Number of generations to retrieve (max 10)",
          default: 3,
        },
      },
      required: ["handle"],
    },
    handler: grampsGetDescendants,
  },

  gramps_recent_changes: {
    name: "gramps_recent_changes",
    description:
      "Get recently modified records in the family tree. " +
      "Useful for seeing what has been updated or added recently.",
    inputSchema: {
      type: "object" as const,
      properties: {
        page: {
          type: "number",
          description: "Page number",
          default: 1,
        },
        pagesize: {
          type: "number",
          description: "Results per page (max 100)",
          default: 20,
        },
      },
      required: [],
    },
    handler: grampsRecentChanges,
  },
};
