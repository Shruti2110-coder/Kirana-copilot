import { NextResponse } from "next/server";
import { requireApiOwner } from "@/lib/auth";
import { parseEntry } from "@/lib/ai";

/** Turn a typed sentence or a voice note into a structured ledger entry. Nothing is saved here. */
export async function POST(req: Request) {
  const { shop, denied } = await requireApiOwner();
  if (denied) return denied;
  try {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("audio");
      if (!(file instanceof Blob)) return NextResponse.json({ error: "No audio" }, { status: 400 });
      if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Voice note too long" }, { status: 413 });
      const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
      const mimeType = (file.type || "audio/webm").split(";")[0];
      return NextResponse.json(await parseEntry({ audio: { base64, mimeType } }, shop.category));
    }
    const { text } = await req.json();
    if (!text || typeof text !== "string") return NextResponse.json({ error: "No text" }, { status: 400 });
    return NextResponse.json(await parseEntry({ text: text.slice(0, 500) }, shop.category));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 });
  }
}
