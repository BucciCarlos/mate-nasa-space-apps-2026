import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { GroundPage, MissionId, OnboardPage, Route } from '../state/types';
import { MISSION_IDS } from '../state/types';
import { useApp } from '../state/AppProvider';
import { localeSet, groundRoleSet, uiLastRoute } from '../state/mateSlice';
import { useLocale, useT } from '../i18n/I18nProvider';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { routePath, sameRoute } from './routes';
import { useNow } from '../state/useNow';
import { flightDay, missionTimeMs } from '../domain/time';
import { fmtTime } from '../i18n/format';

const ONBOARD_PAGES: OnboardPage[] = ['today', 'agenda', 'observations'];
const GROUND_PAGES: GroundPage[] = ['agenda', 'link', 'crew', 'log'];

export function Shell({ route, onRestart, children }: { route: Route; onRestart: () => void; children: ReactNode }) {
  const { state, dispatch } = useApp();
  const t = useT();
  const locale = useLocale();
  const now = useNow(10_000);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const isGround = route.view === 'ground';
  const missionId: MissionId = isGround ? route.missionId : 'iss';
  const mission = state.missions[missionId];
  const mNow = missionTimeMs(mission.clockStart, state.sessionStartMs, now);
  const surface = isGround ? 'ground' : 'onboard';

  // Persist the last route per perspective. Guarded by sameRoute so the effect
  // only fires on a real navigation (the Route object is recreated each render).
  useEffect(() => {
    if (route.view === 'ground' || route.view === 'onboard') {
      const last = state.ui.lastRoute[route.view];
      if (!last || !sameRoute(last, route)) dispatch(uiLastRoute(route));
    }
  }, [route, state.ui.lastRoute, dispatch]);

  const goPerspective = (view: 'ground' | 'onboard') => navigate(routePath(view === 'ground' ? state.ui.lastRoute.ground : state.ui.lastRoute.onboard));

  const segBtn = (on: boolean) => `bg-transparent text-fg border-0 px-3 py-2 font-inherit cursor-pointer${on ? ' bg-accent text-accent-fg font-semibold' : ''}`;

  return (
    <div className="min-h-screen bg-bg text-fg flex flex-col font-sans" data-surface={surface} style={{ fontSize: 'var(--base-fs)' }}>
      <a className="absolute left-[-999px] top-0 bg-accent text-accent-fg px-3 py-2 z-50 focus:left-2" href="#main">{t.a11y.skipToContent}</a>
      <header className="flex flex-wrap items-center gap-3 px-4 py-2 border-b border-line bg-bg2">
        <div className="flex flex-col mr-2"><span className="font-extrabold tracking-[0.12em] text-fs3">{t.common.appName}</span><span className="text-[11px] text-fg2">{t.common.appTagline}</span></div>
        <nav aria-label={t.common.perspectiveLabel} className="inline-flex border border-line rounded-md overflow-hidden">
          <button type="button" className={segBtn(!isGround && route.view !== 'settings')} aria-pressed={!isGround && route.view !== 'settings'} onClick={() => goPerspective('onboard')}>{t.shell.perspective.onboard}</button>
          <button type="button" className={segBtn(isGround)} aria-pressed={isGround} onClick={() => goPerspective('ground')}>{t.shell.perspective.ground}</button>
          <Link to="/demo/fd30" className="inline-flex items-center gap-1 px-3 py-2 text-fs1 rounded-md text-accent no-underline hover:underline">{t.fd30.entry}</Link>
        </nav>
        {isGround && (
          <>
            <label className="flex flex-col text-fs0 gap-0.5">
              <span className="text-fg2">{t.shell.mission.label}</span>
              <select value={route.missionId} onChange={(e) => navigate(`/ground/${e.target.value}/${route.page}`)} className="font-inherit px-2 py-1 rounded border border-line bg-bg3 text-fg">
                {MISSION_IDS.map((id) => <option key={id} value={id}>{t.shell.mission[id]}</option>)}
              </select>
            </label>
            <label className="flex flex-col text-fs0 gap-0.5" title={t.shell.role.demoNote}>
              <span className="text-fg2">{t.shell.role.label}</span>
              <select value={state.groundRole} onChange={(e) => dispatch(groundRoleSet(e.target.value as 'mission_operator' | 'medical_professional'))} className="font-inherit px-2 py-1 rounded border border-line bg-bg3 text-fg">
                <option value="mission_operator">{t.shell.role.missionOperator}</option>
                <option value="medical_professional">{t.shell.role.medicalProfessional}</option>
              </select>
              <span className="text-fg2 text-[11px]">{t.shell.role.demoNote}</span>
            </label>
          </>
        )}
        <div className={`px-3 py-1 rounded-full border border-line font-semibold ${mission.link.status === 'up' ? 'text-green' : 'text-red border-red'}`} aria-label={t.a11y.linkIndicator} role="status">
          <span aria-hidden="true">{mission.link.status === 'up' ? '●' : '○'}</span> {mission.link.status === 'up' ? t.link.up : t.link.down}
        </div>
        <div className="ml-auto text-fs1 font-mono" title={t.common.missionClock}>
          <span className="text-fg2 mr-1">{t.shell.mission[missionId]}</span> {t.common.flightDay({ day: flightDay(mission.flightDayOne, mNow) })} · {fmtTime(mNow, locale)}
        </div>
        <div className="inline-flex border border-line rounded-md overflow-hidden" role="group" aria-label={t.common.language}>
          <button type="button" className={segBtn(locale === 'en')} aria-pressed={locale === 'en'} lang="en" onClick={() => dispatch(localeSet('en'))}>EN</button> {/* i18n-ignore: language code, not translated */}
          <button type="button" className={segBtn(locale === 'es')} aria-pressed={locale === 'es'} lang="es" onClick={() => dispatch(localeSet('es'))}>ES</button> {/* i18n-ignore: language code, not translated */}
        </div>
        <div className="relative">
          <button type="button" className="px-3 py-2 text-accent bg-transparent" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>☰ <span className="sr-only">{t.common.menu}</span></button>
          {menuOpen && (
            <div className="absolute right-0 top-full bg-bg2 border border-line rounded-md shadow-lg flex flex-col min-w-50 z-50" role="menu">
              <Link role="menuitem" to="/settings" onClick={() => setMenuOpen(false)} className="px-3 py-2 text-left bg-none border-0 text-fg font-inherit cursor-pointer no-underline hover:bg-bg3">{t.common.settings}</Link>
              <button type="button" role="menuitem" className="px-3 py-2 text-left bg-none border-0 text-fg font-inherit cursor-pointer hover:bg-bg3" onClick={() => { setMenuOpen(false); onRestart(); }}>{t.common.restartScenario}</button>
            </div>
          )}
        </div>
      </header>
      {(route.view === 'onboard' || route.view === 'ground') && (
        <nav className="flex gap-1 px-4 py-2 border-b border-line bg-bg2" aria-label={t.a11y.missionNav}>
          {route.view === 'onboard'
            ? ONBOARD_PAGES.map((p) => <NavLink key={p} to={`/onboard/${p}`} className="no-underline px-3 py-1 rounded-md text-fg [&[aria-current=page]]:bg-bg3 [&[aria-current=page]]:font-semibold [&[aria-current=page]]:shadow-[inset_0_-2px_0_var(--accent)]">{t.shell.nav[p]}</NavLink>)
            : GROUND_PAGES.map((p) => <NavLink key={p} to={`/ground/${route.missionId}/${p}`} className="no-underline px-3 py-1 rounded-md text-fg [&[aria-current=page]]:bg-bg3 [&[aria-current=page]]:font-semibold [&[aria-current=page]]:shadow-[inset_0_-2px_0_var(--accent)]">{t.shell.nav[p]}</NavLink>)}
        </nav>
      )}
      {children}
      <footer className="px-4 py-2 border-t border-line mt-auto text-fg2 text-fs0">{t.common.prototypeNote}</footer>
    </div>
  );
}
