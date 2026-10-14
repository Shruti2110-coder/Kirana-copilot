import { isValidObjectId, type Types } from "mongoose";
import { connectDB } from "./db";
import { Customer, Transaction } from "./models";

/** Load a transaction and its customer. Returns null for bad or unknown ids. */
export async function getTransaction(id: string) {
  if (!isValidObjectId(id)) return null;
  await connectDB();
  const txn = await Transaction.findById(id);
  if (!txn) return null;
  const customer = await Customer.findById(txn.customerId);
  if (!customer) return null;
  return { txn, customer };
}

/** What a customer still owes overall (pending udhaar minus cash payments), INR. */
export async function customerDue(customerId: Types.ObjectId | string) {
  const rows = await Transaction.find({ customerId }).lean();
  const due = rows.reduce((s, t) => {
    if (t.type === "credit" && t.status === "pending") return s + t.amount;
    if (t.type === "payment") return s - t.amount;
    return s;
  }, 0);
  return Math.max(0, Math.round(due));
}

/** Amount to ask for on one entry: never more than the customer owes in total. */
export async function amountToCollect(txn: { amount: number; customerId: Types.ObjectId | string }) {
  return Math.min(txn.amount, await customerDue(txn.customerId));
}

/** Atomically mark a credit as paid. Returns true only the first time. */
export async function markPaid(transactionId: string) {
  if (!isValidObjectId(transactionId)) return false;
  await connectDB();
  const res = await Transaction.updateOne(
    { _id: transactionId, status: "pending" },
    { $set: { status: "paid", paidAt: new Date() } },
  );
  return res.modifiedCount === 1;
}

export { whatsappLink } from "./whatsapp";

export function daysSince(date: Date | string) {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
}

export function reminderLevel(days: number): 1 | 2 | 3 {
  if (days >= 15) return 3;
  if (days >= 7) return 2;
  return 1;
}
