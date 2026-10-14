"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { post } from "../ui/format";
import { dict, type Locale } from "../i18n";
import BillScanner from "./BillScanner";
import { CATALOG, type ShopType } from "@/lib/catalog";

type Draft = {
  customer: string;
  amount: number;
  type: "credit" | "payment";
  items: string | null;
  phone: string | null;
  transcript: string;
  source?: "ai" | "rules";
};

// Mixed scripts on purpose: shopkeepers type in all three ways. One set per kind of shop.
const EXAMPLES: Record<ShopType, Record<Locale, string[]>> = {
  kirana: {
    en: ["Ramesh ne 500 ka saman liya", "Sunita aunty ne 300 diye", "Raju took 250 of sugar 9876543210"],
    hi: ["रमेश ने 500 का सामान लिया", "सुनीता आंटी ने 300 दिए", "Raju ne 250 ki cheeni li 9876543210"],
  },
  medical: {
    en: ["Ramesh ne 60 ki Dolo 650 ki 2 strip li", "Sunita aunty ne 300 diye", "Raju took cough syrup for 120 9876543210"],
    hi: ["रमेश ने 60 की Dolo 650 की 2 स्ट्रिप ली", "सुनीता आंटी ने 300 दिए", "Raju ne 120 ka cough syrup liya 9876543210"],
  },
  clothes: {
    en: ["Ramesh ne 800 ki shirt li", "Sunita aunty ne 500 diye", "Raju took jeans for 1200 9876543210"],
    hi: ["रमेश ने 800 की शर्ट ली", "सुनीता आंटी ने 500 दिए", "Raju ne 1200 ki jeans li 9876543210"],
  },
};

/**
 * Step 1: record voice or type → /api/parse (AI turns it into a Draft)
 * Step 2: the owner checks and edits the Draft
 * Step 3: save → /api/transactions, then open that customer's page
 */
export default function Composer({ aiEnabled, locale, category }: { aiEnabled: boolean; locale: Locale; category: ShopType }) {
  const t = dict(locale);
  const router = useRouter();
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState<null | "parse" | "save">(null);
  const [recording, setRecording] = useState(false);
  const [billActive, setBillActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  async function parse(body: FormData | { text: string }) {
    setBusy("parse");
    setError(null);
    try {
      setDraft(await post<Draft>("/api/parse", body));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function toggleMic() {
    if (recording) return recRef.current?.stop();
    if (!aiEnabled) return setError(t.needKey);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const fd = new FormData();
        fd.append("audio", new Blob(chunks.current, { type: rec.mimeType || "audio/webm" }), "note.webm");
        parse(fd);
      };
      recRef.current = rec;
      rec.start();
      setRecording(true);
      setError(null);
    } catch {
      setError(t.micBlocked);
    }
  }

  async function save() {
    if (!draft) return;
    setBusy("save");
    setError(null);
    try {
      const res = await post<{ customer: { id: string } }>("/api/transactions", {
        ...draft,
        amount: Number(draft.amount),
        note: draft.transcript,
      });
      router.push(`/khata/${res.customer.id}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  if (draft) {
    return (
      <section className="panel-pad" aria-labelledby="check-h">
        <Steps at={2} locale={locale} />
        <div className="section-head">
          <h2 className="h2" id="check-h">{t.checkSave}</h2>
          {draft.source && <span className="ai-tag" style={{ marginLeft: 0 }}>{draft.source === "ai" ? t.readByAi : t.offlineParser}</span>}
        </div>
        <p className="muted small" style={{ margin: 0 }}>
          {t.heard} <i>&ldquo;{draft.transcript}&rdquo;</i>
        </p>
        <div className="grid-2">
          <label className="field span-2">
            {t.customer}
            <input id="d-customer" className="input" value={draft.customer} onChange={(e) => setDraft({ ...draft, customer: e.target.value })} />
          </label>
          <label className="field">
            {t.amount}
            <input
              id="d-amount"
              className="input tnum"
              type="number"
              inputMode="numeric"
              value={draft.amount}
              onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            {t.type}
            <select id="d-type" className="input" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as Draft["type"] })}>
              <option value="credit">{t.typeCredit}</option>
              <option value="payment">{t.typePayment}</option>
            </select>
          </label>
          <label className="field">
            {t.items}
            <input
              id="d-items"
              className="input"
              list="item-suggestions"
              value={draft.items ?? ""}
              onChange={(e) => setDraft({ ...draft, items: e.target.value || null })}
            />
            <datalist id="item-suggestions">
              {CATALOG[category].map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </label>
          <label className="field">
            {t.whatsappNo}
            <input
              id="d-phone"
              className="input tnum"
              inputMode="tel"
              placeholder={t.optional}
              value={draft.phone ?? ""}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value || null })}
            />
          </label>
          <SuggestedItems
            locale={locale}
            category={category}
            items={draft.items}
            onAdd={(item) => setDraft({ ...draft, items: draft.items ? `${draft.items}, ${item}` : item })}
          />
        </div>
        <div className="btn-row">
          <button className="btn btn-primary" onClick={save} disabled={busy !== null || !draft.customer || !(draft.amount > 0)}>
            {busy === "save" ? t.saving : t.saveEntry}
          </button>
          <button className="btn btn-quiet" onClick={() => setDraft(null)} disabled={busy !== null}>
            {t.startOver}
          </button>
        </div>
        {error && <p className="error" style={{ margin: 0 }}>{error}</p>}
      </section>
    );
  }

  return (
    <>
      {!billActive && (
        <>
          <section className="mic-stage">
            <Steps at={1} locale={locale} />
            <div className="mic-wrap">
              <button
                type="button"
                className={`mic${recording ? " is-recording" : ""}`}
                onClick={toggleMic}
                disabled={busy !== null}
                aria-label={recording ? t.stopRec : t.startRec}
              >
                {recording ? (
                  <svg width="40" height="40" viewBox="0 0 24 24" aria-hidden><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" /></svg>
                ) : (
                  <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                    <rect x="9" y="3" width="6" height="11" rx="3" />
                    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" strokeLinecap="round" />
                  </svg>
                )}
              </button>
            </div>
            {recording ? (
              <div className="wave" aria-hidden>
                <i /><i /><i /><i /><i /><i /><i />
              </div>
            ) : busy === "parse" ? (
              <span className="thinking" style={{ color: "var(--brand)", height: 28 }} aria-hidden>
                <i /><i /><i />
              </span>
            ) : null}
            <p className="mic-title">
              {busy === "parse" ? t.understanding : recording ? t.listening : t.tapSpeak}
            </p>
            <p className="muted small" style={{ margin: 0 }}>{t.example}</p>
            <div className="lang" aria-label={t.languages}>
              <span>हिंदी</span>
              <span>English</span>
              <span>Hinglish</span>
            </div>
          </section>

          <section className="panel-pad" aria-labelledby="type-h">
            <h2 className="h2" id="type-h">{t.orType}</h2>
            <form
              className="btn-row"
              onSubmit={(e) => {
                e.preventDefault();
                if (text.trim()) parse({ text });
              }}
            >
              <input
                id="entry-text"
                className="input"
                style={{ flex: "1 1 220px" }}
                placeholder={EXAMPLES[category][locale][0]}
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={recording}
              />
              <button className="btn btn-primary" style={{ flex: "0 0 auto" }} disabled={!text.trim() || busy !== null}>
                {busy === "parse" ? t.reading : t.continue}
              </button>
            </form>
            <div className="chips">
              {EXAMPLES[category][locale].map((ex) => (
                <button key={ex} type="button" className="chip" onClick={() => setText(ex)}>
                  {ex}
                </button>
              ))}
            </div>
          </section>
          {error && <p className="error" style={{ margin: 0 }}>{error}</p>}
        </>
      )}
      <BillScanner locale={locale} aiEnabled={aiEnabled} category={category} onActiveChange={setBillActive} />
    </>
  );
}

function Steps({ at, locale }: { at: 1 | 2; locale: Locale }) {
  const t = dict(locale);
  return (
    <div className="steps" aria-label={t.stepOf(at)}>
      <span className={at >= 1 ? "on" : ""}><b>1</b>{t.stepSpeak}</span>
      <hr />
      <span className={at >= 2 ? "on" : ""}><b>2</b>{t.stepCheck}</span>
      <hr />
      <span><b>3</b>{t.stepSave}</span>
    </div>
  );
}

/** Tap-to-add chips of what this kind of shop usually sells, skipping items already in the entry. */
function SuggestedItems({
  locale,
  category,
  items,
  onAdd,
}: {
  locale: Locale;
  category: ShopType;
  items: string | null;
  onAdd: (item: string) => void;
}) {
  const have = (items ?? "").toLowerCase();
  const options = CATALOG[category].filter((item) => !have.includes(item.toLowerCase())).slice(0, 12);
  if (options.length === 0) return null;
  return (
    <div className="span-2 suggest">
      <span className="small muted">{dict(locale).suggested}</span>
      <div className="chips">
        {options.map((item) => (
          <button key={item} type="button" className="chip" onClick={() => onAdd(item)}>
            + {item}
          </button>
        ))}
      </div>
    </div>
  );
}
