import { NextResponse } from "next/server";
import { requireApiOwner } from "@/lib/auth";
import { askShop } from "@/lib/ai";
import { getLedger } from "@/lib/db";
import { daysSince } from "@/lib/ledger";

/** "Sabse zyada udhaar kiska hai?" — answer questions about the ledger. */
export async function POST(req: Request) {
  const { denied } = await requireApiOwner();
  if (denied) return denied;
  const { question } = await req.json().catch(() => ({}));
  if (!question || typeof question !== "string") return NextResponse.json({ error: "Ask a question" }, { status: 400 });

  // Send the model a compact view of the ledger, not raw rows.
  const ledger = (await getLedger()).map((c) => ({
    customer: c.name,
    due_inr: c.due,
    entries: c.transactions.slice(0, 20).map((t) => ({
      type: t.type,
      amount_inr: t.amount,
      items: t.items,
      status: t.status,
      days_ago: daysSince(t.createdAt),
    })),
  }));
  try {
    return NextResponse.json({ answer: await askShop(question.slice(0, 300), ledger) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
