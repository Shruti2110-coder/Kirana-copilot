import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getShop } from "@/lib/db";
import { formatPhone, getOwnerSession } from "@/lib/auth";
import { dict } from "../i18n";
import { getLocale } from "../i18n-server";
import Skeleton from "../ui/Skeleton";
import LogoMark from "../ui/Logo";
import OwnerForm from "./OwnerForm";
import LogoutButton from "./LogoutButton";
import PhoneLogin from "../login/PhoneLogin";

export default function WelcomePage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <Welcome />
    </Suspense>
  );
}

/**
 * First visit: the person opening the app becomes the owner, verifying their mobile with a code.
 * Later, the logged-in owner reaches this page from the top bar to edit their details or log out.
 */
async function Welcome() {
  await connection();
  const [shop, session, locale] = await Promise.all([getShop(), getOwnerSession(), getLocale()]);
  const t = dict(locale);

  if (!shop.onboarded) {
    return (
      <div className="welcome">
        <LogoMark size={48} />
        <header>
          <h1 className="h1">{t.welcomeTitle}</h1>
          <p className="muted" style={{ margin: "6px 0 0" }}>{t.welcomeSub}</p>
        </header>
        <PhoneLogin locale={locale} mode="setup" />
      </div>
    );
  }
  if (!session) redirect("/login");

  return (
    <div className="welcome">
      <header>
        <h1 className="h1">{t.ownerDetails}</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>{t.ownerDetailsSub}</p>
      </header>
      <OwnerForm locale={locale} firstTime={false} initial={{ owner: session.owner, name: session.name, category: session.category }} />
      <div className="panel-pad">
        <div className="field">
          {t.loginNumber}
          <span className="tnum" style={{ color: "var(--ink)", fontSize: "1rem" }}>{session.ownerPhone && formatPhone(session.ownerPhone)}</span>
        </div>
        <LogoutButton locale={locale} />
      </div>
    </div>
  );
}
