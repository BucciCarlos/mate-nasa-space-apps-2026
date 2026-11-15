import { useCallback, useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppProvider, useApp } from '../state/AppProvider';
import { scenarioReset } from '../state/mateSlice';
import { I18nProvider, useT } from '../i18n/I18nProvider';
import { parsePath } from './routes';
import { Shell } from './Shell';
import { ErrorBoundary } from './ErrorBoundary';
import { CompanionPanel } from '../views/onboard/CompanionPanel';

export function NotFound() {
  const t = useT();
  return (
    <div>
      <h1 id="view-h" tabIndex={-1}>{t.common.notFoundTitle}</h1>
      <p>{t.common.notFoundBody}</p>
      <Link className="inline-flex items-center gap-2 px-4 py-2 rounded-md font-bold bg-accent text-accent-fg no-underline" to="/onboard/today">{t.common.home}</Link>
    </div>
  );
}

function Body({ children }: { children?: React.ReactNode }) {
  const { state, ready, loadError } = useApp();
  const t = useT();
  const location = useLocation();
  const navigate = useNavigate();
  const route = parsePath(location.pathname);
  const [live, setLive] = useState('');
  const announce = useCallback((text: string) => { setLive(''); window.setTimeout(() => setLive(text), 30); }, []);

  const restart = () => {
    if (window.confirm(t.common.restartConfirm)) {
      scenarioReset(Date.now());
      navigate('/onboard/today');
    }
  };

  useEffect(() => {
    if (route.view === 'settings' || route.view === 'notfound') document.getElementById('view-h')?.focus();
  }, [route]);

  return (
    <I18nProvider locale={state.locale}>
      {!ready && (
        <div className="min-h-screen flex flex-col items-center justify-center gap-2 bg-bg text-fg text-center p-4" role="status">
          {loadError
            ? <>
              <h1>{t.common.loadingTitle}</h1>
              <p>{t.common.loadError}</p>
              <code className="text-red font-mono text-fs0">{loadError}</code>
            </>
            : <p>{t.common.loadingTitle}</p>}
        </div>
      )}
      {ready && (
      <Shell route={route} onRestart={restart}>
        <div className={`flex-1 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4 p-4 items-start`}>
          <ErrorBoundary t={t} onRestart={() => { scenarioReset(Date.now()); navigate('/onboard/today'); }}>
            <main id="main" className="min-w-0">{children ?? <Outlet />}</main>
          </ErrorBoundary>
          {route.view === 'onboard' ? <CompanionPanel announce={announce} /> : <div className="hidden xl:block" aria-hidden="true" />}
        </div>
        <div className="sr-only" aria-live="polite" aria-atomic="true" aria-label={t.a11y.liveRegion}>{live}</div>
      </Shell>
      )}
    </I18nProvider>
  );
}

// Body (inside AppProvider) wraps its content in I18nProvider with the
// store's locale, so the i18n context re-renders when localeSet fires.
export function App({ children }: { children?: React.ReactNode }) {
  return (
    <AppProvider>
      <Body>{children}</Body>
    </AppProvider>
  );
}
