import type { AppState, Locale, MissionId, MissionState, PlanVersion, Route, ScenarioFile } from './types';

/**
 * Scenario registry. Populated at startup by AppProvider from the backend
 * (`/api/scenarios/*`) before state is created, and by tests directly.
 * No module imports scenario JSON any more — the backend is the source of truth.
 */
export const SCENARIOS: Record<MissionId, ScenarioFile> = {
  iss: null as unknown as ScenarioFile,
  cislunar: null as unknown as ScenarioFile,
};

export function setScenarios(iss: ScenarioFile, cislunar: ScenarioFile): void {
  SCENARIOS.iss = iss;
  SCENARIOS.cislunar = cislunar;
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

export function createInitialState(nowMs: number, scenarios: Record<MissionId, ScenarioFile> = SCENARIOS, locale: Locale = 'en'): AppState {
  return {
    schemaVersion: 1,
    locale,
    groundRole: 'mission_operator',
    sessionStartMs: nowMs,
    missions: {
      iss: createMissionState(scenarios.iss),
      cislunar: createMissionState(scenarios.cislunar),
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
