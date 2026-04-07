import { existsSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { dirname } from "node:path";
import { getEventLogPath } from "./paths.js";
import { ensureDir } from "../utils/fs.js";

export interface RunEvent {
  ts: string;
  kind: "state_change" | "phase" | "status" | "iteration"
      | "tool_call" | "file_edit" | "milestone" | "note";
  summary: string;
  detail?: Record<string, unknown>;
}

const MAX_EVENTS = 1000;
const TRUNCATE_TO = 800;

export function appendEvent(runId: string, event: RunEvent): void {
  const path = getEventLogPath(runId);
  ensureDir(dirname(path));
  const line = JSON.stringify(event) + "\n";
  appendFileSync(path, line);

  if (shouldTruncate(path)) {
    truncateLog(path);
  }
}

export function readEvents(runId: string): RunEvent[] {
  const path = getEventLogPath(runId);
  if (!existsSync(path)) return [];
  return parseJsonl(readFileSync(path, "utf-8"));
}

export function tailEvents(runId: string, n: number = 20): RunEvent[] {
  const all = readEvents(runId);
  return all.slice(-n);
}

function parseJsonl(content: string): RunEvent[] {
  const results: RunEvent[] = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      results.push(JSON.parse(trimmed) as RunEvent);
    } catch { /* skip corrupt lines */ }
  }
  return results;
}

function shouldTruncate(path: string): boolean {
  try {
    const content = readFileSync(path, "utf-8");
    const lineCount = content.split("\n").filter(l => l.trim()).length;
    return lineCount > MAX_EVENTS;
  } catch { return false; }
}

function truncateLog(path: string): void {
  try {
    const events = parseJsonl(readFileSync(path, "utf-8"));
    const kept = events.slice(-TRUNCATE_TO);
    writeFileSync(path, kept.map(e => JSON.stringify(e)).join("\n") + "\n");
  } catch { /* skip on error */ }
}
