import { setup } from "./setup.js";
import { doctor } from "./doctor.js";
import { status } from "./status.js";
import { dashboard } from "./dashboard.js";
import { archiveCurrentSession, listArchives } from "../state/archive.js";
import * as log from "../utils/log.js";

const VERSION = "0.1.0";

const HELP = `
oh-my-cursor (omr) v${VERSION}
Lightweight workflow toolkit for Cursor IDE

Usage:
  omr <command> [options]

Core commands:
  setup      Install rules, skills, and MCP servers into Cursor
  doctor     Verify installation health
  status     Show active mode, session, and state
  skills     List core workflows and optional extras
  archive    Archive current session to .omr/archive/ and reset state
  archives   List all archived sessions
  help       Show this help message
  version    Print version

Optional extras:
  schedule   Manage generic scheduled task state and lifecycle
  dashboard  Launch live web dashboard (http://localhost:3721)
  notify     Slack notifications (see subcommands below)

Options:
  --scope <user|project>  Installation scope (default: user)
  --force                 Overwrite existing files without backup prompt
  --verbose               Show detailed output
  --port <number>         Dashboard port (default: 3721)

Examples:
  omr setup                  # Install to user scope
  omr setup --scope project  # Install to current project
  omr doctor                 # Check installation health
  omr status                 # Show current state
  omr skills                 # Show the core path first
  # Cursor chat default path: /omr-deep-interview -> /omr-blueprint -> /omr-forge

Optional extras:
  omr schedule list --scope user
                           # Show user-scoped scheduled tasks
  omr schedule add-rss --scope user --url <feed>
                           # Register a user-scoped RSS watcher
  omr schedule run-now task --scope user
                           # Request an immediate rerun
  omr dashboard              # Launch live web dashboard
  omr dashboard --port 4000  # Custom port
  omr team watch [--run <id>] [--no-follow]
                             # Tail multi-agent blackboard chatter

Notify (Slack Incoming Webhooks):
  omr notify slack [message]   # Test webhook (default message if omitted)
  omr notify forge             # Push current forge-state.json snapshot to Slack
  omr notify emit --task-id <id> --summary <text> [--status ok|warn|error|info] [--scope user|project]
                              # Emit core OMR notification (feed + desktop by default)
  omr notify recent [--limit N] [--scope user|project]
                              # Show recent core notifications
  omr notify test-desktop [message]
                              # Emit a desktop notification for local verification

  Configure URL via OMR_SLACK_WEBHOOK_URL, OMR_FORGE_SLACK_WEBHOOK_URL,
  or notifications.slack_webhook_url in .omr/omr-config.json
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
    case "schedule": {
      const { schedule } = await import("./schedule.js");
      await schedule(args.slice(1));
      break;
    }
    case "dashboard":
      await dashboard({ port: options.port, open: options.open });
      break;
    case "team": {
      const { parseTeamArgs, teamWatch } = await import("./team.js");
      const { sub, opts } = parseTeamArgs(args.slice(1));
      if (sub === "watch") {
        await teamWatch(opts);
        break;
      }
      log.fail("Use: omr team watch [--run <id>] [--no-follow]");
      process.exit(1);
    }
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
      if (sub === "emit") {
        const parsed = parseNotifyEmitArgs(args.slice(2));
        if (!parsed.taskId || !parsed.summary) {
          log.fail("Use: omr notify emit --task-id <id> --summary <text> [--status ok|warn|error|info] [--details <text>] [--source <name>] [--title <text>] [--scope user|project] [--no-desktop] [--no-feed]");
          process.exit(1);
        }
        const { emitNotification } = await import("../notify/notification-center.js");
        const event = emitNotification({
          scope: parsed.scope,
          source: parsed.source,
          taskId: parsed.taskId,
          status: parsed.status,
          summary: parsed.summary,
          ...(parsed.details ? { details: parsed.details } : {}),
          ...(parsed.title ? { title: parsed.title } : {}),
          channels: {
            desktop: parsed.desktop,
            feed: parsed.feed,
          },
        });
        log.ok(`Notification emitted (${event.status}) → ${event.taskId}`);
        break;
      }
      if (sub === "recent") {
        const { limit, scope } = parseNotifyRecentArgs(args.slice(2));
        const { tailNotifications } = await import("../notify/notification-store.js");
        const notifications = tailNotifications(limit, scope);
        if (notifications.length === 0) {
          log.info("No notifications yet.");
          break;
        }
        log.heading("Recent Notifications");
        for (const notification of notifications) {
          log.info(`[${notification.status}] ${notification.taskId} — ${notification.summary}`);
          log.dim(`${notification.ts} · ${notification.source}`);
          if (notification.details) log.dim(notification.details);
        }
        break;
      }
      if (sub === "test-desktop") {
        const { sendDesktopNotification } = await import("../notify/desktop-notify.js");
        const message = args.slice(2).join(" ").trim() || "OMR desktop notification test";
        const result = sendDesktopNotification("OMR Desktop Test", message, {
          tone: "info",
        });
        if (!result.ok) {
          log.fail(`Desktop notification failed: ${result.error ?? "unknown error"}`);
          process.exit(1);
        }
        log.ok("Desktop notification sent.");
        break;
      }
      if (sub === "slack") {
        const { getForgeSlackWebhookUrl } = await import("../notify/config.js");
        const { postSlackIncomingWebhook } = await import("../notify/slack-webhook.js");
        const url = getForgeSlackWebhookUrl();
        if (!url) {
          log.fail(
            "No Slack webhook URL. Set OMR_SLACK_WEBHOOK_URL or OMR_FORGE_SLACK_WEBHOOK_URL, or add notifications.slack_webhook_url to .omr/omr-config.json"
          );
          process.exit(1);
        }
        const msg = args.slice(2).join(" ").trim() || "OMR Slack webhook test";
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
            "No Slack webhook URL. Set OMR_SLACK_WEBHOOK_URL or OMR_FORGE_SLACK_WEBHOOK_URL, or add notifications.slack_webhook_url to .omr/omr-config.json"
          );
          process.exit(1);
        }
        const state = readModeState("forge");
        if (!state) {
          log.fail("No forge state at .omr/state/forge-state.json");
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
      log.fail("Use: omr notify slack [message]  or  omr notify forge  or  omr notify emit|recent|test-desktop");
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

interface NotifyEmitArgs {
  scope: "user" | "project";
  source: string;
  taskId?: string;
  status: "ok" | "warn" | "error" | "info";
  summary?: string;
  details?: string;
  title?: string;
  desktop: boolean;
  feed: boolean;
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

function parseNotifyEmitArgs(args: string[]): NotifyEmitArgs {
  const result: NotifyEmitArgs = {
    scope: "project",
    source: "schedule",
    status: "info",
    desktop: true,
    feed: true,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--source" && args[i + 1]) {
      result.source = args[++i];
    } else if (arg === "--scope" && args[i + 1]) {
      const scope = args[++i];
      if (scope === "project" || scope === "user") {
        result.scope = scope;
      }
    } else if (arg === "--task-id" && args[i + 1]) {
      result.taskId = args[++i];
    } else if (arg === "--status" && args[i + 1]) {
      const status = args[++i];
      if (status === "ok" || status === "warn" || status === "error" || status === "info") {
        result.status = status;
      }
    } else if (arg === "--summary" && args[i + 1]) {
      result.summary = args[++i];
    } else if (arg === "--details" && args[i + 1]) {
      result.details = args[++i];
    } else if (arg === "--title" && args[i + 1]) {
      result.title = args[++i];
    } else if (arg === "--no-desktop") {
      result.desktop = false;
    } else if (arg === "--no-feed") {
      result.feed = false;
    }
  }

  return result;
}

function parseNotifyRecentArgs(args: string[]): {
  limit: number;
  scope: "user" | "project";
} {
  let limit = 10;
  let scope: "user" | "project" = "project";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) {
      const parsed = parseInt(args[i + 1], 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        limit = parsed;
      }
    } else if (args[i] === "--scope" && args[i + 1]) {
      const parsedScope = args[i + 1];
      if (parsedScope === "project" || parsedScope === "user") {
        scope = parsedScope;
      }
    }
  }
  return { limit, scope };
}
