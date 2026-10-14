"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { post } from "../ui/format";
import { dict, type Locale } from "../i18n";
import type { ShopType } from "@/lib/catalog";
import ShopTypePicker from "../ui/ShopTypePicker";

/**
 * "setup": owner name, shop name and mobile; that number becomes the owner's login.
 * "login": the owner's mobile number only.
 */
export default function PhoneLogin({ locale, mode }: { locale: Locale; mode: "setup" | "login" }) {
  const t = dict(locale);
  const router = useRouter();
  const [owner, setOwner] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ShopType>("kirana");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await post("/api/auth/login", mode === "setup" ? { phone, owner, name, category } : { phone });
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const ready = /\d{10}/.test(phone.replace(/\D/g, "")) && (mode === "login" || (owner.trim() && name.trim()));
  return (
    <form className="panel-pad welcome-form" onSubmit={submit}>
      {mode === "setup" && (
        <>
          <label className="field">
            {t.ownerName}
            <input id="owner-name" className="input" autoFocus autoComplete="name" placeholder={t.ownerNamePh} maxLength={40} value={owner} onChange={(e) => setOwner(e.target.value)} />
          </label>
          <label className="field">
            {t.shopName}
            <input id="shop-name" className="input" autoComplete="organization" placeholder={t.shopNamePh} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <ShopTypePicker locale={locale} value={category} onChange={setCategory} />
        </>
      )}
      <label className="field">
        {t.ownerPhone}
        <div className="phone-input">
          <span aria-hidden>+91</span>
          <input
            id="owner-phone"
            className="input tnum"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            autoFocus={mode === "login"}
            placeholder={t.ownerPhonePh}
            maxLength={14}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <span className="small muted">{t.ownerPhoneHint}</span>
      </label>
      <button className="btn btn-primary" disabled={busy || !ready}>
        {busy ? t.loggingIn : mode === "setup" ? t.startApp : t.verifyLogin}
      </button>
      {error && <p className="error" style={{ margin: 0 }}>{error}</p>}
    </form>
  );
}
