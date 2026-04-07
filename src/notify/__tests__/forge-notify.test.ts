import { test } from "node:test";
import assert from "node:assert/strict";
import {
  shouldNotifyForgeChange,
  formatForgeSnapshotMessage,
} from "../forge-notify.js";
import type { ModeState } from "../../state/mode-state.js";

test("shouldNotifyForgeChange: first write always notifies (non-verbose)", () => {
  const next: ModeState = {
    mode: "forge",
    started_at: "2026-01-01T00:00:00Z",
    status: "active",
    task: "t",
  };
  assert.equal(shouldNotifyForgeChange(null, next, false), true);
});

test("shouldNotifyForgeChange: iteration-only bump does not notify", () => {
  const previous: ModeState = {
    mode: "forge",
    started_at: "2026-01-01T00:00:00Z",
    status: "active",
    task: "t",
    iteration: 1,
    phase: "verify",
  };
  const next: ModeState = { ...previous, iteration: 2 };
  assert.equal(shouldNotifyForgeChange(previous, next, false), false);
});

test("shouldNotifyForgeChange: iteration bump notifies when verbose", () => {
  const previous: ModeState = {
    mode: "forge",
    started_at: "2026-01-01T00:00:00Z",
    status: "active",
    task: "t",
    iteration: 1,
  };
  const next: ModeState = { ...previous, iteration: 2 };
  assert.equal(shouldNotifyForgeChange(previous, next, true), true);
});

test("shouldNotifyForgeChange: phase change notifies", () => {
  const previous: ModeState = {
    mode: "forge",
    started_at: "2026-01-01T00:00:00Z",
    status: "active",
    task: "t",
    phase: "implement",
  };
  const next: ModeState = { ...previous, phase: "verify" };
  assert.equal(shouldNotifyForgeChange(previous, next, false), true);
});

test("formatForgeSnapshotMessage includes status and task", () => {
  const s: ModeState = {
    mode: "forge",
    started_at: "2026-01-01T00:00:00Z",
    status: "active",
    task: "hello",
    iteration: 3,
    phase: "fix",
  };
  const t = formatForgeSnapshotMessage(s, "/proj");
  assert.ok(t.includes("Forge snapshot"));
  assert.ok(t.includes("active"));
  assert.ok(t.includes("hello"));
  assert.ok(t.includes("iter 3"));
});
