import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nProvider } from '../i18n/I18nProvider';
import { Fd30Conversation } from './Fd30Conversation';
import { describe, expect, it } from 'vitest';
import { CREW, JOHN, ONBOARD_PROFILES, OWNER, dataOwner, freshPreview, previewReduce, receivedPersonalEvents, restorePreview } from './fd30';
import { groundAgendaLanes } from './Fd30GroundAgenda';
import { wellbeingParts } from './wellbeing';
import { sleepHistory } from './history/sleep';
import { exerciseHistory } from './history/exercise';
import { laboratoryHistory } from './history/laboratory';

// MATE-CAP01: John Doe is a presentation-only profile that shows Lucía's simulated records under his own identity.
const at = (h: string) => Date.parse(`2027-03-10T${h}:00Z`);
const as = (id: typeof ONBOARD_PROFILES[number]['id'], h: string) => {
  const seeked = previewReduce(freshPreview(1000, 1), { type: 'seek', target: at(h), now: 1000 });
  return previewReduce(seeked, { type: 'select', crewId: id });
};

describe('John Doe capture profile', () => {
  it('is selectable with his own identity and the original Orbit companion; the three crew profiles are unchanged', () => {
    expect(JOHN).toMatchObject({ name: 'John Doe', character: 'Orbit', shape: 'luna' });
    expect(CREW.map(c => c.shape)).toEqual(['lira', 'flop', 'pip']);
    expect(ONBOARD_PROFILES.map(c => c.id)).toEqual([...CREW.map(c => c.id), JOHN.id]);
    expect(as(JOHN.id, '08:00').activeCrewId).toBe(JOHN.id);
    expect(dataOwner(JOHN.id)).toBe(OWNER);
  });
  it('does not widen the operational crew or Ground', () => {
    expect(CREW).toHaveLength(3);
    expect(groundAgendaLanes().map(l => l.crew.name)).toEqual(['Lucía Ferraro', 'Tomás Ibarra', 'Mei Okada']);
  });
  it.each(['06:30', '09:40', '11:45', '16:00'])('shows the same simulated metrics as Lucía at %s', h => {
    const lucia = as(OWNER, h), john = as(JOHN.id, h), time = at(h);
    expect(wellbeingParts(john, dataOwner(JOHN.id), time)).toEqual(wellbeingParts(lucia, OWNER, time));
    expect(receivedPersonalEvents(john, JOHN.id).map(e => e.id)).toEqual(receivedPersonalEvents(lucia, OWNER).map(e => e.id));
    for (const range of ['last7', 'all'] as const) {
      expect(sleepHistory(john, { perspective: 'onboard', owner: OWNER }, time, range)).toEqual(sleepHistory(lucia, { perspective: 'onboard', owner: OWNER }, time, range));
      expect(exerciseHistory(john, { perspective: 'onboard', owner: OWNER }, time, range)).toEqual(exerciseHistory(lucia, { perspective: 'onboard', owner: OWNER }, time, range));
      expect(laboratoryHistory(john, { perspective: 'onboard', owner: OWNER }, time, range)).toEqual(laboratoryHistory(lucia, { perspective: 'onboard', owner: OWNER }, time, range));
    }
  });
  it('keeps his chat, draft and position separate from Lucía', () => {
    let s = as(JOHN.id, '09:40');
    s = previewReduce(s, { type: 'draft', owner: JOHN.id, text: 'nota de John' });
    s = previewReduce(s, { type: 'position', owner: JOHN.id, position: { x: 0.2, y: 0.3 } });
    expect(s.profiles[JOHN.id]).toMatchObject({ draft: 'nota de John', position: { x: 0.2, y: 0.3 } });
    expect(s.profiles[OWNER]).toMatchObject({ draft: '', position: null });
    s = previewReduce(s, { type: 'ask', owner: JOHN.id, text: 'How did I sleep?', lang: 'en', now: 1000 });
    expect(s.profiles[JOHN.id].turns).toHaveLength(1);
    expect(s.profiles[OWNER].turns).toHaveLength(0);
    expect(previewReduce(s, { type: 'draft', owner: OWNER, text: 'late' })).toBe(s);
  });
  it('restores his profile and migrates snapshots saved before he existed', () => {
    const s = previewReduce(as(JOHN.id, '09:40'), { type: 'draft', owner: JOHN.id, text: 'kept' });
    expect(restorePreview(JSON.stringify(s), 2000)).toMatchObject({ activeCrewId: JOHN.id, profiles: { [JOHN.id]: { draft: 'kept' } } });
    const old = JSON.parse(JSON.stringify(as(OWNER, '09:40'))); delete old.profiles[JOHN.id];
    const restored = restorePreview(JSON.stringify(old), 2000);
    expect(restored.activeCrewId).toBe(OWNER); expect(restored.profiles[JOHN.id].draft).toBe('');
    const orphan = JSON.parse(JSON.stringify(s)); delete orphan.profiles[JOHN.id];
    expect(restorePreview(JSON.stringify(orphan), 2000).activeCrewId).toBe(OWNER);
  });
  it("never shows Lucía's personalised audio for him, while it stays available for Lucía", () => {
    const render = (id: typeof ONBOARD_PROFILES[number]['id']) => {
      let state = as(id, '05:55');
      state = previewReduce(state, { type: 'ask', owner: id, text: 'How did I sleep?', lang: 'en', now: 1000 });
      return renderToStaticMarkup(createElement(I18nProvider, { locale: 'en', children: createElement(Fd30Conversation, { profile: state.profiles[id], character: 'Mate', time: at('05:55'), owner: id,
        voice: { state: { status: 'idle', stage: null, key: null, error: null }, toggle: () => {} }, logRef: { current: null }, onAsk: () => {}, onDraft: () => {}, onOpen: () => {} }) }));
    };
    expect(render(OWNER)).toContain('fd-chat-audio');
    expect(render(JOHN.id)).not.toContain('fd-chat-audio');
  });
});
