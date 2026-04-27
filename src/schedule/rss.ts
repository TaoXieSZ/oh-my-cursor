import { createHash } from "node:crypto";
import { emitNotification } from "../notify/notification-center.js";
import {
  recordScheduleRun,
  type ScheduleTaskScope,
  type ScheduleTaskState,
} from "./state.js";

export const RSS_WATCH_TASK_TYPE = "rss-watch";
const MAX_TRACKED_IDS = 500;

export interface ParsedRssItem {
  id: string;
  title: string;
  link: string | null;
  guid: string | null;
  pubDate: string | null;
}

export interface RssRunResult {
  summary: string;
  baselineEstablished: boolean;
  newItems: ParsedRssItem[];
}

export async function runRssScheduleTask(
  task: ScheduleTaskState,
  scope: ScheduleTaskScope,
): Promise<RssRunResult> {
  const ts = new Date().toISOString();
  const feedUrl = typeof task.params.feed_url === "string" ? task.params.feed_url : "";

  if (!feedUrl) {
    const summary = "RSS poll failed: missing feed_url";
    recordScheduleRun(task.id, {
      summary,
      ts,
      extra: {
        last_error: summary,
        last_fetch_at: ts,
      },
    }, scope);
    return { summary, baselineEstablished: Boolean(task.baseline_established), newItems: [] };
  }

  try {
    const response = await fetch(feedUrl, {
      headers: {
        "accept": "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const xml = await response.text();
    const items = parseRssFeed(xml);
    const seenIds = new Set(readTrackedIds(task.seen_item_ids));
    const feedIds = items.map((item) => item.id);
    const baselineEstablished = task.baseline_established === true;

    if (!baselineEstablished) {
      const summary = `RSS baseline established with ${items.length} item${items.length === 1 ? "" : "s"}`;
      recordScheduleRun(task.id, {
        summary,
        ts,
        extra: {
          baseline_established: true,
          seen_item_ids: dedupeIds(feedIds),
          last_fetch_at: ts,
          last_error: null,
        },
      }, scope);
      return { summary, baselineEstablished: true, newItems: [] };
    }

    const newItems = items.filter((item) => !seenIds.has(item.id));
    const nextTrackedIds = dedupeIds([...feedIds, ...Array.from(seenIds)]);
    const summary = newItems.length === 0
      ? "No new Agents Radar RSS items"
      : `Detected ${newItems.length} new Agents Radar RSS item${newItems.length === 1 ? "" : "s"}`;

    if (newItems.length > 0) {
      const details = newItems.map((item) => `- ${item.title}`).join("\n");
      emitNotification({
        scope,
        source: "schedule",
        taskId: task.id,
        status: "info",
        title: typeof task.title === "string" ? task.title : "Agents Radar RSS",
        summary,
        details,
      });
    }

    recordScheduleRun(task.id, {
      summary,
      ts,
      extra: {
        baseline_established: true,
        seen_item_ids: nextTrackedIds,
        last_fetch_at: ts,
        last_error: null,
      },
    }, scope);

    return { summary, baselineEstablished: true, newItems };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const summary = `RSS poll failed: ${detail}`;
    recordScheduleRun(task.id, {
      summary,
      ts,
      extra: {
        last_error: summary,
        last_fetch_at: ts,
      },
    }, scope);
    return { summary, baselineEstablished: Boolean(task.baseline_established), newItems: [] };
  }
}

export function parseRssFeed(xml: string): ParsedRssItem[] {
  const items: ParsedRssItem[] = [];
  const seenIds = new Set<string>();

  for (const match of xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)) {
    const block = match[0];
    const title = readTag(block, "title");
    const guid = readTag(block, "guid");
    const link = readTag(block, "link");
    const pubDate = readTag(block, "pubDate");
    const id = computeRssItemIdentity({ title, guid, link });
    if (!id || seenIds.has(id)) {
      continue;
    }
    seenIds.add(id);
    items.push({
      id,
      title: title || link || guid || "Untitled RSS item",
      guid,
      link,
      pubDate,
    });
  }

  return items;
}

export function computeRssItemIdentity(input: {
  title: string | null;
  guid: string | null;
  link: string | null;
}): string {
  const guid = normalizeIdentityValue(input.guid);
  if (guid) {
    return `guid:${guid}`;
  }

  const link = normalizeIdentityValue(input.link);
  if (link) {
    return `link:${link}`;
  }

  const title = normalizeIdentityValue(input.title);
  if (!title) {
    return "";
  }

  return `title:${createHash("sha256").update(title).digest("hex")}`;
}

function readTag(block: string, tag: string): string | null {
  const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i").exec(block);
  if (!match?.[1]) {
    return null;
  }

  return decodeXml(stripCdata(stripTags(match[1]))).trim() || null;
}

function stripCdata(value: string): string {
  return value.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, "");
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function normalizeIdentityValue(value: string | null): string {
  return (value ?? "").trim();
}

function readTrackedIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

function dedupeIds(ids: string[]): string[] {
  return Array.from(new Set(ids)).slice(0, MAX_TRACKED_IDS);
}
