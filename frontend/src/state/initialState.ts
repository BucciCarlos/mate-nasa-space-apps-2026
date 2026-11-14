import type { AppState, Locale, MissionId, MissionState, PlanVersion, Route, ScenarioFile } from './types';

/**
 * Scenario registry. Populated by AppProvider from the backend
 * (`/api/scenarios/*`) before the store is created, and by tests directly.
 * No module imports scenario JSON any more — the backend is the source of truth.
 */
export const SCENARIOS: Record<MissionId, ScenarioFile | null> = {
  iss: null,
  cislunar: null,
};

export function setScenarios(iss: ScenarioFile, cislunar: ScenarioFile): void {
  SCENARIOS.iss = iss;
  SCENARIOS.cislunar = cislunar;
}

export function scenariosReady(): boolean {
  return SCENARIOS.iss !== null && SCENARIOS.cislunar !== null;
}

export const DEFAULT_ROUTES: { onboard: Route; ground: Route } = {
  onboard: { view: 'onboard', page: 'today' },
  ground: { view: 'ground', missionId: 'iss', page: 'agenda' },
};

export function createMissionState(file: ScenarioFile): MissionState {
  const plan: PlanVersion = { missionId: file.id, version: 1, blocks: file.blocks, changeId: null };
  return {
    id: file.id,
    seq: 0,
    clockStart: file.clockStart,
    flightDayOne: file.flightDayOne,
    crew: file.crew,
    onboardUserId: file.onboardUserId,
    link: { status: 'up', transitMs: file.link.transitMs, downSinceMs: null },
    ground: { plan, changes: [], inbox: [] },
    onboard: { plan, notices: [], observations: [], conversation: [] },
    messages: [],
    log: [],
  };
}

/**
 * Creates a minimal "empty" AppState that is safe to use before scenarios
 * are loaded. The UI shows a loading screen while `ready` is false.
 */
export function createEmptyState(nowMs: number, locale: Locale = 'en'): AppState {
  const emptyPlan: PlanVersion = { missionId: 'iss', version: 0, blocks: [], changeId: null };
  const emptyMission = (id: MissionId): MissionState => ({
    id,
    seq: 0,
    clockStart: new Date(nowMs).toISOString(),
    flightDayOne: new Date(nowMs).toISOString(),
    crew: [],
    onboardUserId: null,
    link: { status: 'up', transitMs: 0, downSinceMs: null },
    ground: { plan: emptyPlan, changes: [], inbox: [] },
    onboard: { plan: emptyPlan, notices: [], observations: [], conversation: [] },
    messages: [],
    log: [],
  });
  return {
    schemaVersion: 1,
    locale,
    groundRole: 'mission_operator',
    sessionStartMs: nowMs,
    missions: {
      iss: emptyMission('iss'),
      cislunar: emptyMission('cislunar'),
    },
    companion: { name: 'Mate', color: 'teal' },
    ui: {
      agendaRange: null,
      highlight: null,
      companionOpen: true,
      openSourceId: null,
      observationPrefill: null,
      lastRoute: { ...DEFAULT_ROUTES },
    },
  };
}

/**
 * Creates the initial app state from the scenario registry.
 * If scenarios are not loaded yet, returns an empty state (safe for loading screen).
 */
export function createInitialState(nowMs: number, scenarios: Record<MissionId, ScenarioFile | null> = SCENARIOS, locale: Locale = 'en'): AppState {
  const iss = scenarios.iss;
  const cislunar = scenarios.cislunar;
  if (!iss || !cislunar) {
    return createEmptyState(nowMs, locale);
  }
  return {
    schemaVersion: 1,
    locale,
    groundRole: 'mission_operator',
    sessionStartMs: nowMs,
    missions: {
      iss: createMissionState(iss),
      cislunar: createMissionState(cislunar),
    },
    companion: { name: 'Mate', color: 'teal' },
    ui: {
      agendaRange: null,
      highlight: null,
      companionOpen: true,
      openSourceId: null,
      observationPrefill: null,
      lastRoute: { ...DEFAULT_ROUTES },
    },
  };
}
