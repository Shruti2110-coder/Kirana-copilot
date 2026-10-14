import { Suspense } from "react";
import { connection } from "next/server";
import { getCustomers } from "@/lib/views";
import KhataList from "./KhataList";
import AutoRefresh from "../ui/AutoRefresh";
import { inr } from "../ui/format";
import { dict } from "../i18n";
import { getLocale } from "../i18n-server";
import { requireOwner } from "../setup";
import Skeleton from "../ui/Skeleton";

type Props = { searchParams: Promise<{ filter?: string }> };

export default function KhataPage(props: Props) {
  return (
    <Suspense fallback={<Skeleton />}>
      <Khata {...props} />
    </Suspense>
  );
}

async function Khata({ searchParams }: Props) {
  await connection();
  const [{ filter }, customers, locale] = await Promise.all([searchParams, getCustomers(), getLocale(), requireOwner()]);
  const tr = dict(locale);
  return (
    <>
      <AutoRefresh />
      <header>
        <h1 className="h1">{tr.navKhata}</h1>
        <p className="muted small" style={{ margin: 0 }}>
          {tr.khataSub(customers.length, inr(customers.reduce((s, c) => s + c.due, 0)))}
        </p>
      </header>
      {/* The list is a client component so search and filters respond instantly. */}
      <KhataList customers={JSON.parse(JSON.stringify(customers))} initialFilter={filter} locale={locale} />
    </>
  );
}
