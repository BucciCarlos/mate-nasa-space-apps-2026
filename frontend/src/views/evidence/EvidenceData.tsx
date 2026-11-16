// Fetches the historical evidence subsets from the backend (RTK Query) and
// feeds them to the presentational <EvidenceSuite>. Replaces the old
// build-time `import.meta.glob` load of `src/data/evidence/*.json` — the
// backend is now the single source of truth for the data.
//
//   <EvidenceData perspective="onboard" profileName={crew.name} />
//   <EvidenceData perspective="ground" />
//
// Loading and error states are explicit; an absent/failed subset simply shows
// the view's own "no data" state (the views already handle `raw === undefined`).
import { useLocale } from '../../i18n/I18nProvider';
import { useEvidenceLabsQuery, useEvidenceRadiationQuery, useEvidenceSleepQuery } from '../../state/api';
import type { EvidenceData as EvidenceDataShape, EvidenceSource, EvidenceTab } from './evidenceTypes';
import { EVIDENCE_TEXT } from './evidenceText';
import { EVIDENCE_SOURCES } from './evidenceSources';
import { EvidenceSuite } from './EvidenceSuite';

export interface EvidenceDataProps {
  perspective: 'onboard' | 'ground';
  /** Controlled tab (optional). */
  tab?: EvidenceTab;
  onTabChange?: (tab: EvidenceTab) => void;
  /** On board only: shown in the "no sleep records for {name}" line. */
  profileName?: string;
  /** Override the source registry (defaults to the bundled EVIDENCE_SOURCES). */
  sources?: readonly EvidenceSource[];
}

export function EvidenceData({ perspective, tab, onTabChange, profileName, sources = EVIDENCE_SOURCES }: EvidenceDataProps) {
  const locale = useLocale();
  const t = EVIDENCE_TEXT[locale];

  // Lazy: each query starts when this component mounts (i.e. when the Evidence
  // page opens) and is then cached in the RTK Query store.
  const labs = useEvidenceLabsQuery();
  const radiation = useEvidenceRadiationQuery();
  const sleep = useEvidenceSleepQuery();

  const data: EvidenceDataShape = {
    labs: labs.data,
    radiation: radiation.data,
    sleep: sleep.data,
  };

  const loading = labs.isLoading || radiation.isLoading || sleep.isLoading;
  const failed = labs.isError || radiation.isError || sleep.isError;
  const errorText = failed
    ? t.loadError
    : null;

  return (
    <div className="evd-data">
      {loading && <p className="evd-data-status" role="status">{t.loading}</p>}
      {errorText && <p className="evd-data-status evd-data-status-error" role="alert">{errorText}</p>}
      <EvidenceSuite
        perspective={perspective}
        data={data}
        sources={sources}
        tab={tab}
        onTabChange={onTabChange}
        profileName={profileName}
      />
    </div>
  );
}
