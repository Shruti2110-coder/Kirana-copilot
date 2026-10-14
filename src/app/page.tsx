import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getCustomers, totals, recentActivity, dailySeries } from "@/lib/views";
import { inr } from "./ui/format";
import { agoIn, dateTag, dict, type Locale } from "./i18n";
import { getLocale } from "./i18n-server";
import { requireOwner } from "./setup";
import AskBox from "./ui/AskBox";
import AutoRefresh from "./ui/AutoRefresh";
import WeekChart from "./ui/WeekChart";
import Skeleton from "./ui/Skeleton";
import { CameraIcon, MicIcon } from "./ui/icons";

export default function HomePage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <Home />
    </Suspense>
  );
}

function greeting(locale: Locale) {
  const t = dict(locale);
  const h = Number(new Date().toLocaleString("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }));
  if (h < 12) return t.morning;
  if (h < 17) return t.afternoon;
  return t.evening;
}

async function Home() {
  await connection(); // always read fresh data
  const [shop, customers, locale] = await Promise.all([requireOwner(), getCustomers(), getLocale()]);
  const tr = dict(locale);
  const ago = (iso: string | null) => agoIn(locale, iso);
  const t = totals(customers);
  const activity = recentActivity(customers, 6);
  const week = dailySeries(customers, 7);
  const weekGiven = week.reduce((s, p) => s + p.given, 0);
  const weekCollected = week.reduce((s, p) => s + p.collected, 0);
  const rate = weekGiven > 0 ? Math.min(100, Math.round((weekCollected / weekGiven) * 100)) : weekCollected > 0 ? 100 : 0;
  const overdue = customers
    .filter((c) => c.status === "late")
    .sort((a, b) => b.due - a.due)
    .slice(0, 5);
  const overdueAmount = customers.filter((c) => c.status === "late").reduce((s, c) => s + c.due, 0);
  const today = new Date().toLocaleDateString(dateTag(locale), { weekday: "long", day: "numeric", month: "long" });

  return (
    <>
      <AutoRefresh />
      <header className="hello">
        <div>
          <p className="eyebrow">
            {today} · {greeting(locale)}, {shop.owner}
          </p>
          <h1 className="h1">{shop.name}</h1>
        </div>
      </header>

      <section className="hero" aria-label={tr.toCollect}>
        <span className="hero-label">{tr.toCollect}</span>
        <span className="hero-amount">{inr(t.due)}</span>
        <p className="hero-sub">
          {t.owing === 0 ? (
            tr.allSettled
          ) : (
            <>
              {tr.fromCustomers(t.owing)}
              {overdueAmount > 0 && (
                <>
                  {" · "}
                  <span className="late-text">{tr.overdueAmt(inr(overdueAmount))}</span>
                </>
              )}
            </>
          )}
        </p>
        <div className="btn-row hero-actions">
          <Link href="/add" className="btn btn-primary">
            <MicIcon size={16} /> {tr.navNew}
          </Link>
          <Link href="/add#scan" className="btn btn-quiet">
            <CameraIcon size={16} /> {tr.scanBill}
          </Link>
        </div>
      </section>

      <dl className="stats">
        <div>
          <dt>{tr.collectedToday}</dt>
          <dd className="amt-in">{inr(t.collectedToday)}</dd>
        </div>
        <div>
          <dt>{tr.givenWeek}</dt>
          <dd>{inr(weekGiven)}</dd>
        </div>
        <div>
          <dt>{tr.collectedWeek}</dt>
          <dd>{inr(weekCollected)}</dd>
        </div>
        <div>
          <dt>{tr.recovered}</dt>
          <dd>
            {rate}%
            <div className="meter-track">
              <div className="meter-fill" style={{ width: `${rate}%` }} />
            </div>
          </dd>
        </div>
      </dl>

      <div className="dash">
        <div className="stack">
          <section aria-labelledby="attn-h">
            <div className="panel-head">
              <h2 className="h2" id="attn-h">{tr.overdueAccounts}</h2>
              {overdue.length > 0 && <Link className="link" href="/khata?filter=late">{tr.seeAll}</Link>}
            </div>
            <div className="panel">
              {overdue.length === 0 ? (
                <div className="empty">{tr.nobodyOverdue}</div>
              ) : (
                overdue.map((c) => (
                  <Link key={c.id} href={`/khata/${c.id}`} className="attn-row">
                    <div className="row-main">
                      <div className="row-title">{c.name}</div>
                      <div className="row-sub">{tr.daysUnpaid(c.oldestDays)}</div>
                    </div>
                    <div className="attn-amt">
                      {inr(c.due)}
                      <span className="attn-cta">{tr.remind} →</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          <section aria-labelledby="recent-h">
            <div className="panel-head">
              <h2 className="h2" id="recent-h">{tr.recentTxns}</h2>
              <Link className="link" href="/khata">{tr.viewKhata}</Link>
            </div>
            <div className="panel">
              {activity.length === 0 ? (
                <div className="empty">{tr.noEntries}</div>
              ) : (
                activity.map((a) => {
                  const isIn = a.type === "payment" || a.status === "paid";
                  return (
                    <Link key={a.id} href={`/khata/${a.customerId}`} className="row">
                      <div className="row-main">
                        <div className="row-title">{a.customerName}</div>
                        <div className="row-sub">
                          {a.type === "payment" ? tr.cashReceived : a.status === "paid" ? tr.paidPaypal : a.items || tr.udhaar} ·{" "}
                          {ago(a.type === "payment" ? a.createdAt : a.paidAt ?? a.createdAt)}
                        </div>
                      </div>
                      <span className={`row-amount ${isIn ? "amt-in" : ""}`}>
                        {isIn ? "+" : ""}
                        {inr(a.amount)}
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
          </section>
        </div>

        <div className="stack">
          <section aria-labelledby="week-h">
            <div className="panel-head">
              <h2 className="h2" id="week-h">{tr.last7}</h2>
              <div className="legend">
                <span><i style={{ background: "var(--bar-given)" }} />{tr.udhaarGiven}</span>
                <span><i style={{ background: "var(--bar-collected)" }} />{tr.collected}</span>
              </div>
            </div>
            <div className="panel">
              <WeekChart points={week} locale={locale} />
            </div>
          </section>

          <AskBox locale={locale} />
        </div>
      </div>
    </>
  );
}
