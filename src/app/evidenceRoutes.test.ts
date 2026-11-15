import { describe, expect, it } from 'vitest';
import { parseRoute, toHash } from './routes';

const raw = import.meta.glob(['./App.tsx', './Shell.tsx', '../demo/Fd30Preview.tsx'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

describe('Evidence routes (MATE-EVD01)', () => {
  it('opens Evidence on Ground for both missions and on board in FD30, and round-trips the URL', () => {
    expect(parseRoute('#/ground/iss/evidence')).toEqual({ view: 'ground', missionId: 'iss', page: 'evidence' });
    expect(parseRoute('#/ground/cislunar/evidence')).toEqual({ view: 'ground', missionId: 'cislunar', page: 'evidence' });
    expect(parseRoute('#/demo/fd30/ground/evidence')).toEqual({ view: 'fd30', page: 'ground-evidence' });
    expect(toHash({ view: 'fd30', page: 'ground-evidence' })).toBe('#/demo/fd30/ground/evidence');
    expect(parseRoute('#/onboard/personal/evidence')).toEqual({ view: 'fd30', page: 'evidence' });
    expect(toHash({ view: 'ground', missionId: 'iss', page: 'evidence' })).toBe('#/ground/iss/evidence');
    expect(toHash({ view: 'fd30', page: 'evidence' })).toBe('#/onboard/personal/evidence');
  });
  it('does not put Evidence on board in M1', () => {
    expect(parseRoute('#/onboard/evidence')).toBeNull();
  });
  it('mounts the suite without role or profile, so the content is the same for both perspectives', () => {
    expect(raw['./App.tsx']).toContain('<EvidenceSuite perspective="ground" />');
    expect(raw['../demo/Fd30Preview.tsx']).toContain('<EvidenceSuite perspective="onboard" />');
    expect(raw['./Shell.tsx']).toMatch(/GROUND_PAGES: GroundPage\[\] = \[[^\]]*'evidence'/);
  });
  it('keeps Sources & evidence as a secondary access in Ground and in FD30, same routes', () => {
    expect(raw['./Shell.tsx']).toContain("filter((p) => p !== 'evidence')");
    expect(raw['./Shell.tsx']).toContain('subnav-secondary');
    const fd = raw['../demo/Fd30Preview.tsx'];
    expect(fd).toContain('fd-secondary-link');
    expect(fd).not.toContain(`<a href="#/onboard/personal/evidence" aria-current={page === 'evidence'`);
    expect(fd).not.toContain(`<a href="#/demo/fd30/ground/evidence" aria-current`);
    expect(fd).toContain('fd-evidence-hint');
  });
});
