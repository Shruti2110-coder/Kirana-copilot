import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const shopSchema = new Schema(
  {
    name: { type: String, required: true },
    owner: { type: String, required: true },
    /** kirana | medical | clothes: decides item suggestions and how the AI reads entries and bills */
    category: { type: String, enum: ["kirana", "medical", "clothes"], default: "kirana" },
    /** true once the owner has entered their own name and shop name on the welcome screen */
    onboarded: { type: Boolean, default: false },
    /** owner's mobile, "+91XXXXXXXXXX"; the only number that can log in */
    ownerPhone: { type: String, default: null },
  },
  { timestamps: true },
);

const customerSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    name: { type: String, required: true, trim: true },
    /** lowercase name, used to match "ramesh" and "Ramesh" as the same customer */
    nameKey: { type: String, required: true },
    phone: { type: String, default: null },
  },
  { timestamps: true },
);
customerSchema.index({ shopId: 1, nameKey: 1 }, { unique: true });

const transactionSchema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    /** "credit" = took goods on udhaar, "payment" = paid back in cash */
    type: { type: String, enum: ["credit", "payment"], required: true },
    amount: { type: Number, required: true, min: 0 }, // INR
    items: { type: String, default: null },
    /** Original voice/text input, kept for audit */
    note: { type: String, default: null },
    status: { type: String, enum: ["pending", "paid"], default: "pending" },
    paypalOrderId: { type: String, default: null },
    payLink: { type: String, default: null },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true },
);
transactionSchema.index({ paypalOrderId: 1 }, { unique: true, partialFilterExpression: { paypalOrderId: { $type: "string" } } });

const reminderSchema = new Schema(
  {
    transactionId: { type: Schema.Types.ObjectId, ref: "Transaction", required: true },
    level: { type: Number, required: true }, // 1 friendly, 2 firm, 3 final
    message: { type: String, required: true },
  },
  { timestamps: true },
);

/** A logged-in browser. The cookie holds a random token; only its hash is stored. */
const sessionSchema = new Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Reuse compiled models across hot reloads in dev.
function model<T extends Schema>(name: string, schema: T) {
  return (mongoose.models[name] as Model<InferSchemaType<T>>) || mongoose.model(name, schema);
}

export const Shop = model("Shop", shopSchema);
export const Customer = model("Customer", customerSchema);
export const Transaction = model("Transaction", transactionSchema);
export const Reminder = model("Reminder", reminderSchema);
export const Session = model("Session", sessionSchema);
