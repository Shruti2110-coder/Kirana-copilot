/**
 * Owner login by mobile number.
 *
 * - Anyone can use the app: they enter their name, shop name and mobile, and each mobile
 *   number gets its own shop. There is no one-time code, so this identifies the owner but
 *   does not prove it: anyone who knows a shop's number can open that shop.
 * - Sessions: a random 32-byte token in an httpOnly cookie; the database keeps only
 *   its SHA-256, so a leaked database can't be used to log in. Valid 30 days.
 *
 * Call these from Server Components inside a <Suspense> boundary or from Route Handlers.
 */
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { connectDB, getShopById, openShop } from "./db";
import { Session } from "./models";
import type { ShopType } from "./catalog";

const COOKIE = "hk_session";
const SESSION_DAYS = 30;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** "98765 43210", "+91 9876543210", "09876543210" -> "+919876543210"; null if not an Indian mobile. */
export function normalizePhone(raw: string): string | null {
  let d = raw.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? `+91${d}` : null;
}

/** "+919876543210" -> "+91 98765 43210" */
export const formatPhone = (p: string) => `${p.slice(0, 3)} ${p.slice(3, 8)} ${p.slice(8)}`;

export class AuthError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

/** Log this browser in to the shop for this number, creating the shop if the number is new. */
export async function loginWithPhone(rawPhone: string, details: { owner: string; name: string; category: ShopType }) {
  const phone = normalizePhone(rawPhone);
  if (!phone) throw new AuthError("Enter a valid 10-digit Indian mobile number.");

  const shop = await openShop({ ...details, ownerPhone: phone });

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await Session.create({ tokenHash: sha256(token), shopId: shop.id, expiresAt });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return shop;
}

/** The shop this browser is logged in to, or null. Never throws or redirects. */
export async function getOwnerSession() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  await connectDB();
  const session = await Session.findOne({ tokenHash: sha256(token), expiresAt: { $gt: new Date() } }).lean();
  if (!session) return null;
  return getShopById(String(session.shopId));
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    await connectDB();
    await Session.deleteOne({ tokenHash: sha256(token) });
  }
  jar.delete(COOKIE);
}

/** For Route Handlers: the logged-in shop, or a 401 response to return. */
export async function requireApiOwner() {
  const shop = await getOwnerSession();
  return shop
    ? { shop, denied: null }
    : { shop: null, denied: Response.json({ error: "Please log in again." }, { status: 401 }) };
}
