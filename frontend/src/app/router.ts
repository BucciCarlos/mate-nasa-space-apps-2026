import { useLocation, useNavigate, useParams } from 'react-router';
import type { GroundPage, MissionId, OnboardPage, Route } from '../state/types';

export const ONBOARD_PAGES: OnboardPage[] = ['today', 'agenda', 'observations'];
export const GROUND_PAGES: GroundPage[] = ['agenda', 'link', 'crew', 'log'];
export const MISSIONS: MissionId[] = ['iss', 'cislunar'];

/** Maps the current URL to a Route; unknown paths → notfound. */
export function useRoute(): Route {
  const params = useParams();
  const { pathname } = useLocation();
  const segs = pathname.split('/').filter(Boolean);
  if (segs.length === 0) return { view: 'onboard', page: 'today' };
  if (segs[0] === 'onboard') {
    const page = (params.page ?? 'today') as OnboardPage;
    return segs.length <= 2 && ONBOARD_PAGES.includes(page) ? { view: 'onboard', page } : { view: 'notfound' };
  }
  if (segs[0] === 'ground') {
    const missionId = (params.missionId ?? '') as MissionId;
    const page = (params.page ?? 'agenda') as GroundPage;
    return segs.length <= 3 && MISSIONS.includes(missionId) && GROUND_PAGES.includes(page)
      ? { view: 'ground', missionId, page }
      : { view: 'notfound' };
  }
  if (segs[0] === 'settings' && segs.length === 1) return { view: 'settings' };
  return { view: 'notfound' };
}

/** Route → path (for <Link> and programmatic navigation). */
export function routePath(route: Route): string {
  switch (route.view) {
    case 'onboard': return `/onboard/${route.page}`;
    case 'ground': return `/ground/${route.missionId}/${route.page}`;
    case 'settings': return '/settings';
    case 'notfound': return '/not-found';
  }
}

/** Programmatic navigation helper (replaces window.location.hash). */
export function useGo() {
  const navigate = useNavigate();
  return (route: Route) => navigate(routePath(route));
}
