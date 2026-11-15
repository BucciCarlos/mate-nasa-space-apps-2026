import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { CrewId, PreviewState } from '../../../demo/fd30';
import { laboratoryHistory } from '../../../demo/history/laboratory';
import type { LaboratoryRange } from '../../../demo/history/laboratory';
import type { LabSample } from '../../../demo/laboratory';
import { fdLabel } from '../../../demo/history/sleep';
import { useLocale } from '../../../i18n/I18nProvider';
import { LAB_HISTORY_TEXT } from './laboratoryText';
import './laboratory.css';

export function LaboratoryHistory({ state, owner, time, renderSample }: { state: PreviewState; owner: CrewId; time: number; renderSample: (sample: LabSample) => ReactNode }) {
  const t = LAB_HISTORY_TEXT[useLocale()], detail = useRef<HTMLElement>(null);
  const [preferences, setPreferences] = useState<Partial<Record<CrewId, { range: LaboratoryRange; selected: string | null }>>>({});
  const preference = preferences[owner] ?? { range: 'last7' as const, selected: null };
  const view = laboratoryHistory(state, { perspective: 'onboard', owner }, time, preference.range);
  if (!view) return null;
  const selected = view.records.find(r => r.sample.id === preference.selected) ?? view.records.find(r => r.sample.id === state.profiles[owner].highlightedSampleId) ?? view.records.at(-1);
  return <section className="laboratory-history" data-laboratory-owner={owner} data-laboratory-range={preference.range}>
    <h2>{t.title}</h2><p>{t.demo}</p><p>{t.intro}</p>
    <div role="group" aria-label={t.range}>{(['last7','all'] as const).map(range => <button type="button" key={range} aria-pressed={preference.range === range} onClick={() => setPreferences(p => ({ ...p, [owner]: { range, selected: null } }))}>{range === 'all' ? t.all : t.last7}</button>)}</div>
    <div className="laboratory-days">{view.days.map(day => <div key={day.fd} data-laboratory-day={day.fd} data-status={day.status}><strong>{fdLabel(day.fd)}</strong><span>{day.status === 'recorded' ? t.recorded : day.status === 'no_activity' ? t.noActivity : t.noRecord}</span>{day.plans.map(plan => <p key={plan.id}>{t.planned} · {plan.start.slice(11,16)} UTC</p>)}{day.fd < 30 && !day.samples.length && <small>{t.unknown}</small>}</div>)}</div>
    {!view.records.length && <p>{t.empty}</p>}
    <ul className="laboratory-rows">{view.records.map(row => <li key={row.sample.id} data-laboratory-record={row.sample.id}>
      <dl><dt>{t.date}</dt><dd>{row.date}</dd><dt>{t.type}</dt><dd>{t[row.sample.sampleType]}</dd><dt>{t.stage}</dt><dd>{t[row.stage as 'collection' | 'analysis' | 'result']}</dd></dl>
      {row.sample.collection?.handlingStatus === 'stored_awaiting_analysis' && <p>{t.stored}</p>}
      <button type="button" aria-pressed={selected?.sample.id === row.sample.id} aria-controls="laboratory-history-detail" onClick={() => { setPreferences(p => ({ ...p, [owner]: { ...preference, selected: row.sample.id } })); requestAnimationFrame(() => detail.current?.focus()); }}>{t.detail} · {t[row.sample.sampleType]} · {row.date}</button>
    </li>)}</ul>
    {selected && <section id="laboratory-history-detail" ref={detail} tabIndex={-1}>{renderSample(selected.sample)}</section>}
    <details><summary>{t.origin}</summary><p>{t.source}</p></details>
  </section>;
}
