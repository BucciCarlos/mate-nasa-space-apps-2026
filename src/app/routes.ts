import type { GroundPage, MissionId, OnboardPage, Route } from '../state/types';

const ONBOARD_PAGES: OnboardPage[] = ['today', 'agenda', 'observations'];
const GROUND_PAGES: GroundPage[] = ['agenda', 'link', 'crew', 'log', 'catalog', 'evidence'];
const MISSIONS: MissionId[] = ['iss', 'cislunar'];

export function parseRoute(hash: string): Route | null {
  const path = hash.replace(/^#/, '').replace(/^\/+/, '').replace(/\/+$/, '');
  const parts = path.split('/').filter(Boolean);
  if (path === 'demo/fd30') return { view: 'fd30', page: 'today' };
  if (path === 'demo/fd30/ground/agenda') return { view: 'fd30', page: 'ground-agenda' };
  if (path === 'demo/fd30/ground/catalog') return { view: 'fd30', page: 'ground-catalog' };
  if (path === 'demo/fd30/ground/evidence') return { view: 'fd30', page: 'ground-evidence' };
  if (path === 'demo/fd30/ground') return { view: 'fd30', page: 'ground' };
  for (const page of ['sleep', 'exercise', 'laboratory', 'catalog', 'agenda', 'evidence', 'crew', 'wellbeing', 'requests'] as const) {
    if (path === `onboard/personal/${page}`) return { view: 'fd30', page };
  }
  if (parts.length === 0) return { view: 'onboard', page: 'today' };
  if (parts[0] === 'onboard') {
    const page = (parts[1] ?? 'today') as OnboardPage;
    return parts.length <= 2 && ONBOARD_PAGES.includes(page) ? { view: 'onboard', page } : null;
  }
  if (parts[0] === 'ground') {
    const missionId = parts[1] as MissionId;
    const page = (parts[2] ?? 'agenda') as GroundPage;
    return parts.length <= 3 && MISSIONS.includes(missionId) && GROUND_PAGES.includes(page) ? { view: 'ground', missionId, page } : null;
  }
  if (parts[0] === 'settings' && parts.length === 1) return { view: 'settings' };
  return null;
}

export function toHash(route: Route): string {
  switch (route.view) {
    case 'fd30': return route.page === 'today' ? '#/demo/fd30' : route.page === 'ground' ? '#/demo/fd30/ground' : route.page.startsWith('ground-') ? `#/demo/fd30/ground/${route.page.slice(7)}` : `#/onboard/personal/${route.page}`;
    case 'onboard': return `#/onboard/${route.page}`;
    case 'ground': return `#/ground/${route.missionId}/${route.page}`;
    case 'settings': return '#/settings';
    case 'notfound': return '#/not-found';
  }
}

export function navigate(route: Route): void {
  window.location.hash = toHash(route);
}

export function sameRoute(a: Route, b: Route): boolean {
  return toHash(a) === toHash(b);
}
