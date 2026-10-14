import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, loginWithPhone } from "@/lib/auth";
import { SHOP_TYPES } from "@/lib/catalog";

const Body = z.object({
  phone: z.string({ error: "Enter your mobile number" }).max(20),
  owner: z.string({ error: "Please enter your name" }).trim().min(1, "Please enter your name").max(40),
  name: z.string({ error: "Please enter the shop name" }).trim().min(1, "Please enter the shop name").max(60),
  category: z.enum(SHOP_TYPES).default("kirana"),
});

/** Log in with name, shop name and mobile; a new number gets a new shop (sets an httpOnly session cookie). */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { phone, owner, name, category } = parsed.data;
  try {
    const shop = await loginWithPhone(phone, { owner, name, category });
    return NextResponse.json({ owner: shop.owner, name: shop.name });
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 503;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
