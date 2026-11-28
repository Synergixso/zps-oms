/**
 * Deployment configuration check (issue #11; DEPLOYMENT_GUIDE). Infrastructure-independent: it validates the
 * environment a server is about to run with, without contacting anything. ERRORs mean the configuration is unsafe
 * for that environment; WARNs are items to complete before a pilot. Secrets are never printed — only whether a
 * value is present and well-formed.
 *
 * Used by `npm run check:config` (exit 1 on any ERROR), at server start-up (logged), and by the health page.
 */
import { identifierRule, type IdentifierKind } from "./identifiers";
import { scannerConfig } from "./malware-scan";

export interface ConfigFinding { level: "ERROR" | "WARN" | "OK"; code: string; message: string }

const KINDS: IdentifierKind[] = ["serviceNumber", "registration", "fleetRef", "assetTag", "storeCode"];

export function checkConfig(env: Record<string, string | undefined> = process.env): ConfigFinding[] {
  const out: ConfigFinding[] = [];
  const add = (level: ConfigFinding["level"], code: string, message: string) => out.push({ level, code, message });
  const target = (env.ZPS_ENVIRONMENT ?? "").trim().toLowerCase() || "development";
  const prod = target === "production";
  if (!["development", "test", "production"].includes(target)) add("ERROR", "ENVIRONMENT", `ZPS_ENVIRONMENT must be development, test or production (got "${target}").`);

  // Database
  const url = env.DATABASE_URL;
  if (!url) add("ERROR", "DATABASE_URL", "DATABASE_URL is not set.");
  else {
    try {
      const u = new URL(url);
      if (!/^mysql:$/.test(u.protocol)) add("ERROR", "DATABASE_URL", "DATABASE_URL must be a mysql:// URL.");
      const name = u.pathname.replace(/^\//, "");
      if (!name) add("ERROR", "DATABASE_URL", "DATABASE_URL names no database.");
      if (prod && u.username === "root") add("ERROR", "DATABASE_USER", "Production must use a dedicated least-privilege database account, not root.");
      if (prod && !u.password) add("ERROR", "DATABASE_PASSWORD", "The production database account has no password.");
      if (prod && /^zps_oms_(dev|test|e2e|ci)$/.test(name)) add("ERROR", "DATABASE_NAME", `Production points at a development database (${name}).`);
      if (!prod && !/^zps_oms_/.test(name)) add("WARN", "DATABASE_NAME", "Development databases are expected to be named zps_oms_* (destructive tooling refuses other names).");
    } catch {
      add("ERROR", "DATABASE_URL", "DATABASE_URL is not a valid URL.");
    }
  }

  // Sessions and development conveniences
  if (prod && env.ZPS_INSECURE_COOKIE === "1") add("ERROR", "INSECURE_COOKIE", "ZPS_INSECURE_COOKIE=1 disables the Secure cookie flag; never set it in production (TLS is required).");
  if (prod && env.ZPS_SHOW_DEMO_ACCOUNTS === "1") add("WARN", "DEMO_ACCOUNTS", "ZPS_SHOW_DEMO_ACCOUNTS=1 is ignored in production; remove it.");
  if (prod && env.NODE_ENV !== "production") add("ERROR", "NODE_ENV", "Production must run a production build (NODE_ENV=production, `npm run build` then `npm start`).");
  const token = (env.ZPS_SETUP_TOKEN ?? "").trim();
  if (token && token.length < 24) add("ERROR", "SETUP_TOKEN", "ZPS_SETUP_TOKEN must be at least 24 characters.");
  if (prod && token) add("WARN", "SETUP_TOKEN", "ZPS_SETUP_TOKEN is set: remove it once the first administrator has been created.");

  // Backups
  if (prod && !env.ZPS_BACKUP_DIR) add("WARN", "BACKUP_DIR", "ZPS_BACKUP_DIR is not set; backups go to ./backups on the application host. Point it at the approved backup volume.");
  if (prod && !env.MYSQLDUMP_PATH) add("WARN", "MYSQLDUMP", "MYSQLDUMP_PATH is not set; the default mysqldump on PATH will be used.");

  // Identifier formats (DEC-069): checked with the production rule whatever the current environment is.
  if (prod) {
    const saved = process.env.ZPS_ENVIRONMENT;
    const savedVars = Object.fromEntries(Object.keys(env).filter((k) => k.startsWith("ZPS_FORMAT_")).map((k) => [k, process.env[k]]));
    try {
      process.env.ZPS_ENVIRONMENT = "production";
      for (const k of Object.keys(env)) if (k.startsWith("ZPS_FORMAT_")) { const v = env[k]; if (v === undefined) delete process.env[k]; else process.env[k] = v; }
      for (const kind of KINDS) {
        const r = identifierRule(kind);
        if (!r.pattern) add(/not a valid pattern|accepts synthetic/.test(r.message) ? "ERROR" : "WARN", `FORMAT_${kind}`, r.message);
      }
    } finally {
      if (saved === undefined) delete process.env.ZPS_ENVIRONMENT; else process.env.ZPS_ENVIRONMENT = saved;
      for (const [k, v] of Object.entries(savedVars)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
  }

  // Malware scanner (#12)
  const scanner = (env.ZPS_MALWARE_SCANNER ?? "").trim();
  if (scanner && scanner.toLowerCase() !== "clamd") add("ERROR", "MALWARE_SCANNER", `Unknown ZPS_MALWARE_SCANNER "${scanner}" (supported: clamd).`);
  const saved = process.env.ZPS_MALWARE_SCANNER;
  if (env.ZPS_MALWARE_SCANNER === undefined) delete process.env.ZPS_MALWARE_SCANNER; else process.env.ZPS_MALWARE_SCANNER = env.ZPS_MALWARE_SCANNER;
  const cfg = scannerConfig();
  if (saved === undefined) delete process.env.ZPS_MALWARE_SCANNER; else process.env.ZPS_MALWARE_SCANNER = saved;
  if (prod && !cfg) add("WARN", "MALWARE_SCANNER", "No malware scanner configured: document uploads are refused in production until one is (issue #12).");

  if (!out.some((f) => f.level === "ERROR")) add("OK", "SUMMARY", `Configuration has no errors for the ${target} environment.`);
  return out;
}
