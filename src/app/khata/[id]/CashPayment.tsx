"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { inr, post } from "../../ui/format";
import { dict, type Locale } from "../../i18n";

/** Record money the customer paid in cash at the counter. */
export default function CashPayment({ customer, due, locale }: { customer: string; due: number; locale: Locale }) {
  const t = dict(locale);
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function save(value: number) {
    setBusy(true);
    setMsg(null);
    try {
      await post("/api/transactions", { customer, amount: value, type: "payment", note: t.cashNote });
      setMsg(t.savedCash(inr(value), customer));
      setOk(true);
      setAmount("");
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
      setOk(false);
    } finally {
      setBusy(false);
    }
  }

  const value = Number(amount);
  return (
    <section className="panel-pad" aria-labelledby="cash-h">
      <h2 className="h2" id="cash-h">{t.recordCash}</h2>
      <form
        className="btn-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (value > 0) save(value);
        }}
      >
        <input
          id="cash-amount"
          className="input tnum"
          style={{ flex: "1 1 140px" }}
          inputMode="numeric"
          type="number"
          min={1}
          placeholder={t.amountRs}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button className="btn btn-primary" disabled={busy || !(value > 0)}>
          {busy ? t.saving : t.saveCash}
        </button>
        <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => save(due)}>
          {t.paidFull(inr(due))}
        </button>
      </form>
      {msg && <span className={ok ? "success" : "error"}>{msg}</span>}
    </section>
  );
}
