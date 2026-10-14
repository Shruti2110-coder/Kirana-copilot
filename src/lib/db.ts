import mongoose from "mongoose";
import { Customer, Shop, Transaction } from "./models";
import { isShopType, type ShopType } from "./catalog";

const globalForMongo = globalThis as unknown as { mongoConn?: Promise<typeof mongoose> };

/** Connect once and reuse the connection (Next.js reloads modules in dev). */
export function connectDB() {
  if (!globalForMongo.mongoConn) {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/kirana";
    globalForMongo.mongoConn = mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 }).catch((e) => {
      globalForMongo.mongoConn = undefined; // allow retry on next request
      throw new Error(`Can't connect to MongoDB at ${uri}. Is Docker running? (${e.message})`);
    });
  }
  return globalForMongo.mongoConn;
}

export type ShopInfo = { id: string; name: string; owner: string; category: ShopType; ownerPhone: string };

function toShopInfo(doc: { _id: unknown; name: string; owner: string; category?: string | null; ownerPhone?: string | null }): ShopInfo {
  return {
    id: String(doc._id),
    name: doc.name,
    owner: doc.owner,
    category: (isShopType(doc.category) ? doc.category : "kirana") as ShopType,
    ownerPhone: doc.ownerPhone ?? "",
  };
}

/** A shop by id, or null if it doesn't exist (or was never finished setting up). */
export async function getShopById(id: string): Promise<ShopInfo | null> {
  if (!mongoose.isValidObjectId(id)) return null;
  await connectDB();
  const doc = await Shop.findById(id).lean();
  return doc?.ownerPhone ? toShopInfo(doc) : null;
}

/**
 * Anyone can open the app: each mobile number has its own shop. A new number creates one;
 * a known number opens the existing shop and saves the name and shop name just entered.
 */
export async function openShop(input: { owner: string; name: string; category: ShopType; ownerPhone: string }) {
  await connectDB();
  const doc = await Shop.findOneAndUpdate(
    { ownerPhone: input.ownerPhone },
    { $set: { ...input, onboarded: true } },
    { upsert: true, returnDocument: "after", lean: true },
  );
  return toShopInfo(doc!);
}

/** The logged-in owner changes the name or shop name (not the login number). */
export async function updateShop(shopId: string, input: { owner: string; name: string; category: ShopType }) {
  await connectDB();
  const doc = await Shop.findByIdAndUpdate(shopId, { $set: input }, { returnDocument: "after", lean: true });
  if (!doc) throw new Error("Shop not found");
  return toShopInfo(doc);
}

/** Find a customer by name (case-insensitive) or create them. */
export async function findOrCreateCustomer(shopId: string, rawName: string, phone?: string | null) {
  await connectDB();
  const name = rawName.trim().replace(/\s+/g, " ");
  const nameKey = name.toLowerCase();
  const customer = await Customer.findOneAndUpdate(
    { shopId, nameKey },
    { $setOnInsert: { shopId, name, nameKey } },
    { upsert: true, returnDocument: "after" },
  );
  if (phone && !customer.phone) {
    customer.phone = phone;
    await customer.save();
  }
  return customer;
}

export type TxnDTO = {
  id: string;
  type: "credit" | "payment";
  amount: number;
  items: string | null;
  note: string | null;
  status: "pending" | "paid";
  payLink: string | null;
  createdAt: string;
  paidAt: string | null;
};
export type LedgerRow = { id: string; name: string; phone: string | null; due: number; transactions: TxnDTO[] };

/** Every customer of this shop with their transactions and outstanding balance (INR). */
export async function getLedger(shopId: string): Promise<LedgerRow[]> {
  await connectDB();
  const custs = await Customer.find({ shopId }).sort({ name: 1 }).lean();
  const txns = await Transaction.find({ customerId: { $in: custs.map((c) => c._id) } })
    .sort({ createdAt: -1 })
    .lean();

  return custs.map((c) => {
    const mine = txns.filter((t) => String(t.customerId) === String(c._id));
    const due = mine.reduce((sum, t) => {
      if (t.type === "credit" && t.status === "pending") return sum + t.amount;
      if (t.type === "payment") return sum - t.amount;
      return sum;
    }, 0);
    return {
      id: String(c._id),
      name: c.name,
      phone: c.phone ?? null,
      due: Math.max(0, Math.round(due)),
      transactions: mine.map((t) => ({
        id: String(t._id),
        type: t.type,
        amount: t.amount,
        items: t.items ?? null,
        note: t.note ?? null,
        status: t.status,
        payLink: t.payLink ?? null,
        createdAt: new Date(t.createdAt).toISOString(),
        paidAt: t.paidAt ? new Date(t.paidAt).toISOString() : null,
      })),
    };
  });
}
