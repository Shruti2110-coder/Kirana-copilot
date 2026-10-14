import { NextResponse } from "next/server";
import { z } from "zod";
import { updateShop } from "@/lib/db";
import { requireApiOwner } from "@/lib/auth";
import { SHOP_TYPES } from "@/lib/catalog";

const Body = z.object({
  owner: z.string({ error: "Please enter your name" }).trim().min(1, "Please enter your name").max(40),
  name: z.string({ error: "Please enter the shop name" }).trim().min(1, "Please enter the shop name").max(60),
  category: z.enum(SHOP_TYPES, { error: "Choose the type of shop" }),
});

/** The logged-in owner changes their name or the shop name. Logging in goes through /api/auth. */
export async function POST(req: Request) {
  const { shop, denied } = await requireApiOwner();
  if (denied) return denied;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  try {
    const updated = await updateShop(shop.id, parsed.data);
    return NextResponse.json({ owner: updated.owner, name: updated.name, category: updated.category });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 503 });
  }
}
