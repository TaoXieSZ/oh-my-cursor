import { setup } from "./setup.js";
import { doctor } from "./doctor.js";
import { status } from "./status.js";

const VERSION = "0.1.0";

const HELP = `
oh-my-cursor (omc) v${VERSION}
Workflow orchestration layer for Cursor IDE

Usage:
  omc <command> [options]

Commands:
  setup    Install rules, skills, and MCP servers into Cursor
  doctor   Verify installation health
  status   Show active mode, session, and state
  help     Show this help message
  version  Print version

Options:
  --scope <user|project>  Installation scope (default: user)
  --force                 Overwrite existing files without backup prompt
  --verbose               Show detailed output

Examples:
  omc setup                  # Install to user scope
  omc setup --scope project  # Install to current project
  omc doctor                 # Check installation health
  omc status                 # Show current state
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
    } else if (arg === "--force") {
      opts.force = true;
    } else if (arg === "--verbose") {
      opts.verbose = true;
    }
  }

  return opts;
}
