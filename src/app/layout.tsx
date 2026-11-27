import type { Metadata } from "next";
import { connection } from "next/server";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ZPS-OMS", template: "%s · ZPS-OMS" },
  description: "Zambia Police Service Operations Management System — Operations personnel, manpower and administration management.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Every page renders per request so Next.js can stamp its scripts with the request's CSP nonce
  // (src/proxy.ts, DEC-067). Pre-rendered pages would carry no nonce and their scripts would be blocked.
  await connection();
  return (
    <html lang="en-GB">
      <body className="min-h-screen antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:shadow">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
