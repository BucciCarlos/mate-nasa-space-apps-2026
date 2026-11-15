// Evidence views: input contracts. The views receive validated, derived subsets (04 §4.4, §5, §6, §7); they never
// read raw source files, mission data, profile data or the FD30 state. Historical evidence is never FD30 telemetry.
import type { Locale } from '../../state/types';

export type Text = Record<Locale, string>;
export type EvidenceTab = 'labs' | 'radiation' | 'sleep' | 'co2' | 'sources';
export const EVIDENCE_TABS: readonly EvidenceTab[] = ['labs', 'radiation', 'sleep', 'co2', 'sources'];

export interface RawFile { name: string; url: string; sha256: string }

// ---- Inspiration4 labs (04 §4.4): file `src/data/evidence/i4-labs.json`
export const I4_ANALYTE_IDS = ['glucose', 'calcium', 'hemoglobin', 'rbc', 'wbc'] as const;
export type I4AnalyteId = (typeof I4_ANALYTE_IDS)[number];
export const I4_TIMEPOINTS = ['L-92', 'L-44', 'L-3', 'R+1', 'R+45', 'R+82', 'R+194'] as const;
export const I4_SUBJECTS = ['C001', 'C002', 'C003', 'C004'] as const;
export const I4_PRE_FLIGHT = ['L-92', 'L-44', 'L-3'] as const;
export const I4_TRANSFORMATIONS = ['keep-columns', 'drop-sex-and-ranges', 'merge-female-variants', 'exclude-egfr-race', 'na-to-null', 'no-conversion'] as const;
export type I4Transformation = (typeof I4_TRANSFORMATIONS)[number];

/** Source unit expected per analyte (04 §4.2) and the panel it comes from. */
export const I4_EXPECTED: Record<I4AnalyteId, { unit: string; panel: 'CMP' | 'CBC'; display: string; decimals: number }> = {
  glucose: { unit: 'mg/dL', panel: 'CMP', display: 'mg/dL', decimals: 0 },
  calcium: { unit: 'mg/dL', panel: 'CMP', display: 'mg/dL', decimals: 1 },
  hemoglobin: { unit: 'g/dL', panel: 'CBC', display: 'g/dL', decimals: 1 },
  rbc: { unit: 'Million/uL', panel: 'CBC', display: '10⁶/µL', decimals: 2 },
  wbc: { unit: 'Thousand/uL', panel: 'CBC', display: '10³/µL', decimals: 1 },
};

export interface I4Value { subject: string; timepoint: string; value: number | null }
export interface I4Analyte { id: I4AnalyteId; sourceAnalytes: string[]; unit: string; panel: 'CMP' | 'CBC'; values: I4Value[] }
export interface I4Labs {
  sourceIds: ['osdr-osd-575', 'osdr-osd-569'];
  accessedAt: string;
  rawFiles: RawFile[];
  flight: { start: string; end: string };
  timepoints: string[];
  subjects: string[];
  analytes: I4Analyte[];
  transformations: I4Transformation[];
}

// ---- Ambient radiation, ISS TEPC `DOSE` (04 §6): file `src/data/evidence/tepc-dose.json`
export interface TepcPoint { t: string; dose: number | null }
export interface TepcWindow {
  sourceId: 'cdaweb-iss-tepc';
  accessedAt: string;
  rawFile?: RawFile;
  /** Requested window, UTC ISO. Every point must fall inside it. */
  window: { start: string; end: string };
  /** Nominal minutes between rows. */
  cadenceMin: number;
  unit: 'uGy/min';
  /** Sorted ascending, UTC ISO, one row per timestamp. Missing rows are simply absent; nothing is filled in. */
  points: TepcPoint[];
}

// ---- Published sleep aggregate (04 §7): file `src/data/evidence/sleep-aggregate.json`
export const SLEEP_GROUP_IDS = ['preflight_3m', 'preflight_11d', 'inflight', 'postflight_1w'] as const;
export type SleepGroupId = (typeof SLEEP_GROUP_IDS)[number];
export interface SleepGroup { id: SleepGroupId; hoursObtained: number; sd: number | null }
export interface SleepAggregate {
  sourceId: 'barger-2014';
  accessedAt: string;
  citation: { authors: string; title: string; journal: string; year: number; volume: string; pages: string; doi: string };
  population: Text;
  counts: { astronauts: number; missions: number; inflightDays: number | null };
  method: Text;
  groups: SleepGroup[];
  hypnotics?: { users: number; of: number };
}

// ---- Cabin CO2 (04 §5): this stage shows the context card and "Pending verification". No readings are accepted yet.
export interface Co2Status { status: 'pending' | 'unavailable'; reason?: Text }

// ---- Source registry entry (04 §3 + coverage and DOI for the Sources page)
export interface EvidenceSource {
  id: string;
  title: string;                       // original language
  publisher: string;
  url: string;
  doi?: string;
  kind: 'nasa_resource' | 'partner_resource' | 'dataset' | 'standard' | 'publication';
  challengeResource: boolean;
  accessedAt: string;
  coverage: Text;
  supports: Text;
  status: 'verified' | 'partial' | 'pending';
  attribution?: Text;
  citation?: Text;
  version?: Text;
  subset?: { file: string; sha256: string };
  reuse: Text;
}

/** Raw JSON as received from `src/data/evidence/*.json`. Each piece is validated by its view; absent means "not loaded". */
export interface EvidenceData { labs?: unknown; radiation?: unknown; sleep?: unknown; co2?: unknown }

export interface EvidenceSuiteProps {
  /** Host perspective. It changes only the wording of the "not telemetry" note, never the content or the access. */
  perspective: 'onboard' | 'ground';
  data?: EvidenceData;
  sources?: readonly EvidenceSource[];
  /** Controlled tab (optional). Without it the suite keeps its own. */
  tab?: EvidenceTab;
  onTabChange?: (tab: EvidenceTab) => void;
  /** On board only: shown in the "no sleep records for {name}" line. The suite reads no profile data itself. */
  profileName?: string;
}
