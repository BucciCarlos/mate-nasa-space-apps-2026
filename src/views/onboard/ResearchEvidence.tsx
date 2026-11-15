import { useState } from 'react';
import { fmtNumber } from '../../i18n/format';
import { useLocale, useT } from '../../i18n/I18nProvider';

type AnalyteId = 'glucose' | 'calcium' | 'hemoglobin' | 'rbc' | 'wbc';
interface EvidenceData {
  accessedAt: string;
  rawFiles: { name: string; url: string; sha256: string }[];
  subjects: string[];
  timepoints: string[];
  analytes: { id: AnalyteId; unit: string; values: { subject: string; timepoint: string; value: number | null }[] }[];
}

const files = import.meta.glob<{ default: EvidenceData }>('../../data/evidence/*.json', { eager: true });
const candidate = files['../../data/evidence/i4-labs.json']?.default;
const UNITS = { glucose: 'mg/dL', calcium: 'mg/dL', hemoglobin: 'g/dL', rbc: '10⁶/µL', wbc: '10³/µL' };

function valid(data: EvidenceData | undefined): data is EvidenceData {
  return !!data && typeof data.accessedAt === 'string' &&
    Array.isArray(data.subjects) && data.subjects.join() === 'C001,C002,C003,C004' &&
    Array.isArray(data.timepoints) && data.timepoints.join() === 'L-92,L-44,L-3,R+1,R+45,R+82,R+194' &&
    Array.isArray(data.rawFiles) && data.rawFiles.length === 2 && data.rawFiles.every((file) =>
      file && typeof file.name === 'string' && /^https:\/\/osdr\.nasa\.gov\//.test(file.url) && /^[a-f0-9]{64}$/.test(file.sha256)) &&
    Array.isArray(data.analytes) && data.analytes.length === 5 &&
    Object.entries(UNITS).every(([id, unit]) => data.analytes.filter((series) =>
      series && series.id === id && series.unit === unit && Array.isArray(series.values) && series.values.length === 28 &&
      data.subjects.every((subject) => data.timepoints.every((timepoint) => series.values.filter((point) =>
        point && point.subject === subject && point.timepoint === timepoint && (point.value === null || Number.isFinite(point.value))).length === 1))).length === 1);
}

const data = valid(candidate) ? candidate : null;
const MARKERS = ['●', '■', '▲', '◆'];

function LabTrend({ dataset, analyte, label }: { dataset: EvidenceData; analyte: EvidenceData['analytes'][number]; label: string }) {
  const values = analyte.values.flatMap((point) => point.value === null ? [] : [point.value]);
  if (values.length === 0) return null;
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const y = (value: number) => 138 - 118 * (value - min) / span;
  const x = (i: number) => 20 + i * 43 + (i >= 3 ? 50 : 0);
  return (
    <>
      <svg className="metric-trend lab-trend" viewBox="0 0 350 160" role="img" aria-label={label}>
        <rect className="lab-flight-gap" x="124" y="7" width="65" height="144" />
        {dataset.subjects.map((subject, index) => {
          const points = dataset.timepoints.map((timepoint) => analyte.values.find((point) => point.subject === subject && point.timepoint === timepoint)?.value);
          return (
            <g key={subject} className={`lab-series lab-series-${index}`}>
              {points.map((value, i) => {
                const previous = points[i - 1];
                if (value == null) return null;
                return <g key={dataset.timepoints[i]}>
                  {previous != null && i !== 3 && <line x1={x(i - 1)} x2={x(i)} y1={y(previous)} y2={y(value)} />}
                  <text x={x(i)} y={y(value)} textAnchor="middle" dominantBaseline="central">{MARKERS[index]}</text>
                </g>;
              })}
            </g>
          );
        })}
      </svg>
      <ul className="metric-days">{dataset.subjects.map((subject, index) => (
        <li className={`lab-series lab-series-${index}`} key={subject}><span aria-hidden="true">{MARKERS[index]} </span>{subject}</li>
      ))}</ul>
    </>
  );
}

export function ResearchEvidence() {
  const t = useT().monitoring;
  const locale = useLocale();
  const [id, setId] = useState<AnalyteId>('glucose');
  const analyte = data?.analytes.find((series) => series.id === id);
  return (
    <details className="panel">
      <summary>{t.evidence}</summary>
      <p>{t.openData} · {t.publishedDate}</p>
      <p>{t.evidenceIntro}</p>
      <p>{t.limits}</p>
      <p>{t.flightGap}</p>
      {data && analyte ? (
        <>
          <label className="monitoring-select">{t.value}<select value={id} onChange={(event) => setId(event.target.value as AnalyteId)}>
            {data.analytes.map((series) => <option key={series.id} value={series.id}>{t.labels[series.id]}</option>)}
          </select></label>
          <LabTrend dataset={data} analyte={analyte} label={`${t.labels[id]} · ${analyte.unit} · ${t.flightGap}`} />
          <div className="timeline-scroll" tabIndex={0} role="group" aria-label={t.evidence}>
            <table className="monitoring-table">
              <caption>{t.labels[id]} · {analyte.unit}</caption>
              <thead><tr><th scope="col">{t.stage}</th>{data.subjects.map((subject) => <th scope="col" key={subject}>{subject}</th>)}</tr></thead>
              <tbody>{data.timepoints.map((timepoint) => <tr key={timepoint}><th scope="row">{timepoint}</th>{data.subjects.map((subject) => {
                const value = analyte.values.find((point) => point.subject === subject && point.timepoint === timepoint)?.value;
                return <td key={subject}>{value == null ? t.noValue : fmtNumber(value, locale, 4)}</td>;
              })}</tr>)}</tbody>
            </table>
          </div>
          {id === 'glucose' && <p>{t.glucoseNote}</p>}
        </>
      ) : <p>{t.evidencePending}</p>}
      <details>
        <summary>{t.sources}</summary>
        <ul>
          <li><a href="https://osdr.nasa.gov/bio/repo/data/studies/OSD-575">{'OSD-575 / LSDS-8'}</a></li>
          <li><a href="https://osdr.nasa.gov/bio/repo/data/studies/OSD-569">{'OSD-569 / LSDS-7'}</a></li>
        </ul>
        <p>{t.attribution}</p>
        {data && <><h3>{t.sourceData}</h3><p>{data.accessedAt}</p><ul>{data.rawFiles.map((file) => (
          <li key={file.name}><a href={file.url}>{file.name}</a><br /><code>{file.sha256}</code></li>
        ))}</ul><p>{t.transformations}</p></>}
        <p>{t.published} · <a href="https://doi.org/10.3389/fphys.2020.00394">{t.hera}</a></p>
        <p><a href="https://ntrs.nasa.gov/citations/20230014025">{t.standard}</a></p>
      </details>
    </details>
  );
}
