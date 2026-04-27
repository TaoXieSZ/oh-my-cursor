import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { inspectHarnessReadiness } from "../harness.js";

function makeTmpProject(): string {
  const dir = join(tmpdir(), `omc-harness-test-${randomUUID()}`);
  mkdirSync(join(dir, ".omc", "state"), { recursive: true });
  mkdirSync(join(dir, ".omc", "logs"), { recursive: true });
  return dir;
}

describe("harness readiness", () => {
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

  it("passes when no schedule state exists yet", () => {
    const readiness = inspectHarnessReadiness();
    assert.equal(readiness.ok, true);
    assert.equal(readiness.summary.errorCount, 0);
    assert.equal(readiness.summary.scheduleTasks, 0);
  });

  it("fails when schedule-state.json violates the contract", () => {
    writeFileSync(
      join(projectRoot, ".omc", "state", "schedule-state.json"),
      JSON.stringify({
        mode: "schedule",
        status: "active",
        tasks: [
          {
            id: "",
            description: "",
            interval_seconds: 0,
            state: "broken",
            run_count: -1,
            params: null,
          },
        ],
      }),
    );

    const readiness = inspectHarnessReadiness();
    assert.equal(readiness.ok, false);
    const scheduleCheck = readiness.checks.find((check) => check.id === "schedule-contract");
    assert.ok(scheduleCheck);
    assert.equal(scheduleCheck!.status, "error");
    assert.match(scheduleCheck!.detail ?? "", /invalid interval_seconds/);
  });

  it("ignores deprecated monitor artifacts when checking schedule readiness", () => {
    writeFileSync(
      join(projectRoot, ".omc", "state", "monitor-deadbeef-state.json"),
      JSON.stringify({
        mode: "monitor",
        runId: "deadbeef",
        started_at: "2026-04-15T00:00:00Z",
        status: "active",
        phase: "watching",
        monitorId: "mon-1",
        sourceTaskId: "dashboard-a",
        title: "IMOC Monitor",
        dashboardUrl: "https://grafana.example.com/a",
        latestStatus: "warn",
        latestSummary: "Latency elevated",
        feed: [
          {
            id: "feed-1",
            ts: "2026-04-15T00:01:00Z",
            kind: "tick",
            status: "warn",
            summary: "Latency elevated",
            sourceTaskId: "dashboard-a",
          },
        ],
      }),
    );

    const readiness = inspectHarnessReadiness();
    assert.equal(readiness.ok, true);
    assert.equal(readiness.summary.errorCount, 0);
    assert.equal(readiness.checks.length, 1);
    assert.equal(readiness.checks[0].id, "schedule-contract");
  });
});
