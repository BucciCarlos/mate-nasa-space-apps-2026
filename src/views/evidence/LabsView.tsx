import { useState } from 'react';
import { useLocale } from '../../i18n/I18nProvider';
import type { EvidenceSource, I4AnalyteId } from './evidenceTypes';
import { I4_ANALYTE_IDS, I4_EXPECTED, I4_PRE_FLIGHT, I4_SUBJECTS, I4_TIMEPOINTS } from './evidenceTypes';
import { EVIDENCE_TEXT, EXPECTED_LAB_FILES } from './evidenceText';
import type { EvidenceMessages } from './evidenceText';
import { load, labNulls, labValue, validateI4Labs } from './validate';
import type { Loaded } from './validate';
import type { I4Labs } from './evidenceTypes';
import { buildLabsChart, markerPath } from './labsChart';
import { wrap } from './scale';
import { Ext, NoData, SourceList, fmtFixed } from './parts';

interface Props {
  raw?: unknown;
  sources: EvidenceSource[];
  /** Initial selector state (for hosts and tests). */
  initialAnalyte?: I4AnalyteId; initialCode?: string; initialView?: 'chart' | 'table';
}

export function LabsView({ raw, sources, initialAnalyte = 'glucose', initialCode = 'all', initialView = 'chart' }: Props) {
  const locale = useLocale();
  const t = EVIDENCE_TEXT[locale];
  const result: Loaded<I4Labs> = load(raw, validateI4Labs);
  const [analyte, setAnalyte] = useState<I4AnalyteId>(initialAnalyte);
  const [code, setCode] = useState<string>(initialCode);
  const [view, setView] = useState<'chart' | 'table'>(initialView);
  const L = t.labs;
  const mine = sources.filter(s => s.id === 'osdr-osd-575' || s.id === 'osdr-osd-569');

  return (
    <section className="evd-panel" aria-labelledby="evd-labs-h" data-evidence="labs" data-state={result.state}>
      <h3 id="evd-labs-h">{L.title}</h3>
      <p className="evd-disclaimer" role="note">{L.disclaimer}</p>
      {result.state !== 'ok' ? (
        <NoData load={result} t={t} locale={locale} expected={EXPECTED_LAB_FILES} sources={mine} label={t.tabs.labs} />
      ) : (
        <LabsBody data={result.data} analyte={analyte} code={code} view={view} setAnalyte={setAnalyte} setCode={setCode} setView={setView} t={t} locale={locale} sources={mine} />
      )}
    </section>
  );
}

interface LabsBodyProps {
  data: I4Labs; analyte: I4AnalyteId; code: string; view: 'chart' | 'table';
  setAnalyte: (a: I4AnalyteId) => void; setCode: (c: string) => void; setView: (v: 'chart' | 'table') => void;
  t: EvidenceMessages; locale: 'en' | 'es'; sources: EvidenceSource[];
}

function LabsBody({ data, analyte, code, view, setAnalyte, setCode, setView, t, locale, sources }: LabsBodyProps) {
  const L = t.labs;
  const exp = I4_EXPECTED[analyte];
  const a = data.analytes.find(x => x.id === analyte)!;
  const shown = code === 'all' ? [...I4_SUBJECTS] : [code];
  const nulls = labNulls(data);
  const name = L.analytes[analyte];
  return (
    <>
      <div className="evd-tools">
        <label>{L.analyte}
          <select value={analyte} onChange={e => setAnalyte(e.target.value as I4AnalyteId)}>
            {I4_ANALYTE_IDS.map(id => <option key={id} value={id}>{L.analytes[id]}</option>)}
          </select>
        </label>
        <label>{L.code}
          <select value={code} onChange={e => setCode(e.target.value)}>
            <option value="all">{L.allCodes}</option>
            {I4_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <div className="evd-toggle" role="group" aria-label={L.view}>
          <button type="button" className="btn btn-ghost btn-sm" aria-pressed={view === 'chart'} onClick={() => setView('chart')}>{L.chart}</button>
          <button type="button" className="btn btn-ghost btn-sm" aria-pressed={view === 'table'} onClick={() => setView('table')}>{L.table}</button>
        </div>
      </div>
      <p className="evd-muted">{L.panel[exp.panel]}</p>

      {view === 'chart' ? <Chart data={data} analyte={analyte} code={code} t={t} /> : (
        <div className="evd-table-wrap">
          <table className="evd-table">
            <caption>{L.tableCaption(name, exp.display)}</caption>
            <thead>
              <tr>
                <th scope="col">{L.code}</th>
                {I4_PRE_FLIGHT.map(tp => <th key={tp} scope="col">{tp}</th>)}
                <th scope="col" className="evd-flight-col">{L.inFlight}</th>
                {I4_TIMEPOINTS.filter(tp => !(I4_PRE_FLIGHT as readonly string[]).includes(tp)).map(tp => <th key={tp} scope="col">{tp}</th>)}
              </tr>
            </thead>
            <tbody>
              {shown.map((s, i) => {
                const cell = (tp: string) => { const v = labValue(a, s, tp); return <td key={tp}>{v === null ? <span className="evd-muted">{t.noValue}</span> : fmtFixed(v, exp.decimals, locale)}</td>; };
                return (
                  <tr key={s}>
                    <th scope="row">{s}</th>
                    {I4_PRE_FLIGHT.map(cell)}
                    {i === 0 && <td rowSpan={shown.length} className="evd-flight-col evd-muted">{L.inFlightCell}</td>}
                    {I4_TIMEPOINTS.filter(tp => !(I4_PRE_FLIGHT as readonly string[]).includes(tp)).map(cell)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="evd-muted">{L.axisNote}</p>
      <p>{L.asPublished}</p>
      {analyte === 'glucose' && <p className="evd-notice" role="note">{L.glucoseNote}</p>}
      {nulls.length > 0 && (
        <section className="evd-block" aria-label={L.nulls}>
          <h4>{L.nulls}</h4>
          <ul>{nulls.map(n => <li key={`${n.analyte}-${n.subject}-${n.timepoint}`}>{L.analytes[n.analyte]} · {n.subject} · {n.timepoint} · {t.noValue}</li>)}</ul>
        </section>
      )}
      <details className="evd-prov">
        <summary>{t.provenance}</summary>
        <h4>{L.rawFiles}</h4>
        <ul>{data.rawFiles.map(f => <li key={f.name}><Ext href={f.url} t={t}><code>{f.name}</code></Ext><br /><code className="evd-hash">sha256 {f.sha256}</code></li>)}</ul>
        <p>{t.accessed} {data.accessedAt}</p>
        <h4>{L.transformations}</h4>
        <ul>{data.transformations.map(k => <li key={k}>{L.transform[k]}</li>)}</ul>
      </details>
      <p className="evd-attribution"><strong>{t.attributionLabel}:</strong> {L.attribution}</p>
      <SourceList sources={sources} t={t} locale={locale} />
    </>
  );
}

function Chart({ data, analyte, code, t }: { data: I4Labs; analyte: I4AnalyteId; code: string; t: EvidenceMessages }) {
  const locale = useLocale();
  const L = t.labs;
  const exp = I4_EXPECTED[analyte];
  const c = buildLabsChart(data, analyte, code);
  const title = L.chartTitle(L.analytes[analyte], exp.display);
  const bandLines = wrap(L.flightBand, 15);
  return (
    <figure className="evd-figure">
      <svg className="evd-chart" viewBox={`0 0 ${c.w} ${c.h}`} role="img" aria-labelledby="evd-labs-chart-t evd-labs-chart-d" data-chart="labs">
        <title id="evd-labs-chart-t">{title}</title>
        <desc id="evd-labs-chart-d">{L.chartDesc}</desc>
        {c.ticks.map(k => (
          <g key={k.value}>
            <line className="evd-grid" x1={c.plot.l} x2={c.plot.r} y1={k.y} y2={k.y} />
            <text className="evd-axis" x={c.plot.l - 8} y={k.y + 4} textAnchor="end">{fmtFixed(k.value, exp.decimals > 0 ? Math.min(exp.decimals, 2) : 0, locale)}</text>
          </g>
        ))}
        <text className="evd-axis evd-unit" x={c.plot.l - 8} y={c.plot.t - 16} textAnchor="end">{exp.display}</text>
        <rect className="evd-band" x={c.band.x0} y={c.plot.t} width={c.band.x1 - c.band.x0} height={c.plot.b - c.plot.t} data-flight-band="true" />
        {bandLines.map((line, i) => <text key={i} className="evd-band-text" x={(c.band.x0 + c.band.x1) / 2} y={c.plot.t + 22 + i * 14} textAnchor="middle">{line}</text>)}
        <line className="evd-axis-line" x1={c.plot.l} x2={c.plot.r} y1={c.plot.b} y2={c.plot.b} />
        {c.xTicks.map(k => <text key={k.timepoint} className="evd-axis" x={k.x} y={c.plot.b + 18} textAnchor="middle">{k.timepoint}</text>)}
        <text className="evd-axis" x={(c.plot.l + c.band.x0) / 2} y={c.plot.b + 38} textAnchor="middle">{L.preFlight}</text>
        <text className="evd-axis" x={(c.band.x1 + c.plot.r) / 2} y={c.plot.b + 38} textAnchor="middle">{L.postFlight}</text>
        {c.series.map(s => (
          <g key={s.subject} data-series={s.subject}>
            {s.runs.map((run, i) => run.points.length > 1 && (
              <polyline key={i} className="evd-line" fill="none" strokeDasharray={s.dash || undefined} data-part={run.part}
                points={run.points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} />
            ))}
            {s.runs.flatMap(run => run.points).map(p => (
              <path key={p.timepoint} className="evd-marker" d={markerPath(s.marker, p.x, p.y)}><title>{`${s.subject} · ${p.timepoint} · ${fmtFixed(p.value, exp.decimals, locale)} ${exp.display}`}</title></path>
            ))}
            {s.label && <text className="evd-label" x={s.label.x} y={s.label.y + 4}>{s.subject}</text>}
          </g>
        ))}
      </svg>
      <figcaption className="evd-legend">
        {c.series.map(s => (
          <span key={s.subject}>
            <svg width="34" height="12" viewBox="0 0 34 12" aria-hidden="true"><line x1="0" x2="34" y1="6" y2="6" className="evd-line" strokeDasharray={s.dash || undefined} /><path className="evd-marker" d={markerPath(s.marker, 17, 6, 4)} /></svg> {L.series(s.subject)}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
