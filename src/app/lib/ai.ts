/**
 * AI layer. Uses Google Gemini when GEMINI_API_KEY is set (text + voice).
 * Without a key, falls back to a rule-based Hinglish parser so the app
 * still works offline for text input.
 */
import { z } from "zod";

export const ParsedEntry = z.object({
  customer: z.string().min(1),
  amount: z.number().positive(),
  type: z.enum(["credit", "payment"]),
  items: z.string().nullable(),
  phone: z.string().nullable(),
  transcript: z.string(),
  language: z.string().nullable(),
});
export type ParsedEntry = z.infer<typeof ParsedEntry>;

const MODEL = () => process.env.GEMINI_MODEL || "gemini-2.5-flash";
export const aiEnabled = () => Boolean(process.env.GEMINI_API_KEY);

type Part = { text: string } | { inline_data: { mime_type: string; data: string } };

async function gemini(parts: Part[], schema?: object): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL()}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY!,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: schema
          ? { responseMimeType: "application/json", responseSchema: schema, temperature: 0 }
          : { temperature: 0.7 },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("");
  if (!text) throw new Error("Gemini returned no text");
  return text;
}

const ENTRY_PROMPT = `You are the bookkeeper for a small Indian kirana (grocery) shop.
The shop owner gives you ONE ledger entry, in Hindi, English or Hinglish (text or a voice note).
Extract it as JSON:
- customer: the customer's name as spoken, capitalised (e.g. "Ramesh", "Sunita Aunty").
- amount: the rupee amount as a number.
- type: "credit" if the customer TOOK goods without paying (udhaar, baaki, khate mein, credit, liya),
        "payment" if the customer PAID money back (diye, de gaya, jama, paid, chukaya, wapas).
- items: what was bought, short, or null.
- phone: a 10-digit phone number if mentioned, else null.
- transcript: the exact words of the entry (transcribe the audio if it is a voice note).
- language: "hi", "en" or "hinglish".
If several amounts are mentioned for one customer, add them up.`;

const ENTRY_SCHEMA = {
  type: "OBJECT",
  properties: {
    customer: { type: "STRING" },
    amount: { type: "NUMBER" },
    type: { type: "STRING", enum: ["credit", "payment"] },
    items: { type: "STRING", nullable: true },
    phone: { type: "STRING", nullable: true },
    transcript: { type: "STRING" },
    language: { type: "STRING", nullable: true },
  },
  required: ["customer", "amount", "type", "transcript"],
};

/** Parse a typed or spoken ledger entry into structured data. */
export async function parseEntry(input: {
  text?: string;
  audio?: { base64: string; mimeType: string };
}): Promise<ParsedEntry & { source: "ai" | "rules" }> {
  if (aiEnabled()) {
    const parts: Part[] = [{ text: ENTRY_PROMPT }];
    if (input.audio) parts.push({ inline_data: { mime_type: input.audio.mimeType, data: input.audio.base64 } });
    if (input.text) parts.push({ text: `Entry: ${input.text}` });
    const raw = JSON.parse(await gemini(parts, ENTRY_SCHEMA));
    return { ...ParsedEntry.parse({ items: null, phone: null, language: null, ...raw }), source: "ai" };
  }
  if (!input.text) throw new Error("Voice notes need GEMINI_API_KEY. Type the entry instead.");
  return { ...parseEntryRules(input.text), source: "rules" };
}

const PAYMENT_WORDS =
  /\b(diye|diya|de\s?gaya|de\s?gayi|de\s?diya|de\s?diye|jama|chukaya|chuka\s?diya|wapas|lautaye|paid|pay\s?kiya|returned|gave\s+back|cleared)\b/i;
const STOP_WORDS = new Set(
  "ne ka ki ke ko se ji bhai bhaiya aunty uncle didi rs rupees rupaye rupay inr udhaar udhar credit paid ne liya diye took gave the a an of for on".split(" "),
);

/** Rule-based fallback parser for common Hinglish/English phrasings. */
export function parseEntryRules(text: string): ParsedEntry {
  const clean = text.replace(/[₹,]/g, " ").replace(/\s+/g, " ").trim();
  const phone = clean.match(/\b[6-9]\d{9}\b/)?.[0] ?? null;
  const withoutPhone = phone ? clean.replace(phone, " ") : clean;

  const amounts = [...withoutPhone.matchAll(/(\d+(?:\.\d+)?)\s*(k|hazaar|hazar|thousand)?\b/gi)].map(
    (m) => parseFloat(m[1]) * (m[2] ? 1000 : 1),
  );
  if (!amounts.length) throw new Error("Couldn't find an amount. Try: \"Ramesh ne 500 ka saman liya\"");
  const amount = amounts.reduce((a, b) => a + b, 0);

  // Name: words before "ne"/"took"/"paid"/first number; else first capitalised word.
  const head = withoutPhone.split(/\s+(?:ne|took|paid|gave|ko|has|ka|ki|ke)\s+|\s+\d/i)[0];
  let words = head.split(" ").filter((w) => w && !STOP_WORDS.has(w.toLowerCase()) && !/\d/.test(w));
  if (!words.length) words = withoutPhone.split(" ").filter((w) => /^[A-Z][a-z]+/.test(w)).slice(0, 1);
  if (!words.length) throw new Error("Couldn't find the customer's name.");
  const customer = words
    .slice(0, 3)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");

  const itemsMatch = withoutPhone.match(/\d+\s*(?:rs|rupees|rupaye|rupay)?\s*(?:ka|ki|ke|of|worth of)\s+([a-z ]+?)(?:\s+(?:liya|li|liye|le\s?gaya|took|on|udhaar|udhar)|$)/i);
  const items = itemsMatch?.[1]?.trim() || null;

  return {
    customer,
    amount,
    type: PAYMENT_WORDS.test(withoutPhone) ? "payment" : "credit",
    items,
    phone,
    transcript: text,
    language: /\b(ne|liya|diye|ka|ki)\b/i.test(text) ? "hinglish" : "en",
  };
}

const LEVEL_TONE = {
  1: "very warm and friendly, like a neighbour reminding casually",
  2: "polite but clear that the payment is now overdue",
  3: "respectful but firm, a final reminder before stopping further udhaar",
} as const;

/** Write a WhatsApp reminder in Hinglish for an unpaid balance. */
export async function writeReminder(opts: {
  customer: string;
  amountInr: number;
  daysOverdue: number;
  level: 1 | 2 | 3;
  payLink?: string | null;
  shopName: string;
}): Promise<string> {
  const linkLine = opts.payLink ? `\nPay here: ${opts.payLink}` : "";
  if (aiEnabled()) {
    const msg = await gemini([
      {
        text: `Write a short WhatsApp message (max 3 sentences, Hinglish in Roman script, 1 emoji max) from "${opts.shopName}"
to customer ${opts.customer} about ₹${opts.amountInr} pending udhaar for ${opts.daysOverdue} days.
Tone: ${LEVEL_TONE[opts.level]}. Never be rude or threatening. Do not include any link; it will be added after.`,
      },
    ]);
    return msg.trim() + linkLine;
  }
  const templates = {
    1: `Namaste ${opts.customer} ji 🙏 ${opts.shopName} se yaad dila rahe hain, ₹${opts.amountInr} ka hisaab baaki hai. Jab time mile, de dijiye.`,
    2: `Namaste ${opts.customer} ji, ₹${opts.amountInr} ka udhaar ${opts.daysOverdue} din se pending hai. Kripya jaldi clear kar dijiye. - ${opts.shopName}`,
    3: `${opts.customer} ji, ₹${opts.amountInr} ka payment ab tak nahi aaya hai. Aage udhaar dene se pehle ise clear karna zaroori hai. Dhanyavaad. - ${opts.shopName}`,
  };
  return templates[opts.level] + linkLine;
}

/** Answer the owner's question about the shop using the ledger data. */
export async function askShop(question: string, ledger: object): Promise<string> {
  if (!aiEnabled()) {
    return "Set GEMINI_API_KEY to ask questions in plain language. Meanwhile, the dashboard above shows who owes what.";
  }
  const answer = await gemini([
    {
      text: `You help a kirana shop owner understand their udhaar (credit) ledger. Answer in the same language
the question is asked in (Hindi/Hinglish/English), in 1-3 short sentences, with exact rupee figures from the data.
Only use the data given. Today is ${new Date().toDateString()}.

LEDGER JSON:
${JSON.stringify(ledger)}

QUESTION: ${question}`,
    },
  ]);
  return answer.trim();
}