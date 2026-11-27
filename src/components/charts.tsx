"use client";

/**
 * Dashboard charts (dataviz method): validated categorical palette in fixed order (never cycled),
 * thin marks with 2px surface gaps, hover tooltips, legends with values, and a screen-reader table.
 * Single-measure bar charts use one hue; colour never carries meaning alone.
 */
import Link from "next/link";
import { useState } from "react";

const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"]; // validated light palette, slots 1–6

export function DonutChart({ data, centerLabel, emptyText = "No data in your scope." }: { data: Array<{ label: string; value: number }>; centerLabel: string; emptyText?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const total = data.reduce((n, d) => n + d.value, 0);
  if (!total) return <p className="py-8 text-center text-sm text-muted">{emptyText}</p>;
  const r = 70, c = 2 * Math.PI * r, gap = 2;
  // Each arc starts where the previous ones end (running total; nothing is reassigned after render).
  const lengths = data.map((d) => (d.value / total) * c);
  const arcs = data.map((d, i) => ({ i, d, dash: Math.max(lengths[i] - gap, 0.5), offset: lengths.slice(0, i).reduce((a, b) => a + b, 0) }));
  const pct = (v: number) => Math.round((v / total) * 100);
  return (
    <div className="@container"><div className="flex flex-col items-center gap-4 @[440px]:flex-row">
      <div className="relative h-[180px] w-[180px] shrink-0">
        <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90" role="img" aria-label={`${centerLabel}: ${total}`}>
          <circle cx="90" cy="90" r={r} fill="none" stroke="#eef1f5" strokeWidth="22" />
          {arcs.map((a) => (
            <circle
              key={a.i}
              cx="90" cy="90" r={r} fill="none"
              stroke={SERIES[a.i % SERIES.length]}
              strokeWidth={hover === a.i ? 26 : 22}
              strokeDasharray={`${a.dash} ${c - a.dash}`}
              strokeDashoffset={-a.offset}
              onMouseEnter={() => setHover(a.i)}
              onMouseLeave={() => setHover(null)}
              className="cursor-pointer transition-[stroke-width]"
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {hover === null ? (
            <>
              <span className="text-[26px] font-extrabold leading-none text-ink tabular-nums">{total.toLocaleString()}</span>
              <span className="mt-1 max-w-[110px] text-[11px] font-semibold leading-tight text-ink-2">{centerLabel}</span>
            </>
          ) : (
            <>
              <span className="text-[22px] font-extrabold leading-none text-ink tabular-nums">{data[hover].value}</span>
              <span className="mt-1 max-w-[120px] text-[11px] leading-tight text-ink-2">{data[hover].label} · {pct(data[hover].value)}%</span>
            </>
          )}
        </div>
      </div>
      <ul className="w-full space-y-1.5 text-[13px]" aria-label="Legend">
        {data.map((d, i) => (
          <li key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className={`flex items-center gap-2 rounded px-1 ${hover === i ? "bg-slate-50" : ""}`}>
            <span className="h-3 w-3 shrink-0 rounded-[3px]" style={{ background: SERIES[i % SERIES.length] }} aria-hidden />
            <span className="min-w-0 flex-1 text-ink">{d.label}</span>
            <span className="font-semibold tabular-nums text-ink">{d.value}</span>
            <span className="w-10 text-right tabular-nums text-ink-2">{pct(d.value)}%</span>
          </li>
        ))}
      </ul>
      <div className="sr-only"><table>
        <caption>{centerLabel}</caption>
        <tbody>{data.map((d) => <tr key={d.label}><th scope="row">{d.label}</th><td>{d.value}</td><td>{pct(d.value)}%</td></tr>)}</tbody>
      </table></div>
    </div></div>
  );
}

/** One measure (counts), one hue; value labels on top; each bar links to its register. */
export function BarChart({ data, caption }: { data: Array<{ label: string; value: number; href?: string }>; caption: string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!data.length) return <p className="py-8 text-center text-sm text-muted">No activity data within your permissions.</p>;
  const max = Math.max(1, ...data.map((d) => d.value));
  const nice = Math.max(4, Math.ceil(max / 4) * 4); // whole-number ticks at 0, half and full
  const ticks = [0, nice / 2, nice];
  return (
    <figure>
      <div className="relative flex h-[190px] gap-3 pl-8">
        {ticks.map((t) => (
          <div key={t} className="pointer-events-none absolute left-0 right-0 flex items-center" style={{ bottom: `${(t / nice) * 150 + 30}px` }}>
            <span className="w-7 pr-1 text-right text-[10px] tabular-nums text-muted">{t}</span>
            <span className="h-px flex-1 bg-line" />
          </div>
        ))}
        {data.map((d, i) => {
          const h = Math.max(2, (d.value / nice) * 150);
          const bar = (
            <div className="flex h-full flex-col items-center justify-end pb-[30px]" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <span className="mb-1 text-[12px] font-bold tabular-nums text-ink">{d.value}</span>
              <div className={`w-full max-w-[46px] rounded-t-[4px] transition-colors ${hover === i ? "bg-[#1f5fb0]" : "bg-[#2a78d6]"}`} style={{ height: `${h}px` }} />
              {hover === i && <span role="tooltip" className="absolute -top-1 z-10 rounded bg-ink px-2 py-1 text-[11px] font-semibold text-white shadow">{d.label}: {d.value} in 30 days</span>}
            </div>
          );
          return (
            <div key={d.label} className="relative z-[1] flex-1">
              {d.href ? <Link href={d.href} aria-label={`${d.label}: ${d.value}`} className="block h-full">{bar}</Link> : bar}
              <span className="absolute bottom-0 left-0 right-0 text-center text-[11px] leading-tight text-ink-2">{d.label}</span>
            </div>
          );
        })}
      </div>
      <figcaption className="sr-only">{caption}</figcaption>
      <div className="sr-only"><table>
        <caption>{caption}</caption>
        <tbody>{data.map((d) => <tr key={d.label}><th scope="row">{d.label}</th><td>{d.value}</td></tr>)}</tbody>
      </table></div>
    </figure>
  );
}
