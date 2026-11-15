import type { Route } from '../state/types';
import { parseRoute, toHash } from './routes';

export type Fd30Route = Extract<Route, { view: 'fd30' }>;
export type Fd30Page = Fd30Route['page'];
const onboardPages = ['today', 'sleep', 'exercise', 'laboratory', 'agenda', 'crew', 'wellbeing', 'requests', 'catalog', 'evidence'] as const;
export type OnboardFd30Page = typeof onboardPages[number];
// Retain the existing session key; it now also accepts reference sections.
export const LAST_ONBOARD_KEY = 'mate:fd30:last-operational:v1';
export const isOnboardPage = (page: string): page is OnboardFd30Page => onboardPages.some(p => p === page);
export const restoredOnboardPage = (raw: string | null): OnboardFd30Page => raw && isOnboardPage(raw) ? raw : 'today';
export const isGroundPage = (page: Fd30Page) => page === 'ground' || page.startsWith('ground-');

/** Public boundary only. The legacy parser/contracts remain available to internal M1 tests. */
export function publicRoute(hash: string): Fd30Route {
  const parsed = parseRoute(hash);
  if (parsed?.view === 'fd30') return parsed;
  const path = hash.replace(/^#/, '').replace(/^\/+/, '').replace(/\/+$/, '');
  if (path === 'sources') return { view: 'fd30', page: 'evidence' };
  if (path.startsWith('demo/fd30/ground')) return { view: 'fd30', page: 'ground' };
  if (path.startsWith('ground')) {
    const section = path.split('/')[2] ?? (parsed?.view === 'ground' ? parsed.page : undefined);
    const page = section === 'agenda' ? 'ground-agenda' : section === 'catalog' || section === 'modules' ? 'ground-catalog'
      : section === 'evidence' || section === 'sources' ? 'ground-evidence' : 'ground';
    return { view: 'fd30', page };
  }
  const section = path.startsWith('onboard/personal/') ? path.split('/')[2] : path.split('/')[1];
  const page = section === 'modules' ? 'catalog' : section === 'observations' ? 'wellbeing' : section === 'sources' ? 'evidence'
    : section && ['today', 'sleep', 'exercise', 'laboratory', 'agenda', 'crew', 'wellbeing', 'requests', 'catalog', 'evidence'].includes(section)
      ? section as Fd30Page : 'today';
  return { view: 'fd30', page };
}

export function publicHash(hash: string): string { return toHash(publicRoute(hash)); }
