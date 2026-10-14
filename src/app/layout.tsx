import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import Nav from "./ui/Nav";
import { getLocale } from "./i18n-server";
import { getOwnerSession } from "@/lib/auth";
import { headScript } from "./ui/head-scripts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hisaab Kitaab: udhaar khata for kirana stores",
  description: "Voice-first udhaar khata for kirana stores in Hindi and English, with PayPal collections and AI reminders.",
  applicationName: "Hisaab Kitaab",
  // iPhone "Add to Home Screen": open full-screen with this name under the icon.
  appleWebApp: { capable: true, title: "Hisaab", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // use the whole screen on notched phones; CSS keeps content in the safe area
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbfa" },
    { media: "(prefers-color-scheme: dark)", color: "#111110" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The theme script may set data-theme before React hydrates, so allow that one difference.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: headScript }} />
        {/* IBM Plex: Sans for text, Sans Devanagari for Hindi, Mono for amounts. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+Devanagari:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        <div className="shell">
          <Suspense fallback={<nav className="nav" />}>
            <LocalizedNav />
          </Suspense>
          <main className="page">{children}</main>
        </div>
      </body>
    </html>
  );
}

/** Reads the language cookie and the shop at request time, inside the Suspense boundary above. */
async function LocalizedNav() {
  await connection(); // the shop comes from the database, so render this at request time
  // Logged out (or the database is down): no owner badge; the page itself handles the rest.
  const [locale, shop] = await Promise.all([getLocale(), getOwnerSession().catch(() => null)]);
  return <Nav locale={locale} shop={shop && { name: shop.name, owner: shop.owner }} />;
}
