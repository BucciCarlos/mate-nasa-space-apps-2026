import { useId } from 'react';
import { useLocale, useT } from '../i18n/I18nProvider';
import { TELEMETRY_END, TELEMETRY_START } from './exerciseTelemetry';
import type { TelemetryPoint } from './exerciseTelemetry';
import type { CrewId } from './fd30';
import { TelemetryNote } from './TelemetryNote';
import { OWNER } from './fd30';

function paths(points: readonly TelemetryPoint[], key: 'workload_w' | 'cadence_rpm' | 'pulse_bpm', maximum: number) {
  const segments: string[] = [];
  let current = '';
  for (const point of points) {
    const value = point[key];
    if (value === null) { if (current) segments.push(current); current = ''; continue; }
    const x = 48 + (Date.parse(point.occurredAt) - TELEMETRY_START) / (TELEMETRY_END - TELEMETRY_START) * 552;
    const y = 124 - value / maximum * 100;
    current += `${current ? ' L' : 'M'}${x},${y}`;
  }
  if (current) segments.push(current);
  return segments;
}
export function ExerciseChart({ owner, time, points, asTable, onToggle }: { owner: CrewId; time: number; points: readonly TelemetryPoint[]; asTable: boolean; onToggle: () => void }) {
  const t = useT().fd30;
  const locale = useLocale();
  const id = useId();
  const usable = points.filter(p => p.workload_w !== null && p.cadence_rpm !== null && p.pulse_bpm !== null).length;
  const format = (value: number) => new Intl.NumberFormat(locale).format(value);
  const cursor = 48 + Math.max(0, Math.min(1, (time - TELEMETRY_START) / (TELEMETRY_END - TELEMETRY_START))) * 552;
  return <section className="fd-telemetry" aria-labelledby={`${id}-h`}>
    <h2 id={`${id}-h`}>{t.telemetryTitle}</h2>
    <p className="fd-telemetry-label">{t.telemetryHeading}<TelemetryNote /></p>
    {owner !== OWNER ? <p>{t.telemetryOther}</p> : <>
      <p data-telemetry-count={points.length}>{t.telemetryCount(points.length, usable)}</p>
      {!points.length && <p>{t.telemetryWaiting}</p>}
      <p>{t.telemetryGap}</p><p>{t.telemetryTime} · {new Date(TELEMETRY_START).toISOString().slice(11, 16)}–{new Date(TELEMETRY_END).toISOString().slice(11, 16)}</p>
      <button type="button" onClick={onToggle} aria-expanded={asTable} aria-controls={`${id}-data`}>{asTable ? t.telemetryGraph : t.telemetryTable}</button>
      <div id={`${id}-data`}>
        {asTable ? <div className="fd-telemetry-table"><table>
          <caption>{t.telemetryTitle}</caption>
          <thead><tr><th scope="col">{t.telemetryTime}</th><th scope="col">{t.sessionPulse} ({t.sessionPulseUnit})</th><th scope="col">{t.telemetryPower} {/* i18n-ignore — SI unit */}(W)</th><th scope="col">{t.telemetryCadence} {/* i18n-ignore — rotation unit */}(rpm)</th></tr></thead>
          <tbody>{points.map(p => <tr key={p.receivedAt}><th scope="row">{p.occurredAt.slice(11, 16)}</th>
            <td>{p.pulse_bpm === null ? t.telemetryMissing : format(p.pulse_bpm)}</td><td>{p.workload_w === null ? t.telemetryMissing : format(p.workload_w)}</td><td>{p.cadence_rpm === null ? t.telemetryMissing : format(p.cadence_rpm)}</td>
          </tr>)}</tbody>
        </table></div> : <div className="fd-telemetry-plots">{([
          { key: 'pulse_bpm', label: t.sessionPulse, unit: t.sessionPulseUnit, max: 160 },
          { key: 'workload_w', label: t.telemetryPower, unit: 'W', max: 160 },
          { key: 'cadence_rpm', label: t.telemetryCadence, unit: 'rpm', max: 100 },
        ] as const).map(series => <figure key={series.key}>
          <figcaption>{series.label} ({series.unit})</figcaption>
          <svg viewBox="0 0 640 156" role="img" aria-labelledby={`${id}-${series.key}`} data-series={series.key}>
            <title id={`${id}-${series.key}`}>{`${series.label} (${series.unit}) · ${t.telemetryCount(points.length, usable)}`}</title>
            {[0, series.max / 2, series.max].map(v => <g key={v}><line x1="48" x2="600" y1={124 - v / series.max * 100} y2={124 - v / series.max * 100} className="fd-plot-grid" /><text x="40" y={128 - v / series.max * 100} textAnchor="end">{format(v)}</text></g>)}
            {time >= TELEMETRY_START + 22 * 60_000 && <rect x={48 + 22 / 60 * 552} y="24" width={(Math.min(25, (time - TELEMETRY_START) / 60_000 + 1) - 22) / 60 * 552} height="100" className="fd-plot-gap" />}
            {paths(points, series.key, series.max).map((d, i) => <path key={i} d={d} fill="none" className="fd-plot-line" data-telemetry-path />)}
            {points.filter(p => p[series.key] !== null).map(p => <circle key={p.occurredAt} cx={48 + (Date.parse(p.occurredAt) - TELEMETRY_START) / 3600_000 * 552} cy={124 - p[series.key]! / series.max * 100} r="2" className="fd-plot-point" />)}
            <line x1={cursor} x2={cursor} y1="20" y2="126" className="fd-plot-cursor" />
            {[0, 15, 30, 45, 60].map(m => <text key={m} x={48 + m / 60 * 552} y="149" textAnchor="middle">{new Date(TELEMETRY_START + m * 60_000).toISOString().slice(11, 16)}</text>)}
          </svg>
        </figure>)}</div>}
      </div>
      <p>{t.telemetryLimit}</p><small>{t.telemetrySource}</small>
    </>}
  </section>;
}
