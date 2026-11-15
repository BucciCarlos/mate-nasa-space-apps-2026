// Real-data entry point: DATA03 validated historical subsets. It reads whatever JSON subsets exist in `src/data/evidence/` at build time.
// Missing or invalid files still show the explicit no-data state; no runtime remote requests.
import type { EvidenceData } from './evidenceTypes';

const files = import.meta.glob('../../data/evidence/*.json', { eager: true, import: 'default' }) as Record<string, unknown>;
const pick = (name: string): unknown => files[`../../data/evidence/${name}.json`];

export const EVIDENCE_DATA: EvidenceData = {
  labs: pick('i4-labs'),
  radiation: pick('tepc-dose'),
  sleep: pick('sleep-aggregate'),
};
