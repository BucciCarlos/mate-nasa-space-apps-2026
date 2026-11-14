import type { AppState, Locale, MissionId, MissionState, PlanVersion, Route, ScenarioFile } from './types';
import issScenario from '../data/scenario/iss.json';
import cislunarScenario from '../data/scenario/cislunar.json';

export const SCENARIOS: Record<MissionId, ScenarioFile> = {
  iss: issScenario as ScenarioFile,
  cislunar: cislunarScenario as ScenarioFile,
};

export const DEFAULT_ROUTES: { onboard: Route; ground: Route } = {
  onboard: { view: 'onboard', page: 'wellbeing' },
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

export function createInitialState(nowMs: number, locale: Locale = 'en'): AppState {
  return {
    schemaVersion: 1,
    locale,
    groundRole: 'mission_operator',
    sessionStartMs: nowMs,
    missions: {
      iss: createMissionState(SCENARIOS.iss),
      cislunar: createMissionState(SCENARIOS.cislunar),
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
