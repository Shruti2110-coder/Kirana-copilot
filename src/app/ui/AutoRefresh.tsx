"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-reads the page's server data every few seconds, so a PayPal payment shows up without reloading. */
export default function AutoRefresh({ every = 8000 }: { every?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), every);
    return () => clearInterval(t);
  }, [router, every]);
  return null;
}
