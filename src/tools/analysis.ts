/**
 * Analysis tools for genealogy tree exploration
 */

import { z } from "zod";
import { grampsClient } from "../client.js";
import { API_ENDPOINTS, MESSAGES } from "../constants.js";
import { formatPersonName, formatDate } from "../utils/formatting.js";
import { formatToolResponse } from "../utils/response.js";
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

  const totalRecords = Object.values(stats).reduce((a, b) => a + b, 0);

  if (totalRecords === 0) {
    return formatToolResponse({
      status: "empty",
      summary: MESSAGES.EMPTY_TREE,
      details: "Use gramps_create_person to add your first family member.",
    });
  }

  return formatToolResponse({
    status: "success",
    summary: `Family tree contains ${totalRecords.toLocaleString()} total records`,
    data: {
      people: stats.people,
      families: stats.families,
      events: stats.events,
      places: stats.places,
      sources: stats.sources,
      citations: stats.citations,
      repositories: stats.repositories,
      media: stats.media,
      notes: stats.notes,
    },
    details: stats.people > 0
      ? "Use gramps_search or gramps_find to explore specific records."
      : undefined,
  });
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
    return formatToolResponse({
      status: "empty",
      summary: "No ancestors found for this person",
      details: "The person may not have parent family links. Check the person's parent_family_list.",
    });
  }

  // Group by generation
  const byGen = new Map<number, typeof ancestors>();
  for (const a of ancestors) {
    if (!byGen.has(a.generation)) {
      byGen.set(a.generation, []);
    }
    byGen.get(a.generation)!.push(a);
  }

  const generationsData: Record<string, Array<{ relationship: string; name: string; gramps_id: string; handle: string }>> = {};
  for (let g = 0; g <= generations; g++) {
    const genAncestors = byGen.get(g);
    if (genAncestors && genAncestors.length > 0) {
      generationsData[`generation_${g}`] = genAncestors.map((a) => ({
        relationship: a.relationship,
        name: formatPersonName(a.person.primary_name),
        gramps_id: a.person.gramps_id,
        handle: a.person.handle,
      }));
    }
  }

  return formatToolResponse({
    status: "success",
    summary: `Found ${ancestors.length} ancestor(s) across ${generations} generation(s)`,
    data: {
      total_count: ancestors.length,
      generations_retrieved: generations,
      ancestors: generationsData,
    },
    details: "Use handles with gramps_get to retrieve full details of any ancestor.",
  });
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
    return formatToolResponse({
      status: "empty",
      summary: "No descendants found for this person",
      details: "The person may not have family links. Check the person's family_list.",
    });
  }

  // Group by generation
  const byGen = new Map<number, typeof descendants>();
  for (const d of descendants) {
    if (!byGen.has(d.generation)) {
      byGen.set(d.generation, []);
    }
    byGen.get(d.generation)!.push(d);
  }

  const generationsData: Record<string, Array<{ relationship: string; name: string; gramps_id: string; handle: string }>> = {};
  for (let g = 0; g <= generations; g++) {
    const genDescendants = byGen.get(g);
    if (genDescendants && genDescendants.length > 0) {
      generationsData[`generation_${g}`] = genDescendants.map((d) => ({
        relationship: d.relationship,
        name: formatPersonName(d.person.primary_name),
        gramps_id: d.person.gramps_id,
        handle: d.person.handle,
      }));
    }
  }

  return formatToolResponse({
    status: "success",
    summary: `Found ${descendants.length} descendant(s) across ${generations} generation(s)`,
    data: {
      total_count: descendants.length,
      generations_retrieved: generations,
      descendants: generationsData,
    },
    details: "Use handles with gramps_get to retrieve full details of any descendant.",
  });
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
      return formatToolResponse({
        status: "empty",
        summary: "No recent changes found",
        details: "The tree may be new or have no activity tracking.",
      });
    }

    const changes = response.map((change) => {
      const date = new Date(change.change * 1000);
      return {
        timestamp: date.toISOString(),
        type: change.object_type,
        gramps_id: change.gramps_id,
        handle: change.handle,
      };
    });

    return formatToolResponse({
      status: "success",
      summary: `Found ${changes.length} recent change(s)`,
      data: {
        page,
        count: changes.length,
        changes,
      },
      details: "Use handles with gramps_get to see full details of changed records.",
    });
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
      return formatToolResponse({
        status: "empty",
        summary: "No recent changes found",
        details: "The tree may be new or have no activity tracking.",
      });
    }

    const changes = topEntities.map((item) => {
      const date = new Date(item.change * 1000);
      return {
        timestamp: date.toISOString(),
        type: item.type,
        gramps_id: item.entity.gramps_id,
        handle: item.entity.handle,
      };
    });

    return formatToolResponse({
      status: "success",
      summary: `Found ${changes.length} recent change(s)`,
      data: {
        page,
        count: changes.length,
        changes,
      },
      details: "Use handles with gramps_get to see full details of changed records.",
    });
  }
}

// Tool definitions for MCP
export const analysisTools = {
  gramps_tree_stats: {
    name: "gramps_tree_stats",
    description:
      "Get database overview with record counts by type. " +
      "USE FOR: Understanding tree size, checking if data exists. " +
      "RETURNS: Counts of people, families, events, places, sources, etc. " +
      "START HERE: Good first call to understand the tree before searching.",
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
      "Traverse ancestry tree upward from a person. " +
      "REQUIRED: handle of starting person (from search results). " +
      "OPTIONAL: generations (1-10, default 3). " +
      "RETURNS: Parents, grandparents, great-grandparents with handles.",
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
      "Traverse descendant tree downward from a person. " +
      "REQUIRED: handle of starting person (from search results). " +
      "OPTIONAL: generations (1-10, default 3). " +
      "RETURNS: Children, grandchildren, great-grandchildren with handles.",
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
      "List recently added or modified records. " +
      "USE FOR: Seeing latest tree activity, finding newly added records. " +
      "OPTIONAL: page, pagesize for pagination. " +
      "RETURNS: Timestamped list of changes with handles.",
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
