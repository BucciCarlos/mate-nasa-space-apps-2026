// TEST-ONLY fixtures. Synthetic numbers, in the shape of the real inputs. They are not real measurements and must never be imported by app code
// (evidence.test.ts checks that). Dates are in 2000 and file names say "fixture" so none of this can be mistaken for source data.
import type { I4Labs, SleepAggregate, TepcWindow } from './evidenceTypes';
import { I4_EXPECTED, I4_SUBJECTS, I4_TIMEPOINTS } from './evidenceTypes';

const sourceAnalytes = { glucose: ['GLUCOSE'], calcium: ['CALCIUM'], hemoglobin: ['HEMOGLOBIN', 'HEMOGLOBIN (FEMALE)'], rbc: ['RED BLOOD CELL COUNT', 'RED BLOOD CELL COUNT (FEMALE)'], wbc: ['WHITE BLOOD CELL COUNT'] } as const;
const base = { glucose: 80, calcium: 9, hemoglobin: 13, rbc: 4, wbc: 6 } as const;
const step = { glucose: 3, calcium: 0.2, hemoglobin: 0.5, rbc: 0.1, wbc: 0.4 } as const;

export function labsFixture(): I4Labs {
  return {
    sourceIds: ['osdr-osd-575', 'osdr-osd-569'],
    accessedAt: '2000-01-01',
    rawFiles: [
      { name: 'fixture-cmp.csv', url: 'https://example.invalid/fixture-cmp.csv', sha256: '0'.repeat(64) },
      { name: 'fixture-cbc.csv', url: 'https://example.invalid/fixture-cbc.csv', sha256: '1'.repeat(64) },
    ],
    flight: { start: '2000-01-10', end: '2000-01-12' },
    timepoints: [...I4_TIMEPOINTS],
    subjects: [...I4_SUBJECTS],
    analytes: (Object.keys(I4_EXPECTED) as (keyof typeof I4_EXPECTED)[]).map(id => ({
      id, sourceAnalytes: [...sourceAnalytes[id]], unit: I4_EXPECTED[id].unit, panel: I4_EXPECTED[id].panel,
      values: I4_SUBJECTS.flatMap((subject, si) => I4_TIMEPOINTS.map((timepoint, ti) => ({
        subject, timepoint, value: Math.round((base[id] + si * step[id] * 4 + ((ti * 7 + si * 3) % 5) * step[id]) * 100) / 100,
      }))),
    })),
    transformations: ['keep-columns', 'drop-sex-and-ranges', 'merge-female-variants', 'exclude-egfr-race', 'na-to-null', 'no-conversion'],
  };
}

const T0 = Date.parse('2000-03-01T00:00:00Z');
const iso = (ms: number) => new Date(ms).toISOString().replace('.000Z', 'Z');

/** 2 hours at 1-minute cadence, with a 10-minute hole (rows 40-49 absent) and one row without a value (row 80). */
export function tepcFixture(): TepcWindow {
  const points: TepcWindow['points'] = [];
  for (let i = 0; i < 120; i++) {
    if (i >= 40 && i < 50) continue;
    points.push({ t: iso(T0 + i * 60_000), dose: i === 80 ? null : Math.round((0.05 + ((i * 13) % 17) * 0.01) * 1000) / 1000 });
  }
  return {
    sourceId: 'cdaweb-iss-tepc', accessedAt: '2000-01-01',
    rawFile: { name: 'fixture-tepc.csv', url: 'https://example.invalid/fixture-tepc.csv', sha256: '2'.repeat(64) },
    window: { start: iso(T0), end: iso(T0 + 120 * 60_000) }, cadenceMin: 1, unit: 'uGy/min', points,
  };
}

export function sleepFixture(): SleepAggregate {
  return {
    sourceId: 'barger-2014', accessedAt: '2000-01-01',
    citation: { authors: 'Fixture A, Fixture B', title: 'Fixture study of sleep in a made-up crew', journal: 'Journal of Fixtures', year: 2000, volume: '1', pages: '1-2', doi: '10.0000/fixture' },
    population: { en: 'Made-up crew for tests', es: 'Tripulación inventada para pruebas' },
    counts: { astronauts: 10, missions: 5, inflightDays: 100 },
    method: { en: 'Made-up method', es: 'Método inventado' },
    groups: [
      { id: 'preflight_3m', hoursObtained: 6.5, sd: 0.5 }, { id: 'preflight_11d', hoursObtained: 6, sd: 0.6 },
      { id: 'inflight', hoursObtained: 5.5, sd: 0.4 }, { id: 'postflight_1w', hoursObtained: 7, sd: null },
    ],
    hypnotics: { users: 3, of: 8 },
  };
}
