import { setup } from "./setup.js";
import { doctor } from "./doctor.js";
import { status } from "./status.js";
import { dashboard } from "./dashboard.js";
import { archiveCurrentSession, listArchives } from "../state/archive.js";
import * as log from "../utils/log.js";

const VERSION = "0.1.0";

const HELP = `
oh-my-cursor (omc) v${VERSION}
Workflow orchestration layer for Cursor IDE

Usage:
  omc <command> [options]

Commands:
  setup      Install rules, skills, and MCP servers into Cursor
  doctor     Verify installation health
  status     Show active mode, session, and state
  skills     List all installed OMC skills
  dashboard  Launch live web dashboard (http://localhost:3721)
  archive    Archive current session to .omc/archive/ and reset state
  archives   List all archived sessions
  notify     Slack notifications (see subcommands below)
  help       Show this help message
  version    Print version

Options:
  --scope <user|project>  Installation scope (default: user)
  --force                 Overwrite existing files without backup prompt
  --verbose               Show detailed output
  --port <number>         Dashboard port (default: 3721)

Examples:
  omc setup                  # Install to user scope
  omc setup --scope project  # Install to current project
  omc doctor                 # Check installation health
  omc status                 # Show current state
  omc skills                 # List available skills
  omc dashboard              # Launch live web dashboard
  omc dashboard --port 4000  # Custom port
  omc archive                # Archive current session
  omc archives               # List archived sessions

Notify (Slack Incoming Webhooks):
  omc notify slack [message]   # Test webhook (default message if omitted)
  omc notify forge             # Push current forge-state.json snapshot to Slack

  Configure URL via OMC_SLACK_WEBHOOK_URL, OMC_FORGE_SLACK_WEBHOOK_URL,
  or notifications.slack_webhook_url in .omc/omc-config.json
`.trim();

export async function main(args: string[]): Promise<void> {
  const command = args[0] ?? "help";

  const options = parseOptions(args.slice(1));

  switch (command) {
    case "setup":
      await setup(options);
      break;
    case "doctor":
      await doctor(options);
      break;
    case "status":
      await status(options);
      break;
    case "skills": {
      const { skills: listSkills } = await import("./skills.js");
      await listSkills();
      break;
    }
    case "dashboard":
      await dashboard({ port: options.port, open: options.open });
      break;
    case "archive": {
      const path = archiveCurrentSession();
      if (path) log.ok("Session archived → " + path);
      else log.info("Nothing to archive.");
      break;
    }
    case "archives": {
      const list = listArchives();
      if (list.length === 0) { log.info("No archived sessions."); break; }
      log.heading("Archived Sessions");
      for (const a of list) {
        const task = a.task ?? "(no task)";
        const modes = a.modes.map((m: Record<string, unknown>) => m.mode ?? "?").join(", ");
        log.info(`${a.session.id.slice(0, 8)}  ${a.session.archived_at.slice(0, 16)}  ${task}  [${modes}]`);
      }
      break;
    }
    case "notify": {
      const sub = args[1];
      if (sub === "slack") {
        const { getForgeSlackWebhookUrl } = await import("../notify/config.js");
        const { postSlackIncomingWebhook } = await import("../notify/slack-webhook.js");
        const url = getForgeSlackWebhookUrl();
        if (!url) {
          log.fail(
            "No Slack webhook URL. Set OMC_SLACK_WEBHOOK_URL or OMC_FORGE_SLACK_WEBHOOK_URL, or add notifications.slack_webhook_url to .omc/omc-config.json"
          );
          process.exit(1);
        }
        const msg = args.slice(2).join(" ").trim() || "OMC Slack webhook test";
        const res = await postSlackIncomingWebhook(url, { text: msg });
        if (!res.ok) {
          log.fail(`Slack webhook HTTP ${res.status}`);
          process.exit(1);
        }
        log.ok("Sent to Slack.");
        break;
      }
      if (sub === "forge") {
        const { getForgeSlackWebhookUrl } = await import("../notify/config.js");
        const { postSlackIncomingWebhook } = await import("../notify/slack-webhook.js");
        const { formatForgeSnapshotMessage } = await import("../notify/forge-notify.js");
        const { readModeState } = await import("../state/mode-state.js");
        const { getProjectRoot } = await import("../state/paths.js");
        const url = getForgeSlackWebhookUrl();
        if (!url) {
          log.fail(
            "No Slack webhook URL. Set OMC_SLACK_WEBHOOK_URL or OMC_FORGE_SLACK_WEBHOOK_URL, or add notifications.slack_webhook_url to .omc/omc-config.json"
          );
          process.exit(1);
        }
        const state = readModeState("forge");
        if (!state) {
          log.fail("No forge state at .omc/state/forge-state.json");
          process.exit(1);
        }
        const text = formatForgeSnapshotMessage(state, getProjectRoot());
        const res = await postSlackIncomingWebhook(url, { text });
        if (!res.ok) {
          log.fail(`Slack webhook HTTP ${res.status}`);
          process.exit(1);
        }
        log.ok("Sent forge snapshot to Slack.");
        break;
      }
      log.fail('Use: omc notify slack [message]  or  omc notify forge');
      process.exit(1);
    }
    case "version":
    case "--version":
    case "-v":
      console.log(VERSION);
      break;
    case "help":
    case "--help":
    case "-h":
      console.log(HELP);
      break;
    default:
      console.error(`Unknown command: ${command}\n`);
      console.log(HELP);
      process.exit(1);
  }
}

interface CliOptions {
  scope: "user" | "project";
  force: boolean;
  verbose: boolean;
  port?: number;
  open?: boolean;
}

function parseOptions(args: string[]): CliOptions {
  const opts: CliOptions = {
    scope: "user",
    force: false,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--scope" && args[i + 1]) {
      const val = args[++i];
      if (val === "user" || val === "project") {
        opts.scope = val;
      } else {
        console.error(`Invalid scope: ${val}. Use "user" or "project".`);
        process.exit(1);
      }
    } else if (arg === "--port" && args[i + 1]) {
      const p = parseInt(args[++i], 10);
      if (!isNaN(p)) opts.port = p;
    } else if (arg === "--no-open") {
      opts.open = false;
    } else if (arg === "--force") {
      opts.force = true;
    } else if (arg === "--verbose") {
      opts.verbose = true;
    }
  }

  return opts;
}
