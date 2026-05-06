import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  getScheduleStatePath,
  cancelScheduleTask,
  listScheduleTasks,
  requestScheduleRunNow,
  resumeAllScheduleTasks,
  resumeScheduleTask,
  upsertScheduleTask,
  type ScheduleTaskScope,
  type ScheduleTaskState,
} from "../schedule/state.js";
import { RSS_WATCH_TASK_TYPE } from "../schedule/rss.js";
import { isScheduleWorkerRunning, runScheduleWorker } from "../schedule/worker.js";
import * as log from "../utils/log.js";

export async function schedule(args: string[]): Promise<void> {
  const { subcommand, rest, scope } = parseScheduleArgs(args);
  const sub = subcommand ?? "list";

  if (sub === "list" || sub === "status") {
    const tasks = listScheduleTasks(scope);
    if (tasks.length === 0) {
      log.info("No scheduled tasks.");
      return;
    }
    log.heading(`Scheduled Tasks (${scope})`);
    for (const task of tasks) {
      log.info(`[${task.state}] ${task.id} — every ${formatInterval(task.interval_seconds)}`);
      log.dim(task.description);
      log.dim(`scope: ${task.scope} · type: ${task.type}`);
      if (task.next_run_at) log.dim(`next: ${task.next_run_at}`);
      if (task.last_result) log.dim(`last: ${task.last_result}`);
      if (typeof task.run_now_requested_at === "string") {
        log.dim(`run-now requested: ${task.run_now_requested_at}`);
      }
    }
    return;
  }

  if (sub === "cancel") {
    const taskId = rest[0];
    if (!taskId) {
      log.fail("Use: omr schedule cancel <task-id> [--scope user|project]");
      process.exit(1);
    }
    const task = cancelScheduleTask(taskId, "Cancelled manually", scope);
    if (!task) {
      log.fail(`Scheduled task not found: ${taskId}`);
      process.exit(1);
    }
    log.ok(`Cancelled scheduled task → ${task.id}`);
    return;
  }

  if (sub === "resume") {
    const taskId = rest[0];
    if (taskId) {
      const task = resumeScheduleTask(taskId, scope);
      if (!task) {
        log.fail(`Scheduled task not resumable: ${taskId}`);
        process.exit(1);
      }
      ensureScheduleWorker(scope);
      log.ok(`Resumed scheduled task → ${task.id}`);
      return;
    }
    const resumed = resumeAllScheduleTasks(scope);
    if (resumed.length === 0) {
      log.info("No suspended scheduled tasks to resume.");
      return;
    }
    ensureScheduleWorker(scope);
    log.ok(`Resumed ${resumed.length} scheduled task${resumed.length === 1 ? "" : "s"}.`);
    return;
  }

  if (sub === "run-now") {
    const taskId = rest[0];
    if (!taskId) {
      log.fail("Use: omr schedule run-now <task-id> [--scope user|project]");
      process.exit(1);
    }
    const task = requestScheduleRunNow(taskId, scope);
    if (!task) {
      log.fail(`Scheduled task not runnable: ${taskId}`);
      process.exit(1);
    }
    ensureScheduleWorker(scope);
    log.ok(`Requested immediate run → ${task.id}`);
    return;
  }

  if (sub === "add-rss") {
    const parsed = parseAddRssArgs(rest);
    if (!parsed.url) {
      log.fail("Use: omr schedule add-rss --url <feed-url> [--id <task-id>] [--every <interval>] [--title <text>] [--scope user|project]");
      process.exit(1);
    }

    const taskId = parsed.id ?? "agents-radar-rss";
    const task = upsertScheduleTask({
      id: taskId,
      scope,
      type: RSS_WATCH_TASK_TYPE,
      description: parsed.title ?? "Poll the agents-radar RSS feed for new items",
      intervalSeconds: parsed.intervalSeconds,
      params: {
        feed_url: parsed.url,
        identity_strategy: "guid-link-title",
      },
      extra: {
        title: parsed.title ?? "Agents Radar RSS",
        baseline_established: false,
        seen_item_ids: [],
      },
    });

    requestScheduleRunNow(task.id, scope);
    ensureScheduleWorker(scope);
    log.ok(`Registered RSS scheduled task → ${task.id}`);
    log.dim(`state: ${getScheduleStatePath(scope)}`);
    return;
  }

  if (sub === "worker") {
    const once = rest.includes("--once");
    await runScheduleWorker({ scope, once });
    log.ok(`Schedule worker finished (${scope}${once ? ", once" : ""}).`);
    return;
  }

  log.fail("Use: omr schedule list [--scope user|project] | cancel <task-id> | resume [task-id] | run-now <task-id> | add-rss --url <feed-url> | worker [--once]");
  process.exit(1);
}

function formatInterval(seconds: number): string {
  if (seconds % 3600 === 0) return `${seconds / 3600}h`;
  if (seconds % 60 === 0) return `${seconds / 60}m`;
  return `${seconds}s`;
}

function _taskLabel(task: ScheduleTaskState): string {
  return `${task.id}:${task.state}`;
}

function parseScheduleArgs(args: string[]): {
  subcommand?: string;
  rest: string[];
  scope: ScheduleTaskScope;
} {
  const rest: string[] = [];
  let scope: ScheduleTaskScope = "project";
  let subcommand: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--scope" && args[i + 1]) {
      const value = args[++i];
      if (value === "project" || value === "user") {
        scope = value;
        continue;
      }
    }

    if (!subcommand) {
      subcommand = arg;
      continue;
    }
    rest.push(arg);
  }

  return { subcommand, rest, scope };
}

function parseAddRssArgs(args: string[]): {
  id?: string;
  url?: string;
  title?: string;
  intervalSeconds: number;
} {
  let id: string | undefined;
  let url: string | undefined;
  let title: string | undefined;
  let intervalSeconds = 15 * 60;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--id" && args[i + 1]) {
      id = args[++i];
      continue;
    }
    if (arg === "--url" && args[i + 1]) {
      url = args[++i];
      continue;
    }
    if (arg === "--title" && args[i + 1]) {
      title = args[++i];
      continue;
    }
    if (arg === "--every" && args[i + 1]) {
      intervalSeconds = parseInterval(args[++i]);
    }
  }

  return { id, url, title, intervalSeconds };
}

function parseInterval(value: string): number {
  const trimmed = value.trim().toLowerCase();
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  const match = /^(\d+)(s|m|h)$/.exec(trimmed);
  if (!match) {
    return 15 * 60;
  }

  const amount = Number(match[1]);
  const unit = match[2];
  if (unit === "h") return amount * 3600;
  if (unit === "m") return amount * 60;
  return amount;
}

function ensureScheduleWorker(scope: ScheduleTaskScope): void {
  if (process.env["OMR_DISABLE_SCHEDULE_WORKER_AUTOSTART"] === "1") {
    return;
  }

  if (isScheduleWorkerRunning(scope)) {
    return;
  }

  const cliPath = fileURLToPath(new URL("./omr.js", import.meta.url));
  const child = spawn(process.execPath, [cliPath, "schedule", "worker", "--scope", scope], {
    detached: true,
    stdio: "ignore",
    env: process.env,
  });
  child.unref();
}
