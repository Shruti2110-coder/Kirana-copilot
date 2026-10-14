import { NextResponse } from "next/server";
import { requireApiOwner } from "@/lib/auth";
import { scanBill } from "@/lib/ai";

/** Read a photo of a bill into item lines and a calculated total. Nothing is saved here. */
export async function POST(req: Request) {
  const { shop, denied } = await requireApiOwner();
  if (denied) return denied;
  try {
    const form = await req.formData();
    const file = form.get("image");
    if (!(file instanceof Blob)) return NextResponse.json({ error: "No photo" }, { status: 400 });
    if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Please choose a photo of the bill" }, { status: 415 });
    if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: "Photo too large (max 8 MB)" }, { status: 413 });
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    return NextResponse.json(await scanBill({ base64, mimeType: file.type }, shop.category));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 });
  }
}
