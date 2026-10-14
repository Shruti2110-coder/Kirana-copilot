"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { post } from "../../ui/format";
import { dict, type Locale } from "../../i18n";

type Preview = { message: string; whatsapp: string };

/** Buttons under one unpaid entry: create a PayPal link, or let AI write a reminder. */
export default function EntryActions({ id, hasLink, paypal, locale }: { id: string; hasLink: boolean; paypal: boolean; locale: Locale }) {
  const t = dict(locale);
  const router = useRouter();
  const [busy, setBusy] = useState<null | "link" | "remind">(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function run(kind: "link" | "remind") {
    setBusy(kind);
    setError(null);
    try {
      setPreview(await post<Preview>(`/api/transactions/${id}/${kind === "link" ? "pay-link" : "reminder"}`, { lang: locale }));
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (preview) {
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <p className="message" style={{ margin: 0 }}>{preview.message}</p>
        <div className="btn-row">
          <a className="btn btn-wa" href={preview.whatsapp} target="_blank" rel="noreferrer">
            {t.sendWhatsapp}
          </a>
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() =>
              navigator.clipboard?.writeText(preview.message).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              })
            }
          >
            {copied ? t.copied : t.copyMsg}
          </button>
          <button type="button" className="btn btn-quiet" style={{ flex: "0 0 auto" }} onClick={() => setPreview(null)} aria-label={t.close}>
            {t.close}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div className="btn-row">
        <button
          type="button"
          className="btn btn-primary"
          disabled={!paypal || busy !== null}
          title={paypal ? undefined : t.paypalMissingTitle}
          onClick={() => run("link")}
        >
          {busy === "link" ? t.creatingLink : hasLink ? t.resendLink : t.sendLink}
        </button>
        <button type="button" className="btn btn-ai" disabled={busy !== null} onClick={() => run("remind")}>
          {busy === "remind" ? t.writing : t.writeReminder}
        </button>
      </div>
      {!paypal && <span className="muted small">{t.paypalMissing}</span>}
      {error && <span className="error">{error}</span>}
    </div>
  );
}
