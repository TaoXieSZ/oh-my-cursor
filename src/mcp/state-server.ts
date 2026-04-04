#!/usr/bin/env node

/**
 * MCP server for OMC state management.
 * Provides tools to read/write .omc/ state, plans, and logs.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { ensureDir } from "../utils/fs.js";
import {
  getBaseStateDir,
  getModeStatePath,
  getPlanPath,
  getNotepadPath,
} from "../state/paths.js";

const server = new Server(
  { name: "omc-state", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "state_read",
      description: "Read a mode state file from .omc/state/",
      inputSchema: {
        type: "object" as const,
        properties: {
          mode: { type: "string", description: "Mode name (e.g. forge, team, deep-interview)" },
        },
        required: ["mode"],
      },
    },
    {
      name: "state_write",
      description: "Write a mode state file to .omc/state/",
      inputSchema: {
        type: "object" as const,
        properties: {
          mode: { type: "string", description: "Mode name" },
          state: { type: "object", description: "State object to write" },
        },
        required: ["mode", "state"],
      },
    },
    {
      name: "state_list",
      description: "List all mode state files in .omc/state/",
      inputSchema: { type: "object" as const, properties: {} },
    },
    {
      name: "plan_read",
      description: "Read a plan file from .omc/plans/",
      inputSchema: {
        type: "object" as const,
        properties: {
          filename: { type: "string", description: "Plan filename (e.g. prd-auth.md)" },
        },
        required: ["filename"],
      },
    },
    {
      name: "plan_write",
      description: "Write a plan file to .omc/plans/",
      inputSchema: {
        type: "object" as const,
        properties: {
          filename: { type: "string", description: "Plan filename" },
          content: { type: "string", description: "Plan content (markdown)" },
        },
        required: ["filename", "content"],
      },
    },
    {
      name: "plan_list",
      description: "List all plan files in .omc/plans/",
      inputSchema: { type: "object" as const, properties: {} },
    },
    {
      name: "notepad_read",
      description: "Read the notepad from .omc/notepad.md",
      inputSchema: { type: "object" as const, properties: {} },
    },
    {
      name: "notepad_append",
      description: "Append text to .omc/notepad.md",
      inputSchema: {
        type: "object" as const,
        properties: {
          text: { type: "string", description: "Text to append" },
        },
        required: ["text"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "state_read": {
      const mode = (args as { mode: string }).mode;
      const path = getModeStatePath(mode);
      if (!existsSync(path)) {
        return { content: [{ type: "text", text: `No state found for mode: ${mode}` }] };
      }
      return { content: [{ type: "text", text: readFileSync(path, "utf-8") }] };
    }

    case "state_write": {
      const { mode, state } = args as { mode: string; state: Record<string, unknown> };
      const path = getModeStatePath(mode);
      ensureDir(dirname(path));
      writeFileSync(path, JSON.stringify(state, null, 2) + "\n");
      return { content: [{ type: "text", text: `State written for mode: ${mode}` }] };
    }

    case "state_list": {
      const stateDir = join(getBaseStateDir(), "state");
      if (!existsSync(stateDir)) {
        return { content: [{ type: "text", text: "No state directory found" }] };
      }
      const files = readdirSync(stateDir).filter((f) => f.endsWith("-state.json"));
      return { content: [{ type: "text", text: JSON.stringify(files) }] };
    }

    case "plan_read": {
      const filename = (args as { filename: string }).filename;
      const path = getPlanPath(filename);
      if (!existsSync(path)) {
        return { content: [{ type: "text", text: `Plan not found: ${filename}` }] };
      }
      return { content: [{ type: "text", text: readFileSync(path, "utf-8") }] };
    }

    case "plan_write": {
      const { filename, content } = args as { filename: string; content: string };
      const path = getPlanPath(filename);
      ensureDir(dirname(path));
      writeFileSync(path, content);
      return { content: [{ type: "text", text: `Plan written: ${filename}` }] };
    }

    case "plan_list": {
      const plansDir = join(getBaseStateDir(), "plans");
      if (!existsSync(plansDir)) {
        return { content: [{ type: "text", text: "No plans directory found" }] };
      }
      const files = readdirSync(plansDir).filter((f) => f.endsWith(".md"));
      return { content: [{ type: "text", text: JSON.stringify(files) }] };
    }

    case "notepad_read": {
      const path = getNotepadPath();
      if (!existsSync(path)) {
        return { content: [{ type: "text", text: "Notepad is empty" }] };
      }
      return { content: [{ type: "text", text: readFileSync(path, "utf-8") }] };
    }

    case "notepad_append": {
      const text = (args as { text: string }).text;
      const path = getNotepadPath();
      ensureDir(dirname(path));
      const existing = existsSync(path) ? readFileSync(path, "utf-8") : "# OMC Notepad\n";
      writeFileSync(path, existing.trimEnd() + "\n\n" + text + "\n");
      return { content: [{ type: "text", text: "Appended to notepad" }] };
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
