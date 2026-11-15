import { useCallback, useEffect, useState } from 'react';
import { AppProvider, useApp } from '../state/AppProvider';
import { I18nProvider, useT } from '../i18n/I18nProvider';
import { useRoute } from './useRoute';
import { Shell } from './Shell';
import { ErrorBoundary } from './ErrorBoundary';
import { navigate } from './routes';
import { GroundAgenda } from '../views/ground/GroundAgenda';
import { GroundLink } from '../views/ground/GroundLink';
import { GroundCrew } from '../views/ground/GroundCrew';
import { GroundLog } from '../views/ground/GroundLog';
import { ModuleCatalog } from '../views/catalog/ModuleCatalog';
import { EvidenceSuite } from '../views/evidence/EvidenceSuite';
import { OnboardToday } from '../views/onboard/OnboardToday';
import { OnboardAgenda } from '../views/onboard/OnboardAgenda';
import { OnboardObservations } from '../views/onboard/OnboardObservations';
import { CompanionPanel } from '../views/onboard/CompanionPanel';
import { Settings } from '../views/Settings';
import { Fd30Preview } from '../demo/Fd30Preview';

function Body() {
  const { state, dispatch } = useApp();
  const t = useT();
  const route = useRoute();
  const [live, setLive] = useState('');
  const announce = useCallback((text: string) => { setLive(''); window.setTimeout(() => setLive(text), 30); }, []);

  const restart = () => {
    if (window.confirm(t.common.restartConfirm)) {
      dispatch({ type: 'scenario/reset', nowMs: Date.now() });
      navigate({ view: 'onboard', page: 'today' });
    }
  };

  useEffect(() => {
    if (route.view === 'settings' || route.view === 'notfound') document.getElementById('view-h')?.focus();
  }, [route]);

  if (route.view === 'fd30') return <Fd30Preview page={route.page} evidenceTab={route.tab} />;

  let content: React.ReactNode;
  switch (route.view) {
    case 'ground': {
      const props = { missionId: route.missionId, role: state.groundRole };
      content = route.page === 'agenda' ? <GroundAgenda {...props} /> : route.page === 'link' ? <GroundLink {...props} /> : route.page === 'crew' ? <GroundCrew {...props} /> : route.page === 'catalog' ? <ModuleCatalog perspective="ground" role={state.groundRole} /> : route.page === 'evidence' ? <EvidenceSuite perspective="ground" /> : <GroundLog {...props} />;
      break;
    }
    case 'onboard':
      content = route.page === 'today' ? <OnboardToday /> : route.page === 'agenda' ? <OnboardAgenda /> : <OnboardObservations />;
      break;
    case 'settings':
      content = <Settings onRestart={restart} />;
      break;
    default:
      content = (
        <div className="notfound">
          <h1 id="view-h" tabIndex={-1}>{t.common.notFoundTitle}</h1>
          <p>{t.common.notFoundBody}</p>
          <a className="btn btn-primary" href="#/onboard/today">{t.common.home}</a>
        </div>
      );
  }

  return (
    <I18nProvider locale={state.locale}>
      <Shell route={route} onRestart={restart}>
        <div className={`layout${route.view === 'onboard' ? ' has-companion' : ''}`}>
          <ErrorBoundary t={t} onRestart={() => { dispatch({ type: 'scenario/reset', nowMs: Date.now() }); navigate({ view: 'onboard', page: 'today' }); }}>
            <main id="main" className="main">{content}</main>
          </ErrorBoundary>
          {route.view === 'onboard' && <CompanionPanel announce={announce} />}
        </div>
        <div className="sr-only" aria-live="polite" aria-atomic="true" aria-label={t.a11y.liveRegion}>{live}</div>
      </Shell>
    </I18nProvider>
  );
}

function LocalizedBody() {
  const { state } = useApp();
  return (
    <I18nProvider locale={state.locale}>
      <Body />
    </I18nProvider>
  );
}

export function App() {
  return (
    <AppProvider>
      <LocalizedBody />
    </AppProvider>
  );
}
