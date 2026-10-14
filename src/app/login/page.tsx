import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getShop } from "@/lib/db";
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

/** Owner login by mobile number. No owner yet: set one up first. Already logged in: go home. */
async function Login() {
  await connection();
  const [shop, session, locale] = await Promise.all([getShop(), getOwnerSession(), getLocale()]);
  if (!shop.onboarded) redirect("/welcome");
  if (session) redirect("/");
  const t = dict(locale);
  return (
    <div className="welcome">
      <LogoMark size={48} />
      <header>
        <h1 className="h1">{t.loginTitle}</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>{t.loginSub(shop.name)}</p>
      </header>
      <PhoneLogin locale={locale} mode="login" />
    </div>
  );
}
