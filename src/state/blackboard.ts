/**
 * Shared blackboard for multi-agent coordination.
 * Append-only JSONL log that multiple concurrent agents can write to and read from.
 * Designed for use in Cursor's Agents Window where several agents work in parallel.
 */

import { existsSync, readFileSync, appendFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { ensureDir } from "../utils/fs.js";
import { getBlackboardPath } from "./paths.js";

export interface BlackboardMessage {
  ts: string;
  agent: string;
  kind: "status" | "progress" | "blocker" | "handoff" | "note" | "claim" | "release";
  content: string;
  detail?: Record<string, unknown>;
}

const MAX_MESSAGES = 500;

export function postMessage(msg: BlackboardMessage): void {
  const path = getBlackboardPath();
  ensureDir(dirname(path));
  appendFileSync(path, JSON.stringify(msg) + "\n");
  truncateIfNeeded(path);
}

export function readMessages(opts?: { since?: string; agent?: string; kind?: string }): BlackboardMessage[] {
  const path = getBlackboardPath();
  if (!existsSync(path)) return [];

  const lines = readFileSync(path, "utf-8").trim().split("\n").filter(Boolean);
  let messages: BlackboardMessage[] = [];

  for (const line of lines) {
    try {
      messages.push(JSON.parse(line));
    } catch {
      // skip corrupt lines
    }
  }

  if (opts?.since) {
    messages = messages.filter((m) => m.ts > opts.since!);
  }
  if (opts?.agent) {
    messages = messages.filter((m) => m.agent === opts.agent);
  }
  if (opts?.kind) {
    messages = messages.filter((m) => m.kind === opts.kind);
  }

  return messages;
}

export function getAgentStatuses(): Array<{ agent: string; lastSeen: string; status: string }> {
  const messages = readMessages();
  const agents = new Map<string, { lastSeen: string; status: string }>();

  for (const msg of messages) {
    const existing = agents.get(msg.agent);
    if (!existing || msg.ts > existing.lastSeen) {
      agents.set(msg.agent, {
        lastSeen: msg.ts,
        status: msg.kind === "status" ? msg.content : existing?.status ?? msg.content,
      });
    }
  }

  return Array.from(agents.entries()).map(([agent, info]) => ({
    agent,
    ...info,
  }));
}

export function clearBlackboard(): void {
  const path = getBlackboardPath();
  if (existsSync(path)) {
    writeFileSync(path, "");
  }
}

function truncateIfNeeded(path: string): void {
  try {
    const lines = readFileSync(path, "utf-8").trim().split("\n");
    if (lines.length > MAX_MESSAGES) {
      const trimmed = lines.slice(-MAX_MESSAGES);
      writeFileSync(path, trimmed.join("\n") + "\n");
    }
  } catch {
    // non-fatal
  }
}
