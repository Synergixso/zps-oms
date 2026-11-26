import { NextResponse, type NextRequest } from "next/server";

/** Passes the request path to server components so the session guard can enforce a forced password change. */
export function proxy(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.set("x-zps-path", req.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/app/:path*"] };
