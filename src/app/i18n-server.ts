import { cookies } from "next/headers";
import { isLocale, type Locale } from "./i18n";

/** The shopkeeper's chosen language, from the "lang" cookie. Call inside a <Suspense> boundary. */
export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get("lang")?.value;
  return isLocale(v) ? v : "en";
}
