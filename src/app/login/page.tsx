import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getOwnerSession } from "@/lib/auth";
import { dict } from "../i18n";
import { getLocale } from "../i18n-server";
import Skeleton from "../ui/Skeleton";
import LogoMark from "../ui/Logo";
import PhoneLogin from "./PhoneLogin";

export default function LoginPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <Login />
    </Suspense>
  );
}

/** Anyone can start: name, shop name and mobile. Already logged in: go home. */
async function Login() {
  await connection();
  const [session, locale] = await Promise.all([getOwnerSession(), getLocale()]);
  if (session) redirect("/");
  const t = dict(locale);
  return (
    <div className="welcome">
      <LogoMark size={48} />
      <header>
        <h1 className="h1">{t.welcomeTitle}</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>{t.welcomeSub}</p>
      </header>
      <PhoneLogin locale={locale} />
    </div>
  );
}
