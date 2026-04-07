#!/usr/bin/env node

/**
 * MCP server for OMC state management.
 * Provides tools to read/write .omc/ state, plans, and logs.
 */

import { randomUUID } from "node:crypto";
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
  getPlanPath,
  getNotepadPath,
  listModeStateFiles,
} from "../state/paths.js";
import { readModeState, writeModeState, parseStateFilename } from "../state/mode-state.js";
import type { ModeState } from "../state/mode-state.js";
import { appendEvent, readEvents, tailEvents } from "../state/event-log.js";
import type { RunEvent } from "../state/event-log.js";

const server = new Server(
  { name: "omc-state", version: "0.2.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "state_read",
      description: "Read a mode state file from .omc/state/. Without runId, returns the latest active run for that mode.",
      inputSchema: {
        type: "object" as const,
        properties: {
          mode: { type: "string", description: "Mode name (e.g. forge, team, deep-interview)" },
          runId: { type: "string", description: "Optional run ID for a specific workflow run" },
        },
        required: ["mode"],
      },
    },
    {
      name: "state_write",
      description: "Write a mode state file to .omc/state/. Auto-generates runId for new runs. Without runId, updates the existing active run or creates a new one.",
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
      description: "List all mode state files in .omc/state/ with summary info (mode, runId, status).",
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
    {
      name: "event_append",
      description: "Append a custom event to a run's event log (.omc/logs/{runId}.jsonl)",
      inputSchema: {
        type: "object" as const,
        properties: {
          runId: { type: "string", description: "Run ID to append the event to" },
          kind: { type: "string", description: "Event kind: tool_call, file_edit, milestone, note, etc." },
          summary: { type: "string", description: "Human-readable one-liner" },
          detail: { type: "object", description: "Optional structured payload" },
        },
        required: ["runId", "kind", "summary"],
      },
    },
    {
      name: "event_read",
      description: "Read events from a run's event log. Returns all events or last N with tail param.",
      inputSchema: {
        type: "object" as const,
        properties: {
          runId: { type: "string", description: "Run ID to read events for" },
          tail: { type: "number", description: "Return only the last N events" },
        },
        required: ["runId"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "state_read": {
      const { mode, runId } = args as { mode: string; runId?: string };
      const state = readModeState(mode, runId);
      if (!state) {
        return { content: [{ type: "text", text: `No state found for mode: ${mode}` }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(state, null, 2) }] };
    }

    case "state_write": {
      const { mode, state } = args as { mode: string; state: Record<string, unknown> };
      let merged = { ...state, mode } as ModeState;

      if (!merged.runId) {
        const existing = readModeState(mode);
        if (existing?.status === "active" && existing.runId) {
          merged.runId = existing.runId;
        } else {
          merged.runId = randomUUID().slice(0, 8);
        }
      }

      writeModeState(mode, merged);
      return { content: [{ type: "text", text: `State written for mode: ${mode} (runId: ${merged.runId})` }] };
    }

    case "state_list": {
      const files = listModeStateFiles();
      if (files.length === 0) {
        return { content: [{ type: "text", text: "No state files found" }] };
      }
      const stateDir = join(getBaseStateDir(), "state");
      const summaries = files.map(f => {
        const parsed = parseStateFilename(f);
        try {
          const data = JSON.parse(readFileSync(join(stateDir, f), "utf-8"));
          return {
            file: f,
            mode: parsed?.mode ?? data.mode ?? "unknown",
            runId: data.runId ?? parsed?.runId ?? null,
            status: data.status ?? (data.active ? "active" : "unknown"),
            task: data.task ?? null,
          };
        } catch {
          return { file: f, mode: parsed?.mode ?? "unknown", runId: parsed?.runId ?? null, status: "corrupt", task: null };
        }
      });
      return { content: [{ type: "text", text: JSON.stringify(summaries, null, 2) }] };
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

    case "event_append": {
      const { runId, kind, summary, detail } = args as { runId: string; kind: string; summary: string; detail?: Record<string, unknown> };
      const event: RunEvent = { ts: new Date().toISOString(), kind: kind as RunEvent["kind"], summary, ...(detail ? { detail } : {}) };
      appendEvent(runId, event);
      return { content: [{ type: "text", text: `Event appended to run: ${runId}` }] };
    }

    case "event_read": {
      const { runId, tail } = args as { runId: string; tail?: number };
      const events = tail ? tailEvents(runId, tail) : readEvents(runId);
      return { content: [{ type: "text", text: JSON.stringify(events, null, 2) }] };
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
