"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookIcon, HomeIcon, MicIcon } from "./icons";
import { dict, type Locale } from "../i18n";
import LangToggle from "./LangToggle";
import ThemeToggle from "./ThemeToggle";
import LogoMark from "./Logo";
import InstallApp, { IosInstallTip } from "./InstallApp";

// Order matters on phones: the New entry button sits in the middle of the tab bar.
const TABS: { href: string; label: "navHome" | "navNew" | "navKhata"; icon: typeof HomeIcon; primary?: boolean }[] = [
  { href: "/", label: "navHome", icon: HomeIcon },
  { href: "/add", label: "navNew", icon: MicIcon, primary: true },
  { href: "/khata", label: "navKhata", icon: BookIcon },
];

export default function Nav({ locale, shop }: { locale: Locale; shop: { name: string; owner: string } | null }) {
  const t = dict(locale);
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  // Setup and login screens: only the brand and settings, so the form is the one thing to do.
  const welcome = (path === "/welcome" || path === "/login") && !shop;

  const brand = (
    <Link href="/" className="brand">
      <LogoMark size={30} />
      <span>
        <b>{t.appName}</b>
        <small>{t.tagline}</small>
      </span>
    </Link>
  );
  const settings = (
    <div className="settings">
      <InstallApp locale={locale} />
      <LangToggle locale={locale} />
      <ThemeToggle locale={locale} />
      {shop && !welcome && (
        <Link href="/welcome" className="owner" title={t.editOwner} aria-label={`${t.ownerRole}: ${shop.owner}. ${t.editOwner}`}>
          <span className="avatar" aria-hidden>{shop.owner.trim()[0]?.toUpperCase()}</span>
          <span className="owner-text">
            <b>{shop.owner}</b>
            <small>{shop.name}</small>
          </span>
        </Link>
      )}
    </div>
  );

  return (
    <>
      {/* Top bar: brand (phones only) on the left; language, theme and owner on the right. */}
      <header className="topbar">
        {brand}
        {settings}
      </header>
      <nav className="nav" aria-label="Main" hidden={welcome}>
        {brand}
        {TABS.map(({ href, label, icon: Icon, primary }) => (
          <Link
            key={href}
            href={href}
            className={`nav-tab${active(href) ? " is-active" : ""}${primary ? " is-primary" : ""}`}
            aria-current={active(href) ? "page" : undefined}
          >
            <Icon size={20} />
            <span>{t[label]}</span>
          </Link>
        ))}
      </nav>
      <IosInstallTip locale={locale} />
    </>
  );
}
