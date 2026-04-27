import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildDesktopAppleScript,
  sendDesktopNotification,
  shellEscapeForAppleScript,
  type DesktopCommandRunner,
} from "../desktop-notify.js";

test("shellEscapeForAppleScript escapes quotes and backslashes", () => {
  const escaped = shellEscapeForAppleScript('hello "quoted" \\ slash');
  assert.equal(escaped, 'hello \\"quoted\\" \\\\ slash');
});

test("buildDesktopAppleScript uses alert style and sound", () => {
  const script = buildDesktopAppleScript("Title", "Message", {
    tone: "warn",
    timeoutSeconds: 12,
  });
  assert.ok(script.includes("beep 2"));
  assert.ok(script.includes('display alert "Title" message "Message" as warning giving up after 12'));
});

test("sendDesktopNotification returns success when runner succeeds", () => {
  let seenCommand = "";
  let seenArgs: string[] = [];
  const runner: DesktopCommandRunner = (command, args) => {
    seenCommand = command;
    seenArgs = args;
    return { status: 0, stdout: "", stderr: "" };
  };
  const result = sendDesktopNotification("Title", "Message", { tone: "error" }, runner);
  assert.deepEqual(result, { ok: true });
  assert.equal(seenCommand, "osascript");
  assert.equal(seenArgs[0], "-e");
  assert.ok(seenArgs[1]?.includes("beep 2"));
  assert.ok(seenArgs[1]?.includes('display alert "Title" message "Message" as critical'));
});

test("sendDesktopNotification returns error when runner fails", () => {
  const runner: DesktopCommandRunner = () => ({ status: 1, stdout: "", stderr: "boom" });
  const result = sendDesktopNotification("Title", "Message", {}, runner);
  assert.equal(result.ok, false);
  assert.equal(result.error, "boom");
});

test("sendDesktopNotification returns command error when runner throws", () => {
  const runner: DesktopCommandRunner = () => ({
    status: null,
    error: new Error("osascript_missing"),
  });
  const result = sendDesktopNotification("Title", "Message", {}, runner);
  assert.equal(result.ok, false);
  assert.equal(result.error, "osascript_missing");
});
