/**
 * Ready-made data for the screens. Pages call these instead of doing the
 * maths themselves, so every page shows the same numbers.
 */
import { getLedger, type LedgerRow, type TxnDTO } from "./db";

const DAY = 86_400_000;
const daysAgo = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / DAY);

export type Status = "clear" | "due" | "late";

export type CustomerSummary = LedgerRow & {
  status: Status;
  /** Age in days of the oldest unpaid udhaar, or null if nothing is pending. */
  oldestDays: number | null;
  lastActivity: string | null;
  /** Ids of udhaar entries still open after cash payments are applied, oldest first. */
  openIds: string[];
};

/**
 * Cash payments are not tied to one entry, so apply them to pending udhaar
 * oldest-first. An entry is still open until cash fully covers it.
 */
function openCredits(c: LedgerRow) {
  let cash = c.transactions.filter((t) => t.type === "payment").reduce((s, t) => s + t.amount, 0);
  const pending = c.transactions
    .filter((t) => t.type === "credit" && t.status === "pending")
    .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  const open = [];
  for (const t of pending) {
    if (cash >= t.amount) cash -= t.amount;
    else {
      cash = 0;
      open.push(t);
    }
  }
  return open;
}

/** "late" = something unpaid for 7+ days, "due" = unpaid but recent, "clear" = owes nothing. */
export function summarise(c: LedgerRow): CustomerSummary {
  const open = c.due > 0 ? openCredits(c) : [];
  const oldestDays = open.length ? Math.max(...open.map((t) => daysAgo(t.createdAt))) : null;
  const status: Status = c.due <= 0 ? "clear" : oldestDays !== null && oldestDays >= 7 ? "late" : "due";
  return { ...c, status, oldestDays, lastActivity: c.transactions[0]?.createdAt ?? null, openIds: open.map((t) => t.id) };
}

export async function getCustomers() {
  return (await getLedger()).map(summarise);
}

export async function getCustomer(id: string) {
  return (await getCustomers()).find((c) => c.id === id) ?? null;
}

export type ActivityItem = TxnDTO & { customerId: string; customerName: string };

/** Newest entries across all customers. */
export function recentActivity(customers: LedgerRow[], limit = 6): ActivityItem[] {
  return customers
    .flatMap((c) => c.transactions.map((t) => ({ ...t, customerId: c.id, customerName: c.name })))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, limit);
}

export type DayPoint = { date: string; label: string; given: number; collected: number };

/** Last `days` days: udhaar given vs money collected (cash + PayPal). */
export function dailySeries(customers: LedgerRow[], days = 7): DayPoint[] {
  const all = customers.flatMap((c) => c.transactions);
  const out: DayPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toDateString();
    const same = (iso: string | null) => !!iso && new Date(iso).toDateString() === key;
    out.push({
      date: d.toISOString(),
      label: i === 0 ? "Aaj" : d.toLocaleDateString("en-IN", { weekday: "short" }),
      given: all.filter((t) => t.type === "credit" && same(t.createdAt)).reduce((s, t) => s + t.amount, 0),
      collected: all
        .filter((t) => (t.type === "payment" || t.status === "paid") && same(t.paidAt))
        .reduce((s, t) => s + t.amount, 0),
    });
  }
  return out;
}

export function totals(customers: CustomerSummary[]) {
  const today = new Date().toDateString();
  const collectedToday = customers
    .flatMap((c) => c.transactions)
    .filter((t) => (t.type === "payment" || t.status === "paid") && t.paidAt && new Date(t.paidAt).toDateString() === today)
    .reduce((s, t) => s + t.amount, 0);
  return {
    due: customers.reduce((s, c) => s + c.due, 0),
    owing: customers.filter((c) => c.due > 0).length,
    late: customers.filter((c) => c.status === "late").length,
    collectedToday,
  };
}
