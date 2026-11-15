import { useRef, useState } from 'react';
import type { CrewId, PreviewState } from '../../../demo/fd30';
import { CREW } from '../../../demo/fd30';
import { FLIGHT_DAY_ONE, fdDate, fdLabel, sleepDuration, sleepHistory, sleepSegments } from '../../../demo/history/sleep';
import type { SleepRange } from '../../../demo/history/sleep';
import { planFor } from '../../../demo/fd30Plan';
import { useLocale } from '../../../i18n/I18nProvider';
import { SLEEP_TEXT } from './sleepText';
import './sleep.css';
import { SleepScore } from './SleepScore';

/** `targetFd`: optional night to open selected (voice guided playback). View-only: it never moves the clock or writes a record. */
export function SleepDetail({ state, owner, time, targetFd = null }: { state: PreviewState; owner: CrewId; time: number; targetFd?: number | null }) {
  const locale = useLocale(), t = SLEEP_TEXT[locale];
  // View-only preferences by profile. No clock/reducer/record copies or writes.
  const [views, setViews] = useState<Partial<Record<CrewId, { range: SleepRange; fd: number | null }>>>(() => {
    if (!targetFd) return {};
    const currentFd = Math.floor((time - FLIGHT_DAY_ONE) / 86_400_000) + 1;
    return { [owner]: { range: targetFd >= currentFd - 6 ? 'last7' : 'all', fd: targetFd } };
  });
  const detail = useRef<HTMLElement>(null);
  const preference = views[owner] ?? { range: 'last7' as const, fd: null };
  const view = sleepHistory(state, { perspective: 'onboard', owner }, time, preference.range);
  if (!view) return null;
  const setRange = (range: SleepRange) => setViews(v => ({ ...v, [owner]: { range, fd: null } }));
  const selected = view.days.find(d => d.fd === preference.fd) ?? view.days.find(d => d.fd === view.latest?.fd) ?? view.days.at(-1)!;
  const select = (fd: number) => {
    setViews(v => ({ ...v, [owner]: { ...preference, fd } }));
    requestAnimationFrame(() => detail.current?.focus());
  };
  const status = (day: typeof selected) => day.status === 'recorded' ? t.recorded : day.status === 'no_record' ? t.noRecord : t.notReceived;
  const planned = planFor(owner).find(b => b.kind === 'sleep' && b.end.slice(0, 10) === fdDate(selected.fd));
  const date = (fd: number) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${fdDate(fd)}T12:00:00Z`));
  const instant = (iso: string) => `${iso.slice(0, 10)} · ${iso.slice(11, 16)} UTC`;
  const x = (fd: number) => 56 + (fd - view.firstFd + .5) * 620 / view.days.length;
  const y = (minutes: number) => 242 - minutes / 600 * 204;
  return <article className="sleep-history" data-sleep-owner={owner} data-sleep-range={preference.range}>
    <header className="fd-page-intro"><p className="fd-eyebrow">{CREW.find(c => c.id === owner)!.name}</p><h1 id="fd-view-h" tabIndex={-1}>{t.title}</h1><p>{t.intro}</p><p className="sleep-demo">{t.demo}</p><a href="#/onboard/personal/evidence">{t.origin}</a></header>
    <div className="sleep-range" role="group" aria-label={t.range}>
      <button type="button" aria-pressed={preference.range === 'last7'} onClick={() => setRange('last7')}>{t.last7}</button>
      <button type="button" aria-pressed={preference.range === 'all'} onClick={() => setRange('all')}>{t.all}</button>
    </div>
    <section className="sleep-trend" aria-labelledby="sleep-trend-h">
      <h2 id="sleep-trend-h">{t.trend}</h2><p data-sleep-count>{t.coverage(view.records.length, view.days.length)}</p>
      <div className="sleep-chart-scroll" tabIndex={0} role="region" aria-label={t.trend}>
        <svg viewBox="0 0 720 292" role="img" aria-labelledby="sleep-trend-h sleep-gap" style={{ minWidth: preference.range === 'all' ? 900 : 560 }}>
          <text x="10" y="21">{t.axis}</text>
          {[0, 2, 4, 6, 8, 10].map(h => <g key={h}><line className="sleep-grid" x1="50" x2="680" y1={y(h * 60)} y2={y(h * 60)} /><text x="20" y={y(h * 60) + 5}>{h}</text></g>)}
          {view.medianMinutes !== null && <line className="sleep-median" data-sleep-median={view.medianMinutes} x1="50" x2="680" y1={y(view.medianMinutes)} y2={y(view.medianMinutes)} />}
          {sleepSegments(view.days).filter(segment => segment.length > 1).map(segment => <polyline key={segment[0].id} className="sleep-line" data-sleep-segment={segment.map(r => r.fd).join(',')} points={segment.map(r => `${x(r.fd)},${y(r.durationMinutes)}`).join(' ')} />)}
          {view.days.map(day => <g key={day.fd}>
            {day.record ? <g data-sleep-point={day.fd}>
              {preference.range === 'last7' && <rect className="sleep-bar" x={x(day.fd) - 12} y={y(day.record.durationMinutes)} width="24" height={242 - y(day.record.durationMinutes)} />}
              <circle cx={x(day.fd)} cy={y(day.record.durationMinutes)} r="4"><title>{`${fdLabel(day.fd)} · ${sleepDuration(day.record.durationMinutes)} ${t.units}`}</title></circle>
            </g> : <text data-sleep-gap={day.fd} x={x(day.fd)} y="257" textAnchor="middle">{'—'}</text>}
            {(view.days.length <= 7 || day.fd === 1 || day.fd % 5 === 0) && <text x={x(day.fd)} y="274" textAnchor="middle">{fdLabel(day.fd)}</text>}
          </g>)}
        </svg>
      </div>
      <p id="sleep-gap">{t.gap}</p>
      <p className="sleep-median-key">{t.median}: {view.medianMinutes === null ? t.noRecord : `${sleepDuration(view.medianMinutes)} ${t.units}`} · {t.calculated}</p>
    </section>
    <div className="sleep-nights" role="group" aria-label={t.nights}>
      {view.days.map(day => <button type="button" key={day.fd} data-sleep-day={day.fd} data-status={day.status} aria-pressed={selected.fd === day.fd}
        aria-controls="sleep-night-detail" aria-label={`${fdLabel(day.fd)} · ${date(day.fd)} · ${day.record ? `${sleepDuration(day.record.durationMinutes)} ${t.units}` : status(day)}`} onClick={() => select(day.fd)}>
        <strong>{fdLabel(day.fd)}</strong><span>{date(day.fd)}</span><span>{day.record ? `${sleepDuration(day.record.durationMinutes)} ${t.units}` : status(day)}</span>
      </button>)}
    </div>
    <section ref={detail} tabIndex={-1} id="sleep-night-detail" className="sleep-detail" aria-labelledby="sleep-detail-h" data-sleep-selected={selected.fd}>
      <p className="fd-eyebrow">{t.detail}</p><h2 id="sleep-detail-h">{fdLabel(selected.fd)} · {fdDate(selected.fd)}</h2>
      <p>{t.recorded}</p><strong className="sleep-duration" data-sleep-duration>{selected.record ? `${sleepDuration(selected.record.durationMinutes)} ${t.units}` : status(selected)}</strong>
      {selected.record && <dl><dt>{t.ended}</dt><dd>{instant(selected.record.occurredAt)}</dd><dt>{t.received}</dt><dd>{instant(selected.record.receivedAt)}</dd></dl>}
      <SleepScore state={state} owner={owner} time={time} fd={selected.fd} />
      <div className="sleep-plan"><h3>{t.planned}</h3>{planned ? <p>{instant(planned.start)} → {instant(planned.end)}</p> : <p>{t.noPlan}</p>}<p>{t.planLimit}</p></div>
    </section>
    <details className="sleep-table"><summary>{t.table}</summary><div><table><thead><tr><th>{t.night}</th><th>{t.date}</th><th>{t.recorded} ({t.units})</th><th>{t.status}</th></tr></thead>
      <tbody>{view.days.map(day => <tr key={day.fd}><th scope="row">{fdLabel(day.fd)}</th><td>{fdDate(day.fd)}</td><td>{day.record ? sleepDuration(day.record.durationMinutes) : '—'}</td><td>{status(day)}</td></tr>)}</tbody>
    </table></div></details>
  </article>;
}
