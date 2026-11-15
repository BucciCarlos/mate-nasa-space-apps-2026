import type { GroundPage, MissionId, OnboardPage, Route } from '../state/types';

export const ONBOARD_PAGES: OnboardPage[] = ['today', 'agenda', 'observations'];
export const GROUND_PAGES: GroundPage[] = ['agenda', 'link', 'crew', 'log'];
export const MISSIONS: MissionId[] = ['iss', 'cislunar'];

/** Route → path (for <Link>, <NavLink> and programmatic navigation). */
export function routePath(route: Route): string {
  switch (route.view) {
    case 'onboard': return `/onboard/${route.page}`;
    case 'ground': return `/ground/${route.missionId}/${route.page}`;
    case 'fd30': return route.page === 'today' ? '/demo/fd30' : `/onboard/personal/${route.page}`;
    case 'settings': return '/settings';
    case 'notfound': return '/not-found';
  }
}

/** Path → Route; unknown paths → notfound. The router renders by path; this
 *  derives the app-level Route from the matched path. */
export function parsePath(pathname: string): Route {
  const segs = pathname.split('/').filter(Boolean);
  if (segs.length === 0) return { view: 'onboard', page: 'today' };
  if (segs[0] === 'demo' && segs[1] === 'fd30' && segs.length === 2) return { view: 'fd30', page: 'today' };
  if (segs[0] === 'onboard' && segs[1] === 'personal' && segs.length === 3 && (['sleep', 'exercise', 'laboratory'] as const).includes(segs[2] as 'sleep')) return { view: 'fd30', page: segs[2] as 'sleep' | 'exercise' | 'laboratory' };
  if (segs[0] === 'onboard') {
    const page = (segs[1] ?? 'today') as OnboardPage;
    return segs.length <= 2 && ONBOARD_PAGES.includes(page) ? { view: 'onboard', page } : { view: 'notfound' };
  }
  if (segs[0] === 'ground') {
    const missionId = segs[1] as MissionId;
    const page = (segs[2] ?? 'agenda') as GroundPage;
    return segs.length <= 3 && MISSIONS.includes(missionId) && GROUND_PAGES.includes(page)
      ? { view: 'ground', missionId, page }
      : { view: 'notfound' };
  }
  if (segs[0] === 'settings' && segs.length === 1) return { view: 'settings' };
  return { view: 'notfound' };
}

export function sameRoute(a: Route, b: Route): boolean {
  return routePath(a) === routePath(b);
}
