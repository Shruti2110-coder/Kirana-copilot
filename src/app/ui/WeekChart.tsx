import type { DayPoint } from "@/lib/views";
import { inr } from "./format";
import { dateTag, dict, type Locale } from "../i18n";

/** Simple paired bar chart: udhaar given vs money collected, per day. */
export default function WeekChart({ points, locale }: { points: DayPoint[]; locale: Locale }) {
  const t = dict(locale);
  const max = Math.max(1, ...points.flatMap((p) => [p.given, p.collected]));
  const pct = (v: number) => `${Math.round((v / max) * 100)}%`;
  return (
    <div className="bars" role="img" aria-label={t.chartAria}>
      {points.map((p, i) => (
        <div key={p.date} className={`bar-col${i === points.length - 1 ? " is-today" : ""}`}>
          <div className="bar-pair">
            <div className="bar given" style={{ height: pct(p.given) }} title={`${t.udhaarGiven} ${inr(p.given)}`} />
            <div className="bar collected" style={{ height: pct(p.collected) }} title={`${t.collected} ${inr(p.collected)}`} />
          </div>
          <span className="bar-label">
            {i === points.length - 1 ? t.todayShort : new Date(p.date).toLocaleDateString(dateTag(locale), { weekday: "short" })}
          </span>
        </div>
      ))}
    </div>
  );
}
