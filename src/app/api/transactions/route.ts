import { NextResponse } from "next/server";
import { requireApiOwner } from "@/lib/auth";
import { z } from "zod";
import { getShop, findOrCreateCustomer, getLedger } from "@/lib/db";
import { Transaction } from "@/lib/models";
import { customerDue } from "@/lib/ledger";

export async function GET() {
  const { denied } = await requireApiOwner();
  if (denied) return denied;
  try {
    return NextResponse.json(await getLedger());
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 503 });
  }
}

const Body = z.object({
  customer: z.string().trim().min(1).max(60),
  amount: z.number().positive().max(10_000_000),
  type: z.enum(["credit", "payment"]),
  items: z.string().max(200).nullish(),
  phone: z
    .string()
    .regex(/^\+?\d{10,13}$/)
    .nullish()
    .or(z.literal("").transform(() => null)),
  note: z.string().max(1000).nullish(),
});

/** Save an entry the owner has confirmed. */
export async function POST(req: Request) {
  const { denied } = await requireApiOwner();
  if (denied) return denied;
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { customer, amount, type, items, phone, note } = parsed.data;

  try {
    const shop = await getShop();
    const cust = await findOrCreateCustomer(shop.id, customer, phone);
    const txn = await Transaction.create({
      customerId: cust._id,
      type,
      amount,
      items: items || null,
      note: note || null,
      // A cash payment is settled the moment it's recorded.
      status: type === "payment" ? "paid" : "pending",
      paidAt: type === "payment" ? new Date() : null,
    });
    return NextResponse.json(
      {
        transaction: { id: String(txn._id), type, amount, status: txn.status },
        customer: { id: String(cust._id), name: cust.name, phone: cust.phone ?? null, due: await customerDue(cust._id) },
        shop: { name: shop.name },
      },
      { status: 201 },
    );
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 503 });
  }
}
