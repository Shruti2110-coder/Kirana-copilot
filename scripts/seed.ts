/** Demo data so the dashboard looks alive for the video. Run: npm run db:seed [mobile] (default 9999999999) */
import mongoose from "mongoose";
import { connectDB, openShop, findOrCreateCustomer } from "../src/lib/db";
import { normalizePhone } from "../src/lib/auth";
import { Customer, Reminder, Transaction } from "../src/lib/models";

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

async function main() {
  await connectDB();
  const ownerPhone = normalizePhone(process.argv[2] ?? "9999999999");
  if (!ownerPhone) throw new Error("Pass a valid 10-digit mobile number");
  const shop = await openShop({
    owner: process.env.SHOP_OWNER || "Owner",
    name: process.env.SHOP_NAME || "My Kirana Store",
    category: "kirana",
    ownerPhone,
  });
  // Clear only this shop's demo data; other shops are untouched.
  const old = await Customer.find({ shopId: shop.id }, { _id: 1 }).lean();
  const oldTxns = await Transaction.find({ customerId: { $in: old.map((c) => c._id) } }, { _id: 1 }).lean();
  await Reminder.deleteMany({ transactionId: { $in: oldTxns.map((t) => t._id) } });
  await Transaction.deleteMany({ customerId: { $in: old.map((c) => c._id) } });
  await Customer.deleteMany({ shopId: shop.id });

  const entries: [string, string | null, "credit" | "payment", number, string | null, number][] = [
    ["Ramesh", "9876543210", "credit", 500, "atta, dal", 2],
    ["Ramesh", null, "credit", 320, "doodh, bread", 0],
    ["Sunita Aunty", "9812345678", "credit", 1200, "chawal, tel", 9],
    ["Sunita Aunty", null, "payment", 400, null, 3],
    ["Mohan", "9898989898", "credit", 2450, "monthly ration", 18],
    ["Pinky", null, "credit", 180, "biscuits, chips", 1],
    ["Vikas Bhaiya", "9123456780", "credit", 650, "sugar, chai patti", 5],
    ["Vikas Bhaiya", null, "payment", 650, null, 0],
  ];
  for (const [name, phone, type, amount, items, ago] of entries) {
    const c = await findOrCreateCustomer(shop.id, name, phone);
    // Insert directly so we can backdate createdAt for realistic "days overdue".
    await Transaction.collection.insertOne({
      customerId: c._id,
      type,
      amount,
      items,
      note: null,
      status: type === "payment" ? "paid" : "pending",
      paypalOrderId: null,
      payLink: null,
      paidAt: type === "payment" ? daysAgo(ago) : null,
      createdAt: daysAgo(ago),
      updatedAt: daysAgo(ago),
    });
  }
  console.log(`Seeded ${entries.length} entries for ${shop.name} (log in with ${ownerPhone})`);
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
