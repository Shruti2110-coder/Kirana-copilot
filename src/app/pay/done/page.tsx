import { Suspense } from "react";
import LogoMark from "../../ui/Logo";

const COPY: Record<string, { emoji: string; title: string; body: string }> = {
  paid: { emoji: "✅", title: "Payment received", body: "Dhanyavaad! Your shop has been notified. You can close this page." },
  pending: { emoji: "⏳", title: "Payment processing", body: "We'll update the shop as soon as PayPal confirms it." },
  cancelled: { emoji: "↩️", title: "Payment cancelled", body: "No money was taken. You can use the same link again any time." },
  invalid: { emoji: "⚠️", title: "Link not valid", body: "Please ask the shop to send a fresh payment link." },
};

async function Message({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "invalid" } = await searchParams;
  const c = COPY[status] ?? COPY.invalid;
  return (
    <>
      <div className="pay-icon" aria-hidden>{c.emoji}</div>
      <h1 className="h1" style={{ fontSize: "1.5rem", marginBottom: 8 }}>{c.title}</h1>
      <p className="text-[var(--muted)]">{c.body}</p>
    </>
  );
}

export default function PayDone(props: { searchParams: Promise<{ status?: string }> }) {
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="card w-full max-w-sm text-center">
        <Suspense fallback={null}>
          <Message searchParams={props.searchParams} />
        </Suspense>
        <p className="muted small" style={{ marginTop: 24, marginBottom: 0, display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
          <LogoMark size={20} /> Secured by PayPal · Hisaab Kitaab
        </p>
      </div>
    </main>
  );
}
