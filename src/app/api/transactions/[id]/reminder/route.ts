import { NextResponse } from "next/server";
import { requireApiOwner } from "@/lib/auth";
import { getShop } from "@/lib/db";
import { Reminder } from "@/lib/models";
import { amountToCollect, daysSince, getTransaction, reminderLevel, whatsappLink } from "@/lib/ledger";
import { writeReminder } from "@/lib/ai";

/** AI writes a reminder whose tone depends on how long the udhaar has been pending. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { denied } = await requireApiOwner();
  if (denied) return denied;
  const { id } = await params;
  const row = await getTransaction(id);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { txn, customer } = row;
  if (txn.status === "paid") return NextResponse.json({ error: "Already paid" }, { status: 400 });

  const { lang } = await req.json().catch(() => ({}));
  const shop = await getShop();
  const days = daysSince(txn.createdAt);
  const level = reminderLevel(days);
  const amount = await amountToCollect(txn);
  if (amount <= 0) return NextResponse.json({ error: "Nothing left to collect from this customer" }, { status: 400 });
  try {
    const message = await writeReminder({
      customer: customer.name,
      amountInr: amount,
      daysOverdue: days,
      level,
      payLink: txn.payLink,
      shopName: shop.name,
      hindi: lang === "hi",
    });
    await Reminder.create({ transactionId: txn._id, level, message });
    return NextResponse.json({ level, days, message, whatsapp: whatsappLink(customer.phone, message) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
