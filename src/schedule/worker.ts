import { readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { ensureDir } from "../utils/fs.js";
import {
  clearScheduleWorkerState,
  getScheduleWorkerStatePath,
  hasRunningScheduleTasks,
  listDueScheduleTasks,
  readScheduleTask,
  type ScheduleTaskScope,
} from "./state.js";
import { RSS_WATCH_TASK_TYPE, runRssScheduleTask } from "./rss.js";

export interface ScheduleWorkerOptions {
  scope?: ScheduleTaskScope;
  once?: boolean;
  pollIntervalMs?: number;
}

export async function runScheduleWorker(options: ScheduleWorkerOptions = {}): Promise<void> {
  const scope = options.scope ?? "user";
  const pollIntervalMs = options.pollIntervalMs ?? 15000;
  const workerStatePath = getScheduleWorkerStatePath(scope);

  ensureDir(dirname(workerStatePath));
  writeFileSync(workerStatePath, JSON.stringify({
    pid: process.pid,
    scope,
    started_at: new Date().toISOString(),
  }, null, 2) + "\n");

  try {
    do {
      const dueTasks = listDueScheduleTasks(scope, new Date().toISOString());
      for (const dueTask of dueTasks) {
        const latestTask = readScheduleTask(dueTask.id, scope);
        if (!latestTask || latestTask.state !== "running") {
          continue;
        }

        if (latestTask.type === RSS_WATCH_TASK_TYPE) {
          await runRssScheduleTask(latestTask, scope);
          continue;
        }
      }

      if (options.once) {
        break;
      }

      if (!hasRunningScheduleTasks(scope)) {
        break;
      }

      await sleep(pollIntervalMs);
    } while (true);
  } finally {
    clearScheduleWorkerState(scope);
  }
}

export function isScheduleWorkerRunning(scope: ScheduleTaskScope = "user"): boolean {
  const state = readScheduleWorkerState(scope);
  if (!state || typeof state.pid !== "number") {
    return false;
  }

  try {
    process.kill(state.pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readScheduleWorkerState(scope: ScheduleTaskScope): Record<string, unknown> | null {
  const path = getScheduleWorkerStatePath(scope);
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
