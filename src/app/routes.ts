import type { GroundPage, MissionId, OnboardPage, Route } from '../state/types';

const ONBOARD_PAGES: OnboardPage[] = ['today', 'agenda', 'observations'];
const GROUND_PAGES: GroundPage[] = ['agenda', 'link', 'crew', 'log'];
const MISSIONS: MissionId[] = ['iss', 'cislunar'];

export function parseRoute(hash: string): Route | null {
  const path = hash.replace(/^#/, '').replace(/^\/+/, '').replace(/\/+$/, '');
  const parts = path.split('/').filter(Boolean);
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
