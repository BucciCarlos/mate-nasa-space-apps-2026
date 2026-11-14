// Intent matching: docs/specs/02-architecture-contracts.md §8.1–§8.2
import type { IntentId } from '../../state/types';
import { INTENT_PRIORITY } from '../../state/types';

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const PHRASES: Record<Exclude<IntentId, 'unknown'>, string[]> = {
  'schedule.show_change': [
    'show me', 'show the change', 'show', 'open my agenda', 'open agenda', 'show me what changed',
    'mostrame', 'muestrame', 'mostrar', 'abri la agenda', 'abrir agenda', 'ver el cambio', 'mostrame que cambio',
  ],
  'rest.effect_on_me': [
    'affect me', 'how will this affect', 'will i sleep', 'how did i sleep', 'impact on me',
    'me va a afectar', 'como me afecta', 'voy a dormir', 'como dormi', 'me afecta',
  ],
  'rest.how_much': [
    'how much rest', 'how much sleep', 'rest window', 'lose',
    'cuanto descanso', 'cuanto sueno', 'ventana de descanso', 'pierdo',
  ],
  'why.it_matters': [
    'why does this matter', 'why does it matter', 'why', 'matter',
    'por que importa', 'por que', 'importa',
  ],
  'schedule.what_changed': [
    'what changed', 'whats new', 'schedule change', 'changed',
    'que cambio', 'que hay de nuevo', 'cambio de agenda', 'novedades', 'cambio',
  ],
  'observation.start': [
    'log', 'note', 'record', 'observation', 'how i feel',
    'registrar', 'anotar', 'observacion', 'nota', 'como me siento',
  ],
  'privacy.who_sees': [
    'who can see', 'who sees', 'privacy', 'private',
    'quien ve', 'quien puede ver', 'privacidad', 'privado',
  ],
  'link.status': [
    'link', 'connection', 'signal', 'contact with ground',
    'enlace', 'conexion', 'senal', 'contacto con tierra',
  ],
  help: ['help', 'what can you do', 'options', 'ayuda', 'que podes hacer', 'opciones'],
};

function containsPhrase(words: string[], phrase: string): boolean {
  const p = phrase.split(' ');
  for (let i = 0; i + p.length <= words.length; i++) {
    let ok = true;
    for (let j = 0; j < p.length; j++) if (words[i + j] !== p[j]) { ok = false; break; }
    if (ok) return true;
  }
  return false;
}

export function matchIntent(text: string): IntentId {
  const words = normalize(text).split(' ').filter(Boolean);
  if (words.length === 0) return 'unknown';
  let best: IntentId = 'unknown';
  let bestScore = 0;
  for (const intent of INTENT_PRIORITY) {
    const phrases = PHRASES[intent as Exclude<IntentId, 'unknown'>];
    let score = 0;
    for (const ph of phrases) if (containsPhrase(words, ph)) score += ph.split(' ').length;
    if (score > bestScore) { bestScore = score; best = intent; }
  }
  return best;
}
