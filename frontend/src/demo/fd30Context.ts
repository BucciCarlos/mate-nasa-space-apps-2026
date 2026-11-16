import type { Locale } from '../state/types';
import type { CrewId, PreviewState } from './fd30';
import type { OpsState } from '../views/fd30-ops/opsState';
import { planFor, PLAN_VERSION, PLAN_SOURCE } from './fd30Plan';

/**
 * Build the user/ground context block that is prepended to every FD30 chat
 * request, so the LLM always knows WHO is asking and what the current
 * operational state is (ground link + plan, onboard today + receipts, and any
 * ops check-ins/requests from the owner).
 *
 * The FD30 demo is a self-contained simulation: its "ground" state lives in the
 * preview state + ops journal (not the live M1 Redux mission, which stays
 * untouched).
 */

export interface Fd30ContextInput {
  preview: PreviewState;
  ownerCrewId: CrewId;
  ownerName: string;
  lang: Locale;
  ops?: OpsState;
}

const pad = (n: number) => String(n).padStart(2, '0');

function fmtClock(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export function buildFd30Context(input: Fd30ContextInput): string {
  const { preview, ownerCrewId, ownerName, lang, ops } = input;
  const es = lang === 'es';
  const now = preview.sessionStartMs;
  const lines: string[] = [];

  // ---- USER (who is asking) ----
  lines.push(es ? 'USUARIO' : 'USER');
  lines.push(`- ${ownerName} (${es ? 'astronauta a bordo, ISS' : 'astronaut onboard, ISS'})`);
  if (preview.wakeReceived && ownerCrewId === 'iss:crew-lf') {
    lines.push(`- ${es ? 'Ha recibido su notificación de despertar.' : 'Has received your wake notification.'}`);
  }

  // ---- GROUND (link + ground plan) ----
  lines.push(es ? 'SUELO' : 'GROUND');
  lines.push(`- ${es ? 'Enlace de uplink/downlink: activo (4 s de tránsito, simulado)' : 'Uplink/downlink: up (4 s transit, simulated)'}`);
  lines.push(`- ${es ? `Plan de suelo ${PLAN_SOURCE} (versión ${PLAN_VERSION})` : `Ground plan ${PLAN_SOURCE} (version ${PLAN_VERSION})`}`);

  // ---- ONBOARD (today's plan) ----
  lines.push(es ? 'A BORDO (HOY)' : 'ONBOARD (TODAY)');
  const blocks = planFor(ownerCrewId)
    .filter(b => new Date(b.end).getTime() > now)
    .slice(0, 3);
  if (blocks.length) {
    const list = blocks.map(b => `${fmtClock(b.start)}-${fmtClock(b.end)} ${b.title[lang] ?? b.title.en}`).join('; ');
    lines.push(`- ${es ? `Próximos bloques: ${list}` : `Upcoming blocks: ${list}`}`);
  } else {
    lines.push(`- ${es ? 'No hay bloques restantes hoy.' : 'No remaining blocks today.'}`);
  }

  // Receipts: exercise + lab seen/announced by the owner.
  const exercise = preview.exercise.filter(s => s.crewId === ownerCrewId);
  const lab = preview.laboratory.filter(s => s.crewId === ownerCrewId);
  lines.push(`- ${es ? `Sesiones de ejercicio: ${exercise.length}` : `Exercise sessions: ${exercise.length}`}`);
  lines.push(`- ${es ? `Muestras de laboratorio: ${lab.length}` : `Laboratory samples: ${lab.length}`}`);

  // ---- OPS (check-ins + requests to the commander) ----
  if (ops) {
    const ownCheckins = ops.profiles[ownerCrewId]?.checkins.filter(c => c.at <= now) ?? [];
    const sentRequests = (ops.requests ?? []).filter(r => r.owner === ownerCrewId && r.sentAt <= now);
    lines.push(es ? 'OPERACIONES' : 'OPS');
    lines.push(`- ${es ? `Check-ins enviados hoy: ${ownCheckins.length}` : `Check-ins sent today: ${ownCheckins.length}`}`);
    lines.push(`- ${es ? `Solicitudes al comandante: ${sentRequests.length}` : `Requests to the commander: ${sentRequests.length}`}`);
  }

  return lines.join('\n');
}
