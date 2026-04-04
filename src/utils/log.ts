const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";

export function ok(msg: string): void {
  console.log(`${GREEN}✓${RESET} ${msg}`);
}

export function warn(msg: string): void {
  console.log(`${YELLOW}!${RESET} ${msg}`);
}

export function fail(msg: string): void {
  console.log(`${RED}✗${RESET} ${msg}`);
}

export function info(msg: string): void {
  console.log(`${CYAN}→${RESET} ${msg}`);
}

export function dim(msg: string): void {
  console.log(`${DIM}  ${msg}${RESET}`);
}

export function heading(msg: string): void {
  console.log(`\n${CYAN}${msg}${RESET}`);
  console.log(`${DIM}${"─".repeat(msg.length)}${RESET}`);
}
