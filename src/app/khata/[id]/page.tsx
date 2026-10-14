import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getCustomer } from "@/lib/views";
import { paypalEnabled } from "@/lib/paypal";
import { inr, initials, tone } from "../../ui/format";
import { agoIn, dict } from "../../i18n";
import { getLocale } from "../../i18n-server";
import { requireOwner } from "../../setup";
import Skeleton from "../../ui/Skeleton";
import AutoRefresh from "../../ui/AutoRefresh";
import EntryActions from "./EntryActions";
import { BackIcon } from "../../ui/icons";
import CashPayment from "./CashPayment";

type Props = { params: Promise<{ id: string }> };

export default function CustomerPage(props: Props) {
  return (
    <Suspense fallback={<Skeleton />}>
      <Customer {...props} />
    </Suspense>
  );
}

async function Customer({ params }: Props) {
  await connection();
  const { id } = await params;
  const shop = await requireOwner();
  const [c, locale] = await Promise.all([getCustomer(shop.id, id), getLocale()]);
  if (!c) notFound();
  const tr = dict(locale);
  const ago = (iso: string | null) => agoIn(locale, iso);

  const paypal = paypalEnabled();
  const statusText =
    c.status === "late" ? tr.oldestOld(c.oldestDays) : c.status === "due" ? tr.owesMoney : tr.nothingPending;

  return (
    <>
      <AutoRefresh />
      <Link href="/khata" className="back">
        <BackIcon size={16} />
        {tr.navKhata}
      </Link>

      <header className="cust-hero" data-status={c.status}>
        <span className="avatar lg" data-c={tone(c.name)}>{initials(c.name)}</span>
        <div style={{ minWidth: 0 }}>
          <h1 className="h1" style={{ fontSize: "1.5rem" }}>{c.name}</h1>
          <div className="muted small">{c.phone ? `WhatsApp ${c.phone}` : tr.noPhone}</div>
        </div>
        <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div className="muted small">{tr.totalOwed}</div>
            <div className="cust-due" style={{ color: c.status === "late" ? "var(--late)" : c.due > 0 ? "var(--due)" : "var(--ok)" }}>
              {inr(c.due)}
            </div>
          </div>
          <span className={`pill ${c.status}`}>{statusText}</span>
        </div>
      </header>

      {c.due > 0 && <CashPayment customer={c.name} due={c.due} locale={locale} />}

      <section className="section" aria-labelledby="hist-h">
        <h2 className="h2" id="hist-h">{tr.history}</h2>
        <div className="panel">
          {c.transactions.map((t) => {
            const isIn = t.type === "payment" || t.status === "paid";
            const pendingCredit = t.type === "credit" && t.status === "pending";
            const open = pendingCredit && c.openIds.includes(t.id);
            return (
              <div key={t.id} className="row" style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div className="row-main">
                    <div className="row-title">
                      {t.type === "payment" ? tr.paidCash : t.items || tr.tookGoods}
                    </div>
                    <div className="row-sub">
                      {ago(t.createdAt)}
                      {t.status === "paid" && t.type === "credit" ? tr.paidViaPaypalWhen(ago(t.paidAt)) : ""}
                    </div>
                  </div>
                  <div style={{ display: "grid", justifyItems: "end", gap: 2 }}>
                    <span className={`row-amount ${isIn ? "amt-in" : "amt-out"}`}>
                      {t.type === "payment" ? "+" : ""}
                      {inr(t.amount)}
                    </span>
                    <span className={`pill ${open ? "due" : "paid"}`}>
                      {t.type === "payment" ? tr.cashIn : t.status === "paid" ? tr.paid : open ? tr.udhaar : tr.settled}
                    </span>
                  </div>
                </div>
                {open && <EntryActions id={t.id} hasLink={!!t.payLink} paypal={paypal} locale={locale} />}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
