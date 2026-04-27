import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import {
  appendNotification,
  createNotificationEvent,
  readNotifications,
  tailNotifications,
} from "../notification-store.js";
import { getNotificationLogPath } from "../../state/paths.js";

function makeTmpProject(): string {
  const dir = join(tmpdir(), `omc-notify-test-${randomUUID()}`);
  mkdirSync(join(dir, ".omc", "state"), { recursive: true });
  return dir;
}

describe("notification-store", () => {
  let projectRoot: string;
  const origEnv = process.env["OMC_PROJECT_ROOT"];

  beforeEach(() => {
    projectRoot = makeTmpProject();
    process.env["OMC_PROJECT_ROOT"] = projectRoot;
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
    if (origEnv === undefined) delete process.env["OMC_PROJECT_ROOT"];
    else process.env["OMC_PROJECT_ROOT"] = origEnv;
  });

  it("createNotificationEvent applies defaults", () => {
    const event = createNotificationEvent({
      taskId: "dashboard-scan",
      summary: "tick",
    });
    assert.equal(event.source, "schedule");
    assert.equal(event.status, "info");
    assert.equal(event.channels.desktop, true);
    assert.equal(event.channels.feed, true);
    assert.ok(event.id);
    assert.ok(event.ts);
  });

  it("appends and reads notifications", () => {
    appendNotification(createNotificationEvent({
      taskId: "dashboard-scan",
      summary: "tick",
      status: "warn",
    }));

    const notifications = readNotifications();
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].taskId, "dashboard-scan");
    assert.equal(notifications[0].status, "warn");
  });

  it("tailNotifications returns newest notifications first", () => {
    appendNotification(createNotificationEvent({
      ts: "2026-04-04T10:00:00Z",
      taskId: "a",
      summary: "first",
    }));
    appendNotification(createNotificationEvent({
      ts: "2026-04-04T10:01:00Z",
      taskId: "b",
      summary: "second",
    }));

    const notifications = tailNotifications(2);
    assert.equal(notifications.length, 2);
    assert.equal(notifications[0].taskId, "b");
    assert.equal(notifications[1].taskId, "a");
  });

  it("readNotifications skips corrupt lines", () => {
    const path = getNotificationLogPath();
    writeFileSync(
      path,
      JSON.stringify(createNotificationEvent({
        taskId: "dashboard-scan",
        summary: "tick",
      })) + "\n{invalid\n",
    );

    const notifications = readNotifications();
    assert.equal(notifications.length, 1);
  });

  it("returns empty arrays when notification log is missing", () => {
    assert.deepEqual(readNotifications(), []);
    assert.deepEqual(tailNotifications(5), []);
  });
});
