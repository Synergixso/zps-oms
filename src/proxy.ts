import { NextResponse, type NextRequest } from "next/server";
import { newNonce, pageCsp } from "@/server/lib/csp";

/**
 * Runs before every page request:
 * - issues a per-request CSP nonce (request header `x-nonce` and the `Content-Security-Policy` request
 *   header, from which Next.js stamps its own scripts; the same policy goes on the response);
 * - passes the request path to server components so the session guard can enforce a forced password change.
 * API routes and static assets are excluded; they get a non-page policy from next.config.ts.
 */
export function proxy(req: NextRequest) {
  // Stored documents carry their own stricter policy (sandbox, nothing loads): do not replace it with the page policy.
  if (req.nextUrl.pathname.startsWith("/app/correspondence/files/")) {
    const headers = new Headers(req.headers);
    headers.set("x-zps-path", req.nextUrl.pathname);
    return NextResponse.next({ request: { headers } });
  }
  const nonce = newNonce();
  const csp = pageCsp(nonce, process.env.NODE_ENV === "development");
  const headers = new Headers(req.headers);
  headers.set("x-nonce", nonce);
  headers.set("content-security-policy", csp);
  headers.set("x-zps-path", req.nextUrl.pathname);
  const res = NextResponse.next({ request: { headers } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export const config = {
  matcher: [
    {
      // Every page; not API routes, build assets or public files (paths with a file extension).
      // Prefetches are included: the password-change guard relies on x-zps-path for every /app request.
      source: "/((?!api/|_next/static|_next/image|favicon\\.ico|.*\\.[a-z0-9]+$).*)",
    },
  ],
};
