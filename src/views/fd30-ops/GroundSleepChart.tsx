import { useLocale } from '../../i18n/I18nProvider';
import { GROUND_SLEEP_TEXT } from './groundSleepText';
import type { GroundSleepTrend } from './groundSleep';
import './groundSleep.css';

const hhmm = (iso: string) => iso.slice(11, 16);
/** Compact bars for the projected series only. A night that has not arrived is an empty slot, never a zero; no thresholds or severity colors. */
export function GroundSleepChart({ trend, compact = false }: { trend: GroundSleepTrend; compact?: boolean }) {
  const t = GROUND_SLEEP_TEXT[useLocale()];
  const hm = (minutes: number) => t.hm(Math.floor(minutes / 60), Math.round(minutes % 60));
  const slots = Array.from({ length: trend.expected }, (_, i) => trend.firstFd + i);
  const max = 600, width = 560, height = 150, left = 8, step = (width - left * 2) / slots.length, bar = 34;
  const sample = trend.points[0]?.provenance;
  return <section className="gss" aria-labelledby="gss-h" data-ground-sleep={trend.person.id} data-sleep-points={trend.points.length}>
    <h3 id="gss-h">{t.title}</h3>
    <p className="gss-scope"><strong>{t.series}</strong>{!compact && <> · {t.scope}</>}</p>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t.chartLabel(trend.person.name, trend.firstFd, trend.lastFd)}>
      {slots.map((fd, i) => {
        const point = trend.points.find(p => p.fd === fd), x = left + step * i + (step - bar) / 2;
        const h = point ? point.durationMinutes / max * 96 : 0;
        return <g key={fd} data-fd={fd}><title>{`FD${fd} · ${point ? hm(point.durationMinutes) : t.notReceived}`}</title>
          {point ? <><rect className="gss-bar" x={x} y={104 - h} width={bar} height={h} /><text className="gss-value" x={x + bar / 2} y={98 - h} textAnchor="middle">{hm(point.durationMinutes)}</text></>
            : <rect className="gss-empty" x={x} y={104 - 4} width={bar} height={4} />}
          <text className="gss-fd" x={x + bar / 2} y={126} textAnchor="middle">FD{fd}</text>
        </g>;
      })}
    </svg>
    <p className="gss-coverage">{t.coverage(trend.points.length, trend.expected)}</p>
    <details className="gss-records" open={!compact}><summary>{t.records}</summary><div className="gss-table"><table>
      <thead><tr><th scope="col">{t.day}</th><th scope="col">{t.duration}</th><th scope="col">{t.occurred}</th><th scope="col">{t.received}</th><th scope="col">{t.record}</th></tr></thead>
      <tbody>{trend.points.map(p => <tr key={p.id}><th scope="row">FD{p.fd}</th><td>{hm(p.durationMinutes)}</td><td>{hhmm(p.occurredAt)}</td><td>{hhmm(p.receivedAt)}</td><td><code>{p.id}</code></td></tr>)}</tbody>
    </table></div></details>
    {sample && <p className="gss-source">{t.provenance(sample.adapter, sample.version)}</p>}
  </section>;
}
