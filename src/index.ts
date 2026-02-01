#!/usr/bin/env node

/**
 * Gramps Web MCP Server
 *
 * An MCP server that provides tools for interacting with the Gramps Web API
 * for genealogy research.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";

import { loadConfig } from "./config.js";
import { authManager } from "./auth.js";
import { grampsClient } from "./client.js";
import { allTools } from "./tools/index.js";
import { formatErrorForMCP } from "./utils/errors.js";

// Logger that writes to stderr (stdout is for MCP JSON-RPC)
const log = {
  info: (msg: string) => console.error(`[INFO] ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${msg}`),
  debug: (msg: string) => {
    if (process.env.DEBUG) {
      console.error(`[DEBUG] ${msg}`);
    }
  },
};

async function main() {
  log.info("Starting Gramps Web MCP Server...");

  // Load and validate configuration
  let config;
  try {
    config = loadConfig();
    log.info(`Connecting to Gramps Web at: ${config.apiUrl}`);
  } catch (error) {
    log.error(formatErrorForMCP(error));
    process.exit(1);
  }

  // Initialize auth manager and API client
  authManager.initialize(config);
  grampsClient.initialize(config);

  // Test authentication
  try {
    await authManager.getToken();
    log.info("Authentication successful");
  } catch (error) {
    log.error(`Authentication failed: ${formatErrorForMCP(error)}`);
    process.exit(1);
  }

  // Create MCP server
  const server = new Server(
    {
      name: "gramps-web",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tool list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools: Tool[] = Object.values(allTools).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));

    return { tools };
  });

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    log.debug(`Tool called: ${name}`);

    const tool = allTools[name as keyof typeof allTools];
    if (!tool) {
      return {
        content: [
          {
            type: "text",
            text: `Unknown tool: ${name}`,
          },
        ],
        isError: true,
      };
    }

    try {
      const result = await tool.handler(args as never);
      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    } catch (error) {
      const errorMessage = formatErrorForMCP(error);
      log.error(`Tool ${name} failed: ${errorMessage}`);
      return {
        content: [
          {
            type: "text",
            text: `Error: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Set up error handlers
  server.onerror = (error) => {
    log.error(`Server error: ${error.message}`);
  };

  process.on("SIGINT", async () => {
    log.info("Shutting down...");
    await server.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    log.info("Shutting down...");
    await server.close();
    process.exit(0);
  });

  // Start the server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  log.info("Gramps Web MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
