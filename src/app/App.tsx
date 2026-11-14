import { useCallback, useEffect, useState } from 'react';
import { AppProvider, useApp } from '../state/AppProvider';
import { I18nProvider, useT } from '../i18n/I18nProvider';
import { useRoute } from './useRoute';
import { Shell } from './Shell';
import { ErrorBoundary } from './ErrorBoundary';
import { navigate } from './routes';
import { GroundAgenda } from '../views/ground/GroundAgenda';
import { OperationsHeader } from '../views/ground/OperationsHeader';
import { Commander } from '../views/ground/Commander';
import { GroundLink } from '../views/ground/GroundLink';
import { GroundCrew } from '../views/ground/GroundCrew';
import { GroundLog } from '../views/ground/GroundLog';
import { OnboardToday } from '../views/onboard/OnboardToday';
import { OnboardAgenda } from '../views/onboard/OnboardAgenda';
import { OnboardObservations } from '../views/onboard/OnboardObservations';
import { FlightMonitoring } from '../views/onboard/FlightMonitoring';
import { MissionWellbeing } from '../views/onboard/MissionWellbeing';
import { CompanionPanel } from '../views/onboard/CompanionPanel';
import { Settings } from '../views/Settings';

function Body() {
  const { state, dispatch } = useApp();
  const t = useT();
  const route = useRoute();
  const isOnboard = route.view === 'onboard';
  const [live, setLive] = useState('');
  const announce = useCallback((text: string) => { setLive(''); window.setTimeout(() => setLive(text), 30); }, []);

  const restart = () => {
    if (window.confirm(t.common.restartConfirm)) {
      dispatch({ type: 'scenario/reset', nowMs: Date.now() });
      navigate({ view: 'onboard', page: 'wellbeing' });
    }
  };

  useEffect(() => {
    if (route.view === 'settings' || route.view === 'notfound') document.getElementById('view-h')?.focus();
  }, [route]);

  let content: React.ReactNode;
  switch (route.view) {
    case 'ground': {
      const props = { missionId: route.missionId, role: state.groundRole };
      content = route.page === 'commander' ? <Commander missionId={route.missionId} /> : route.page === 'agenda' ? <GroundAgenda {...props} /> : route.page === 'link' ? <GroundLink {...props} /> : route.page === 'crew' ? <GroundCrew {...props} /> : <GroundLog {...props} />;
      break;
    }
    case 'onboard':
      content = route.page === 'wellbeing' ? <MissionWellbeing key={state.missions.iss.onboardUserId} /> :
        route.page === 'monitoring' ? <FlightMonitoring key={state.missions.iss.onboardUserId} /> :
        route.page === 'today' ? <OnboardToday /> : route.page === 'agenda' ? <OnboardAgenda /> : <OnboardObservations />;
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
        <div className={`layout${isOnboard ? ' onboard-layout' : ''}`} data-companion={isOnboard ? (state.ui.companionOpen ? 'open' : 'collapsed') : undefined}>
          <ErrorBoundary t={t} onRestart={() => { dispatch({ type: 'scenario/reset', nowMs: Date.now() }); navigate({ view: 'onboard', page: 'wellbeing' }); }}>
            <main id="main" className="main">
              {route.view === 'ground' && <OperationsHeader missionId={route.missionId} page={route.page} />}
              {content}
            </main>
          </ErrorBoundary>
          {route.view === 'onboard' && <CompanionPanel key={state.missions.iss.onboardUserId} announce={announce} />}
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
