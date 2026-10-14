import { Suspense } from "react";
import { connection } from "next/server";
import { aiEnabled } from "@/lib/ai";
import Composer from "./Composer";
import { dict } from "../i18n";
import { getLocale } from "../i18n-server";
import { requireOwner } from "../setup";
import Skeleton from "../ui/Skeleton";

export default function AddPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <AddEntry />
    </Suspense>
  );
}

/** Reads the AI setting and language at request time, so changing .env takes effect without a rebuild. */
async function AddEntry() {
  await connection();
  const [locale, shop] = await Promise.all([getLocale(), requireOwner()]);
  const t = dict(locale);
  return (
    <>
      <header>
        <h1 className="h1">{t.newEntry}</h1>
        <p className="muted small" style={{ margin: 0 }}>{t.newEntrySub}</p>
      </header>
      <Composer aiEnabled={aiEnabled()} locale={locale} category={shop.category} />
    </>
  );
}
