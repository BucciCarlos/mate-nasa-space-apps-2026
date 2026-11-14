import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCENARIOS, createInitialState } from './initialState';
import type { Bilingual, ScenarioFile, Source } from './types';

// Scenario/source data now lives in backend/data (the backend serves it to the app).
const DATA_DIR = join(fileURLToPath(new URL('.', import.meta.url)), '../../../backend/data');
const loadJson = (p: string) => JSON.parse(readFileSync(join(DATA_DIR, p), 'utf-8'));
const sources = loadJson('sources.json') as Source[];
import { MISSION_PREFIX } from '../domain/ids';
import { overlaps, toMs, defaultAgendaRange, flightDay, missionTimeMs } from '../domain/time';
import { parseRoute, toHash } from '../app/routes';
import type { Route } from './types';
import { deserialize, serialize } from './persistence';
import { en } from '../i18n/en';
import { es } from '../i18n/es';

const bilingualOk = (b: Bilingual) => typeof b.en === 'string' && b.en.trim().length > 0 && typeof b.es === 'string' && b.es.trim().length > 0;

describe('U-SCN-01 scenario files (02 §11)', () => {
  for (const file of Object.values(SCENARIOS) as ScenarioFile[]) {
    it(`${file.id}`, () => {
      const prefix = `${MISSION_PREFIX[file.id]}:`;
      const ids = new Set<string>();
      for (const c of file.crew) {
        expect(c.id.startsWith(prefix)).toBe(true);
        expect(c.missionId).toBe(file.id);
        expect(ids.has(c.id)).toBe(false); ids.add(c.id);
        expect(bilingualOk(c.roleTitle)).toBe(true);
      }
      for (const b of file.blocks) {
        expect(b.id.startsWith(prefix)).toBe(true);
        expect(b.missionId).toBe(file.id);
        expect(ids.has(b.id)).toBe(false); ids.add(b.id);
        expect(bilingualOk(b.title)).toBe(true);
        expect(toMs(b.end)).toBeGreaterThan(toMs(b.start));
        for (const cid of b.crewIds) expect(file.crew.some((c) => c.id === cid)).toBe(true);
        if (['sleep', 'pre_sleep', 'post_sleep'].includes(b.kind)) expect(b.crewIds).toHaveLength(1);
        if (b.movable) expect(['task', 'exercise', 'conference']).toContain(b.kind);
      }
      for (const c of file.crew) {
        const mine = file.blocks.filter((b) => b.crewIds.includes(c.id));
        for (const k of ['sleep', 'pre_sleep', 'post_sleep']) expect(mine.some((b) => b.kind === k), `${c.id} ${k}`).toBe(true);
        for (let i = 0; i < mine.length; i++) for (let j = i + 1; j < mine.length; j++) expect(overlaps(mine[i], mine[j]), `${mine[i].id} vs ${mine[j].id}`).toBe(false);
      }
      if (file.onboardUserId) expect(file.crew.some((c) => c.id === file.onboardUserId)).toBe(true);
    });
  }
  it('flight days and default range', () => {
    const s = createInitialState(0);
    expect(flightDay(s.missions.iss.flightDayOne, missionTimeMs(s.missions.iss.clockStart, 0, 0))).toBe(41);
    expect(flightDay(s.missions.cislunar.flightDayOne, missionTimeMs(s.missions.cislunar.clockStart, 0, 0))).toBe(12);
    expect(defaultAgendaRange(s.missions.iss.clockStart)).toEqual({ start: '2027-03-09T12:00:00Z', end: '2027-03-10T12:00:00Z' });
  });
});

describe('U-I18N-01', () => {
  it('bilingual fields in sources.json are non-empty', () => {
    for (const src of sources as Source[]) {
      expect(bilingualOk(src.supports), src.id).toBe(true);
      expect(bilingualOk(src.reuse), src.id).toBe(true);
      expect(src.url.startsWith('https://')).toBe(true);
    }
  });
  it('catalogs have the same keys and no empty strings', () => {
    const walk = (a: unknown, b: unknown, path: string) => {
      if (typeof a === 'string') { expect(typeof b, path).toBe('string'); expect(a.trim().length, path).toBeGreaterThan(0); expect((b as string).trim().length, path).toBeGreaterThan(0); return; }
      if (typeof a === 'function') { expect(typeof b, path).toBe('function'); return; }
      const ka = Object.keys(a as object).sort(); const kb = Object.keys(b as object).sort();
      expect(kb, path).toEqual(ka);
      for (const k of ka) walk((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`);
    };
    walk(en, es, 'root');
  });
  it('H2: no readiness verdicts in either catalog', () => {
    const flat = JSON.stringify([en, es], (_k, v) => (typeof v === 'function' ? v.toString() : v)).toLowerCase();
    for (const w of ['unfit', 'no apto', ' apto', 'fit for duty', 'fit/unfit']) expect(flat, w).not.toContain(w);
  });
});

describe('U-ROUTE-01', () => {
  it('round-trips every route; unknown → null', () => {
    const routes: Route[] = [
      { view: 'onboard', page: 'today' }, { view: 'onboard', page: 'agenda' }, { view: 'onboard', page: 'observations' },
      { view: 'ground', missionId: 'iss', page: 'agenda' }, { view: 'ground', missionId: 'cislunar', page: 'link' },
      { view: 'ground', missionId: 'iss', page: 'crew' }, { view: 'ground', missionId: 'cislunar', page: 'log' }, { view: 'settings' },
    ];
    for (const r of routes) expect(parseRoute(toHash(r))).toEqual(r);
    expect(parseRoute('')).toEqual({ view: 'onboard', page: 'today' });
    expect(parseRoute('#/')).toEqual({ view: 'onboard', page: 'today' });
    for (const bad of ['#/nope', '#/ground/mars/agenda', '#/ground/iss/xyz', '#/onboard/modules', '#/settings/x']) expect(parseRoute(bad), bad).toBeNull();
  });
});

describe('U-PERSIST-01', () => {
  it('snapshot round-trip; version mismatch or corrupt JSON → null', () => {
    const s = createInitialState(123, undefined, 'es');
    expect(deserialize(serialize(s))).toEqual(s);
    expect(deserialize(serialize({ ...s, schemaVersion: 2 as unknown as 1 }))).toBeNull();
    expect(deserialize('{not json')).toBeNull();
    expect(deserialize(null)).toBeNull();
    expect(deserialize('{"schemaVersion":1}')).toBeNull();
  });
});
