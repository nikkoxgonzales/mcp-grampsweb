/**
 * Shared Zod schemas for common types
 */

import { z } from "zod";

// Entity type schema
export const entityTypeSchema = z.enum([
  "people",
  "families",
  "events",
  "places",
  "sources",
  "citations",
  "repositories",
  "media",
  "notes",
]);

// Handle or Gramps ID schema
export const handleOrIdSchema = z.string().min(1).describe("Entity handle or Gramps ID");

// Date schema for Gramps
export const dateSchema = z.object({
  _class: z.literal("Date").optional(),
  calendar: z.number().optional(),
  modifier: z.number().optional(),
  quality: z.number().optional(),
  dateval: z.array(z.number()).optional(),
  text: z.string().optional(),
  sortval: z.number().optional(),
  newyear: z.number().optional(),
}).optional();

// Person name schema
export const personNameSchema = z.object({
  _class: z.literal("Name").optional(),
  first_name: z.string().optional(),
  surname: z.string().optional(),
  suffix: z.string().optional(),
  title: z.string().optional(),
  type: z.string().optional(),
  primary: z.boolean().optional(),
});

// Event reference schema
export const eventRefSchema = z.object({
  _class: z.literal("EventRef").optional(),
  ref: z.string(),
  role: z.string().optional(),
});

// Child reference schema
export const childRefSchema = z.object({
  _class: z.literal("ChildRef").optional(),
  ref: z.string(),
  frel: z.string().optional(),
  mrel: z.string().optional(),
});

// Media reference schema
export const mediaRefSchema = z.object({
  _class: z.literal("MediaRef").optional(),
  ref: z.string(),
  rect: z.array(z.number()).optional(),
});

// Place reference schema
export const placeRefSchema = z.object({
  _class: z.literal("PlaceRef").optional(),
  ref: z.string(),
  date: dateSchema,
});

// Repository reference schema
export const repoRefSchema = z.object({
  _class: z.literal("RepoRef").optional(),
  ref: z.string(),
  call_number: z.string().optional(),
  media_type: z.string().optional(),
});

// Attribute schema
export const attributeSchema = z.object({
  _class: z.literal("Attribute").optional(),
  type: z.string().optional(),
  value: z.string().optional(),
});

// URL schema
export const urlSchema = z.object({
  _class: z.literal("Url").optional(),
  path: z.string().optional(),
  type: z.string().optional(),
  desc: z.string().optional(),
});

// Address schema
export const addressSchema = z.object({
  _class: z.literal("Address").optional(),
  street: z.string().optional(),
  locality: z.string().optional(),
  city: z.string().optional(),
  county: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postal: z.string().optional(),
  phone: z.string().optional(),
});

// Place name schema
export const placeNameSchema = z.object({
  _class: z.literal("PlaceName").optional(),
  value: z.string().optional(),
  date: dateSchema,
  lang: z.string().optional(),
});

// Gender schema
export const genderSchema = z.enum(["male", "female", "unknown"]).transform((val) => {
  switch (val) {
    case "male":
      return 1;
    case "female":
      return 0;
    default:
      return 2;
  }
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1).describe("Page number (1-indexed)"),
  pagesize: z.number().int().positive().max(100).default(20).describe("Results per page (max 100)"),
});
