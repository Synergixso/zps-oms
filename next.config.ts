import type { NextConfig } from "next";
import { NON_PAGE_CSP } from "./src/server/lib/csp";

// Security headers applied to every route (SECURITY_ARCHITECTURE.md §6). Pages get their nonce-based
// Content-Security-Policy from src/proxy.ts; API responses get a policy that allows nothing to load.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // A separate build directory lets the Playwright server run alongside `npm run dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  serverExternalPackages: ["pdfkit"],
  // Correspondence documents are up to 5 MB (validated again in the domain layer); the default limit is 1 MB.
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  async redirects() {
    // The public Modules page was retired (directive 27 Nov 2026 §3); its capabilities are described on Features.
    return [{ source: "/modules", destination: "/features", permanent: true }];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/api/:path*", headers: [{ key: "Content-Security-Policy", value: NON_PAGE_CSP }] },
    ];
  },
};

export default nextConfig;
