import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, loginWithPhone } from "@/lib/auth";
import { SHOP_TYPES } from "@/lib/catalog";

const Body = z.object({
  phone: z.string({ error: "Enter your mobile number" }).max(20),
  // Only for first-time setup: who the owner is and what the shop is called.
  owner: z.string().trim().min(1, "Please enter your name").max(40).optional(),
  name: z.string().trim().min(1, "Please enter the shop name").max(60).optional(),
  category: z.enum(SHOP_TYPES).default("kirana"),
});

/** Log in with the owner's mobile number (sets an httpOnly session cookie). */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { phone, owner, name, category } = parsed.data;
  try {
    const shop = await loginWithPhone(phone, owner && name ? { owner, name, category } : undefined);
    return NextResponse.json({ owner: shop.owner, name: shop.name });
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 503;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
