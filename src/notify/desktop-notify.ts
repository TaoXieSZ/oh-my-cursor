import { spawnSync } from "node:child_process";

export interface DesktopNotificationResult {
  ok: boolean;
  error?: string;
}

export type DesktopNotificationTone = "ok" | "warn" | "error" | "info";

export interface DesktopNotificationOptions {
  tone?: DesktopNotificationTone;
  timeoutSeconds?: number;
  sound?: boolean;
}

export interface DesktopCommandResult {
  status: number | null;
  stdout?: string;
  stderr?: string;
  error?: Error;
}

export type DesktopCommandRunner = (
  command: string,
  args: string[],
) => DesktopCommandResult;

const DEFAULT_ALERT_TIMEOUT_SECONDS = 8;

export function shellEscapeForAppleScript(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function defaultDesktopCommandRunner(
  command: string,
  args: string[],
): DesktopCommandResult {
  const result = spawnSync(command, args, {
    encoding: "utf-8",
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    ...(result.error ? { error: result.error } : {}),
  };
}

export function buildDesktopAppleScript(
  title: string,
  message: string,
  options: DesktopNotificationOptions = {},
): string {
  const escapedTitle = shellEscapeForAppleScript(title);
  const escapedMessage = shellEscapeForAppleScript(message);
  const tone = options.tone ?? "info";
  const alertStyle = desktopToneToAppleScriptStyle(tone);
  const timeoutSeconds = normalizeTimeoutSeconds(
    options.timeoutSeconds ?? DEFAULT_ALERT_TIMEOUT_SECONDS,
  );
  const soundStatements = options.sound === false ? [] : ["beep 2"];

  return [
    ...soundStatements,
    `display alert "${escapedTitle}" message "${escapedMessage}" as ${alertStyle} giving up after ${timeoutSeconds}`,
  ].join("\n");
}

export function sendDesktopNotification(
  title: string,
  message: string,
  options: DesktopNotificationOptions = {},
  runner: DesktopCommandRunner = defaultDesktopCommandRunner,
): DesktopNotificationResult {
  const command = process.env["OMC_DESKTOP_NOTIFY_COMMAND"]?.trim() || "osascript";
  const script = buildDesktopAppleScript(title, message, options);
  const result = runner(command, ["-e", script]);

  if (result.error) {
    return { ok: false, error: result.error.message };
  }
  if (result.status !== 0) {
    const errorText = (result.stderr || result.stdout || "desktop_notification_failed").trim();
    return { ok: false, error: errorText };
  }
  return { ok: true };
}

function desktopToneToAppleScriptStyle(
  tone: DesktopNotificationTone,
): "informational" | "warning" | "critical" {
  if (tone === "error") return "critical";
  if (tone === "warn") return "warning";
  return "informational";
}

function normalizeTimeoutSeconds(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_ALERT_TIMEOUT_SECONDS;
  }
  return Math.max(1, Math.floor(value));
}
