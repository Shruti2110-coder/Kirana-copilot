import { NextResponse } from "next/server";
import { captureOrder } from "@/lib/paypal";
import { getTransaction, markPaid } from "@/lib/ledger";

/** PayPal sends the customer here after they approve. We capture the payment, then mark the entry paid. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const txnId = url.searchParams.get("txn");
  const token = url.searchParams.get("token"); // PayPal order id
  const done = (status: string) => NextResponse.redirect(new URL(`/pay/done?status=${status}`, url.origin));

  if (!txnId || !token) return done("invalid");
  const row = await getTransaction(txnId);
  // The order id must match what we created for this entry, so links can't be swapped.
  if (!row || row.txn.paypalOrderId !== token) return done("invalid");
  if (row.txn.status === "paid") return done("paid");

  try {
    const capture = await captureOrder(token);
    if (capture.status === "COMPLETED") {
      await markPaid(txnId);
      return done("paid");
    }
    return done("pending");
  } catch (e) {
    // ORDER_ALREADY_CAPTURED etc. — the webhook will settle it.
    console.error("capture failed", e);
    return done("pending");
  }
}
