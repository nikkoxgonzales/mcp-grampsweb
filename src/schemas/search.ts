/**
 * Search parameter schemas
 */

import { z } from "zod";
import { entityTypeSchema, handleOrIdSchema } from "./common.js";

// GQL search schema
export const searchSchema = z.object({
  query: z.string().min(1).describe("GQL query string (e.g., 'surname=Smith', 'gender=M')"),
  entity_type: entityTypeSchema.describe("Type of entity to search"),
  page: z.number().int().positive().default(1).describe("Page number (1-indexed)"),
  pagesize: z.number().int().positive().max(100).default(20).describe("Results per page"),
});

// Full-text search schema
export const findSchema = z.object({
  query: z.string().min(1).describe("Full-text search query"),
  page: z.number().int().positive().default(1).describe("Page number (1-indexed)"),
  pagesize: z.number().int().positive().max(100).default(20).describe("Results per page"),
});

// Get entity schema
export const getEntitySchema = z.object({
  entity_type: entityTypeSchema.describe("Type of entity to retrieve"),
  handle: handleOrIdSchema.describe("Entity handle or Gramps ID"),
});

// Export types
export type SearchParams = z.infer<typeof searchSchema>;
export type FindParams = z.infer<typeof findSchema>;
export type GetEntityParams = z.infer<typeof getEntitySchema>;
