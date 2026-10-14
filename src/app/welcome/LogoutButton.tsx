"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { post } from "../ui/format";
import { dict, type Locale } from "../i18n";

export default function LogoutButton({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-quiet"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await post("/api/auth/logout").catch(() => null);
        router.replace("/login");
        router.refresh();
      }}
    >
      {dict(locale).logout}
    </button>
  );
}
