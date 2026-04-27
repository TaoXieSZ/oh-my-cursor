import { existsSync, readFileSync } from "node:fs";
import { getStatePath } from "./paths.js";

type HarnessStatus = "ok" | "warn" | "error";

export interface HarnessCheck {
  id: string;
  status: HarnessStatus;
  summary: string;
  detail?: string;
}

export interface HarnessReadiness {
  ok: boolean;
  summary: {
    checkCount: number;
    okCount: number;
    warnCount: number;
    errorCount: number;
    scheduleTasks: number;
  };
  checks: HarnessCheck[];
}

interface ScheduleTaskState {
  id?: unknown;
  description?: unknown;
  interval_seconds?: unknown;
  state?: unknown;
  run_count?: unknown;
  params?: unknown;
}

interface ScheduleModeState {
  mode?: unknown;
  status?: unknown;
  started_at?: unknown;
  tasks?: ScheduleTaskState[];
}

const VALID_SCHEDULE_TASK_STATES = new Set([
  "running",
  "suspended",
  "completed",
  "cancelled",
]);

export function inspectHarnessReadiness(): HarnessReadiness {
  const checks = [inspectScheduleContract()];
  const summary = {
    checkCount: checks.length,
    okCount: checks.filter((check) => check.status === "ok").length,
    warnCount: checks.filter((check) => check.status === "warn").length,
    errorCount: checks.filter((check) => check.status === "error").length,
    scheduleTasks: countScheduleTasks(),
  };

  return {
    ok: summary.errorCount === 0,
    summary,
    checks,
  };
}

function inspectScheduleContract(): HarnessCheck {
  const path = getStatePath("schedule-state.json");
  if (!existsSync(path)) {
    return {
      id: "schedule-contract",
      status: "ok",
      summary: "Schedule contract ready (no schedule-state.json yet)",
      detail: path,
    };
  }

  const parsed = readJsonFile<ScheduleModeState>(path);
  if (!parsed) {
    return {
      id: "schedule-contract",
      status: "error",
      summary: "Schedule contract invalid (cannot parse schedule-state.json)",
      detail: path,
    };
  }

  if (parsed.mode !== "schedule") {
    return {
      id: "schedule-contract",
      status: "error",
      summary: "Schedule contract invalid (mode must be 'schedule')",
      detail: path,
    };
  }

  if (!Array.isArray(parsed.tasks)) {
    return {
      id: "schedule-contract",
      status: "error",
      summary: "Schedule contract invalid (tasks must be an array)",
      detail: path,
    };
  }

  const invalidTasks: string[] = [];
  for (const task of parsed.tasks) {
    const reasons: string[] = [];
    if (typeof task.id !== "string" || task.id.trim() === "") {
      reasons.push("missing id");
    }
    if (typeof task.description !== "string" || task.description.trim() === "") {
      reasons.push("missing description");
    }
    if (typeof task.interval_seconds !== "number" || task.interval_seconds <= 0) {
      reasons.push("invalid interval_seconds");
    }
    if (!VALID_SCHEDULE_TASK_STATES.has(String(task.state ?? ""))) {
      reasons.push("invalid state");
    }
    if (typeof task.run_count !== "number" || task.run_count < 0) {
      reasons.push("invalid run_count");
    }
    if (typeof task.params !== "object" || task.params === null || Array.isArray(task.params)) {
      reasons.push("missing params");
    }
    if (reasons.length > 0) {
      invalidTasks.push(`${String(task.id ?? "(unknown)")}: ${reasons.join(", ")}`);
    }
  }

  if (invalidTasks.length > 0) {
    return {
      id: "schedule-contract",
      status: "error",
      summary: `Schedule contract invalid (${invalidTasks.length} task${invalidTasks.length === 1 ? "" : "s"} failed validation)`,
      detail: invalidTasks.join("; "),
    };
  }

  return {
    id: "schedule-contract",
    status: "ok",
    summary: `Schedule contract valid (${parsed.tasks.length} task${parsed.tasks.length === 1 ? "" : "s"})`,
    detail: path,
  };
}

function countScheduleTasks(): number {
  const parsed = readJsonFile<ScheduleModeState>(getStatePath("schedule-state.json"));
  return Array.isArray(parsed?.tasks) ? parsed.tasks.length : 0;
}

function readJsonFile<T>(path: string): T | null {
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return null;
  }
}
