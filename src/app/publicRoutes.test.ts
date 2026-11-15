import { describe, expect, it } from 'vitest';
import { publicHash, publicRoute, restoredOnboardPage } from './publicRoutes';
import { parseRoute } from './routes';

const aliases = {
  '': '#/demo/fd30', '#/': '#/demo/fd30', '#/onboard/today': '#/demo/fd30',
  '#/onboard/agenda': '#/onboard/personal/agenda', '#/onboard/observations': '#/onboard/personal/wellbeing',
  '#/onboard/exercise': '#/onboard/personal/exercise', '#/onboard/laboratory': '#/onboard/personal/laboratory',
  '#/onboard/modules/MOD-AUTONOMY': '#/onboard/personal/catalog', '#/sources': '#/onboard/personal/evidence',
  '#/ground/iss': '#/demo/fd30/ground/agenda', '#//ground/iss/agenda': '#/demo/fd30/ground/agenda',
  '#/ground/iss/agenda': '#/demo/fd30/ground/agenda', '#/ground/cislunar/agenda': '#/demo/fd30/ground/agenda',
  '#/ground/iss/link': '#/demo/fd30/ground', '#/ground/iss/log': '#/demo/fd30/ground',
  '#/ground/cislunar/crew': '#/demo/fd30/ground', '#/ground/iss/catalog': '#/demo/fd30/ground/catalog',
  '#/ground/cislunar/evidence': '#/demo/fd30/ground/evidence', '#/ground/iss/modules/MOD-MED': '#/demo/fd30/ground/catalog',
  '#/settings': '#/demo/fd30', '#/ground/unknown/old': '#/demo/fd30/ground',
  '#/demo/fd30/ground/old': '#/demo/fd30/ground', '#/unknown': '#/demo/fd30',
};
describe('FD30 public routing boundary', () => {
  it('resolves aliases synchronously to FD30 only; canonical URLs are idempotent', () => {
    for (const [old, canonical] of Object.entries(aliases)) {
      expect(publicHash(old), old).toBe(canonical);
      expect(publicRoute(old).view).toBe('fd30');
      expect(publicHash(canonical)).toBe(canonical);
    }
  });
  it('retains legacy parsing for internal regression, distinct from public resolution', () => {
    expect(parseRoute('#/ground/iss/agenda')?.view).toBe('ground');
    expect(parseRoute('#/onboard/today')?.view).toBe('onboard');
    expect(publicRoute('#/ground/iss/agenda')).toEqual({ view: 'fd30', page: 'ground-agenda' });
  });
  it('restores the last visited Onboard section, including Catalog and Evidence', () => {
    expect(restoredOnboardPage('exercise')).toBe('exercise');
    expect(restoredOnboardPage('agenda')).toBe('agenda');
    expect(restoredOnboardPage('catalog')).toBe('catalog');
    expect(restoredOnboardPage('evidence')).toBe('evidence');
    for (const raw of [null, 'ground', 'ground-agenda', '#/ground/iss/link', 'unknown']) expect(restoredOnboardPage(raw)).toBe('today');
  });
});
