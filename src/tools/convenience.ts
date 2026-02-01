/**
 * Convenience tools for common genealogy operations
 */

import { z } from "zod";
import { grampsClient } from "../client.js";
import { API_ENDPOINTS } from "../constants.js";
import { formatToolResponse } from "../utils/response.js";
import type { Family, GrampsEntity } from "../types.js";

// Schema for adding a child to a family
const addChildToFamilySchema = z.object({
  family_handle: z.string().describe("Family handle to add child to"),
  child_handle: z.string().describe("Person handle of the child to add"),
  frel: z.string().optional().default("Birth").describe("Father relationship: Birth, Adopted, Stepchild, Foster, Unknown"),
  mrel: z.string().optional().default("Birth").describe("Mother relationship: Birth, Adopted, Stepchild, Foster, Unknown"),
});

/**
 * Add an existing person as a child to an existing family
 */
export async function grampsAddChildToFamily(
  params: z.infer<typeof addChildToFamilySchema>
): Promise<string> {
  const { family_handle, child_handle, frel, mrel } = addChildToFamilySchema.parse(params);

  // Fetch the existing family
  const family = await grampsClient.get<Family>(`${API_ENDPOINTS.FAMILIES}${family_handle}`);

  // Check if child is already in the family
  const existingChildren = family.child_ref_list || [];
  const alreadyExists = existingChildren.some((c) => c.ref === child_handle);

  if (alreadyExists) {
    return formatToolResponse({
      status: "success",
      summary: `Child is already in family ${family.gramps_id}`,
      data: {
        family_handle: family.handle,
        family_gramps_id: family.gramps_id,
        child_handle,
        children_count: existingChildren.length,
      },
      details: "No changes were made - child was already a member of this family.",
    });
  }

  // Build the new child reference
  const newChildRef = {
    _class: "ChildRef",
    ref: child_handle,
    frel,
    mrel,
  };

  // Build the updated family object
  const updatedFamily = {
    _class: "Family",
    handle: family.handle,
    gramps_id: family.gramps_id,
    change: family.change,
    father_handle: family.father_handle,
    mother_handle: family.mother_handle,
    child_ref_list: [
      ...existingChildren.map((c) => ({ _class: "ChildRef", ...c })),
      newChildRef,
    ],
    type: family.type,
    event_ref_list: family.event_ref_list?.map((e) => ({ _class: "EventRef", ...e })),
    media_list: family.media_list?.map((m) => ({ _class: "MediaRef", ...m })),
    citation_list: family.citation_list,
    note_list: family.note_list,
    attribute_list: family.attribute_list?.map((a) => ({ _class: "Attribute", ...a })),
    tag_list: family.tag_list,
    private: family.private,
  };

  // PUT the updated family
  const rawResponse = await grampsClient.put<GrampsEntity | GrampsEntity[]>(
    `${API_ENDPOINTS.FAMILIES}${family_handle}`,
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

  return formatToolResponse({
    status: "success",
    summary: `Added child to family ${family.gramps_id}`,
    data: {
      family_handle: response.handle,
      family_gramps_id: response.gramps_id,
      child_handle,
      frel,
      mrel,
      children_count: existingChildren.length + 1,
    },
    details: `Child added with father relationship "${frel}" and mother relationship "${mrel}".`,
  });
}

// Tool definitions for MCP
export const convenienceTools = {
  gramps_add_child_to_family: {
    name: "gramps_add_child_to_family",
    description:
      "Add an existing person as a child to an existing family. " +
      "REQUIRED: family_handle, child_handle. " +
      "OPTIONAL: frel (father relationship), mrel (mother relationship). " +
      "DEFAULTS: Both relationships default to 'Birth'. " +
      "USE FOR: Quickly linking a person as a child without manual family updates.",
    inputSchema: {
      type: "object" as const,
      properties: {
        family_handle: {
          type: "string",
          description: "Family handle to add the child to",
        },
        child_handle: {
          type: "string",
          description: "Person handle of the child to add",
        },
        frel: {
          type: "string",
          enum: ["Birth", "Adopted", "Stepchild", "Foster", "Unknown"],
          description: "Father relationship type (default: Birth)",
          default: "Birth",
        },
        mrel: {
          type: "string",
          enum: ["Birth", "Adopted", "Stepchild", "Foster", "Unknown"],
          description: "Mother relationship type (default: Birth)",
          default: "Birth",
        },
      },
      required: ["family_handle", "child_handle"],
    },
    handler: grampsAddChildToFamily,
  },
};
