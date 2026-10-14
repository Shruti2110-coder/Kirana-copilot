/**
 * Link that opens WhatsApp with a prefilled message. Safe to use in the browser.
 *
 * Uses api.whatsapp.com/send rather than wa.me: wa.me redirects to api.whatsapp.com and
 * re-encodes the text on the way, which turns emoji such as 🙏 into "�".
 */
export function whatsappLink(phone: string | null | undefined, message: string) {
  const digits = (phone || "").replace(/\D/g, "");
  const intl = digits.length === 10 ? `91${digits}` : digits;
  const params = new URLSearchParams();
  if (intl) params.set("phone", intl);
  params.set("text", message);
  // URLSearchParams writes spaces as "+", which WhatsApp shows literally; use %20 instead.
  return `https://api.whatsapp.com/send?${params.toString().replace(/\+/g, "%20")}`;
}
