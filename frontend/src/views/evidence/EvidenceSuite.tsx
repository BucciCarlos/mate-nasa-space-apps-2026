// Evidence and Sources for M.A.T.E. Mount it with a perspective; it reads no mission, profile or FD30 state and grants no access.
//   On board (FD30):  <EvidenceSuite perspective="onboard" profileName={crew.name} />
//   On Ground:        <EvidenceSuite perspective="ground" />
// Data come from `src/data/evidence/*.json` through `EVIDENCE_DATA`, or from the `data` prop. Absent or invalid inputs show their state.
import { useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useLocale } from '../../i18n/I18nProvider';
import { EVIDENCE_TABS } from './evidenceTypes';
import type { EvidenceSuiteProps, EvidenceTab } from './evidenceTypes';
import { EVIDENCE_TEXT } from './evidenceText';
import { EVIDENCE_DATA } from './evidenceData';
import { EVIDENCE_SOURCES } from './evidenceSources';
import { HistoricalNote } from './parts';
import { LabsView } from './LabsView';
import { RadiationView } from './RadiationView';
import { SleepView } from './SleepView';
import { Co2View } from './Co2View';
import { SourcesView } from './SourcesView';
import './evidence.css';

export function EvidenceSuite({ perspective, data = EVIDENCE_DATA, sources = EVIDENCE_SOURCES, tab: controlled, onTabChange, profileName }: EvidenceSuiteProps) {
  const locale = useLocale();
  const t = EVIDENCE_TEXT[locale];
  const base = useId();
  const [own, setOwn] = useState<EvidenceTab>('labs');
  const tab = controlled ?? own;
  const list = useRef<HTMLDivElement>(null);
  const select = (next: EvidenceTab) => { if (controlled === undefined) setOwn(next); onTabChange?.(next); };
  const move = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = EVIDENCE_TABS.indexOf(tab);
    const next = e.key === 'ArrowRight' ? (i + 1) % EVIDENCE_TABS.length : e.key === 'ArrowLeft' ? (i + EVIDENCE_TABS.length - 1) % EVIDENCE_TABS.length : e.key === 'Home' ? 0 : e.key === 'End' ? EVIDENCE_TABS.length - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    select(EVIDENCE_TABS[next]);
    list.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  };
  const src = [...sources];
  return (
    <section className="evd" data-perspective={perspective} aria-labelledby={`${base}-h`}>
      <header className="evd-head">
        <h2 id={`${base}-h`}>{t.title}</h2>
        <p>{t.intro}</p>
      </header>
      <HistoricalNote perspective={perspective} t={t} />
      <div className="evd-tabs" role="tablist" aria-label={t.tabsLabel} ref={list}>
        {EVIDENCE_TABS.map(id => (
          <button key={id} type="button" role="tab" id={`${base}-tab-${id}`} aria-selected={tab === id} aria-controls={`${base}-panel`} tabIndex={tab === id ? 0 : -1}
            className="evd-tab" onClick={() => select(id)} onKeyDown={move}>{t.tabs[id]}</button>
        ))}
      </div>
      <div id={`${base}-panel`} role="tabpanel" aria-labelledby={`${base}-tab-${tab}`}>
        {tab === 'labs' && <LabsView raw={data.labs} sources={src} />}
        {tab === 'radiation' && <RadiationView raw={data.radiation} sources={src} />}
        {tab === 'sleep' && <SleepView raw={data.sleep} sources={src} profileName={profileName} />}
        {tab === 'co2' && <Co2View sources={src} />}
        {tab === 'sources' && <SourcesView sources={src} />}
      </div>
    </section>
  );
}

export { EVIDENCE_SOURCES } from './evidenceSources';
export { EVIDENCE_DATA } from './evidenceData';
export type { EvidenceData, EvidenceSource, EvidenceSuiteProps, EvidenceTab, I4Labs, TepcWindow, SleepAggregate, Co2Status } from './evidenceTypes';
