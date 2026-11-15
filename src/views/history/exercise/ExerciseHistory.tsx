import { useEffect, useRef, useState } from 'react';
import type { CrewId, PreviewState } from '../../../demo/fd30';
import { comparableReason, exerciseHistory } from '../../../demo/history/exercise';
import type { ExerciseRange, ExerciseRecord } from '../../../demo/history/exercise';
import { FLIGHT_DAY_ONE, fdDate, fdLabel } from '../../../demo/history/sleep';
import { EQUIPMENT } from '../../../demo/fd30Plan';
import { useLocale } from '../../../i18n/I18nProvider';
import { EXERCISE_TEXT } from './exerciseText';
import './exercise.css';

/** `target`: optional exact day/section to open (voice guided playback). View-only: never moves the clock or writes a record. */
export interface ExerciseTarget { fd: number; focus: 'session' | 'comparison' }
export function ExerciseHistory({ state, owner, time, highlight = false, target = null }: { state: PreviewState; owner: CrewId; time: number; highlight?: boolean; target?: ExerciseTarget | null }) {
  const locale = useLocale(), t = EXERCISE_TEXT[locale], detail = useRef<HTMLElement>(null);
  const [views, setViews] = useState<Partial<Record<CrewId, { range: ExerciseRange; fd: number | null }>>>(() => {
    if (!target) return {};
    const currentFd = Math.floor((time - FLIGHT_DAY_ONE) / 86_400_000) + 1;
    return { [owner]: { range: target.fd >= currentFd - 6 ? 'last7' : 'all', fd: target.fd } };
  });
  const preference = views[owner] ?? { range: 'last7' as const, fd: null };
  const view = exerciseHistory(state, { perspective: 'onboard', owner }, time, preference.range);
  const completed = view?.records.some(r => r.fd === 30) ?? false;
  const highlightedId = state.profiles[owner].highlightedSessionId;
  const seenCount = state.profiles[owner].exerciseSeenIds.length;
  useEffect(() => {
    if (!highlight || !completed || highlightedId !== 'iss:session-lf-1') return;
    setViews(v => ({ ...v, [owner]: { range: v[owner]?.range ?? 'last7', fd: 30 } }));
    requestAnimationFrame(() => { detail.current?.focus(); detail.current?.scrollIntoView({ block: 'center' }); });
  }, [highlight, completed, highlightedId, owner, seenCount]);
  useEffect(() => {
    if (!target) return;
    requestAnimationFrame(() => {
      const heading = target.focus === 'comparison' ? document.getElementById('exercise-comparison-h') : detail.current;
      heading?.focus(); heading?.scrollIntoView({ block: 'center' });
    });
  }, [target?.fd, target?.focus]);
  if (!view) return null;
  const selected = view.days.find(d => d.fd === preference.fd) ?? view.days.find(d => d.fd === view.latest?.fd) ?? view.days.at(-1)!;
  const number = (v: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(v);
  const metric = (r: ExerciseRecord, v: number | null) => r.equipmentId === 'demo-treadmill' ? t.notApplicable : v === null ? t.noRecord : number(v);
  const status = (day: typeof selected) => day.status === 'recorded' ? t.recorded : day.status === 'no_activity' ? t.noActivity
    : day.status === 'pending' ? t.pending : day.status === 'live' ? t.live : t.noRecord;
  const setRange = (range: ExerciseRange) => setViews(v => ({ ...v, [owner]: { range, fd: null } }));
  const select = (fd: number) => {
    setViews(v => ({ ...v, [owner]: { ...preference, fd } }));
    requestAnimationFrame(() => detail.current?.focus());
  };
  const powerRows = view.comparisons.flatMap(c => c.rows).filter(r => view.records.some(v => v.id === r.id));
  const maximum = Math.max(50, ...powerRows.map(r => r.powerW!)) * 1.1;
  const x = (fd: number) => 55 + (fd - view.firstFd + .5) * 620 / view.days.length;
  const y = (w: number) => 210 - w / maximum * 175;
  return <section className="exercise-history" data-exercise-owner={owner} data-exercise-range={preference.range}>
    <header><h2>{t.title}</h2><p className="exercise-demo">{t.demo}</p><p>{t.intro}</p><a href="#/onboard/personal/evidence">{t.origin}</a></header>
    <div className="exercise-range" role="group" aria-label={t.range}><button type="button" aria-pressed={preference.range === 'last7'} onClick={() => setRange('last7')}>{t.last7}</button><button type="button" aria-pressed={preference.range === 'all'} onClick={() => setRange('all')}>{t.all}</button></div>
    <section className="exercise-trend" aria-labelledby="exercise-trend-h"><h3 id="exercise-trend-h">{t.trend}</h3><p data-exercise-count>{t.count(view.records.length, view.days.length)}</p><p id="exercise-trend-hint">{t.trendHint}</p>
      <div className="exercise-chart-scroll" role="region" tabIndex={0} aria-label={t.trend}>
        <svg viewBox="0 0 720 255" role="img" aria-labelledby="exercise-trend-h exercise-trend-hint" style={{ minWidth: preference.range === 'all' ? 900 : 540 }}>
          {[0, .5, 1].map(f => <g key={f}><line className="exercise-grid" x1="50" x2="685" y1={y(maximum * f)} y2={y(maximum * f)} /><text x="4" y={y(maximum * f) + 4}>{number(maximum * f)}</text></g>)}
          {powerRows.map(r => <g key={r.id} data-exercise-point={r.id}><circle className={r.protocolId === 'demo-live-60.1' ? 'exercise-point-live' : 'exercise-point'} cx={x(r.fd)} cy={y(r.powerW!)} r="5"><title>{`${fdLabel(r.fd)} · ${number(r.powerW!)} W · ${r.protocolId}`}</title></circle></g>)}
          {view.days.filter(d => view.days.length <= 7 || d.fd === 1 || d.fd % 5 === 0).map(d => <text key={d.fd} x={x(d.fd)} y="239" textAnchor="middle">{fdLabel(d.fd)}</text>)}
        </svg>
      </div>
    </section>
    <section className="exercise-comparison" aria-labelledby="exercise-comparison-h"><h3 id="exercise-comparison-h" tabIndex={-1}>{t.comparison}</h3><p>{t.calculation}</p>
      {!view.comparisons.length && <p>{t.insufficient}</p>}
      {view.comparisons.map(c => <div key={c.protocolId} data-exercise-comparison={c.protocolId}>
        <h4>{c.protocolId} · {t.through(fdLabel(c.rows.at(-1)!.fd))}</h4>
        {c.referenceW === null ? <p>{t.insufficient}</p> : <><p>{t.medians(number(c.recentW!), number(c.referenceW), c.baseline.length)}</p><strong data-exercise-difference={c.differenceW}>{t.difference(number(c.differenceW!), number(c.differencePercent!))}</strong></>}
        <details><summary>{t.cohort}</summary><p>{`${c.baseline.length} / ${c.recent.length}`}</p>{[c.baseline, c.recent].map((group, index) => <ul key={index}>{group.map(r => <li key={r.id}>{fdLabel(r.fd)} · {fdDate(r.fd)} · {number(r.powerW!)} W · {r.id}</li>)}</ul>)}</details>
      </div>)}
    </section>
    <div className="exercise-days" role="group" aria-label={t.sessions}>{view.days.map(day => <button type="button" key={day.fd} data-exercise-day={day.fd} data-status={day.status} aria-pressed={selected.fd === day.fd} aria-controls="exercise-day-detail" onClick={() => select(day.fd)}><strong>{fdLabel(day.fd)}</strong><span>{status(day)}</span><span>{day.sessions.length ? day.sessions.map(r => `${number(r.durationMinutes)} min`).join(' · ') : '—'}</span></button>)}</div>
    <section ref={detail} tabIndex={-1} id="exercise-day-detail" className="exercise-day-detail" data-exercise-selected={selected.fd}>
      <h3 id={selected.fd === 30 && selected.sessions.length ? 'fd-exercise-session-h' : undefined} tabIndex={-1}>{t.detail} · {fdLabel(selected.fd)} · {fdDate(selected.fd)}</h3>
      {selected.sessions.length ? selected.sessions.map(r => <article key={r.id} data-exercise-record={r.id}>
        <dl><dt>{t.type}</dt><dd>{t.aerobic}</dd><dt>{t.equipment}</dt><dd>{EQUIPMENT[r.equipmentId][locale]}</dd><dt>{t.duration}</dt><dd>{number(r.durationMinutes)}</dd><dt>{t.power}</dt><dd>{metric(r, r.powerW)}</dd><dt>{t.cadence}</dt><dd>{metric(r, r.cadenceRpm)}</dd></dl>
        <details><summary>{t.detail}</summary><dl><dt>{t.start}</dt><dd>{r.start}</dd><dt>{t.end}</dt><dd>{r.end}</dd><dt>{t.receipt}</dt><dd>{r.receivedAt}</dd><dt>{t.protocol}</dt><dd>{r.protocolId}</dd><dt>{t.coverage}</dt><dd>{r.powerMinutes}/{number(r.durationMinutes)}</dd><dt>{t.eligibility}</dt><dd>{comparableReason(r) ? t.reasons[comparableReason(r)!] : t.eligible}</dd><dt>{t.origin}</dt><dd>{r.id} · {r.source.version}</dd></dl></details>
      </article>) : <><strong>{status(selected)}</strong><p>{t.noSession}</p></>}
      {selected.reservation && <aside className="exercise-reservation"><p>{t.reservation}</p><p>{EQUIPMENT[selected.reservation.equipmentId!][locale]} · {selected.reservation.start} → {selected.reservation.end}</p></aside>}
    </section>
    <details className="exercise-table"><summary>{t.table}</summary><div><table><thead><tr><th>{t.day}</th><th>{t.type}</th><th>{t.equipment}</th><th>{t.duration}</th><th>{t.power}</th><th>{t.cadence}</th><th>{t.status}</th></tr></thead><tbody>
      {view.days.flatMap(day => day.sessions.length ? day.sessions.map(r => <tr key={r.id}><th scope="row">{fdLabel(r.fd)}</th><td>{t.aerobic}</td><td>{EQUIPMENT[r.equipmentId][locale]}</td><td>{number(r.durationMinutes)}</td><td>{metric(r, r.powerW)}</td><td>{metric(r, r.cadenceRpm)}</td><td>{status(day)}</td></tr>) : [<tr key={day.fd}><th scope="row">{fdLabel(day.fd)}</th><td colSpan={5}>{'—'}</td><td>{status(day)}</td></tr>])}
    </tbody></table></div></details>
  </section>;
}
