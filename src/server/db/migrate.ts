/**
 * Versioned SQL migration runner (self-contained: only node built-ins + mysql2,
 * so it can also run standalone via `node --experimental-strip-types`).
 *
 * - Applies db/migrations/NNN_name.sql in order, each once, recording version,
 *   name, checksum and time in schema_migrations.
 * - Refuses to run if an applied migration file has been edited (checksum drift).
 * - Never drops or rewrites data; destructive changes require an approved,
 *   backed-up, separately reviewed migration.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import mysql from "mysql2/promise";

export interface MigrationResult {
  applied: string[];
  current: number;
}

const DIR = path.join(process.cwd(), "db", "migrations");

export function listMigrationFiles(dir = DIR): Array<{ version: number; name: string; file: string }> {
  return fs
    .readdirSync(dir)
    .filter((f) => /^\d{3}_[a-z0-9_]+\.sql$/.test(f))
    .sort()
    .map((f) => ({ version: Number(f.slice(0, 3)), name: f.replace(/\.sql$/, ""), file: path.join(dir, f) }));
}

/** Runs pending migrations against the database in `url`. */
export async function migrate(url: string, dir = DIR): Promise<MigrationResult> {
  const conn = await mysql.createConnection({ uri: url, multipleStatements: true });
  try {
    await conn.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version INT NOT NULL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      checksum CHAR(64) NOT NULL,
      applied_at CHAR(24) NOT NULL
    ) ENGINE=InnoDB`);
    const [rows] = await conn.query("SELECT version, name, checksum FROM schema_migrations ORDER BY version");
    const applied = new Map((rows as Array<{ version: number; name: string; checksum: string }>).map((r) => [r.version, r]));
    const done: string[] = [];
    for (const m of listMigrationFiles(dir)) {
      const sql = fs.readFileSync(m.file, "utf8");
      const checksum = crypto.createHash("sha256").update(sql).digest("hex");
      const prev = applied.get(m.version);
      if (prev) {
        if (prev.checksum !== checksum) throw new Error(`Migration ${m.name} was modified after being applied. Create a new migration instead.`);
        continue;
      }
      // DDL auto-commits in MySQL; each migration is written to be safe to re-run only via a fresh database.
      await conn.query(sql);
      await conn.query("INSERT INTO schema_migrations (version, name, checksum, applied_at) VALUES (?,?,?,?)", [m.version, m.name, checksum, new Date().toISOString()]);
      done.push(m.name);
    }
    const [[cur]] = (await conn.query("SELECT COALESCE(MAX(version),0) AS v FROM schema_migrations")) as unknown as [[{ v: number }]];
    return { applied: done, current: Number(cur.v) };
  } finally {
    await conn.end();
  }
}

/** Drops and recreates a database (tests / explicit local reset only). Refuses anything not named zps_oms_*. */
export async function recreateDatabase(url: string): Promise<void> {
  const u = new URL(url);
  const name = u.pathname.replace(/^\//, "");
  if (!/^zps_oms_[a-z0-9_]+$/.test(name)) throw new Error(`Refusing to recreate database "${name}" (only zps_oms_* databases may be reset).`);
  u.pathname = "/";
  const conn = await mysql.createConnection({ uri: u.toString() });
  try {
    await conn.query(`DROP DATABASE IF EXISTS \`${name}\``);
    await conn.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  } finally {
    await conn.end();
  }
}

// Standalone: node --experimental-strip-types src/server/db/migrate.ts [--reset]
if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("src/server/db/migrate.ts")) {
  const env = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(env)) {
    for (const line of fs.readFileSync(env, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set (see .env.example).");
    process.exit(1);
  }
  (async () => {
    if (process.argv.includes("--reset")) {
      if (!process.argv.includes("--confirm-synthetic")) throw new Error("--reset destroys the database. Re-run with --confirm-synthetic, only for a local SYNTHETIC database you have backed up or do not need.");
      await recreateDatabase(url);
      console.log("Database recreated.");
    }
    const r = await migrate(url);
    console.log(r.applied.length ? `Applied: ${r.applied.join(", ")}` : "No pending migrations.", `Schema version ${r.current}.`);
    console.log("Synthetic seed data is loaded automatically on first start of the app when the database is empty.");
  })().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
