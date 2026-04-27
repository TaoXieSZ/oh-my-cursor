import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { readNotifications } from "../../notify/notification-store.js";
import { computeRssItemIdentity, parseRssFeed, runRssScheduleTask } from "../rss.js";
import { readScheduleTask, upsertScheduleTask } from "../state.js";

function makeTmpDir(prefix: string): string {
  const dir = join(tmpdir(), `${prefix}-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("rss schedule runtime", () => {
  const originalFetch = globalThis.fetch;
  const origProjectRoot = process.env["OMC_PROJECT_ROOT"];
  const origUserRoot = process.env["OMC_USER_OMC_ROOT"];
  const origDesktopNotify = process.env["OMC_DESKTOP_NOTIFY_COMMAND"];
  let projectRoot: string;
  let userRoot: string;

  beforeEach(() => {
    projectRoot = makeTmpDir("omc-rss-project");
    userRoot = makeTmpDir("omc-rss-user");
    mkdirSync(join(projectRoot, ".omc", "state"), { recursive: true });
    mkdirSync(join(userRoot, "state"), { recursive: true });
    process.env["OMC_PROJECT_ROOT"] = projectRoot;
    process.env["OMC_USER_OMC_ROOT"] = userRoot;
    process.env["OMC_DESKTOP_NOTIFY_COMMAND"] = "true";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    rmSync(projectRoot, { recursive: true, force: true });
    rmSync(userRoot, { recursive: true, force: true });
    if (origProjectRoot === undefined) delete process.env["OMC_PROJECT_ROOT"];
    else process.env["OMC_PROJECT_ROOT"] = origProjectRoot;
    if (origUserRoot === undefined) delete process.env["OMC_USER_OMC_ROOT"];
    else process.env["OMC_USER_OMC_ROOT"] = origUserRoot;
    if (origDesktopNotify === undefined) delete process.env["OMC_DESKTOP_NOTIFY_COMMAND"];
    else process.env["OMC_DESKTOP_NOTIFY_COMMAND"] = origDesktopNotify;
  });

  it("parses RSS items and prefers guid then link then title hash", () => {
    const items = parseRssFeed(`
      <rss><channel>
        <item><title>One</title><guid>guid-1</guid><link>https://example.com/1</link></item>
        <item><title>Two</title><link>https://example.com/2</link></item>
        <item><title>Three</title></item>
      </channel></rss>
    `);

    assert.equal(items.length, 3);
    assert.equal(items[0].id, "guid:guid-1");
    assert.equal(items[1].id, "link:https://example.com/2");
    assert.match(items[2].id, /^title:[a-f0-9]{64}$/);
    assert.equal(computeRssItemIdentity({ title: "Hello", guid: null, link: null }).startsWith("title:"), true);
  });

  it("establishes a baseline on the first successful fetch without notifying", async () => {
    globalThis.fetch = (async () => new Response(`
      <rss><channel>
        <item><title>CLI launch</title><guid>guid-1</guid></item>
        <item><title>New benchmark</title><guid>guid-2</guid></item>
      </channel></rss>
    `, { status: 200 })) as typeof fetch;

    const task = upsertScheduleTask({
      id: "agents-radar-rss",
      scope: "user",
      type: "rss-watch",
      description: "Watch agents-radar",
      intervalSeconds: 900,
      params: { feed_url: "https://duanyytop.github.io/agents-radar/feed.xml" },
      extra: {
        baseline_established: false,
        seen_item_ids: [],
      },
    });

    const result = await runRssScheduleTask(task, "user");
    assert.match(result.summary, /baseline established/i);
    assert.equal(readNotifications("user").length, 0);

    const updated = readScheduleTask("agents-radar-rss", "user");
    assert.equal(updated?.baseline_established, true);
    assert.deepEqual(updated?.seen_item_ids, ["guid:guid-1", "guid:guid-2"]);
  });

  it("batches newly discovered items into one notification", async () => {
    const xml = `
      <rss><channel>
        <item><title>Already seen</title><guid>guid-1</guid></item>
        <item><title>Fresh A</title><guid>guid-2</guid></item>
        <item><title>Fresh B</title><guid>guid-3</guid></item>
      </channel></rss>
    `;
    globalThis.fetch = (async () => new Response(xml, { status: 200 })) as typeof fetch;

    const task = upsertScheduleTask({
      id: "agents-radar-rss",
      scope: "user",
      type: "rss-watch",
      description: "Watch agents-radar",
      intervalSeconds: 900,
      params: { feed_url: "https://duanyytop.github.io/agents-radar/feed.xml" },
      extra: {
        baseline_established: true,
        seen_item_ids: ["guid:guid-1"],
        title: "Agents Radar RSS",
      },
    });

    const result = await runRssScheduleTask(task, "user");
    assert.match(result.summary, /Detected 2 new/i);
    assert.equal(result.newItems.length, 2);

    const notifications = readNotifications("user");
    assert.equal(notifications.length, 1);
    assert.match(notifications[0].summary, /Detected 2 new/i);
    assert.match(notifications[0].details ?? "", /Fresh A/);
    assert.match(notifications[0].details ?? "", /Fresh B/);
  });

  it("does not notify when the feed has not changed", async () => {
    globalThis.fetch = (async () => new Response(`
      <rss><channel>
        <item><title>Already seen</title><guid>guid-1</guid></item>
      </channel></rss>
    `, { status: 200 })) as typeof fetch;

    const task = upsertScheduleTask({
      id: "agents-radar-rss",
      scope: "user",
      type: "rss-watch",
      description: "Watch agents-radar",
      intervalSeconds: 900,
      params: { feed_url: "https://duanyytop.github.io/agents-radar/feed.xml" },
      extra: {
        baseline_established: true,
        seen_item_ids: ["guid:guid-1"],
      },
    });

    const result = await runRssScheduleTask(task, "user");
    assert.match(result.summary, /No new/i);
    assert.equal(readNotifications("user").length, 0);
  });
});
