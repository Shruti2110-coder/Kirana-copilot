"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { dict, type Locale } from "../i18n";

/** EN / हिंदी switch. Saves the choice in a cookie for a year and re-renders the page. */
export default function LangToggle({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function choose(next: Locale) {
    if (next === locale) return;
    document.cookie = `lang=${next}; path=/; max-age=31536000; samesite=lax`;
    start(() => router.refresh());
  }

  return (
    <div className="seg" role="group" aria-label={dict(locale).langLabel} aria-busy={pending}>
      <button type="button" aria-pressed={locale === "en"} onClick={() => choose("en")}>
        EN
      </button>
      <button type="button" aria-pressed={locale === "hi"} onClick={() => choose("hi")} lang="hi">
        हिंदी
      </button>
    </div>
  );
}
