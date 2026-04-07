import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getBaseStateDir } from "../state/paths.js";

/**
 * Resolve Slack webhook URL for forge notifications.
 * Precedence: OMC_FORGE_SLACK_WEBHOOK_URL → OMC_SLACK_WEBHOOK_URL → .omc/omc-config.json notifications.slack_webhook_url
 */
export function getForgeSlackWebhookUrl(): string | undefined {
  const envForge = process.env["OMC_FORGE_SLACK_WEBHOOK_URL"]?.trim();
  if (envForge) return envForge;

  const envGeneral = process.env["OMC_SLACK_WEBHOOK_URL"]?.trim();
  if (envGeneral) return envGeneral;

  const path = join(getBaseStateDir(), "omc-config.json");
  if (!existsSync(path)) return undefined;

  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw) as {
      notifications?: { slack_webhook_url?: string };
    };
    const url = parsed.notifications?.slack_webhook_url?.trim();
    return url || undefined;
  } catch {
    return undefined;
  }
}

export function isForgeSlackVerbose(): boolean {
  const v = process.env["OMC_SLACK_FORGE_VERBOSE"]?.toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}
