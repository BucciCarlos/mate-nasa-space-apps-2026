import { useCallback, useEffect, useState } from 'react';
import { AppProvider, useApp } from '../state/AppProvider';
import { scenarioReset } from '../state/mateSlice';
import { I18nProvider, useT } from '../i18n/I18nProvider';
import { useRoute } from './useRoute';
import { Shell } from './Shell';
import { ErrorBoundary } from './ErrorBoundary';
import { navigate } from './routes';
import { GroundAgenda } from '../views/ground/GroundAgenda';
import { GroundLink } from '../views/ground/GroundLink';
import { GroundCrew } from '../views/ground/GroundCrew';
import { GroundLog } from '../views/ground/GroundLog';
import { OnboardToday } from '../views/onboard/OnboardToday';
import { OnboardAgenda } from '../views/onboard/OnboardAgenda';
import { OnboardObservations } from '../views/onboard/OnboardObservations';
import { CompanionPanel } from '../views/onboard/CompanionPanel';
import { Settings } from '../views/Settings';

function Body() {
  const { state, ready, loadError } = useApp();
  const t = useT();
  const route = useRoute();
  const [live, setLive] = useState('');
  const announce = useCallback((text: string) => { setLive(''); window.setTimeout(() => setLive(text), 30); }, []);

  const restart = () => {
    if (window.confirm(t.common.restartConfirm)) {
      scenarioReset(Date.now());
      navigate({ view: 'onboard', page: 'today' });
    }
  };

  useEffect(() => {
    if (route.view === 'settings' || route.view === 'notfound') document.getElementById('view-h')?.focus();
  }, [route]);

  let content: React.ReactNode;
  switch (route.view) {
    case 'ground': {
      const props = { missionId: route.missionId, role: state.groundRole };
      content = route.page === 'agenda' ? <GroundAgenda {...props} /> : route.page === 'link' ? <GroundLink {...props} /> : route.page === 'crew' ? <GroundCrew {...props} /> : <GroundLog {...props} />;
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
      {!ready && (
        <div className="loading-screen" role="status">
          {loadError
            ? <>
              <h1>{t.common.loadingTitle}</h1>
              <p>{t.common.loadError}</p>
              <code className="loading-error">{loadError}</code>
            </>
            : <p>{t.common.loadingTitle}</p>}
        </div>
      )}
      {ready && (
      <Shell route={route} onRestart={restart}>
        <div className={`layout${route.view === 'onboard' ? ' has-companion' : ''}`}>
          <ErrorBoundary t={t} onRestart={() => { scenarioReset(Date.now()); navigate({ view: 'onboard', page: 'today' }); }}>
            <main id="main" className="main">{content}</main>
          </ErrorBoundary>
          {route.view === 'onboard' && <CompanionPanel announce={announce} />}
        </div>
        <div className="sr-only" aria-live="polite" aria-atomic="true" aria-label={t.a11y.liveRegion}>{live}</div>
      </Shell>
      )}
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
