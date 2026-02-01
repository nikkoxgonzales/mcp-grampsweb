/**
 * Entity creation/update schemas
 */

import { z } from "zod";
import {
  personNameSchema,
  eventRefSchema,
  childRefSchema,
  mediaRefSchema,
  placeRefSchema,
  repoRefSchema,
  attributeSchema,
  urlSchema,
  addressSchema,
  placeNameSchema,
  dateSchema,
} from "./common.js";

// Person creation schema
export const createPersonSchema = z.object({
  gramps_id: z.string().optional().describe("Gramps ID (auto-generated if not provided)"),
  primary_name: personNameSchema.describe("Primary name"),
  alternate_names: z.array(personNameSchema).optional().describe("Alternate names"),
  gender: z.enum(["male", "female", "unknown"]).optional().describe("Gender"),
  event_ref_list: z.array(eventRefSchema).optional().describe("Event references"),
  family_list: z.array(z.string()).optional().describe("Family handles (as spouse/parent)"),
  parent_family_list: z.array(z.string()).optional().describe("Family handles (as child)"),
  media_list: z.array(mediaRefSchema).optional().describe("Media references"),
  citation_list: z.array(z.string()).optional().describe("Citation handles"),
  note_list: z.array(z.string()).optional().describe("Note handles"),
  attribute_list: z.array(attributeSchema).optional().describe("Attributes"),
  tag_list: z.array(z.string()).optional().describe("Tag handles"),
  private: z.boolean().optional().describe("Mark as private"),
});

// Family creation schema
export const createFamilySchema = z.object({
  gramps_id: z.string().optional().describe("Gramps ID (auto-generated if not provided)"),
  father_handle: z.string().optional().describe("Father's person handle"),
  mother_handle: z.string().optional().describe("Mother's person handle"),
  child_ref_list: z.array(childRefSchema).optional().describe("Child references"),
  type: z.string().optional().describe("Relationship type (e.g., 'Married', 'Unknown')"),
  event_ref_list: z.array(eventRefSchema).optional().describe("Event references"),
  media_list: z.array(mediaRefSchema).optional().describe("Media references"),
  citation_list: z.array(z.string()).optional().describe("Citation handles"),
  note_list: z.array(z.string()).optional().describe("Note handles"),
  attribute_list: z.array(attributeSchema).optional().describe("Attributes"),
  tag_list: z.array(z.string()).optional().describe("Tag handles"),
  private: z.boolean().optional().describe("Mark as private"),
});

// Event creation schema
export const createEventSchema = z.object({
  gramps_id: z.string().optional().describe("Gramps ID (auto-generated if not provided)"),
  type: z.string().describe("Event type (e.g., 'Birth', 'Death', 'Marriage', 'Burial')"),
  date: dateSchema.describe("Event date"),
  place: z.string().optional().describe("Place handle"),
  description: z.string().optional().describe("Event description"),
  media_list: z.array(mediaRefSchema).optional().describe("Media references"),
  citation_list: z.array(z.string()).optional().describe("Citation handles"),
  note_list: z.array(z.string()).optional().describe("Note handles"),
  attribute_list: z.array(attributeSchema).optional().describe("Attributes"),
  tag_list: z.array(z.string()).optional().describe("Tag handles"),
  private: z.boolean().optional().describe("Mark as private"),
});

// Place creation schema
export const createPlaceSchema = z.object({
  gramps_id: z.string().optional().describe("Gramps ID (auto-generated if not provided)"),
  title: z.string().optional().describe("Place title"),
  name: placeNameSchema.optional().describe("Primary place name"),
  alt_names: z.array(placeNameSchema).optional().describe("Alternate names"),
  lat: z.string().optional().describe("Latitude"),
  long: z.string().optional().describe("Longitude"),
  placeref_list: z.array(placeRefSchema).optional().describe("Parent place references"),
  place_type: z.string().optional().describe("Place type (e.g., 'City', 'Country', 'State')"),
  media_list: z.array(mediaRefSchema).optional().describe("Media references"),
  citation_list: z.array(z.string()).optional().describe("Citation handles"),
  note_list: z.array(z.string()).optional().describe("Note handles"),
  tag_list: z.array(z.string()).optional().describe("Tag handles"),
  private: z.boolean().optional().describe("Mark as private"),
});

// Source creation schema
export const createSourceSchema = z.object({
  gramps_id: z.string().optional().describe("Gramps ID (auto-generated if not provided)"),
  title: z.string().describe("Source title"),
  author: z.string().optional().describe("Author"),
  pubinfo: z.string().optional().describe("Publication information"),
  abbrev: z.string().optional().describe("Abbreviation"),
  reporef_list: z.array(repoRefSchema).optional().describe("Repository references"),
  media_list: z.array(mediaRefSchema).optional().describe("Media references"),
  note_list: z.array(z.string()).optional().describe("Note handles"),
  tag_list: z.array(z.string()).optional().describe("Tag handles"),
  private: z.boolean().optional().describe("Mark as private"),
});

// Citation creation schema
export const createCitationSchema = z.object({
  gramps_id: z.string().optional().describe("Gramps ID (auto-generated if not provided)"),
  source_handle: z.string().describe("Source handle"),
  page: z.string().optional().describe("Page or location within source"),
  confidence: z.number().int().min(0).max(4).optional().describe("Confidence level (0=Very Low to 4=Very High)"),
  date: dateSchema.describe("Citation date"),
  media_list: z.array(mediaRefSchema).optional().describe("Media references"),
  note_list: z.array(z.string()).optional().describe("Note handles"),
  tag_list: z.array(z.string()).optional().describe("Tag handles"),
  private: z.boolean().optional().describe("Mark as private"),
});

// Note creation schema
export const createNoteSchema = z.object({
  gramps_id: z.string().optional().describe("Gramps ID (auto-generated if not provided)"),
  text: z.string().describe("Note text content"),
  format: z.number().int().min(0).max(1).optional().describe("Format (0=flowed, 1=preformatted)"),
  type: z.string().optional().describe("Note type (e.g., 'General', 'Research', 'Transcript')"),
  tag_list: z.array(z.string()).optional().describe("Tag handles"),
  private: z.boolean().optional().describe("Mark as private"),
});

// Media creation schema
export const createMediaSchema = z.object({
  gramps_id: z.string().optional().describe("Gramps ID (auto-generated if not provided)"),
  path: z.string().describe("File path or URL"),
  mime: z.string().optional().describe("MIME type"),
  desc: z.string().optional().describe("Description"),
  date: dateSchema.describe("Media date"),
  citation_list: z.array(z.string()).optional().describe("Citation handles"),
  note_list: z.array(z.string()).optional().describe("Note handles"),
  attribute_list: z.array(attributeSchema).optional().describe("Attributes"),
  tag_list: z.array(z.string()).optional().describe("Tag handles"),
  private: z.boolean().optional().describe("Mark as private"),
});

// Repository creation schema
export const createRepositorySchema = z.object({
  gramps_id: z.string().optional().describe("Gramps ID (auto-generated if not provided)"),
  name: z.string().describe("Repository name"),
  type: z.string().optional().describe("Repository type (e.g., 'Library', 'Archive', 'Website')"),
  address_list: z.array(addressSchema).optional().describe("Addresses"),
  urls: z.array(urlSchema).optional().describe("URLs"),
  note_list: z.array(z.string()).optional().describe("Note handles"),
  tag_list: z.array(z.string()).optional().describe("Tag handles"),
  private: z.boolean().optional().describe("Mark as private"),
});

// Export types
export type CreatePersonParams = z.infer<typeof createPersonSchema>;
export type CreateFamilyParams = z.infer<typeof createFamilySchema>;
export type CreateEventParams = z.infer<typeof createEventSchema>;
export type CreatePlaceParams = z.infer<typeof createPlaceSchema>;
export type CreateSourceParams = z.infer<typeof createSourceSchema>;
export type CreateCitationParams = z.infer<typeof createCitationSchema>;
export type CreateNoteParams = z.infer<typeof createNoteSchema>;
export type CreateMediaParams = z.infer<typeof createMediaSchema>;
export type CreateRepositoryParams = z.infer<typeof createRepositorySchema>;
