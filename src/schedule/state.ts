import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { getStatePath, type OmcStateScope } from "../state/paths.js";
import { ensureDir } from "../utils/fs.js";

export type ScheduleTaskLifecycle = "running" | "suspended" | "completed" | "cancelled";
export type ScheduleTaskScope = OmcStateScope;

export interface ScheduleTaskState {
  id: string;
  scope: ScheduleTaskScope;
  type: string;
  description: string;
  interval_seconds: number;
  state: ScheduleTaskLifecycle;
  run_count: number;
  params: Record<string, unknown>;
  created_at: string;
  last_run_at: string | null;
  last_result: string | null;
  next_run_at: string | null;
  [key: string]: unknown;
}

export interface ScheduleState {
  mode: "schedule";
  scope: ScheduleTaskScope;
  status: string;
  started_at: string;
  tasks: ScheduleTaskState[];
  [key: string]: unknown;
}

export interface UpsertScheduleTaskInput {
  id: string;
  scope?: ScheduleTaskScope;
  description: string;
  intervalSeconds: number;
  params?: Record<string, unknown>;
  type?: string;
  untilCondition?: string | null;
  notify?: Record<string, unknown>;
  initialState?: ScheduleTaskLifecycle;
  now?: string;
  extra?: Record<string, unknown>;
}

export interface RecordScheduleRunInput {
  summary: string;
  ts?: string;
  nextRunAt?: string | null;
  extra?: Record<string, unknown>;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function computeNextRunAt(intervalSeconds: number, ts = nowIso()): string {
  return new Date(new Date(ts).getTime() + intervalSeconds * 1000).toISOString();
}

export function readScheduleState(scope: ScheduleTaskScope = "project"): ScheduleState | null {
  const path = getScheduleStatePath(scope);
  if (!existsSync(path)) return null;
  try {
    return normalizeScheduleState(JSON.parse(readFileSync(path, "utf-8")) as Partial<ScheduleState>, scope);
  } catch {
    return null;
  }
}

export function writeScheduleState(state: ScheduleState, scope: ScheduleTaskScope = state.scope ?? "project"): void {
  const path = getScheduleStatePath(scope);
  ensureDir(dirname(path));
  writeFileSync(path, JSON.stringify(normalizeScheduleState(state, scope), null, 2) + "\n");
}

export function ensureScheduleState(now = nowIso(), scope: ScheduleTaskScope = "project"): ScheduleState {
  return readScheduleState(scope) ?? {
    mode: "schedule",
    scope,
    status: "active",
    started_at: now,
    tasks: [],
  };
}

export function listScheduleTasks(scope: ScheduleTaskScope = "project"): ScheduleTaskState[] {
  return ensureScheduleState(undefined, scope).tasks.slice().sort((a, b) => {
    const rank = (task: ScheduleTaskState): number => {
      if (task.state === "running") return 0;
      if (task.state === "suspended") return 1;
      if (task.state === "completed") return 2;
      return 3;
    };
    const rankDiff = rank(a) - rank(b);
    if (rankDiff !== 0) return rankDiff;
    return a.created_at.localeCompare(b.created_at);
  });
}

export function readScheduleTask(taskId: string, scope: ScheduleTaskScope = "project"): ScheduleTaskState | null {
  return ensureScheduleState(undefined, scope).tasks.find((task) => task.id === taskId) ?? null;
}

export function upsertScheduleTask(input: UpsertScheduleTaskInput): ScheduleTaskState {
  const now = input.now ?? nowIso();
  const scope = input.scope ?? "project";
  const state = ensureScheduleState(now, scope);
  const idx = state.tasks.findIndex((task) => task.id === input.id);
  const current = idx >= 0 ? state.tasks[idx] : null;
  const taskScope = input.scope ?? current?.scope ?? scope;
  const next = normalizeScheduleTask(
    idx >= 0
      ? {
          ...current,
          scope: taskScope,
          description: input.description,
          interval_seconds: input.intervalSeconds,
          params: input.params ?? current?.params ?? {},
          type: input.type ?? current?.type ?? "custom",
          ...(input.untilCondition !== undefined ? { until_condition: input.untilCondition } : {}),
          ...(input.notify ? { notify: input.notify } : {}),
          ...(input.extra ?? {}),
        }
      : {
          id: input.id,
          scope: taskScope,
          type: input.type ?? "custom",
          description: input.description,
          interval_seconds: input.intervalSeconds,
          until_condition: input.untilCondition ?? null,
          params: input.params ?? {},
          state: input.initialState ?? "running",
          created_at: now,
          last_run_at: null,
          last_result: null,
          run_count: 0,
          next_run_at: computeNextRunAt(input.intervalSeconds, now),
          ...(input.notify ? { notify: input.notify } : {}),
          ...(input.extra ?? {}),
        },
    taskScope,
  );

  if (idx >= 0) state.tasks[idx] = next;
  else state.tasks.push(next);
  state.scope = scope;
  state.status = "active";
  state.started_at = state.started_at || now;
  writeScheduleState(state, scope);
  return next;
}

export function cancelScheduleTask(
  taskId: string,
  reason = "Cancelled manually",
  scope: ScheduleTaskScope = "project",
): ScheduleTaskState | null {
  const ts = nowIso();
  return updateScheduleTask(taskId, scope, (task) => ({
    ...task,
    state: "cancelled",
    cancelled_at: ts,
    cancel_reason: reason,
    next_run_at: null,
  }));
}

export function resumeScheduleTask(taskId: string, scope: ScheduleTaskScope = "project"): ScheduleTaskState | null {
  const current = readScheduleTask(taskId, scope);
  if (!current) return null;
  if (current.state === "cancelled" || current.state === "completed") return null;
  const ts = nowIso();
  return updateScheduleTask(taskId, scope, (task) => ({
    ...task,
    state: "running",
    resumed_at: ts,
    next_run_at: computeNextRunAt(task.interval_seconds, ts),
  }));
}

export function resumeAllScheduleTasks(scope: ScheduleTaskScope = "project"): ScheduleTaskState[] {
  const state = ensureScheduleState(undefined, scope);
  const ts = nowIso();
  const resumed: ScheduleTaskState[] = [];
  state.tasks = state.tasks.map((task) => {
    if (task.state !== "suspended") return task;
    const next = normalizeScheduleTask({
      ...task,
      state: "running",
      resumed_at: ts,
      next_run_at: computeNextRunAt(task.interval_seconds, ts),
    }, scope);
    resumed.push(next);
    return next;
  });
  if (resumed.length > 0) writeScheduleState(state, scope);
  return resumed;
}

export function requestScheduleRunNow(taskId: string, scope: ScheduleTaskScope = "project"): ScheduleTaskState | null {
  const current = readScheduleTask(taskId, scope);
  if (!current) return null;
  if (current.state === "cancelled" || current.state === "completed") return null;
  const ts = nowIso();
  return updateScheduleTask(taskId, scope, (task) => ({
    ...task,
    state: "running",
    run_now_requested_at: ts,
    next_run_at: ts,
  }));
}

export function recordScheduleRun(
  taskId: string,
  input: RecordScheduleRunInput,
  scope: ScheduleTaskScope = "project",
): ScheduleTaskState | null {
  const current = readScheduleTask(taskId, scope);
  if (!current) return null;
  const ts = input.ts ?? nowIso();
  const nextRunAt = input.nextRunAt === undefined
    ? (current.state === "running" ? computeNextRunAt(current.interval_seconds, ts) : current.next_run_at)
    : input.nextRunAt;
  return updateScheduleTask(taskId, scope, (task) => ({
    ...task,
    last_run_at: ts,
    last_result: input.summary,
    last_heartbeat_at: ts,
    last_notified_at: ts,
    last_notified_summary: input.summary,
    run_count: task.run_count + 1,
    next_run_at: nextRunAt,
    ...(input.extra ?? {}),
    run_now_requested_at: undefined,
  }));
}

export function listDueScheduleTasks(
  scope: ScheduleTaskScope = "project",
  now = nowIso(),
): ScheduleTaskState[] {
  return listScheduleTasks(scope).filter((task) => {
    if (task.state !== "running") return false;
    if (typeof task.run_now_requested_at === "string") return true;
    if (typeof task.next_run_at !== "string") return false;
    return task.next_run_at <= now;
  });
}

export function suspendRunningScheduleTasks(
  scope: ScheduleTaskScope = "project",
  ts = nowIso(),
): ScheduleTaskState[] {
  const state = ensureScheduleState(ts, scope);
  const suspended: ScheduleTaskState[] = [];
  state.tasks = state.tasks.map((task) => {
    if (task.state !== "running") return task;
    const next = normalizeScheduleTask({
      ...task,
      state: "suspended",
      suspended_at: ts,
      next_run_at: null,
    }, scope);
    suspended.push(next);
    return next;
  });
  if (suspended.length > 0) {
    writeScheduleState(state, scope);
  }
  return suspended;
}

export function hasRunningScheduleTasks(scope: ScheduleTaskScope = "project"): boolean {
  return ensureScheduleState(undefined, scope).tasks.some((task) => task.state === "running");
}

export function getScheduleStatePath(scope: ScheduleTaskScope = "project"): string {
  return getStatePath("schedule-state.json", scope);
}

export function getScheduleResumePendingPath(scope: ScheduleTaskScope = "project"): string {
  return getStatePath("schedule-resume-pending.json", scope);
}

export function getScheduleWorkerStatePath(scope: ScheduleTaskScope = "project"): string {
  return getStatePath("schedule-worker.json", scope);
}

export function clearScheduleWorkerState(scope: ScheduleTaskScope = "project"): void {
  const path = getScheduleWorkerStatePath(scope);
  if (existsSync(path)) {
    rmSync(path, { force: true });
  }
}

function updateScheduleTask(
  taskId: string,
  scope: ScheduleTaskScope,
  updater: (task: ScheduleTaskState) => Partial<ScheduleTaskState>,
): ScheduleTaskState | null {
  const state = ensureScheduleState(undefined, scope);
  const idx = state.tasks.findIndex((task) => task.id === taskId);
  if (idx === -1) return null;
  const current = state.tasks[idx];
  state.tasks[idx] = normalizeScheduleTask(updater(current), current.scope ?? scope);
  writeScheduleState(state, scope);
  return state.tasks[idx];
}

function normalizeScheduleState(state: Partial<ScheduleState>, scope: ScheduleTaskScope): ScheduleState {
  return {
    ...state,
    mode: "schedule",
    scope: state.scope === "user" ? "user" : scope,
    status: typeof state.status === "string" && state.status.trim() ? state.status : "active",
    started_at: typeof state.started_at === "string" && state.started_at.trim() ? state.started_at : nowIso(),
    tasks: Array.isArray(state.tasks) ? state.tasks.map((task) => normalizeScheduleTask(task, scope)) : [],
  };
}

function normalizeScheduleTask(task: Partial<ScheduleTaskState>, scope: ScheduleTaskScope): ScheduleTaskState {
  const extras = { ...task };
  return {
    ...extras,
    id: typeof task.id === "string" ? task.id : "",
    scope: task.scope === "user" ? "user" : scope,
    type: typeof task.type === "string" && task.type.trim() ? task.type : "custom",
    description: typeof task.description === "string" ? task.description : "",
    interval_seconds: typeof task.interval_seconds === "number" ? task.interval_seconds : 0,
    state: isScheduleTaskLifecycle(task.state) ? task.state : "running",
    run_count: typeof task.run_count === "number" ? task.run_count : 0,
    params: isRecord(task.params) ? task.params : {},
    created_at: typeof task.created_at === "string" && task.created_at.trim() ? task.created_at : nowIso(),
    last_run_at: typeof task.last_run_at === "string" ? task.last_run_at : null,
    last_result: typeof task.last_result === "string" ? task.last_result : null,
    next_run_at: typeof task.next_run_at === "string" ? task.next_run_at : null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isScheduleTaskLifecycle(value: unknown): value is ScheduleTaskLifecycle {
  return value === "running" || value === "suspended" || value === "completed" || value === "cancelled";
}
