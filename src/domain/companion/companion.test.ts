import { describe, expect, it } from 'vitest';
import { matchIntent } from './intents';
import { respond } from './respond';
import { createInitialState } from '../../state/initialState';
import { reduce } from '../../state/reducer';
import { en } from '../../i18n/en';
import { es } from '../../i18n/es';
import { renderReply } from '../../i18n/companionText';
import type { CompanionReply, CompanionTemplateId, IntentId } from '../../state/types';

const T0 = 1_000_000;

describe('U-COMP-01 matchIntent', () => {
  const samples: Record<Exclude<IntentId, 'unknown'>, string[]> = {
    'monitoring.explain': ['Flight metrics', 'my metrics', 'explain metrics', 'Métricas en vuelo', 'Mis métricas', 'Explicame las métricas'],
    'schedule.show_change': ['Show me', 'show the change', 'Open my agenda', 'Mostrame', 'Mostrame qué cambió', 'Abrí la agenda'],
    'rest.effect_on_me': ['How will this affect me?', 'will i sleep', 'How did I sleep?', '¿Cómo me va a afectar?', 'como me afecta', '¿Voy a dormir?'],
    'rest.how_much': ['How much rest do I lose?', 'how much sleep', 'rest window?', '¿Cuánto descanso pierdo?', 'cuanto sueño', 'Ventana de descanso'],
    'why.it_matters': ['Why does this matter?', 'why', 'does it matter', '¿Por qué importa?', 'por que', '¿Por qué?'],
    'schedule.what_changed': ['What changed?', "what's new", 'schedule change', '¿Qué cambió?', 'que cambio', '¿Qué hay de nuevo?'],
    'observation.start': ['I want to log something', 'record an observation', 'how I feel', 'Quiero registrar algo', 'anotar', 'Cómo me siento'],
    'privacy.who_sees': ['Who can see my notes?', 'who sees this', 'privacy', '¿Quién ve mis notas?', 'quien puede ver', 'Privacidad'],
    'link.status': ['Is there a link?', 'connection?', 'signal', '¿Hay enlace?', 'conexion', '¿Hay señal?'],
    help: ['Help', 'what can you do', 'options', 'Ayuda', 'que podes hacer', 'Opciones'],
  };
  for (const [intent, phrases] of Object.entries(samples)) {
    it(intent, () => { for (const p of phrases) expect(matchIntent(p), p).toBe(intent); });
  }
  it('nonsense → unknown', () => {
    expect(matchIntent('qwerty')).toBe('unknown');
    expect(matchIntent('   ')).toBe('unknown');
    expect(matchIntent('asdf jkl')).toBe('unknown');
  });
});

describe('U-COMP-02', () => {
  it('rest.effect_on_me without records → no_evidence and no numeric params', () => {
    let s = createInitialState(T0);
    s = reduce(s, { type: 'plan/change_sent', missionId: 'iss', taskId: 'iss:blk-16', advanceMinutes: 90, nowMs: T0 });
    s = reduce(s, { type: 'clock/tick', nowMs: T0 + 5000 });
    const r = respond(s, 'iss', 'rest.effect_on_me');
    expect(r.status).toBe('no_evidence');
    expect(r.templateId).toBe('noComparableRecords');
    expect(Object.values(r.params).some((v) => typeof v === 'number')).toBe(false);
  });
  it('show_change selects the A5 range and highlights the change; what_changed reports link down', () => {
    let s = createInitialState(T0);
    s = reduce(s, { type: 'plan/change_sent', missionId: 'iss', taskId: 'iss:blk-16', advanceMinutes: 90, nowMs: T0 });
    s = reduce(s, { type: 'clock/tick', nowMs: T0 + 5000 });
    const r = respond(s, 'iss', 'schedule.show_change');
    expect(r.actions).toEqual([
      { type: 'navigate', route: { view: 'onboard', page: 'agenda' } },
      { type: 'select_range', range: { start: '2027-03-09T20:30:00Z', end: '2027-03-10T10:00:00Z' } },
      { type: 'highlight', target: { kind: 'change', changeId: 'iss:chg-1' } },
    ]);
    expect(respond(createInitialState(T0), 'iss', 'schedule.show_change').templateId).toBe('changeNone');
    s = reduce(s, { type: 'link/status_set', missionId: 'iss', status: 'down', nowMs: T0 + 6000 });
    const w = respond(s, 'iss', 'schedule.what_changed');
    expect(w.params.linkDownSinceMs).toBe(T0 + 6000);
    expect(renderReply(w, s, 'iss', 'en', en)).toContain('may be waiting');
    expect(respond(reduce(createInitialState(T0), { type: 'link/status_set', missionId: 'iss', status: 'down', nowMs: T0 }), 'iss', 'schedule.what_changed').templateId).toBe('changeNoneLinkDown');
  });
});

describe('U-COMP-03 templates render in both languages', () => {
  it('every template renders a non-empty string', () => {
    let s = createInitialState(T0);
    s = reduce(s, { type: 'plan/change_sent', missionId: 'iss', taskId: 'iss:blk-16', advanceMinutes: 90, nowMs: T0 });
    s = reduce(s, { type: 'clock/tick', nowMs: T0 + 5000 });
    s = reduce(s, { type: 'link/status_set', missionId: 'iss', status: 'down', nowMs: T0 + 6000 });
    const ids: CompanionTemplateId[] = ['changeSummary', 'changeNone', 'changeNoneLinkDown', 'showChange', 'restDelta', 'restUnchanged', 'noComparableRecords', 'whyItMatters', 'observationStart', 'whoSees', 'linkUp', 'linkDown', 'help', 'notUnderstood'];
    const params = {
      noticeId: 'iss:ntc-1', taskId: 'iss:blk-16', advanceMinutes: 90, deltaMinutes: -90, hasRest: 1, linkDownSinceMs: T0 + 6000,
      beforeStart: '2027-03-09T21:30:00Z', beforeEnd: '2027-03-10T06:00:00Z', afterStart: '2027-03-09T21:30:00Z', afterEnd: '2027-03-10T04:30:00Z',
    };
    for (const id of ids) {
      const r: CompanionReply = { templateId: id, params, status: 'ok', sourceIds: [], actions: [], executed: false };
      for (const [locale, t] of [['en', en], ['es', es]] as const) {
        const out = renderReply(r, s, 'iss', locale, t);
        expect(out.length, `${id}/${locale}`).toBeGreaterThan(0);
        expect(out, `${id}/${locale}`).not.toContain('undefined');
      }
    }
    const rd: CompanionReply = { templateId: 'restDelta', params, status: 'ok', sourceIds: [], actions: [], executed: false };
    expect(renderReply(rd, s, 'iss', 'en', en)).toContain('8 h 30 min');
    expect(renderReply(rd, s, 'iss', 'es', es)).toContain('−1 h 30 min');
  });
});
