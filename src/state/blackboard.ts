/**
 * Shared blackboard for multi-agent coordination.
 * Append-only JSONL log that multiple concurrent agents can write to and read from.
 * Designed for use in Cursor's Agents Window where several agents work in parallel.
 */

import { existsSync, readFileSync, appendFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { ensureDir } from "../utils/fs.js";
import { getBaseStateDir, getBlackboardPath } from "./paths.js";

export interface BlackboardMessage {
  ts: string;
  agent: string;
  kind: "status" | "progress" | "blocker" | "handoff" | "note" | "claim" | "release";
  content: string;
  /** Optional lane identifier for team dispatch (e.g. "lane-1"). */
  lane?: string;
  /** Optional role name the agent is playing (e.g. "executor"). */
  role?: string;
  detail?: Record<string, unknown>;
}

export interface TailResult {
  messages: BlackboardMessage[];
  nextCursor: string | null;
}

const MAX_MESSAGES = 500;

export function postMessage(msg: BlackboardMessage): void {
  const path = getBlackboardPath();
  ensureDir(dirname(path));
  appendFileSync(path, JSON.stringify(msg) + "\n");
  truncateIfNeeded(path);
}

export function readMessages(opts?: { since?: string; agent?: string; kind?: string; lane?: string }): BlackboardMessage[] {
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
  if (opts?.lane) {
    messages = messages.filter((m) => m.lane === opts.lane);
  }

  return messages;
}

/**
 * Incremental tail of the blackboard. Returns messages strictly newer than
 * `cursor` (an ISO timestamp) together with the timestamp of the most recent
 * message as `nextCursor`. Callers pass that cursor back to fetch only new
 * chatter on the next poll.
 */
export function tailSince(cursor?: string): TailResult {
  const all = readMessages();
  const filtered = cursor ? all.filter((m) => m.ts > cursor) : all;
  const latest = all.length > 0 ? all[all.length - 1].ts : cursor ?? null;
  return {
    messages: filtered,
    nextCursor: latest,
  };
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

/**
 * Canonical one-line render of a blackboard message, shared by the leader's
 * chat echo, the transcript writer, and the `omc team watch` CLI so all three
 * display the same format.
 *
 * Example: `[14:22:01] lane-1·executor  claim     src/api/users.ts`
 */
export function formatLine(msg: BlackboardMessage): string {
  const time = formatTime(msg.ts);
  const who = msg.lane && msg.role
    ? `${msg.lane}·${msg.role}`
    : msg.lane ?? msg.role ?? msg.agent;
  const kind = msg.kind.padEnd(8, " ");
  return `[${time}] ${who.padEnd(20, " ")} ${kind} ${msg.content}`;
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

/**
 * Write a per-run team transcript as markdown to
 * `.omc/state/team/<runId>-transcript.md`. The transcript includes the final
 * blackboard chatter rendered with {@link formatLine}. Returns the absolute
 * path of the written file.
 *
 * If `runId` is provided, only messages whose `lane` starts with `<runId>-`
 * are included; otherwise the full blackboard is captured (useful for ad-hoc
 * team runs where the leader did not stamp a run id onto lane ids).
 */
export function writeTranscript(runId?: string): string {
  const all = readMessages();
  const filtered = runId
    ? all.filter((m) => typeof m.lane === "string" && m.lane.startsWith(`${runId}-`))
    : all;

  const dir = join(getBaseStateDir(), "state", "team");
  ensureDir(dir);

  const filename = runId ? `${runId}-transcript.md` : `transcript-${Date.now()}.md`;
  const path = join(dir, filename);

  const header = `# Team transcript${runId ? ` — run ${runId}` : ""}\n\nGenerated: ${new Date().toISOString()}\n\n`;
  const body = filtered.length === 0
    ? "_No blackboard messages recorded._\n"
    : "```text\n" + filtered.map(formatLine).join("\n") + "\n```\n";

  writeFileSync(path, header + body);
  return path;
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
