import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ZPS-OMS", template: "%s · ZPS-OMS" },
  description: "Zambia Police Service Operations Management System — local synthetic-data prototype for institutional review.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
