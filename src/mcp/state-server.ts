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
import { postMessage, readMessages, getAgentStatuses, clearBlackboard, tailSince, writeTranscript } from "../state/blackboard.js";
import type { BlackboardMessage } from "../state/blackboard.js";
import { inspectHarnessReadiness } from "../state/harness.js";

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
    {
      name: "harness_readiness",
      description: "Summarize OMC harness readiness for schedule-state contracts and generic workflow setup.",
      inputSchema: { type: "object" as const, properties: {} },
    },
    {
      name: "blackboard_post",
      description: "Post a message to the shared blackboard for multi-agent coordination. Use this when multiple agents work in parallel to share status, claim files, report blockers, or hand off work. When dispatched as a team lane, always include `lane` and `role` so the leader can render chatter in the chat session.",
      inputSchema: {
        type: "object" as const,
        properties: {
          agent: { type: "string", description: "Agent identifier (e.g. 'lane-1-executor', 'leader')" },
          kind: { type: "string", enum: ["status", "progress", "blocker", "handoff", "note", "claim", "release"], description: "Message type" },
          content: { type: "string", description: "Human-readable message" },
          lane: { type: "string", description: "Lane identifier when posting from a team dispatch (e.g. 'lane-1' or '<runId>-lane-1')" },
          role: { type: "string", description: "Role name the agent is playing (e.g. 'executor', 'designer')" },
          detail: { type: "object", description: "Optional structured data (e.g. { files: [...], progress: 3/5 })" },
        },
        required: ["agent", "kind", "content"],
      },
    },
    {
      name: "blackboard_read",
      description: "Read messages from the shared blackboard. Optionally filter by timestamp, agent, lane, or message kind.",
      inputSchema: {
        type: "object" as const,
        properties: {
          since: { type: "string", description: "ISO timestamp — return only messages after this time" },
          agent: { type: "string", description: "Filter by agent identifier" },
          kind: { type: "string", description: "Filter by message kind" },
          lane: { type: "string", description: "Filter by lane identifier" },
        },
      },
    },
    {
      name: "blackboard_tail",
      description: "Incrementally tail the blackboard. Returns messages strictly newer than the provided cursor together with the latest timestamp as `nextCursor`. The leader uses this to echo new team chatter into the chat session each poll without re-reading the whole log.",
      inputSchema: {
        type: "object" as const,
        properties: {
          cursor: { type: "string", description: "ISO timestamp from a previous call's `nextCursor`. Omit on the first poll to get everything." },
        },
      },
    },
    {
      name: "blackboard_status",
      description: "Get a summary of all agents that have posted to the blackboard, with their last-seen time and latest status.",
      inputSchema: { type: "object" as const, properties: {} },
    },
    {
      name: "blackboard_clear",
      description: "Clear the shared blackboard (use between team sessions).",
      inputSchema: { type: "object" as const, properties: {} },
    },
    {
      name: "team_transcript_write",
      description: "Write a per-run team transcript to `.omc/state/team/<runId>-transcript.md` from the current blackboard contents. If `runId` is omitted, the full blackboard is captured. Returns the absolute path of the written file so the leader can cite it in the final summary.",
      inputSchema: {
        type: "object" as const,
        properties: {
          runId: { type: "string", description: "Team run identifier used as the lane-id prefix (e.g. 'run123')" },
        },
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

    case "harness_readiness": {
      const readiness = inspectHarnessReadiness();
      return { content: [{ type: "text", text: JSON.stringify(readiness, null, 2) }] };
    }

    case "blackboard_post": {
      const { agent, kind, content, lane, role, detail } = args as {
        agent: string;
        kind: BlackboardMessage["kind"];
        content: string;
        lane?: string;
        role?: string;
        detail?: Record<string, unknown>;
      };
      const msg: BlackboardMessage = {
        ts: new Date().toISOString(),
        agent,
        kind,
        content,
        ...(lane ? { lane } : {}),
        ...(role ? { role } : {}),
        ...(detail ? { detail } : {}),
      };
      postMessage(msg);
      const laneLabel = lane && role ? `[${lane}·${role}]` : `[${agent}]`;
      return { content: [{ type: "text", text: `Posted to blackboard: ${laneLabel} ${kind}: ${content}` }] };
    }

    case "blackboard_read": {
      const { since, agent, kind, lane } = (args ?? {}) as { since?: string; agent?: string; kind?: string; lane?: string };
      const messages = readMessages({ since, agent, kind, lane });
      if (messages.length === 0) {
        return { content: [{ type: "text", text: "No messages on blackboard" }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(messages, null, 2) }] };
    }

    case "blackboard_tail": {
      const { cursor } = (args ?? {}) as { cursor?: string };
      const result = tailSince(cursor);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }

    case "blackboard_status": {
      const statuses = getAgentStatuses();
      if (statuses.length === 0) {
        return { content: [{ type: "text", text: "No agents have posted to the blackboard" }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(statuses, null, 2) }] };
    }

    case "blackboard_clear": {
      clearBlackboard();
      return { content: [{ type: "text", text: "Blackboard cleared" }] };
    }

    case "team_transcript_write": {
      const { runId } = (args ?? {}) as { runId?: string };
      const path = writeTranscript(runId);
      return { content: [{ type: "text", text: `Team transcript written: ${path}` }] };
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
