"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CustomerSummary } from "@/lib/views";
import { inr, initials, tone } from "../ui/format";
import { agoIn, dict, type Locale } from "../i18n";
import { BookIcon, ChevronIcon, SearchIcon } from "../ui/icons";

const FILTERS = [
  { id: "all", label: "fAll" },
  { id: "due", label: "fDue" },
  { id: "late", label: "fLate" },
  { id: "clear", label: "fClear" },
] as const;
type FilterId = (typeof FILTERS)[number]["id"];

export default function KhataList({
  customers,
  initialFilter,
  locale,
}: {
  customers: CustomerSummary[];
  initialFilter?: string;
  locale: Locale;
}) {
  const t = dict(locale);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>(
    FILTERS.some((f) => f.id === initialFilter) ? (initialFilter as FilterId) : "all",
  );

  const counts: Record<FilterId, number> = {
    all: customers.length,
    due: customers.filter((c) => c.due > 0).length,
    late: customers.filter((c) => c.status === "late").length,
    clear: customers.filter((c) => c.status === "clear").length,
  };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers
      .filter((c) => !q || c.name.toLowerCase().includes(q) || (c.phone ?? "").includes(q))
      .filter((c) => {
        if (filter === "all") return true;
        if (filter === "due") return c.due > 0;
        return c.status === filter;
      })
      .sort((a, b) => b.due - a.due);
  }, [customers, query, filter]);

  return (
    <>
      <div className="toolbar">
        <div className="search">
          <SearchIcon size={17} />
          <input
            id="khata-search"
            className="input"
            type="search"
            placeholder={t.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="chips" role="group" aria-label={t.filterAria}>
          {FILTERS.map((f) => (
            <button key={f.id} type="button" className="chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {t[f.label]}
              <span className="count">{counts[f.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="panel empty">
          <span className="empty-icon" aria-hidden>{customers.length === 0 ? <BookIcon size={20} /> : <SearchIcon size={20} />}</span>
          {customers.length === 0 ? t.noCustomers : t.noMatch}
        </div>
      ) : (
        <div className="panel">
          {shown.map((c) => (
            <Link key={c.id} href={`/khata/${c.id}`} className="row">
              <span className="avatar" data-status={c.status} data-c={tone(c.name)}>{initials(c.name)}</span>
              <div className="row-main">
                <div className="row-title">{c.name}</div>
                <div className="row-sub">
                  {c.status === "late"
                    ? t.unpaidFor(c.oldestDays)
                    : c.status === "due"
                      ? t.lastEntry(agoIn(locale, c.lastActivity))
                      : t.nothingPending}
                </div>
              </div>
              <div style={{ display: "grid", justifyItems: "end", gap: 2 }}>
                <span className="row-amount">{c.due > 0 ? inr(c.due) : "₹0"}</span>
                <span className={`pill ${c.status}`}>
                  {c.status === "late" ? t.pillLate : c.status === "due" ? t.pillDue : t.pillClear}
                </span>
              </div>
              <span className="muted" aria-hidden><ChevronIcon size={16} /></span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
