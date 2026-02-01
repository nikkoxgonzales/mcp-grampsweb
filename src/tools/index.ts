/**
 * Tool registry - exports all tools for MCP server
 */

import { searchTools } from "./search.js";
import { createTools } from "./create.js";
import { analysisTools } from "./analysis.js";

// Combine all tools
export const allTools = {
  ...searchTools,
  ...createTools,
  ...analysisTools,
};

// Export tool names for registration
export const toolNames = Object.keys(allTools);

// Export individual tool groups
export { searchTools, createTools, analysisTools };
