import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Outlet, useNavigate, useParams } from 'react-router-dom';
import type { GroundRole, MissionId } from './state/types';
import { useApp } from './state/AppProvider';
import { scenarioReset } from './state/mateSlice';
import { App, NotFound } from './app/App';
import { AppProvider, useAppSelector } from './state/AppProvider';
import { I18nProvider } from './i18n/I18nProvider';
import { GROUND_PAGES, MISSIONS, ONBOARD_PAGES } from './app/routes';
import { GroundAgenda } from './views/ground/GroundAgenda';
import { GroundCrew } from './views/ground/GroundCrew';
import { GroundLink } from './views/ground/GroundLink';
import { GroundLog } from './views/ground/GroundLog';
import { OnboardAgenda } from './views/onboard/OnboardAgenda';
import { OnboardObservations } from './views/onboard/OnboardObservations';
import { OnboardToday } from './views/onboard/OnboardToday';
import { Settings } from './views/Settings';
import { Fd30Preview } from './demo/Fd30Preview';
import './styles/index.css';

// BrowserRouter: the backend serves the SPA with a catch-all fallback to
// index.html for any non-API route, so refresh/deep-link works on clean URLs.
// <App/> is the layout (providers + Shell); each page renders inside its <Outlet/>.
function Layout() {
  return (
    <App>
      <Outlet />
    </App>
  );
}

// The FD30 demo ships its own full-page layout (header, demo bar, footer),
// so it renders with the providers but WITHOUT the M1 Shell chrome —
// otherwise it would appear as a nested layout inside the app frame.
function Fd30I18n() {
  const state = useAppSelector((s) => s.mate) as { locale: import('./state/types').Locale };
  return (
    <I18nProvider locale={state.locale}>
      <Outlet />
    </I18nProvider>
  );
}

function Fd30Layout() {
  return (
    <AppProvider>
      <Fd30I18n />
    </AppProvider>
  );
}

// Ground views need the missionId (from the URL) and the ground role (from
// state). These thin wrappers resolve both so the route table stays declarative.
function useGroundProps() {
  const { missionId } = useParams();
  const { state } = useApp();
  // The route param is only trusted when it is one of the known missions;
  // otherwise fall back to the ISS mission so a malformed deep link can
  // never crash the views.
  const id: MissionId = MISSIONS.includes(missionId as MissionId) ? (missionId as MissionId) : 'iss';
  return { missionId: id, role: state.groundRole as GroundRole };
}

function GroundAgendaPage() { const p = useGroundProps(); return <GroundAgenda {...p} />; }
function GroundLinkPage() { const p = useGroundProps(); return <GroundLink {...p} />; }
function GroundCrewPage() { const p = useGroundProps(); return <GroundCrew {...p} />; }
function GroundLogPage() { const p = useGroundProps(); return <GroundLog {...p} />; }

function SettingsPage() {
  const navigate = useNavigate();
  const restart = () => { scenarioReset(Date.now()); navigate('/onboard/today'); };
  return <Settings onRestart={restart} />;
}

const groundPages: { page: (typeof GROUND_PAGES)[number]; element: React.ReactNode }[] = [
  { page: 'agenda', element: <GroundAgendaPage /> },
  { page: 'link', element: <GroundLinkPage /> },
  { page: 'crew', element: <GroundCrewPage /> },
  { page: 'log', element: <GroundLogPage /> },
];

const onboardPages: { page: (typeof ONBOARD_PAGES)[number]; element: React.ReactNode }[] = [
  { page: 'today', element: <OnboardToday /> },
  { page: 'agenda', element: <OnboardAgenda /> },
  { page: 'observations', element: <OnboardObservations /> },
];

const router = createBrowserRouter([
  {
    path: '/demo/fd30',
    element: <Fd30Layout />,
    children: [{ index: true, element: <Fd30Preview page="today" /> }],
  },
  {
    path: '/onboard/personal',
    element: <Fd30Layout />,
    children: [
      { path: 'sleep', element: <Fd30Preview page="sleep" /> },
      { path: 'exercise', element: <Fd30Preview page="exercise" /> },
      { path: 'laboratory', element: <Fd30Preview page="laboratory" /> },
    ],
  },
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <OnboardToday /> },
      { path: 'onboard', element: <OnboardToday /> },
      ...onboardPages.map((p) => ({ path: `onboard/${p.page}`, element: p.element })),
      ...groundPages.map((p) => ({ path: `ground/:missionId/${p.page}`, element: p.element })),
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
