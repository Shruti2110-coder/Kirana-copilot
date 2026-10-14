import type { MetadataRoute } from "next";

/** Lets phones install Hisaab Kitaab to the home screen and open it full-screen, like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Hisaab Kitaab",
    short_name: "Hisaab",
    description: "Voice-first udhaar khata for kirana stores, in Hindi and English.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbfbfa",
    theme_color: "#161615",
    lang: "en-IN",
    categories: ["finance", "business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Long-press the home-screen icon (Android) to jump straight in.
    shortcuts: [
      { name: "New entry", short_name: "New entry", url: "/add", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Scan bill", short_name: "Scan bill", url: "/add#scan", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Khata", short_name: "Khata", url: "/khata", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
