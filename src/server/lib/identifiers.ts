/**
 * Identifier formats by environment (DEC-069).
 *
 * Development and test accept SYNTHETIC identifiers only, so real service numbers, registrations or asset tags
 * cannot be typed into a demonstration database by mistake. In production the formats are the Service's to
 * define: each is read from an environment variable holding a regular expression (e.g.
 * ZPS_FORMAT_SERVICE_NUMBER). Until a format is configured, registration of that kind is refused with a clear
 * message instead of guessing a format. Invalid patterns are refused at start-up of the check, never ignored.
 */
import { z } from "zod";
import { environment } from "./environment";

export type IdentifierKind = "serviceNumber" | "assetTag" | "fleetRef" | "registration" | "storeCode" | "username";

const SYNTHETIC: Record<IdentifierKind, { pattern: RegExp; message: string }> = {
  serviceNumber: { pattern: /^SYN-\d{6}$/, message: "Development records must use a synthetic service number: SYN- followed by 6 digits." },
  assetTag: { pattern: /^SYN-AST-\d{5}$/, message: "Asset tag must follow the synthetic pattern SYN-AST-00000." },
  fleetRef: { pattern: /^SYN-FLT-\d{4}$/, message: "Fleet reference must follow the synthetic pattern SYN-FLT-0000." },
  registration: { pattern: /^SYN-REG-[A-Z0-9]{3,8}$/, message: "Registration reference must be a synthetic placeholder (SYN-REG-…). Real registrations are not permitted outside production." },
  storeCode: { pattern: /^SYN-STO-\d{4,6}$/, message: "Item code must follow the synthetic pattern SYN-STO-0000." },
  username: { pattern: /^demo\.[a-z0-9.]{3,40}$/, message: "Synthetic usernames must start with 'demo.' (lower-case letters, digits, dots)." },
};

const SAMPLE_SYNTHETIC: Record<IdentifierKind, string> = {
  serviceNumber: "SYN-000001", assetTag: "SYN-AST-00001", fleetRef: "SYN-FLT-0001", registration: "SYN-REG-ABC123", storeCode: "SYN-STO-0001", username: "demo.account",
};

const ENV_VAR: Record<IdentifierKind, string> = {
  serviceNumber: "ZPS_FORMAT_SERVICE_NUMBER", assetTag: "ZPS_FORMAT_ASSET_TAG", fleetRef: "ZPS_FORMAT_FLEET_REF",
  registration: "ZPS_FORMAT_VEHICLE_REGISTRATION", storeCode: "ZPS_FORMAT_STORE_CODE", username: "ZPS_FORMAT_USERNAME",
};
const LABEL: Record<IdentifierKind, string> = {
  serviceNumber: "service number", assetTag: "asset tag", fleetRef: "fleet reference", registration: "vehicle registration", storeCode: "store item code", username: "username",
};
/** Usernames are a technical convention, not Service data: production has a default unless one is configured. */
const PRODUCTION_DEFAULT: Partial<Record<IdentifierKind, string>> = { username: "[a-z][a-z0-9._-]{2,40}" };

/** The rule that applies now. `pattern` is null in production when no format has been configured. */
export function identifierRule(kind: IdentifierKind): { pattern: RegExp | null; message: string; synthetic: boolean } {
  if (environment() !== "production") return { ...SYNTHETIC[kind], synthetic: true };
  const raw = process.env[ENV_VAR[kind]]?.trim() || PRODUCTION_DEFAULT[kind];
  if (!raw) return { pattern: null, message: `The Service's ${LABEL[kind]} format has not been configured (${ENV_VAR[kind]}). Registration is disabled until it is.`, synthetic: false };
  let pattern: RegExp;
  try {
    pattern = new RegExp(`^(?:${raw})$`);
  } catch {
    return { pattern: null, message: `The configured ${LABEL[kind]} format (${ENV_VAR[kind]}) is not a valid pattern. Registration is disabled until it is corrected.`, synthetic: false };
  }
  // Synthetic identifiers are never valid in production.
  // A configured Service format must not admit synthetic identifiers (usernames use a default, checked per value below).
  if (!PRODUCTION_DEFAULT[kind] && pattern.test(SAMPLE_SYNTHETIC[kind])) {
    return { pattern: null, message: `The configured ${LABEL[kind]} format accepts synthetic SYN- identifiers, which production must refuse.`, synthetic: false };
  }
  return { pattern, message: `Enter a valid ${LABEL[kind]}.`, synthetic: false };
}

/** A Zod field enforcing the identifier rule at validation time (so tests and environments can change it). */
export function identifierField(kind: IdentifierKind, opts: { upper?: boolean } = {}) {
  return z.string().trim().transform((v) => (opts.upper ? v.toUpperCase() : v)).superRefine((v, ctx) => {
    const r = identifierRule(kind);
    if (!r.pattern || !r.pattern.test(v)) ctx.addIssue({ code: "custom", message: r.message });
    // Production never accepts a synthetic identifier, whatever the configured format.
    else if (!r.synthetic && SYNTHETIC[kind].pattern.test(v)) ctx.addIssue({ code: "custom", message: `Synthetic ${LABEL[kind]}s are not accepted in production.` });
  });
}

/** A short hint for form fields describing the accepted format. */
export function identifierHint(kind: IdentifierKind): string {
  const r = identifierRule(kind);
  return r.synthetic ? r.message : r.pattern ? `Use the Service's ${LABEL[kind]} format.` : r.message;
}
