/**
 * Convenience tools for common genealogy operations
 */

import { z } from "zod";
import { grampsClient } from "../client.js";
import { API_ENDPOINTS } from "../constants.js";
import { formatToolResponse } from "../utils/response.js";
import { formatPersonName, normalizeDateval } from "../utils/formatting.js";
import type { Family, Person, GrampsEntity, Event } from "../types.js";

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

// Schema for setting birth/death date
const setPersonVitalEventSchema = z.object({
  person_handle: z.string().describe("Person handle to add birth/death event to"),
  date: z
    .object({
      dateval: z
        .array(z.number())
        .optional()
        .describe("Date as [day, month, year] - use 0 for unknown day/month"),
      text: z.string().optional().describe("Date as text (e.g., 'about 1920', 'before 1950')"),
    })
    .describe("Event date - provide either dateval or text"),
  place_handle: z.string().optional().describe("Place handle for the event location"),
  description: z.string().optional().describe("Event description or notes"),
});

/**
 * Create a birth event and link it to a person
 */
export async function grampsSetPersonBirth(
  params: z.infer<typeof setPersonVitalEventSchema>
): Promise<string> {
  const { person_handle, date, place_handle, description } = setPersonVitalEventSchema.parse(params);

  // Fetch the person first
  const person = await grampsClient.get<Person>(`${API_ENDPOINTS.PEOPLE}${person_handle}`);

  // Normalize the date to ensure dateval has 4 elements
  const normalizedDate = date ? {
    ...date,
    dateval: normalizeDateval(date.dateval),
  } : undefined;

  // Create the birth event
  const event = {
    _class: "Event",
    type: "Birth",
    date: normalizedDate ? { _class: "Date", ...normalizedDate } : undefined,
    place: place_handle,
    description,
  };

  const eventResponse = await grampsClient.post<GrampsEntity | GrampsEntity[]>(
    API_ENDPOINTS.EVENTS,
    event
  );

  const createdEvent = Array.isArray(eventResponse) ? eventResponse[0] : eventResponse;

  if (!createdEvent?.handle) {
    throw new Error(
      `API did not return event handle after creating birth event. Response: ${JSON.stringify(eventResponse)}`
    );
  }

  // Now update the person to add the event reference
  const existingEventRefs = person.event_ref_list || [];
  const newEventRef = {
    _class: "EventRef",
    ref: createdEvent.handle,
    role: "Primary",
  };

  const updatedPerson = {
    _class: "Person",
    handle: person.handle,
    gramps_id: person.gramps_id,
    change: person.change,
    primary_name: person.primary_name,
    alternate_names: person.alternate_names,
    gender: person.gender,
    event_ref_list: [
      ...existingEventRefs.map((e) => ({ _class: "EventRef", ...e })),
      newEventRef,
    ],
    family_list: person.family_list,
    parent_family_list: person.parent_family_list,
    media_list: person.media_list?.map((m) => ({ _class: "MediaRef", ...m })),
    citation_list: person.citation_list,
    note_list: person.note_list,
    attribute_list: person.attribute_list?.map((a) => ({ _class: "Attribute", ...a })),
    tag_list: person.tag_list,
    private: person.private,
    birth_ref_index: existingEventRefs.length, // Index of the new birth event
    death_ref_index: person.death_ref_index,
  };

  await grampsClient.put<GrampsEntity | GrampsEntity[]>(
    `${API_ENDPOINTS.PEOPLE}${person_handle}`,
    updatedPerson
  );

  const personName = formatPersonName(person.primary_name);
  const dateDisplay = date.text || (date.dateval ? `${date.dateval[2]}-${date.dateval[1]}-${date.dateval[0]}` : "unknown");

  return formatToolResponse({
    status: "success",
    summary: `Added birth date to ${personName}`,
    data: {
      person_handle,
      person_gramps_id: person.gramps_id,
      person_name: personName,
      event_handle: createdEvent.handle,
      event_gramps_id: createdEvent.gramps_id,
      date: dateDisplay,
      place_handle: place_handle || null,
    },
    details: `Created birth event (${createdEvent.gramps_id}) and linked to person.`,
  });
}

/**
 * Create a death event and link it to a person
 */
export async function grampsSetPersonDeath(
  params: z.infer<typeof setPersonVitalEventSchema>
): Promise<string> {
  const { person_handle, date, place_handle, description } = setPersonVitalEventSchema.parse(params);

  // Fetch the person first
  const person = await grampsClient.get<Person>(`${API_ENDPOINTS.PEOPLE}${person_handle}`);

  // Normalize the date to ensure dateval has 4 elements
  const normalizedDate = date ? {
    ...date,
    dateval: normalizeDateval(date.dateval),
  } : undefined;

  // Create the death event
  const event = {
    _class: "Event",
    type: "Death",
    date: normalizedDate ? { _class: "Date", ...normalizedDate } : undefined,
    place: place_handle,
    description,
  };

  const eventResponse = await grampsClient.post<GrampsEntity | GrampsEntity[]>(
    API_ENDPOINTS.EVENTS,
    event
  );

  const createdEvent = Array.isArray(eventResponse) ? eventResponse[0] : eventResponse;

  if (!createdEvent?.handle) {
    throw new Error(
      `API did not return event handle after creating death event. Response: ${JSON.stringify(eventResponse)}`
    );
  }

  // Now update the person to add the event reference
  const existingEventRefs = person.event_ref_list || [];
  const newEventRef = {
    _class: "EventRef",
    ref: createdEvent.handle,
    role: "Primary",
  };

  const updatedPerson = {
    _class: "Person",
    handle: person.handle,
    gramps_id: person.gramps_id,
    change: person.change,
    primary_name: person.primary_name,
    alternate_names: person.alternate_names,
    gender: person.gender,
    event_ref_list: [
      ...existingEventRefs.map((e) => ({ _class: "EventRef", ...e })),
      newEventRef,
    ],
    family_list: person.family_list,
    parent_family_list: person.parent_family_list,
    media_list: person.media_list?.map((m) => ({ _class: "MediaRef", ...m })),
    citation_list: person.citation_list,
    note_list: person.note_list,
    attribute_list: person.attribute_list?.map((a) => ({ _class: "Attribute", ...a })),
    tag_list: person.tag_list,
    private: person.private,
    birth_ref_index: person.birth_ref_index,
    death_ref_index: existingEventRefs.length, // Index of the new death event
  };

  await grampsClient.put<GrampsEntity | GrampsEntity[]>(
    `${API_ENDPOINTS.PEOPLE}${person_handle}`,
    updatedPerson
  );

  const personName = formatPersonName(person.primary_name);
  const dateDisplay = date.text || (date.dateval ? `${date.dateval[2]}-${date.dateval[1]}-${date.dateval[0]}` : "unknown");

  return formatToolResponse({
    status: "success",
    summary: `Added death date to ${personName}`,
    data: {
      person_handle,
      person_gramps_id: person.gramps_id,
      person_name: personName,
      event_handle: createdEvent.handle,
      event_gramps_id: createdEvent.gramps_id,
      date: dateDisplay,
      place_handle: place_handle || null,
    },
    details: `Created death event (${createdEvent.gramps_id}) and linked to person.`,
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

  gramps_set_person_birth: {
    name: "gramps_set_person_birth",
    description:
      "Create a birth event and automatically link it to a person. " +
      "REQUIRED: person_handle and date (dateval or text). " +
      "OPTIONAL: place_handle, description. " +
      "USE FOR: Quickly adding birth information without manual event creation.",
    inputSchema: {
      type: "object" as const,
      properties: {
        person_handle: {
          type: "string",
          description: "Handle of the person to add birth to",
        },
        date: {
          type: "object",
          description: "Birth date - provide dateval OR text",
          properties: {
            dateval: {
              type: "array",
              items: { type: "number" },
              description: "Date as [day, month, year] or [day, month, year, false]. Use 0 for unknown parts (e.g., [0, 0, 1990] for just year)",
            },
            text: {
              type: "string",
              description: "Date as text (e.g., 'about 1920', 'before March 1950')",
            },
          },
        },
        place_handle: {
          type: "string",
          description: "Place handle for birth location (from gramps_create_place or search)",
        },
        description: {
          type: "string",
          description: "Additional notes about the birth",
        },
      },
      required: ["person_handle", "date"],
    },
    handler: grampsSetPersonBirth,
  },

  gramps_set_person_death: {
    name: "gramps_set_person_death",
    description:
      "Create a death event and automatically link it to a person. " +
      "REQUIRED: person_handle and date (dateval or text). " +
      "OPTIONAL: place_handle, description. " +
      "USE FOR: Quickly adding death information without manual event creation.",
    inputSchema: {
      type: "object" as const,
      properties: {
        person_handle: {
          type: "string",
          description: "Handle of the person to add death to",
        },
        date: {
          type: "object",
          description: "Death date - provide dateval OR text",
          properties: {
            dateval: {
              type: "array",
              items: { type: "number" },
              description: "Date as [day, month, year] or [day, month, year, false]. Use 0 for unknown parts (e.g., [0, 0, 1990] for just year)",
            },
            text: {
              type: "string",
              description: "Date as text (e.g., 'about 1920', 'after March 1950')",
            },
          },
        },
        place_handle: {
          type: "string",
          description: "Place handle for death location (from gramps_create_place or search)",
        },
        description: {
          type: "string",
          description: "Additional notes about the death",
        },
      },
      required: ["person_handle", "date"],
    },
    handler: grampsSetPersonDeath,
  },
};
