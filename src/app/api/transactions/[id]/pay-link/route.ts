import { NextResponse } from "next/server";
import { requireApiOwner } from "@/lib/auth";
import { amountToCollect, getTransaction, whatsappLink } from "@/lib/ledger";
import { createPaymentOrder, paypalEnabled } from "@/lib/paypal";

/** Create (or reuse) a PayPal payment link for a pending credit and a WhatsApp message to send it. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { shop, denied } = await requireApiOwner();
  if (denied) return denied;
  const { id } = await params;
  const row = await getTransaction(id, shop.id);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { txn, customer } = row;
  if (txn.type !== "credit") return NextResponse.json({ error: "Only udhaar entries need a payment link" }, { status: 400 });
  if (txn.status === "paid") return NextResponse.json({ error: "Already paid" }, { status: 400 });
  if (!paypalEnabled()) {
    return NextResponse.json({ error: "Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to .env" }, { status: 503 });
  }

  const { lang } = await req.json().catch(() => ({}));
  const amount = await amountToCollect(txn);
  if (amount <= 0) return NextResponse.json({ error: "Nothing left to collect from this customer" }, { status: 400 });

  if (!txn.payLink) {
    try {
      const order = await createPaymentOrder({
        transactionId: id,
        amountInr: amount,
        description: `${shop.name}: ₹${amount} udhaar${txn.items ? ` (${txn.items})` : ""}`,
        shopName: shop.name,
      });
      txn.paypalOrderId = order.orderId;
      txn.payLink = order.approveUrl;
      await txn.save();
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 502 });
    }
  }

  const items = txn.items ? ` (${txn.items})` : "";
  const message =
    lang === "hi"
      ? `नमस्ते ${customer.name} जी 🙏 ${shop.name} में आपका ₹${amount} का हिसाब बाकी है${items}। यहाँ से PayPal पर भुगतान कर सकते हैं: ${txn.payLink}`
      : `Namaste ${customer.name} ji 🙏 ${shop.name} mein aapka ₹${amount} ka hisaab baaki hai${items}. Yahan se PayPal par pay kar sakte hain: ${txn.payLink}`;

  return NextResponse.json({ payLink: txn.payLink, message, whatsapp: whatsappLink(customer.phone, message) });
}
