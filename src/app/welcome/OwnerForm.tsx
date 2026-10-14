"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { post } from "../ui/format";
import { dict, type Locale } from "../i18n";
import type { ShopType } from "@/lib/catalog";
import ShopTypePicker from "../ui/ShopTypePicker";

/** Owner's name and shop name. First visit: "Start". Later visits (from the top bar): "Save changes". */
export default function OwnerForm({
  locale,
  initial,
  firstTime,
}: {
  locale: Locale;
  initial: { owner: string; name: string; category: ShopType };
  firstTime: boolean;
}) {
  const t = dict(locale);
  const router = useRouter();
  const [owner, setOwner] = useState(initial.owner);
  const [name, setName] = useState(initial.name);
  const [category, setCategory] = useState<ShopType>(initial.category);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await post("/api/shop", { owner, name, category });
      router.push("/");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form className="panel-pad welcome-form" onSubmit={save}>
      <label className="field">
        {t.ownerName}
        <input
          id="owner-name"
          className="input"
          autoFocus={firstTime}
          autoComplete="name"
          placeholder={t.ownerNamePh}
          value={owner}
          maxLength={40}
          onChange={(e) => setOwner(e.target.value)}
        />
      </label>
      <label className="field">
        {t.shopName}
        <input
          id="shop-name"
          className="input"
          autoComplete="organization"
          placeholder={t.shopNamePh}
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <ShopTypePicker locale={locale} value={category} onChange={setCategory} />
      <button className="btn btn-primary" disabled={busy || !owner.trim() || !name.trim()}>
        {busy ? t.saving : firstTime ? t.startApp : t.saveChanges}
      </button>
      {error && <p className="error" style={{ margin: 0 }}>{error}</p>}
    </form>
  );
}
