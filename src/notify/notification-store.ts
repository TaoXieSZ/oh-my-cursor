import { randomUUID } from "node:crypto";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { getScopedNotificationLogPath, type OmcStateScope } from "../state/paths.js";
import { ensureDir } from "../utils/fs.js";

export type NotificationStatus = "ok" | "warn" | "error" | "info";

export interface NotificationChannels {
  desktop: boolean;
  feed: boolean;
}

export interface NotificationDelivery {
  desktopOk?: boolean;
  desktopError?: string;
}

export interface NotificationEvent {
  id: string;
  ts: string;
  source: string;
  taskId: string;
  status: NotificationStatus;
  summary: string;
  details?: string;
  channels: NotificationChannels;
  delivery?: NotificationDelivery;
}

export interface CreateNotificationInput {
  source?: string;
  taskId: string;
  status?: NotificationStatus;
  summary: string;
  details?: string;
  channels?: Partial<NotificationChannels>;
  ts?: string;
}

export function createNotificationEvent(input: CreateNotificationInput): NotificationEvent {
  return {
    id: randomUUID(),
    ts: input.ts ?? new Date().toISOString(),
    source: input.source ?? "schedule",
    taskId: input.taskId,
    status: input.status ?? "info",
    summary: input.summary,
    ...(input.details ? { details: input.details } : {}),
    channels: {
      desktop: input.channels?.desktop ?? true,
      feed: input.channels?.feed ?? true,
    },
  };
}

export function appendNotification(event: NotificationEvent, scope: OmcStateScope = "project"): void {
  const path = getScopedNotificationLogPath(scope);
  ensureDir(dirname(path));
  appendFileSync(path, JSON.stringify(event) + "\n");
}

export function readNotifications(scope: OmcStateScope = "project"): NotificationEvent[] {
  const path = getScopedNotificationLogPath(scope);
  if (!existsSync(path)) return [];
  return parseNotificationJsonl(readFileSync(path, "utf-8"));
}

export function tailNotifications(n: number = 20, scope: OmcStateScope = "project"): NotificationEvent[] {
  const all = readNotifications(scope);
  return all.slice(-n).reverse();
}

function parseNotificationJsonl(content: string): NotificationEvent[] {
  const notifications: NotificationEvent[] = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      notifications.push(JSON.parse(trimmed) as NotificationEvent);
    } catch {
      // Skip malformed lines so one bad record doesn't break the feed.
    }
  }
  return notifications;
}
