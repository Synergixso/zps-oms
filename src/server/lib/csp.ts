/**
 * Content Security Policy (SECURITY_ARCHITECTURE.md §6, THREAT_MODEL XSS row, DEC-067).
 *
 * Pages get a fresh nonce on every request (src/proxy.ts). Scripts run only if they carry it, or if a
 * nonce-bearing script loaded them ('strict-dynamic'), so an injected inline <script> or event-handler
 * attribute cannot execute. 'unsafe-eval' is added in development only (React's dev tooling).
 *
 * Styles: production allows stylesheets from this origin only ('unsafe-inline' removed, KNOWN_ISSUES 14).
 * The interface has no style attributes or inline <style> elements; dynamic sizes use literal classes
 * (src/components/sizing.ts). Development keeps 'unsafe-inline' because the Next.js dev server injects
 * styles for hot reloading and its error overlay. Everything else is limited to this origin; framing,
 * plugins and cross-origin form posts are refused.
 */
export function newNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

export function pageCsp(nonce: string, dev: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self'${dev ? " 'unsafe-inline'" : ""}`,
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${dev ? " ws:" : ""}`,
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
  ].join("; ");
}

/** For responses that are never HTML pages (JSON API, files): nothing may load or frame them. */
export const NON_PAGE_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";
