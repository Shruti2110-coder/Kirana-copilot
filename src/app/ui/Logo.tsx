/**
 * Hisaab Kitaab mark: an open ledger (kitaab) with ledger lines, a ₹ and a red bookmark.
 * Drawn in the theme's ink and paper colours so it flips with light/dark mode.
 * Same artwork as app/icon.svg; keep the two in sync.
 */
export default function LogoMark({ size = 32, title }: { size?: number; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <rect width="64" height="64" rx="14" fill="var(--ink)" />
      <path d="M10 19.5c7.5-2.6 15-2 22 2.5v26c-7-4-14.5-4.6-22-2.5z" fill="var(--bg)" fillOpacity=".86" />
      <path d="M54 19.5c-7.5-2.6-15-2-22 2.5v26c7-4 14.5-4.6 22-2.5z" fill="var(--bg)" />
      <path
        d="M15 27.5c3.6-.9 7.2-.6 11 .9M15 32.5c3.6-.9 7.2-.6 11 .9M15 37.5c3.6-.9 7.2-.6 11 .9"
        stroke="var(--ink)"
        strokeOpacity=".4"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M36.5 27h8M36.5 30.8h8M37.4 27h2.3a3.8 3.8 0 0 1 0 7.6h-2.3l6.4 7"
        stroke="var(--ink)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M48.6 18.7v8.3l1.9-1.5 1.9 1.5v-8.9c-1.3-.1-2.5 0-3.8.6z" fill="var(--red)" />
    </svg>
  );
}
