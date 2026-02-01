/**
 * Tool registry - exports all tools for MCP server
 */

import { searchTools } from "./search.js";
import { createTools } from "./create.js";
import { analysisTools } from "./analysis.js";
import { listTools } from "./list.js";
import { updateTools } from "./update.js";
import { convenienceTools } from "./convenience.js";
import { deleteTools } from "./delete.js";
import { tagTools } from "./tags.js";

// Combine all tools
export const allTools = {
  ...searchTools,
  ...createTools,
  ...analysisTools,
  ...listTools,
  ...updateTools,
  ...convenienceTools,
  ...deleteTools,
  ...tagTools,
};

// Export tool names for registration
export const toolNames = Object.keys(allTools);

// Export individual tool groups
export { searchTools, createTools, analysisTools, listTools, updateTools, convenienceTools, deleteTools, tagTools };
