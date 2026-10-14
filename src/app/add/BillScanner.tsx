"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { inr, post } from "../ui/format";
import { dateTag, dict, type Locale } from "../i18n";
import { whatsappLink } from "@/lib/whatsapp";
import { CameraIcon } from "../ui/icons";
import { CATALOG, type ShopType } from "@/lib/catalog";

type Line = { key: number; name: string; qty: string; amount: string };
type Scan = { customer: string | null; phone: string | null; items: { name: string; qty: string | null; amount: number }[]; printedTotal: number | null; total: number };
type Saved = { customerId: string; name: string; phone: string | null; due: number; total: number; shop: string; lines: Line[] };

let nextKey = 0;
const toLine = (l: { name: string; qty: string | null; amount: number }): Line => ({
  key: nextKey++,
  name: l.name,
  qty: l.qty ?? "",
  amount: String(l.amount),
});
const sum = (lines: Line[]) => Math.round(lines.reduce((s, l) => s + (Number(l.amount) || 0), 0) * 100) / 100;

/** Phone photos can be 5–10 MB; shrink to ~1600px JPEG before upload. Falls back to the original file. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

/**
 * Scan a bill: photo -> /api/scan reads the lines -> owner checks them ->
 * saved as one udhaar entry -> itemised bill sent to the customer on WhatsApp.
 * The total is always the sum of the lines shown, so edits are reflected.
 */
export default function BillScanner({
  locale,
  aiEnabled,
  category,
  onActiveChange,
}: {
  locale: Locale;
  aiEnabled: boolean;
  category: ShopType;
  onActiveChange: (active: boolean) => void;
}) {
  const t = dict(locale);
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<"idle" | "scanning" | "review" | "saving" | "saved">("idle");
  const [photo, setPhoto] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [printed, setPrinted] = useState<number | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [error, setError] = useState<string | null>(null);

  const total = sum(lines);

  function reset() {
    if (photo) URL.revokeObjectURL(photo);
    setPhoto(null);
    setLines([]);
    setCustomer("");
    setPhone("");
    setPrinted(null);
    setSaved(null);
    setError(null);
    setPhase("idle");
    onActiveChange(false);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!aiEnabled) return setError(t.scanNeedKey);
    setError(null);
    setPhoto(URL.createObjectURL(file));
    setPhase("scanning");
    onActiveChange(true);
    try {
      const fd = new FormData();
      fd.append("image", await shrink(file), "bill.jpg");
      const scan = await post<Scan>("/api/scan", fd);
      if (scan.items.length === 0) throw new Error(t.scanEmpty);
      setLines(scan.items.map(toLine));
      setCustomer(scan.customer ?? "");
      setPhone(scan.phone ?? "");
      setPrinted(scan.printedTotal);
      setPhase("review");
    } catch (e) {
      reset();
      setError((e as Error).message);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function update(key: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  const describe = (ls: Line[]) =>
    ls.map((l) => `• ${l.name}${l.qty ? ` (${l.qty})` : ""} — ${inr(Number(l.amount) || 0)}`).join("\n");

  async function save() {
    const clean = lines.filter((l) => l.name.trim() && Number(l.amount) > 0);
    setPhase("saving");
    setError(null);
    try {
      const res = await post<{ customer: { id: string; name: string; phone: string | null; due: number }; shop: { name: string } }>(
        "/api/transactions",
        {
          customer: customer.trim(),
          amount: sum(clean),
          type: "credit",
          items: clean.map((l) => l.name.trim()).join(", ").slice(0, 200),
          phone: phone.trim() || null,
          note: `${t.billNote}:\n${describe(clean)}`.slice(0, 1000),
        },
      );
      setSaved({
        customerId: res.customer.id,
        name: res.customer.name,
        phone: res.customer.phone ?? (phone.trim() || null),
        due: res.customer.due,
        total: sum(clean),
        shop: res.shop.name,
        lines: clean,
      });
      setPhase("saved");
    } catch (e) {
      setError((e as Error).message);
      setPhase("review");
    }
  }

  if (phase === "saved" && saved) {
    const message = t.billMsg({
      who: saved.name,
      shop: saved.shop,
      date: new Date().toLocaleDateString(dateTag(locale), { day: "numeric", month: "short" }),
      lines: describe(saved.lines),
      total: inr(saved.total),
      due: inr(saved.due),
    });
    return (
      <section className="panel-pad" aria-live="polite">
        <div>
          <p className="success" style={{ margin: 0 }}>{t.billSaved(inr(saved.total), saved.name)}</p>
          <p className="muted small" style={{ margin: "2px 0 0" }}>{t.billDueNow(inr(saved.due))}</p>
        </div>
        <p className="message">{message}</p>
        <div className="btn-row">
          <a className="btn btn-wa" href={whatsappLink(saved.phone, message)} target="_blank" rel="noreferrer">
            {t.billSend}
          </a>
          <Link className="btn btn-quiet" href={`/khata/${saved.customerId}`}>
            {t.billOpenKhata}
          </Link>
          <button type="button" className="btn btn-quiet" onClick={reset}>
            {t.billAnother}
          </button>
        </div>
      </section>
    );
  }

  if (phase === "review" || phase === "saving" || phase === "scanning") {
    const busy = phase !== "review";
    const mismatch = printed !== null && Math.abs(printed - total) >= 1;
    return (
      <section className="panel-pad" aria-labelledby="bill-h">
        <h2 className="h2" id="bill-h">{t.billCheck}</h2>
        <div className="bill">
          {photo && (
            <a href={photo} target="_blank" rel="noreferrer" className="bill-photo">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
              <img src={photo} alt="" />
            </a>
          )}
          {phase === "scanning" ? (
            <p className="muted" style={{ margin: 0, display: "flex", gap: 10, alignItems: "center" }}>
              <span className="thinking" aria-hidden>
                <i />
                <i />
                <i />
              </span>
              {t.scanning}
            </p>
          ) : (
            <div className="bill-body">
              <table className="bill-table">
                <thead>
                  <tr>
                    <th>{t.billItem}</th>
                    <th className="bill-qty">{t.billQty}</th>
                    <th className="bill-amt">{t.billAmount}</th>
                    <th aria-hidden />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.key}>
                      <td>
                        <input className="cell" list="bill-item-suggestions" value={l.name} aria-label={t.billItem} onChange={(e) => update(l.key, { name: e.target.value })} />
                      </td>
                      <td className="bill-qty">
                        <input className="cell" value={l.qty} aria-label={t.billQty} onChange={(e) => update(l.key, { qty: e.target.value })} />
                      </td>
                      <td className="bill-amt">
                        <input
                          className="cell tnum"
                          inputMode="decimal"
                          value={l.amount}
                          aria-label={t.billAmount}
                          onChange={(e) => update(l.key, { amount: e.target.value.replace(/[^\d.]/g, "") })}
                        />
                      </td>
                      <td>
                        <button type="button" className="cell-x" aria-label={t.billRemove} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}>
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <datalist id="bill-item-suggestions">
                {CATALOG[category].map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
              <button type="button" className="link-btn" onClick={() => setLines((ls) => [...ls, toLine({ name: "", qty: null, amount: 0 })])}>
                + {t.billAddLine}
              </button>
              <div className="bill-total">
                <span>
                  {t.billTotal}
                  <small>{t.billCalculated}</small>
                </span>
                <b className="tnum">{inr(total)}</b>
              </div>
              {mismatch && <p className="warn">{t.billMismatch(inr(printed!), inr(total))}</p>}
            </div>
          )}
        </div>

        {phase !== "scanning" && (
          <>
            <div className="grid-2">
              <label className="field">
                {t.customer}
                <input id="bill-customer" className="input" value={customer} onChange={(e) => setCustomer(e.target.value)} />
              </label>
              <label className="field">
                {t.whatsappNo}
                <input
                  id="bill-phone"
                  className="input tnum"
                  inputMode="tel"
                  placeholder={t.optional}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>
            </div>
            <div className="btn-row">
              <button type="button" className="btn btn-primary" onClick={save} disabled={busy || !customer.trim() || !(total > 0)}>
                {phase === "saving" ? t.saving : t.billSaveSend}
              </button>
              <button type="button" className="btn btn-quiet" onClick={reset} disabled={busy}>
                {t.startOver}
              </button>
            </div>
          </>
        )}
        {error && <p className="error" style={{ margin: 0 }}>{error}</p>}
      </section>
    );
  }

  return (
    <section className="panel-pad" id="scan" aria-labelledby="scan-h">
      <div>
        <h2 className="h2" id="scan-h">{t.scanTitle}</h2>
        <p className="muted small" style={{ margin: "4px 0 0" }}>{t.scanSub}</p>
      </div>
      <label className="btn btn-quiet scan-btn">
        <CameraIcon size={17} />
        {t.scanBtn}
        <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      </label>
      {error && <p className="error" style={{ margin: 0 }}>{error}</p>}
    </section>
  );
}
