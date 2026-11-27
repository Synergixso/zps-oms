/**
 * Deployment environment and data classification (DEC-069).
 *
 * ZPS_ENVIRONMENT names the environment explicitly: "development" (default), "test" or "production". It is
 * separate from NODE_ENV (a production BUILD can run in a test environment). Environment labels in the
 * interface come from here, not from hard-coded text:
 *   - development / test: a visible environment banner, and synthetic-data notices on outputs;
 *   - production with no synthetic records: no environment banner;
 *   - production that still holds synthetic records: a warning, because demonstration data must never be
 *     mistaken for Service information.
 * Production also disables every development convenience (the synthetic account list on the sign-in page).
 */
import type { DB } from "../db/connection";
import { one } from "../db/connection";

export type Environment = "development" | "test" | "production";

export function environment(): Environment {
  const e = (process.env.ZPS_ENVIRONMENT ?? "").trim().toLowerCase();
  return e === "production" || e === "test" ? e : "development";
}

export const isProduction = () => environment() === "production";

let cache: { at: number; value: boolean } | null = null;

/** True while the database holds synthetic (demonstration) accounts. Cached for one minute. */
export async function syntheticDataPresent(db: DB): Promise<boolean> {
  if (cache && Date.now() - cache.at < 60_000) return cache.value;
  const r = await one<{ n: number }>(db, "SELECT COUNT(*) AS n FROM users WHERE synthetic = 1");
  cache = { at: Date.now(), value: Number(r?.n ?? 0) > 0 };
  return cache.value;
}

export interface EnvironmentNotice {
  environment: Environment;
  synthetic: boolean;
  /** Show the environment banner in the back office. */
  banner: boolean;
  /** Short banner label, e.g. "Development environment". */
  label: string;
  /** One-sentence explanation for the banner. */
  detail: string;
  /** Text stamped on outputs (print, PDF, exports) while synthetic data is present; empty otherwise. */
  outputStamp: string;
}

export async function environmentNotice(db: DB): Promise<EnvironmentNotice> {
  const env = environment();
  const synthetic = await syntheticDataPresent(db);
  const name = { development: "Development environment", test: "Test environment", production: "Production environment" }[env];
  if (env === "production" && !synthetic) return { environment: env, synthetic, banner: false, label: name, detail: "", outputStamp: "" };
  const detail = env === "production"
    ? "This production database still holds synthetic demonstration records. Remove them before Service information is entered."
    : "Synthetic demonstration data only. Not for Service information.";
  return { environment: env, synthetic, banner: true, label: env === "production" ? "Synthetic data present" : name, detail, outputStamp: synthetic ? "SYNTHETIC DEMONSTRATION DATA — NOT AN OFFICIAL RECORD" : "" };
}
