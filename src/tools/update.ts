/**
 * Entity update tools
 */

import { z } from "zod";
import { grampsClient } from "../client.js";
import { API_ENDPOINTS } from "../constants.js";
import {
  personNameSchema,
  eventRefSchema,
  childRefSchema,
  mediaRefSchema,
  attributeSchema,
} from "../schemas/common.js";
import { formatToolResponse } from "../utils/response.js";
import { formatPersonName } from "../utils/formatting.js";
import type { Person, Family, GrampsEntity } from "../types.js";

// Schema for updating a person
const updatePersonSchema = z.object({
  handle: z.string().describe("Person handle to update"),
  gramps_id: z.string().optional().describe("Update Gramps ID"),
  primary_name: personNameSchema.optional().describe("Update primary name"),
  alternate_names: z.array(personNameSchema).optional().describe("Replace alternate names"),
  gender: z.enum(["male", "female", "unknown"]).optional().describe("Update gender"),
  event_ref_list: z.array(eventRefSchema).optional().describe("Replace event references"),
  add_event_ref: eventRefSchema.optional().describe("Add a single event reference"),
  family_list: z.array(z.string()).optional().describe("Replace family handles (as spouse/parent)"),
  parent_family_list: z.array(z.string()).optional().describe("Replace family handles (as child)"),
  media_list: z.array(mediaRefSchema).optional().describe("Replace media references"),
  citation_list: z.array(z.string()).optional().describe("Replace citation handles"),
  note_list: z.array(z.string()).optional().describe("Replace note handles"),
  add_note: z.string().optional().describe("Add a single note handle"),
  attribute_list: z.array(attributeSchema).optional().describe("Replace attributes"),
  tag_list: z.array(z.string()).optional().describe("Replace tag handles"),
  private: z.boolean().optional().describe("Update private flag"),
});

// Schema for updating a family
const updateFamilySchema = z.object({
  handle: z.string().describe("Family handle to update"),
  gramps_id: z.string().optional().describe("Update Gramps ID"),
  father_handle: z.string().nullable().optional().describe("Update father handle (null to remove)"),
  mother_handle: z.string().nullable().optional().describe("Update mother handle (null to remove)"),
  child_ref_list: z.array(childRefSchema).optional().describe("Replace child references"),
  add_child: childRefSchema.optional().describe("Add a single child reference"),
  remove_child: z.string().optional().describe("Remove child by handle"),
  type: z.string().optional().describe("Update relationship type"),
  event_ref_list: z.array(eventRefSchema).optional().describe("Replace event references"),
  add_event_ref: eventRefSchema.optional().describe("Add a single event reference"),
  media_list: z.array(mediaRefSchema).optional().describe("Replace media references"),
  citation_list: z.array(z.string()).optional().describe("Replace citation handles"),
  note_list: z.array(z.string()).optional().describe("Replace note handles"),
  attribute_list: z.array(attributeSchema).optional().describe("Replace attributes"),
  tag_list: z.array(z.string()).optional().describe("Replace tag handles"),
  private: z.boolean().optional().describe("Update private flag"),
});

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
 * Update an existing person
 */
export async function grampsUpdatePerson(
  params: z.infer<typeof updatePersonSchema>
): Promise<string> {
  const validated = updatePersonSchema.parse(params);
  const { handle, add_event_ref, add_note, ...updateFields } = validated;

  // First, fetch the existing person
  const existing = await grampsClient.get<Person>(`${API_ENDPOINTS.PEOPLE}${handle}`);

  // Build the updated person object
  const updatedPerson: Record<string, unknown> = {
    _class: "Person",
    handle: existing.handle,
    gramps_id: updateFields.gramps_id ?? existing.gramps_id,
    change: existing.change,
  };

  // Handle primary_name update - merge with existing to preserve unspecified fields
  if (updateFields.primary_name) {
    const existingName = (existing.primary_name || {}) as Record<string, unknown>;
    const nameData = {
      ...existingName, // Keep existing fields
      ...updateFields.primary_name, // Override with provided fields
    } as Record<string, unknown>;
    // Map nickname to call_name (API field name)
    if (nameData.nickname) {
      nameData.call_name = nameData.nickname;
      delete nameData.nickname;
    }
    updatedPerson.primary_name = { _class: "Name", ...nameData };
  } else {
    updatedPerson.primary_name = existing.primary_name;
  }

  // Handle alternate_names update
  // Note: alternate_names replaces the entire list (not merged per-name)
  // This is intentional - use the full list when updating alternate names
  if (updateFields.alternate_names) {
    updatedPerson.alternate_names = updateFields.alternate_names.map((n) => {
      const nameData = { ...n } as Record<string, unknown>;
      // Map nickname to call_name (API field name)
      if (nameData.nickname) {
        nameData.call_name = nameData.nickname;
        delete nameData.nickname;
      }
      return { _class: "Name", ...nameData };
    });
  } else {
    updatedPerson.alternate_names = existing.alternate_names;
  }

  // Handle gender update
  if (updateFields.gender !== undefined) {
    updatedPerson.gender = mapGender(updateFields.gender);
  } else {
    updatedPerson.gender = existing.gender;
  }

  // Handle event_ref_list update (with optional add)
  let eventRefs = updateFields.event_ref_list
    ? updateFields.event_ref_list.map((e) => ({ _class: "EventRef", ...e }))
    : existing.event_ref_list?.map((e) => ({ _class: "EventRef", ...e })) || [];

  if (add_event_ref) {
    eventRefs = [...eventRefs, { _class: "EventRef", ...add_event_ref }];
  }
  updatedPerson.event_ref_list = eventRefs;

  // Handle family lists
  updatedPerson.family_list = updateFields.family_list ?? existing.family_list;
  updatedPerson.parent_family_list = updateFields.parent_family_list ?? existing.parent_family_list;

  // Handle media_list update
  if (updateFields.media_list) {
    updatedPerson.media_list = updateFields.media_list.map((m) => ({
      _class: "MediaRef",
      ...m,
    }));
  } else {
    updatedPerson.media_list = existing.media_list;
  }

  // Handle citation_list update
  updatedPerson.citation_list = updateFields.citation_list ?? existing.citation_list;

  // Handle note_list update (with optional add)
  let noteList = updateFields.note_list ?? existing.note_list ?? [];
  if (add_note) {
    noteList = [...noteList, add_note];
  }
  updatedPerson.note_list = noteList;

  // Handle attribute_list update
  if (updateFields.attribute_list) {
    updatedPerson.attribute_list = updateFields.attribute_list.map((a) => ({
      _class: "Attribute",
      ...a,
    }));
  } else {
    updatedPerson.attribute_list = existing.attribute_list;
  }

  // Handle tag_list and private
  updatedPerson.tag_list = updateFields.tag_list ?? existing.tag_list;
  updatedPerson.private = updateFields.private ?? existing.private;

  // Preserve other existing fields
  updatedPerson.birth_ref_index = existing.birth_ref_index;
  updatedPerson.death_ref_index = existing.death_ref_index;

  // PUT the updated person
  const rawResponse = await grampsClient.put<GrampsEntity | GrampsEntity[]>(
    `${API_ENDPOINTS.PEOPLE}${handle}`,
    updatedPerson
  );

  const response = Array.isArray(rawResponse) ? rawResponse[0] : rawResponse;

  if (!response?.handle) {
    throw new Error(
      `API did not return entity handle after updating person. Response: ${JSON.stringify(rawResponse)}`
    );
  }

  const genderMap: Record<number, string> = { 0: "female", 1: "male", 2: "unknown" };
  const updatedGender = updatedPerson.gender as number | undefined;

  return formatToolResponse({
    status: "success",
    summary: `Updated person: ${formatPersonName(updatedPerson.primary_name as { first_name?: string; surname?: string })}`,
    data: {
      handle: response.handle,
      gramps_id: response.gramps_id,
      name: formatPersonName(updatedPerson.primary_name as { first_name?: string; surname?: string }),
      gender: updatedGender !== undefined ? genderMap[updatedGender] : "unknown",
    },
    details: "Person record updated successfully.",
  });
}

/**
 * Update an existing family
 */
export async function grampsUpdateFamily(
  params: z.infer<typeof updateFamilySchema>
): Promise<string> {
  const validated = updateFamilySchema.parse(params);
  const { handle, add_child, remove_child, add_event_ref, ...updateFields } = validated;

  // First, fetch the existing family
  const existing = await grampsClient.get<Family>(`${API_ENDPOINTS.FAMILIES}${handle}`);

  // Build the updated family object
  const updatedFamily: Record<string, unknown> = {
    _class: "Family",
    handle: existing.handle,
    gramps_id: updateFields.gramps_id ?? existing.gramps_id,
    change: existing.change,
  };

  // Handle parent updates (null means remove)
  if (updateFields.father_handle !== undefined) {
    updatedFamily.father_handle = updateFields.father_handle;
  } else {
    updatedFamily.father_handle = existing.father_handle;
  }

  if (updateFields.mother_handle !== undefined) {
    updatedFamily.mother_handle = updateFields.mother_handle;
  } else {
    updatedFamily.mother_handle = existing.mother_handle;
  }

  // Handle child_ref_list update (with optional add/remove)
  let childRefs = updateFields.child_ref_list
    ? updateFields.child_ref_list.map((c) => ({ _class: "ChildRef", ...c }))
    : existing.child_ref_list?.map((c) => ({ _class: "ChildRef", ...c })) || [];

  if (remove_child) {
    childRefs = childRefs.filter((c) => c.ref !== remove_child);
  }

  if (add_child) {
    // Check if child already exists
    const exists = childRefs.some((c) => c.ref === add_child.ref);
    if (!exists) {
      childRefs = [...childRefs, { _class: "ChildRef", ...add_child }];
    }
  }
  updatedFamily.child_ref_list = childRefs;

  // Handle type update
  updatedFamily.type = updateFields.type ?? existing.type;

  // Handle event_ref_list update (with optional add)
  let eventRefs = updateFields.event_ref_list
    ? updateFields.event_ref_list.map((e) => ({ _class: "EventRef", ...e }))
    : existing.event_ref_list?.map((e) => ({ _class: "EventRef", ...e })) || [];

  if (add_event_ref) {
    eventRefs = [...eventRefs, { _class: "EventRef", ...add_event_ref }];
  }
  updatedFamily.event_ref_list = eventRefs;

  // Handle media_list update
  if (updateFields.media_list) {
    updatedFamily.media_list = updateFields.media_list.map((m) => ({
      _class: "MediaRef",
      ...m,
    }));
  } else {
    updatedFamily.media_list = existing.media_list;
  }

  // Handle citation_list, note_list, attribute_list, tag_list
  updatedFamily.citation_list = updateFields.citation_list ?? existing.citation_list;
  updatedFamily.note_list = updateFields.note_list ?? existing.note_list;

  if (updateFields.attribute_list) {
    updatedFamily.attribute_list = updateFields.attribute_list.map((a) => ({
      _class: "Attribute",
      ...a,
    }));
  } else {
    updatedFamily.attribute_list = existing.attribute_list;
  }

  updatedFamily.tag_list = updateFields.tag_list ?? existing.tag_list;
  updatedFamily.private = updateFields.private ?? existing.private;

  // PUT the updated family
  const rawResponse = await grampsClient.put<GrampsEntity | GrampsEntity[]>(
    `${API_ENDPOINTS.FAMILIES}${handle}`,
    updatedFamily
  );

  // API returns an array of change records - find the Family entry
  let response: GrampsEntity | undefined;
  if (Array.isArray(rawResponse)) {
    response = rawResponse.find((r) => r._class === "Family") || rawResponse[0];
  } else {
    response = rawResponse;
  }

  if (!response?.handle) {
    throw new Error(
      `API did not return entity handle after updating family. Response: ${JSON.stringify(rawResponse)}`
    );
  }

  const childCount = (updatedFamily.child_ref_list as unknown[])?.length || 0;

  return formatToolResponse({
    status: "success",
    summary: `Updated family: ${response.gramps_id}`,
    data: {
      handle: response.handle,
      gramps_id: response.gramps_id,
      father_handle: updatedFamily.father_handle || null,
      mother_handle: updatedFamily.mother_handle || null,
      children_count: childCount,
      type: updatedFamily.type || "Unknown",
    },
    details: "Family record updated successfully.",
  });
}

// Tool definitions for MCP
export const updateTools = {
  gramps_update_person: {
    name: "gramps_update_person",
    description:
      "Update an existing person record. " +
      "REQUIRED: handle of person to update. " +
      "OPTIONAL: Any field to update (name, gender, add events, etc.). " +
      "NAME UPDATES: When updating primary_name, only provide the fields you want to change - " +
      "other name fields (first_name, surname, etc.) are preserved automatically. " +
      "SHORTCUTS: add_event_ref (append event), add_note (append note). " +
      "RETURNS: Updated person details.",
    inputSchema: {
      type: "object" as const,
      properties: {
        handle: {
          type: "string",
          description: "Person handle to update (from search results)",
        },
        primary_name: {
          type: "object",
          description:
            "Update primary name fields. Only include fields you want to change - " +
            "existing fields are preserved. Example: {nickname: 'Nicks'} only updates " +
            "nickname, keeping first_name and surname intact.",
          properties: {
            first_name: { type: "string", description: "Update first name" },
            surname: { type: "string", description: "Update surname" },
            nickname: { type: "string", description: "Update nickname (also known as call name)" },
            suffix: { type: "string", description: "Update suffix" },
            title: { type: "string", description: "Update title" },
          },
        },
        gender: {
          type: "string",
          enum: ["male", "female", "unknown"],
          description: "Update gender",
        },
        add_event_ref: {
          type: "object",
          description: "Add a single event reference without replacing existing ones",
          properties: {
            ref: { type: "string", description: "Event handle" },
            role: { type: "string", description: "Role (e.g., 'Primary')" },
          },
          required: ["ref"],
        },
        add_note: {
          type: "string",
          description: "Add a single note handle without replacing existing ones",
        },
        private: {
          type: "boolean",
          description: "Update private flag",
        },
      },
      required: ["handle"],
    },
    handler: grampsUpdatePerson,
  },

  gramps_update_family: {
    name: "gramps_update_family",
    description:
      "Update an existing family record. " +
      "REQUIRED: handle of family to update. " +
      "OPTIONAL: Update parents, add/remove children, change relationship type. " +
      "SHORTCUTS: add_child (append child), remove_child (remove by handle), add_event_ref (append event). " +
      "RETURNS: Updated family details.",
    inputSchema: {
      type: "object" as const,
      properties: {
        handle: {
          type: "string",
          description: "Family handle to update (from search results)",
        },
        father_handle: {
          type: ["string", "null"],
          description: "Update father handle (null to remove father)",
        },
        mother_handle: {
          type: ["string", "null"],
          description: "Update mother handle (null to remove mother)",
        },
        add_child: {
          type: "object",
          description: "Add a child to the family",
          properties: {
            ref: { type: "string", description: "Child's person handle" },
            frel: { type: "string", description: "Father relationship (Birth, Adopted, Stepchild)" },
            mrel: { type: "string", description: "Mother relationship (Birth, Adopted, Stepchild)" },
          },
          required: ["ref"],
        },
        remove_child: {
          type: "string",
          description: "Remove a child by person handle",
        },
        type: {
          type: "string",
          description: "Update relationship type (e.g., 'Married', 'Unknown')",
        },
        add_event_ref: {
          type: "object",
          description: "Add a single event reference (e.g., marriage event)",
          properties: {
            ref: { type: "string", description: "Event handle" },
            role: { type: "string", description: "Role (e.g., 'Family')" },
          },
          required: ["ref"],
        },
        private: {
          type: "boolean",
          description: "Update private flag",
        },
      },
      required: ["handle"],
    },
    handler: grampsUpdateFamily,
  },
};
