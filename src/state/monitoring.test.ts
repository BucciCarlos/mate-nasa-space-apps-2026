import { describe, expect, it } from 'vitest';
import { monitoringSeries } from '../domain/monitoring';
import { createInitialState } from './initialState';
import { reduce } from './reducer';
import { deserialize, serialize } from './persistence';
import {
  selectCommander, selectCompanionPreferences, selectDeliveredMedicalReviews, selectGroundLinkRows,
  selectMonitoringProfile, selectOnboard, selectOwnMedicalReviews,
} from './selectors';

const start = 1_000_000;
const lucia = 'iss:crew-lf';
const tomas = 'iss:crew-ti';

describe('flight monitoring', () => {
  it('persists private wellbeing records without adding anything to the mission link', () => {
    let state = createInitialState(start);
    const entry = { atMs: start, feeling: 'tense', stress: 4 } as const;
    expect(reduce(state, { type: 'wellbeing/check_in', crewId: tomas, entry })).toBe(state);
    expect(reduce(state, { type: 'wellbeing/check_in', crewId: lucia, entry: { ...entry, stress: 6 } })).toBe(state);
    state = reduce(state, { type: 'wellbeing/check_in', crewId: lucia, entry });
    state = reduce(state, { type: 'wellbeing/note', crewId: lucia, note: { text: 'private wellbeing note', lang: 'en' }, atMs: start });
    state = reduce(state, { type: 'wellbeing/hobby', crewId: lucia, hobby: 'music' });
    state = reduce(state, { type: 'wellbeing/decision', crewId: lucia, activity: 'breathing', decision: 'dismissed', atMs: start });
    state = reduce(state, { type: 'wellbeing/family_read', crewId: lucia });
    state = deserialize(serialize(state))!;
    expect(selectMonitoringProfile(state, lucia).wellbeing).toMatchObject({
      checkIns: [entry], hobby: 'music', familyRead: true, decisions: [{ activity: 'breathing', decision: 'dismissed' }],
    });
    state = reduce(state, { type: 'monitoring/profile_selected', crewId: tomas });
    expect(selectMonitoringProfile(state, tomas).wellbeing).toBeUndefined();
    expect(selectGroundLinkRows(state, 'iss', 'medical_professional')).toEqual([]);
    expect(selectDeliveredMedicalReviews(state, 'iss', 'medical_professional')).toEqual([]);
  });
  it('keeps legacy memory, private entries, stage and avatar preferences with the correct profile', () => {
    let state = createInitialState(start);
    state.missions.iss.onboard.conversation = [{ id: 'legacy', atMs: start, speaker: 'user' }];
    state = reduce(state, { type: 'monitoring/companion_saved', preferences: { name: 'Nova', color: 'blue', avatar: 'initial', style: 'brief' } });
    state = reduce(state, { type: 'monitoring/stage_set', stage: 'training' });
    state = reduce(state, { type: 'monitoring/activity_saved', crewId: lucia, metric: 'sleep', kind: 'journal', note: { text: 'private', lang: 'en' }, nowMs: start });
    state = reduce(state, { type: 'monitoring/profile_selected', crewId: tomas });
    expect(selectOnboard(state).conversation).toEqual([]);
    expect(selectMonitoringProfile(state, tomas).activities).toEqual([]);
    expect(selectCompanionPreferences(state, tomas).name).toBe('Mate');
    expect(reduce(state, { type: 'monitoring/activity_saved', crewId: lucia, metric: 'sleep', kind: 'personal_break', nowMs: start })).toBe(state);
    state = reduce(state, { type: 'monitoring/profile_selected', crewId: lucia });
    state = deserialize(serialize(state))!;
    expect(selectOnboard(state).conversation[0].id).toBe('legacy');
    expect(selectMonitoringProfile(state, lucia)).toMatchObject({ stage: 'training', activities: [{ note: { text: 'private' } }] });
    expect(selectCompanionPreferences(state, lucia)).toMatchObject({ name: 'Nova', avatar: 'initial' });
  });

  it('keeps a review private while queued or in transit and projects it only to the medical role after delivery', () => {
    let state = createInitialState(start);
    const request = { type: 'monitoring/review_requested', crewId: lucia, metric: 'reaction', consent: true, nowMs: start } as const;
    state = reduce(state, { type: 'link/status_set', missionId: 'iss', status: 'down', nowMs: start });
    state = reduce(state, request);
    expect(selectOwnMedicalReviews(state)[0]).toMatchObject({ status: 'queued', sample: { value: 310, source: 'simulated' } });
    state = deserialize(serialize(state))!;
    expect(selectDeliveredMedicalReviews(state, 'iss', 'medical_professional')).toEqual([]);
    expect(selectGroundLinkRows(state, 'iss', 'medical_professional')[0]).not.toHaveProperty('sample');
    expect(selectGroundLinkRows(state, 'iss', 'medical_professional')[0]).not.toHaveProperty('crewId');
    expect(selectCommander(state, 'iss')).not.toHaveProperty('messages');
    state = reduce(state, { type: 'link/status_set', missionId: 'iss', status: 'up', nowMs: start + 5_000 });
    expect(selectOwnMedicalReviews(state)[0].status).toBe('in_transit');
    expect(selectDeliveredMedicalReviews(state, 'iss', 'medical_professional')).toEqual([]);
    state = reduce(state, { type: 'clock/tick', nowMs: start + 10_000 });
    expect(selectDeliveredMedicalReviews(state, 'iss', 'medical_professional')).toMatchObject([{ crewId: lucia, sample: { value: 310 } }]);
    expect(selectDeliveredMedicalReviews(state, 'iss', 'mission_operator')).toEqual([]);
    expect(selectDeliveredMedicalReviews(state, 'cislunar', 'medical_professional')).toEqual([]);
  });

  it('uses separate baselines and preserves missing samples', () => {
    expect(monitoringSeries(lucia, 'reaction').mean).toBe(270);
    expect(monitoringSeries(tomas, 'reaction').mean).toBe(280);
    expect(monitoringSeries(tomas, 'reaction').flight[2].value).toBeNull();
    expect(monitoringSeries('other', 'reaction').mean).toBeNull();
  });
});
