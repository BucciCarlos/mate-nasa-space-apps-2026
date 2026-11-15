import { useState } from 'react';
import { useLocale } from '../../i18n/I18nProvider';
import { fmtClock, fmtDate, fmtNumber } from '../../i18n/format';
import type { EvidenceSource, TepcWindow } from './evidenceTypes';
import { EVIDENCE_TEXT, UGY_PER_MIN } from './evidenceText';
import type { EvidenceMessages } from './evidenceText';
import { load, tepcSummary, validateTepc } from './validate';
import { buildRadChart } from './radiationChart';
import { Ext, MeasurementCard, NoData, SourceList } from './parts';

const utcStamp = (ms: number) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ');

export function RadiationView({ raw, sources, initialRows = 100 }: { raw?: unknown; sources: EvidenceSource[]; initialRows?: number }) {
  const locale = useLocale();
  const t = EVIDENCE_TEXT[locale];
  const R = t.radiation;
  const result = load(raw, validateTepc);
  const mine = sources.filter(s => s.id === 'cdaweb-iss-tepc' || s.id === 'nasa-std-3001-v1');
  const card: [string, string][] = [
    [R.detector, R.detectorValue], [R.location, R.locationValue], [R.unit, R.unitValue],
    [R.coverage, R.coverageValue], [R.measures, R.measuresValue], [R.notRepresent, R.notRepresentValue],
  ];
  return (
    <section className="evd-panel" aria-labelledby="evd-rad-h" data-evidence="radiation" data-state={result.state}>
      <h3 id="evd-rad-h">{R.title}</h3>
      <MeasurementCard title={R.card} rows={card} />
      <p className="evd-standard">{R.standard}</p>
      {result.state !== 'ok'
        ? <NoData load={result} t={t} locale={locale} expected={[R.expectedFile]} sources={mine} label={R.noData} />
        : <RadiationBody data={result.data} t={t} locale={locale} sources={mine} initialRows={initialRows} />}
    </section>
  );
}

function RadiationBody({ data, t, locale, sources, initialRows }: { data: TepcWindow; t: EvidenceMessages; locale: 'en' | 'es'; sources: EvidenceSource[]; initialRows: number }) {
  const R = t.radiation;
  const [rows, setRows] = useState(initialRows);
  const s = tepcSummary(data);
  const c = buildRadChart(data);
  const start = Date.parse(data.window.start), end = Date.parse(data.window.end);
  const num = (v: number | null) => (v === null ? '—' : fmtNumber(v, locale, 3));
  return (
    <>
      <dl className="evd-stats">
        <div><dt>{R.window}</dt><dd>{utcStamp(start)} → {utcStamp(end)} {t.utc}</dd></div>
        <div><dt>{R.cadence}</dt><dd>{R.minutes(data.cadenceMin)}</dd></div>
        <div><dt>{R.rows}</dt><dd>{fmtNumber(s.rows, locale, 0)}</dd></div>
        <div><dt>{R.withValue}</dt><dd>{fmtNumber(s.withValue, locale, 0)}</dd></div>
        <div><dt>{R.expected}</dt><dd>{fmtNumber(s.expected, locale, 0)}</dd></div>
        <div><dt>{R.min}</dt><dd>{num(s.min)} {UGY_PER_MIN}</dd></div>
        <div><dt>{R.max}</dt><dd>{num(s.max)} {UGY_PER_MIN}</dd></div>
      </dl>
      <figure className="evd-figure">
        <svg className="evd-chart" viewBox={`0 0 ${c.w} ${c.h}`} role="img" aria-labelledby="evd-rad-chart-t evd-rad-chart-d" data-chart="radiation">
          <title id="evd-rad-chart-t">{R.chartTitle}</title>
          <desc id="evd-rad-chart-d">{R.chartDesc}</desc>
          {c.yTicks.map(k => (
            <g key={k.value}>
              <line className="evd-grid" x1={c.plot.l} x2={c.plot.r} y1={k.y} y2={k.y} />
              <text className="evd-axis" x={c.plot.l - 8} y={k.y + 4} textAnchor="end">{fmtNumber(k.value, locale, 2)}</text>
            </g>
          ))}
          <text className="evd-axis evd-unit" x={c.plot.l - 8} y={c.plot.t - 16} textAnchor="end">{UGY_PER_MIN}</text>
          {c.gaps.map((g, i) => <rect key={i} className="evd-gap" data-gap={g.kind} x={g.x0} y={c.plot.t} width={Math.max(2, g.x1 - g.x0)} height={c.plot.b - c.plot.t}><title>{`${R.gap}: ${g.kind === 'null' ? R.gapNull : R.gapMissing} · ${R.gapRow(utcStamp(g.startMs), utcStamp(g.endMs), g.minutes)}`}</title></rect>)}
          <line className="evd-axis-line" x1={c.plot.l} x2={c.plot.r} y1={c.plot.b} y2={c.plot.b} />
          {c.xTicks.map(k => (
            <g key={k.ms}>
              <line className="evd-grid" x1={k.x} x2={k.x} y1={c.plot.t} y2={c.plot.b} />
              <text className="evd-axis" x={k.x} y={c.plot.b + 16} textAnchor="middle">{fmtClock(k.ms)}</text>
              {k.midnight && <text className="evd-axis" x={k.x} y={c.plot.b + 32} textAnchor="middle">{fmtDate(k.ms, locale)}</text>}
            </g>
          ))}
          {c.runs.map((run, i) => run.points.length > 1
            ? <polyline key={i} className="evd-line" fill="none" points={run.points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} />
            : <circle key={i} className="evd-dot" cx={run.points[0].x} cy={run.points[0].y} r="2" />)}
        </svg>
        <figcaption className="evd-legend"><span><svg width="26" height="12" viewBox="0 0 26 12" aria-hidden="true"><rect className="evd-gap" x="0" y="0" width="26" height="12" /></svg> {R.gap}</span></figcaption>
      </figure>
      <section className="evd-block" aria-label={R.gapsTitle}>
        <h4>{R.gapsTitle}</h4>
        {s.gaps.length === 0 ? <p>{R.noGaps}</p> : (
          <ul data-gaps={s.gaps.length}>
            {s.gaps.map((g, i) => <li key={i}>{g.kind === 'null' ? R.gapNull : R.gapMissing} · {R.gapRow(utcStamp(g.startMs), utcStamp(g.endMs), g.minutes)}</li>)}
          </ul>
        )}
      </section>
      <section className="evd-block" aria-label={R.tableTitle}>
        <h4>{R.tableTitle}</h4>
        <div className="evd-table-wrap">
          <table className="evd-table">
            <caption>{R.shown(Math.min(rows, data.points.length), data.points.length)}</caption>
            <thead><tr><th scope="col">{R.colTime}</th><th scope="col">{R.colDose}</th></tr></thead>
            <tbody>
              {data.points.slice(0, rows).map(p => <tr key={p.t}><td>{p.t.slice(0, 19).replace('T', ' ')}</td><td>{p.dose === null ? <span className="evd-muted">{t.noValue}</span> : fmtNumber(p.dose, locale, 3)}</td></tr>)}
            </tbody>
          </table>
        </div>
        {rows < data.points.length && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRows(r => r + 200)}>{R.showMore(Math.min(200, data.points.length - rows))}</button>}
      </section>
      {data.rawFile && (
        <details className="evd-prov">
          <summary>{t.provenance}</summary>
          <ul><li><Ext href={data.rawFile.url} t={t}><code>{data.rawFile.name}</code></Ext><br /><code className="evd-hash">sha256 {data.rawFile.sha256}</code></li></ul>
          <p>{t.accessed} {data.accessedAt}</p>
        </details>
      )}
      <p className="evd-attribution"><strong>{t.attributionLabel}:</strong> {R.attribution}</p>
      <SourceList sources={sources} t={t} locale={locale} />
    </>
  );
}
