"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { post } from "../ui/format";
import { dict, type Locale } from "../i18n";
import type { ShopType } from "@/lib/catalog";
import ShopTypePicker from "../ui/ShopTypePicker";

/** Owner name, shop name, shop type and mobile. Each mobile number has its own shop. */
export default function PhoneLogin({ locale }: { locale: Locale }) {
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
      await post("/api/auth/login", { phone, owner, name, category });
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const ready = /\d{10}/.test(phone.replace(/\D/g, "")) && owner.trim() && name.trim();
  return (
    <form className="panel-pad welcome-form" onSubmit={submit}>
      <label className="field">
        {t.ownerName}
        <input id="owner-name" className="input" autoFocus autoComplete="name" placeholder={t.ownerNamePh} maxLength={40} value={owner} onChange={(e) => setOwner(e.target.value)} />
      </label>
      <label className="field">
        {t.shopName}
        <input id="shop-name" className="input" autoComplete="organization" placeholder={t.shopNamePh} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <ShopTypePicker locale={locale} value={category} onChange={setCategory} />
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
            placeholder={t.ownerPhonePh}
            maxLength={14}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <span className="small muted">{t.ownerPhoneHint}</span>
      </label>
      <button className="btn btn-primary" disabled={busy || !ready}>
        {busy ? t.loggingIn : t.startApp}
      </button>
      {error && <p className="error" style={{ margin: 0 }}>{error}</p>}
    </form>
  );
}
