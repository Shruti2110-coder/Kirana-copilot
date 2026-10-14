"use client";

import { useEffect, useSyncExternalStore } from "react";
import { dict, type Locale } from "../i18n";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type InstallWindow = Window & { __hkInstall?: InstallEvent | null };


export default function InstallApp({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const prompt = useSyncExternalStore(subscribeInstall, () => (window as InstallWindow).__hkInstall ?? null, () => null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
        /* not supported here (e.g. plain http on a LAN address): the app still works as a website */
      });
    }
  }, []);

  if (!prompt) return null;
  return (
    <button
      type="button"
      className="btn btn-quiet install-btn"
      onClick={async () => {
        await prompt.prompt();
        await prompt.userChoice;
        (window as InstallWindow).__hkInstall = null; // a prompt can only be used once
        window.dispatchEvent(new Event("hk-installable"));
      }}
    >
      {t.installApp}
    </button>
  );
}

const subscribeInstall = (cb: () => void) => {
  window.addEventListener("hk-installable", cb);
  return () => window.removeEventListener("hk-installable", cb);
};

const TIP_KEY = "hk-ios-tip-dismissed";
const TIP_EVENT = "hk-ios-tip";

/** True on iPhone/iPad Safari, outside the installed app, until the owner closes the tip. */
function showIosTip() {
  try {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const installed = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    return ios && !installed && localStorage.getItem(TIP_KEY) !== "1";
  } catch {
    return false;
  }
}
const subscribe = (cb: () => void) => {
  window.addEventListener(TIP_EVENT, cb);
  return () => window.removeEventListener(TIP_EVENT, cb);
};

export function IosInstallTip({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const visible = useSyncExternalStore(subscribe, showIosTip, () => false);
  if (!visible) return null;
  return (
    <div className="ios-tip" role="status">
      <span>{t.iosTip}</span>
      <button
        type="button"
        aria-label={t.close}
        onClick={() => {
          try {
            localStorage.setItem(TIP_KEY, "1");
          } catch {
            /* storage blocked: hides for this page only */
          }
          window.dispatchEvent(new Event(TIP_EVENT));
        }}
      >
        ×
      </button>
    </div>
  );
}
