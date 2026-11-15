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

  return (
    <div className="shell" data-surface={surface}>
      <a className="skip" href="#main">{t.a11y.skipToContent}</a>
      <header className="topbar">
        <div className="brand"><span className="wordmark">{t.common.appName}</span><span className="brand-sub">{t.common.appTagline}</span></div>
        <nav aria-label={t.common.perspectiveLabel} className="seg">
          <button type="button" className={`seg-btn${!isGround && route.view !== 'settings' ? ' is-on' : ''}`} aria-pressed={!isGround && route.view !== 'settings'} onClick={() => goPerspective('onboard')}>{t.shell.perspective.onboard}</button>
          <button type="button" className={`seg-btn${isGround ? ' is-on' : ''}`} aria-pressed={isGround} onClick={() => goPerspective('ground')}>{t.shell.perspective.ground}</button>
          <Link to="/demo/fd30" className="btn btn-ghost btn-sm">{t.fd30.entry}</Link>
        </nav>
        {isGround && (
          <>
            <label className="ctl">
              <span className="ctl-label">{t.shell.mission.label}</span>
              <select value={route.missionId} onChange={(e) => navigate(`/ground/${e.target.value}/${route.page}`)}>
                {MISSION_IDS.map((id) => <option key={id} value={id}>{t.shell.mission[id]}</option>)}
              </select>
            </label>
            <label className="ctl" title={t.shell.role.demoNote}>
              <span className="ctl-label">{t.shell.role.label}</span>
              <select value={state.groundRole} onChange={(e) => dispatch(groundRoleSet(e.target.value as 'mission_operator' | 'medical_professional'))}>
                <option value="mission_operator">{t.shell.role.missionOperator}</option>
                <option value="medical_professional">{t.shell.role.medicalProfessional}</option>
              </select>
              <span className="ctl-note">{t.shell.role.demoNote}</span>
            </label>
          </>
        )}
        <div className={`link-ind link-${mission.link.status}`} aria-label={t.a11y.linkIndicator} role="status">
          <span aria-hidden="true">{mission.link.status === 'up' ? '●' : '○'}</span> {mission.link.status === 'up' ? t.link.up : t.link.down}
        </div>
        <div className="clock mono" title={t.common.missionClock}>
          <span className="clock-mission">{t.shell.mission[missionId]}</span> {t.common.flightDay({ day: flightDay(mission.flightDayOne, mNow) })} · {fmtTime(mNow, locale)}
        </div>
        <div className="seg" role="group" aria-label={t.common.language}>
          <button type="button" className={`seg-btn${locale === 'en' ? ' is-on' : ''}`} aria-pressed={locale === 'en'} lang="en" onClick={() => dispatch(localeSet('en'))}>EN</button> {/* i18n-ignore: language code, not translated */}
          <button type="button" className={`seg-btn${locale === 'es' ? ' is-on' : ''}`} aria-pressed={locale === 'es'} lang="es" onClick={() => dispatch(localeSet('es'))}>ES</button> {/* i18n-ignore: language code, not translated */}
        </div>
        <div className="menu">
          <button type="button" className="btn btn-ghost" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>☰ <span className="sr-only">{t.common.menu}</span></button>
          {menuOpen && (
            <div className="menu-pop" role="menu">
              <Link role="menuitem" to="/settings" onClick={() => setMenuOpen(false)}>{t.common.settings}</Link>
              <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onRestart(); }}>{t.common.restartScenario}</button>
            </div>
          )}
        </div>
      </header>
      {(route.view === 'onboard' || route.view === 'ground') && (
        <nav className="subnav" aria-label={t.a11y.missionNav}>
          {route.view === 'onboard'
            ? ONBOARD_PAGES.map((p) => <NavLink key={p} to={`/onboard/${p}`} aria-current="page">{t.shell.nav[p]}</NavLink>)
            : GROUND_PAGES.map((p) => <NavLink key={p} to={`/ground/${route.missionId}/${p}`} aria-current="page">{t.shell.nav[p]}</NavLink>)}
        </nav>
      )}
      {children}
      <footer className="foot muted small">{t.common.prototypeNote}</footer>
    </div>
  );
}
