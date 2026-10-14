import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { formatPhone, getOwnerSession } from "@/lib/auth";
import { dict } from "../i18n";
import { getLocale } from "../i18n-server";
import Skeleton from "../ui/Skeleton";
import OwnerForm from "./OwnerForm";
import LogoutButton from "./LogoutButton";

export default function WelcomePage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <Welcome />
    </Suspense>
  );
}

/** The logged-in owner reaches this page from the top bar to edit their details or log out. */
async function Welcome() {
  await connection();
  const [session, locale] = await Promise.all([getOwnerSession(), getLocale()]);
  const t = dict(locale);

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
