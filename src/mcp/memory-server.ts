#!/usr/bin/env node

/**
 * MCP server for OMC cross-session project memory.
 * Provides tools to read/write persistent key-value memory.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { ensureDir } from "../utils/fs.js";
import { getProjectMemoryPath } from "../state/paths.js";

const server = new Server(
  { name: "omc-memory", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

type MemoryStore = Record<string, unknown>;

function loadMemory(): MemoryStore {
  const path = getProjectMemoryPath();
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return {};
  }
}

function saveMemory(memory: MemoryStore): void {
  const path = getProjectMemoryPath();
  ensureDir(dirname(path));
  writeFileSync(path, JSON.stringify(memory, null, 2) + "\n");
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "memory_get",
      description: "Read a value from cross-session project memory",
      inputSchema: {
        type: "object" as const,
        properties: {
          key: { type: "string", description: "Memory key to read" },
        },
        required: ["key"],
      },
    },
    {
      name: "memory_set",
      description: "Write a value to cross-session project memory",
      inputSchema: {
        type: "object" as const,
        properties: {
          key: { type: "string", description: "Memory key to write" },
          value: { description: "Value to store (any JSON-serializable value)" },
        },
        required: ["key", "value"],
      },
    },
    {
      name: "memory_delete",
      description: "Delete a key from project memory",
      inputSchema: {
        type: "object" as const,
        properties: {
          key: { type: "string", description: "Memory key to delete" },
        },
        required: ["key"],
      },
    },
    {
      name: "memory_list",
      description: "List all keys in project memory",
      inputSchema: { type: "object" as const, properties: {} },
    },
    {
      name: "memory_clear",
      description: "Clear all project memory (destructive)",
      inputSchema: { type: "object" as const, properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "memory_get": {
      const key = (args as { key: string }).key;
      const memory = loadMemory();
      if (!(key in memory)) {
        return { content: [{ type: "text", text: `Key not found: ${key}` }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(memory[key], null, 2) }] };
    }

    case "memory_set": {
      const { key, value } = args as { key: string; value: unknown };
      const memory = loadMemory();
      memory[key] = value;
      saveMemory(memory);
      return { content: [{ type: "text", text: `Stored: ${key}` }] };
    }

    case "memory_delete": {
      const key = (args as { key: string }).key;
      const memory = loadMemory();
      delete memory[key];
      saveMemory(memory);
      return { content: [{ type: "text", text: `Deleted: ${key}` }] };
    }

    case "memory_list": {
      const memory = loadMemory();
      const keys = Object.keys(memory);
      return { content: [{ type: "text", text: keys.length > 0 ? keys.join("\n") : "(empty)" }] };
    }

    case "memory_clear": {
      saveMemory({});
      return { content: [{ type: "text", text: "Memory cleared" }] };
    }

    default:
      return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
