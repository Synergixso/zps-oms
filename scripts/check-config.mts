/**
 * Validates the deployment configuration of the current environment (issue #11). Usage: `npm run check:config`
 * (reads the process environment; load .env files with your process manager). Exit code 1 on any ERROR.
 * Prints findings only — never secret values.
 */
import { checkConfig } from "../src/server/lib/config-check.ts";

const findings = checkConfig();
for (const f of findings) console.log(`${f.level.padEnd(5)} ${f.code.padEnd(22)} ${f.message}`);
process.exit(findings.some((f) => f.level === "ERROR") ? 1 : 0);
