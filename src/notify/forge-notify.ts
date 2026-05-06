import type { ModeState } from "../state/mode-state.js";
import { getForgeSlackWebhookUrl, isForgeSlackVerbose } from "./config.js";
import { postSlackIncomingWebhook } from "./slack-webhook.js";
import { getProjectRoot } from "../state/paths.js";

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

/**
 * Returns true if this write is worth notifying (avoids spam on iteration-only bumps).
 */
export function shouldNotifyForgeChange(
  previous: ModeState | null,
  next: ModeState,
  verbose: boolean
): boolean {
  if (verbose) return true;
  if (!previous) return true;
  if (previous.status !== next.status) return true;
  if (previous.phase !== next.phase) return true;
  const pb = JSON.stringify(previous.blockers ?? []);
  const nb = JSON.stringify(next.blockers ?? []);
  if (pb !== nb) return true;
  const pt = String(previous.task ?? "");
  const nt = String(next.task ?? "");
  if (pt !== nt) return true;
  return false;
}

/** One-off snapshot (e.g. after editing forge-state.json by hand). */
export function formatForgeSnapshotMessage(next: ModeState, projectRoot: string): string {
  const task = truncate(String(next.task ?? "(no task)"), 400);
  const iter = next.iteration != null ? ` · iter ${next.iteration}` : "";
  const phase = next.phase ? ` · ${next.phase}` : "";
  const status = next.status ?? "?";
  return `:clipboard: *Forge snapshot* (${status})\n${task}\n_${projectRoot}${iter}${phase}_`;
}

function buildMessage(
  previous: ModeState | null,
  next: ModeState,
  projectRoot: string
): string {
  const task = truncate(String(next.task ?? "(no task)"), 400);
  const iter =
    next.iteration != null ? ` · iter ${next.iteration}` : "";
  const phase = next.phase ? ` · ${next.phase}` : "";

  if (!previous) {
    return `:hammer_and_wrench: *Forge started*\n${task}\n_${projectRoot}${iter}${phase}_`;
  }

  if (previous.status !== next.status) {
    if (next.status === "complete") {
      return `:white_check_mark: *Forge complete*\n${task}\n_${projectRoot}${iter}${phase}_`;
    }
    if (next.status === "cancelled") {
      return `:stop_button: *Forge cancelled*\n${task}\n_${projectRoot}${iter}${phase}_`;
    }
    if (next.status === "blocked") {
      return `:warning: *Forge blocked*\n${task}\n_${projectRoot}${iter}${phase}_`;
    }
    if (next.status === "active" && previous.status !== "active") {
      return `:hammer_and_wrench: *Forge resumed*\n${task}\n_${projectRoot}${iter}${phase}_`;
    }
  }

  if (previous.phase !== next.phase && next.phase) {
    return `:arrows_counterclockwise: *Forge phase* ${previous.phase ?? "?"} → *${next.phase}*\n${task}\n_${projectRoot}${iter}_`;
  }

  const blockers = next.blockers;
  if (Array.isArray(blockers) && blockers.length > 0) {
    const b = truncate(blockers.map(String).join(", "), 300);
    return `:construction: *Forge update*\n${task}\nBlockers: ${b}\n_${projectRoot}${iter}${phase}_`;
  }

  return `:information_source: *Forge update*\n${task}\n_${projectRoot}${iter}${phase}_`;
}

/**
 * Fire-and-forget Slack notification after forge state is persisted.
 */
export function notifyForgeStateChange(
  previous: ModeState | null,
  next: ModeState
): Promise<void> {
  const url = getForgeSlackWebhookUrl();
  if (!url) return Promise.resolve();

  const verbose = isForgeSlackVerbose();
  if (!shouldNotifyForgeChange(previous, next, verbose)) {
    return Promise.resolve();
  }

  const text = buildMessage(previous, next, getProjectRoot());
  return postSlackIncomingWebhook(url, { text })
    .then((res) => {
      if (!res.ok) {
        console.error(`[omr] Slack webhook HTTP ${res.status}`);
      }
    })
    .catch((err: unknown) => {
      console.error("[omr] Slack webhook failed:", err);
    });
}
