/**
 * `omr team` CLI commands.
 *
 * Right now this surface has one subcommand — `watch` — which tails the shared
 * blackboard and renders chatter in a terminal using the same canonical format
 * the leader uses in the chat composer. It's the closest analogue to the
 * oh-my-codex tmux panes: keep a terminal open beside Cursor and watch the
 * team work.
 */

import { existsSync, watchFile, unwatchFile } from "node:fs";
import { getBlackboardPath } from "../state/paths.js";
import { formatLine, readMessages } from "../state/blackboard.js";
import type { BlackboardMessage } from "../state/blackboard.js";
import * as log from "../utils/log.js";

export interface TeamWatchOptions {
  runId?: string;
  follow?: boolean;
  /** Override the polling interval in ms (default 500). Used by tests. */
  intervalMs?: number;
  /** Internal hook so tests can assert what was rendered. */
  onLine?: (line: string) => void;
}

const ROLE_COLORS: Record<string, string> = {
  executor: "\x1b[38;5;208m",
  architect: "\x1b[38;5;39m",
  debugger: "\x1b[38;5;203m",
  verifier: "\x1b[38;5;114m",
  explorer: "\x1b[38;5;180m",
  planner: "\x1b[38;5;183m",
  "code-reviewer": "\x1b[38;5;180m",
  "security-reviewer": "\x1b[38;5;197m",
  "performance-reviewer": "\x1b[38;5;178m",
  "test-engineer": "\x1b[38;5;114m",
  designer: "\x1b[38;5;213m",
  writer: "\x1b[38;5;250m",
  researcher: "\x1b[38;5;117m",
  critic: "\x1b[38;5;215m",
  "build-fixer": "\x1b[38;5;209m",
  "api-reviewer": "\x1b[38;5;111m",
  "quality-reviewer": "\x1b[38;5;144m",
  "style-reviewer": "\x1b[38;5;247m",
  "git-master": "\x1b[38;5;214m",
  "code-simplifier": "\x1b[38;5;151m",
};
const RESET = "\x1b[0m";

/**
 * Filter blackboard messages by run id. A message belongs to a run when its
 * `lane` starts with `<runId>-`. Messages without a lane are always included
 * when no run filter is supplied and excluded when one is.
 */
export function filterByRun(messages: BlackboardMessage[], runId?: string): BlackboardMessage[] {
  if (!runId) return messages;
  return messages.filter((m) => typeof m.lane === "string" && m.lane.startsWith(`${runId}-`));
}

function colorize(line: string, role: string | undefined, color: boolean): string {
  if (!color || !role) return line;
  const c = ROLE_COLORS[role];
  if (!c) return line;
  return `${c}${line}${RESET}`;
}

/**
 * Stream blackboard chatter to stdout, newest at the bottom.
 *
 * - When `follow` is true, the watcher keeps the process alive and prints
 *   new messages as they appear (the default for `omr team watch`).
 * - When `follow` is false, the existing chatter is dumped once and the
 *   function returns — used by tests and one-shot `--no-follow` calls.
 */
export async function teamWatch(opts: TeamWatchOptions = {}): Promise<void> {
  const follow = opts.follow ?? true;
  const useColor = process.stdout.isTTY === true;
  const bbPath = getBlackboardPath();

  const emit = (msg: BlackboardMessage): void => {
    const line = formatLine(msg);
    const coloured = colorize(line, msg.role, useColor);
    if (opts.onLine) opts.onLine(line);
    process.stdout.write(coloured + "\n");
  };

  log.heading(opts.runId ? `Team chatter — run ${opts.runId}` : "Team chatter");
  log.dim(`Blackboard: ${bbPath}`);
  log.dim(follow ? "Following — press Ctrl+C to stop." : "Dumping current contents.");

  let lastCursor: string | null = null;

  const drain = (): void => {
    if (!existsSync(bbPath)) return;
    const all = readMessages();
    const filtered = filterByRun(all, opts.runId);
    const fresh = lastCursor
      ? filtered.filter((m) => m.ts > lastCursor!)
      : filtered;
    for (const msg of fresh) {
      emit(msg);
    }
    if (filtered.length > 0) {
      lastCursor = filtered[filtered.length - 1].ts;
    }
  };

  drain();

  if (!follow) return;

  return new Promise<void>((resolve) => {
    const interval = opts.intervalMs ?? 500;
    const handler = (): void => {
      drain();
    };
    watchFile(bbPath, { interval }, handler);

    const cleanup = (): void => {
      unwatchFile(bbPath, handler);
      resolve();
    };
    process.once("SIGINT", cleanup);
    process.once("SIGTERM", cleanup);
  });
}

/**
 * Parse the argv slice for `omr team <sub>` into a known command + options.
 * Exposed as a pure function so the CLI entry can dispatch without pulling in
 * the watcher.
 */
export function parseTeamArgs(args: string[]): { sub: string; opts: TeamWatchOptions } {
  const sub = args[0] ?? "help";
  const opts: TeamWatchOptions = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if ((arg === "--run" || arg === "--run-id") && args[i + 1]) {
      opts.runId = args[++i];
    } else if (arg === "--no-follow") {
      opts.follow = false;
    } else if (arg === "--interval" && args[i + 1]) {
      const ms = parseInt(args[++i], 10);
      if (!Number.isNaN(ms) && ms > 0) opts.intervalMs = ms;
    }
  }

  return { sub, opts };
}
