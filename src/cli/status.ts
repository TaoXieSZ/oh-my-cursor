import { existsSync, readFileSync, readdirSync } from "node:fs";
import {
  omrStateDir,
  omrStatePath,
  omrPlansDir,
  omrSetupScopePath,
} from "../utils/paths.js";
import { ok, warn, info, heading, dim } from "../utils/log.js";

interface StatusOptions {
  scope: "user" | "project";
  force: boolean;
  verbose: boolean;
}

export async function status(_options: StatusOptions): Promise<void> {
  heading("oh-my-cursor status");

  showSetupInfo();
  showActiveMode();
  showPlans();
  showTeamState();
}

function showSetupInfo(): void {
  const metaPath = omrSetupScopePath();
  if (!existsSync(metaPath)) {
    warn("Not set up. Run 'omr setup' first.");
    return;
  }

  try {
    const meta = JSON.parse(readFileSync(metaPath, "utf-8"));
    info(`Scope: ${meta.scope} | Version: ${meta.version} | Installed: ${meta.installedAt}`);
  } catch {
    warn("Setup metadata unreadable");
  }
}

function showActiveMode(): void {
  const stateDir = omrStatePath();
  if (!existsSync(stateDir)) {
    dim("No active mode");
    return;
  }

  const stateFiles = readdirSync(stateDir).filter((f) => f.endsWith("-state.json"));
  if (stateFiles.length === 0) {
    dim("No active mode");
    return;
  }

  for (const file of stateFiles) {
    try {
      const state = JSON.parse(readFileSync(`${stateDir}/${file}`, "utf-8"));
      const mode = file.replace("-state.json", "");
      if (mode === "monitor" || mode.startsWith("monitor-")) {
        continue;
      }
      const status = state.completed_at ? "completed" : state.cancelled_at ? "cancelled" : "active";
      info(`Mode: ${mode} (${status})`);
      if (state.phase) dim(`  Phase: ${state.phase}`);
      if (state.iteration) dim(`  Iteration: ${state.iteration}`);
    } catch {
      // skip corrupt state files
    }
  }
}

function showPlans(): void {
  const plansDir = omrPlansDir();
  if (!existsSync(plansDir)) return;

  const plans = readdirSync(plansDir).filter((f) => f.endsWith(".md"));
  if (plans.length === 0) {
    dim("No plans");
    return;
  }

  info(`Plans: ${plans.length}`);
  for (const plan of plans) {
    dim(`  ${plan}`);
  }
}

function showTeamState(): void {
  const teamDir = `${omrStatePath()}/team`;
  if (!existsSync(teamDir)) return;

  const teamStatePath = `${teamDir}/team-state.json`;
  if (!existsSync(teamStatePath)) return;

  try {
    const state = JSON.parse(readFileSync(teamStatePath, "utf-8"));
    info(`Team: ${state.name ?? "unnamed"} (${state.status ?? "unknown"})`);
    if (state.workers) {
      dim(`  Workers: ${state.workers.length}`);
    }
  } catch {
    // skip
  }
}
