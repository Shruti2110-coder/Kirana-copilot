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

/** Single-shop demo: get or create the shop from env settings. */
export async function getShop() {
  await connectDB();
  const existing = await Shop.findOne().lean();
  if (existing) {
    return {
      id: String(existing._id),
      name: existing.name,
      owner: existing.owner,
      category: (isShopType(existing.category) ? existing.category : "kirana") as ShopType,
      onboarded: Boolean(existing.onboarded && existing.ownerPhone),
      ownerPhone: existing.ownerPhone ?? null,
    };
  }
  // .env values only pre-fill the welcome screen; the owner confirms or replaces them there.
  const created = await Shop.create({
    name: process.env.SHOP_NAME || "My Kirana Store",
    owner: process.env.SHOP_OWNER || "Owner",
  });
  return { id: String(created._id), name: created.name, owner: created.owner, category: "kirana" as ShopType, onboarded: false, ownerPhone: null };
}

/** First-time setup, after the owner's phone is verified: save who they are and lock the shop to that number. */
export async function setupShop(input: { owner: string; name: string; category: ShopType; ownerPhone: string }) {
  const shop = await getShop();
  await Shop.updateOne({ _id: shop.id }, { $set: { ...input, onboarded: true } });
  return { ...shop, ...input, onboarded: true };
}

/** The logged-in owner changes the name or shop name (not the login number). */
export async function updateShop(input: { owner: string; name: string; category: ShopType }) {
  const shop = await getShop();
  await Shop.updateOne({ _id: shop.id }, { $set: input });
  return { ...shop, ...input };
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

/** Every customer with their transactions and outstanding balance (INR). */
export async function getLedger(): Promise<LedgerRow[]> {
  const shop = await getShop();
  const custs = await Customer.find({ shopId: shop.id }).sort({ name: 1 }).lean();
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
