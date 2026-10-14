"use client";

import { useState } from "react";
import { post } from "./format";
import { dict, type Locale } from "../i18n";

/** Ask questions about the shop in plain language. Calls /api/ask, which sends the ledger to Gemini. */
export default function AskBox({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function ask(question: string) {
    setQ(question);
    setBusy(true);
    try {
      setAnswer((await post<{ answer: string }>("/api/ask", { question })).answer);
    } catch (e) {
      setAnswer((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="ai-card" aria-labelledby="ask-h">
      <div className="ai-head">
        <h2 className="h2" id="ask-h">{t.assistant}</h2>
        <span className="muted small">{t.assistantSub}</span>
      </div>
      <form
        className="btn-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) ask(q);
        }}
      >
        <input
          id="ask-input"
          className="input"
          style={{ flex: "1 1 220px" }}
          placeholder={t.askPlaceholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="btn btn-primary" style={{ flex: "0 0 auto" }} disabled={busy || !q.trim()}>
          {busy ? (
            <span className="thinking" aria-label={t.thinking}>
              <i />
              <i />
              <i />
            </span>
          ) : (
            t.ask
          )}
        </button>
      </form>
      {answer ? (
        <>
          <p className="ai-answer">{answer}</p>
          <button type="button" className="chip" style={{ justifySelf: "start" }} onClick={() => setAnswer(null)}>
            {t.askAgain}
          </button>
        </>
      ) : (
        <div className="chips">
          {t.examples.map((ex) => (
            <button key={ex} type="button" className="chip" onClick={() => ask(ex)}>
              {ex}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
