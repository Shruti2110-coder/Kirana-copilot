import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Transaction } from "@/lib/models";
import { markPaid } from "@/lib/ledger";
import { captureOrder, verifyWebhook } from "@/lib/paypal";

/**
 * Backup path: if the customer pays but closes the tab before being redirected,
 * PayPal still tells us here. Subscribe to CHECKOUT.ORDER.APPROVED and
 * PAYMENT.CAPTURE.COMPLETED in the PayPal dashboard.
 */
export async function POST(req: Request) {
  const event = await req.json();
  if (!(await verifyWebhook(req.headers, event))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const resource = event.resource ?? {};
  let orderId: string | undefined;
  if (event.event_type === "CHECKOUT.ORDER.APPROVED") {
    orderId = resource.id;
    try {
      await captureOrder(resource.id); // capture; COMPLETED webhook will follow
    } catch {
      /* already captured via redirect */
    }
  } else if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
    orderId = resource.supplementary_data?.related_ids?.order_id;
    await connectDB();
    const txn = orderId ? await Transaction.findOne({ paypalOrderId: orderId }).lean() : null;
    const txnId = txn ? String(txn._id) : resource.custom_id;
    if (txnId) await markPaid(txnId);
  }
  return NextResponse.json({ ok: true, orderId });
}
