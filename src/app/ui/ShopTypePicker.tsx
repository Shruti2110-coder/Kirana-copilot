"use client";

import { SHOP_TYPES, type ShopType } from "@/lib/catalog";
import { dict, type Locale } from "../i18n";

/** Kirana / Medical / Clothes, as three radio-style buttons. */
export default function ShopTypePicker({ locale, value, onChange }: { locale: Locale; value: ShopType; onChange: (v: ShopType) => void }) {
  const t = dict(locale);
  return (
    <div className="field">
      <span id="shop-type-label">{t.shopType}</span>
      <div className="type-pick" role="radiogroup" aria-labelledby="shop-type-label">
        {SHOP_TYPES.map((type) => (
          <button key={type} type="button" role="radio" aria-checked={value === type} onClick={() => onChange(type)}>
            {t.shopTypes[type]}
          </button>
        ))}
      </div>
      <span className="small muted">{t.shopTypeHint}</span>
    </div>
  );
}
