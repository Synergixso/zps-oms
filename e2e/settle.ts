/**
 * Network-idle with diagnostics (follow-up to the intermittent e2e stalls of 28 Nov 2026: a page fully rendered but
 * one request never finished, so "networkidle" never fired). `watch(page)` records in-flight requests; `settle(page)`
 * waits for network idle within a bounded time and, if it does not come, FAILS naming every request still open —
 * so a recurrence identifies its cause instead of silently timing out. It does not lengthen any test timeout.
 */
import type { Page, Request } from "@playwright/test";

const inflight = new WeakMap<Page, Map<Request, number>>();

export function watch(page: Page) {
  if (inflight.has(page)) return;
  const open = new Map<Request, number>();
  inflight.set(page, open);
  page.on("request", (r) => open.set(r, Date.now()));
  page.on("requestfinished", (r) => open.delete(r));
  page.on("requestfailed", (r) => open.delete(r));
}

export async function settle(page: Page, timeout = 60_000) {
  watch(page);
  try {
    await page.waitForLoadState("networkidle", { timeout });
  } catch {
    const now = Date.now();
    const open = [...(inflight.get(page) ?? new Map()).entries()].map(([r, t]) => `${r.method()} ${r.url()} (${r.resourceType()}, open ${Math.round((now - t) / 1000)} s)`);
    throw new Error(`Network did not become idle within ${timeout / 1000} s on ${page.url()}. Requests still open:\n${open.join("\n") || "(none recorded — the stall began before the page was watched)"}`);
  }
}
