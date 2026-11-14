import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createHashRouter, RouterProvider, Outlet, useNavigate, useParams } from 'react-router-dom';
import type { GroundRole, MissionId } from './state/types';
import { useApp } from './state/AppProvider';
import { scenarioReset } from './state/mateSlice';
import { App, NotFound } from './app/App';
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
import './styles/tokens.css';
import './styles/base.css';
import './styles/ground.css';
import './styles/onboard.css';
import './styles/fd30.css';

// HashRouter keeps refresh/deep-link working when the SPA is served from the
// backend (Vercel single origin) without server-side route configuration.
// <App/> is the layout (providers + Shell); each page renders inside its <Outlet/>.
function Layout() {
  return (
    <App>
      <Outlet />
    </App>
  );
}

// Ground views need the missionId (from the URL) and the ground role (from
// state). These thin wrappers resolve both so the route table stays declarative.
function useGroundProps() {
  const { missionId } = useParams();
  const { state } = useApp();
  return { missionId: missionId as MissionId, role: state.groundRole as GroundRole };
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

const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <OnboardToday /> },
      { path: 'demo/fd30', element: <Fd30Preview page="today" /> },
      { path: 'onboard/personal/sleep', element: <Fd30Preview page="sleep" /> },
      { path: 'onboard', element: <OnboardToday /> },
      ...onboardPages.map((p) => ({ path: `onboard/${p.page}`, element: p.element })),
      ...MISSIONS.flatMap((m) =>
        groundPages.map((p) => ({ path: `ground/${m}/${p.page}`, element: p.element })),
      ),
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
