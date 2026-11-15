const en = {
  title: 'Sleep duration', series: 'Simulated series', scope: 'Simulated FD30 durations for this person, approved for medical review. Not a measurement, assessment or interpretation.',
  chartLabel: (name: string, first: number, last: number) => `Simulated nightly sleep duration for ${name}, FD${first} to FD${last}`,
  day: 'Mission day', duration: 'Duration', occurred: 'Occurred · UTC', received: 'Received · UTC', record: 'Record', source: 'Source',
  coverage: (n: number, total: number) => `Coverage: ${n} of ${total} nights received`, notReceived: 'No received record', records: 'Night records and source',
  provenance: (adapter: string, version: string) => `Source: ${adapter} · ${version} · simulated FD30 scenario`,
  hm: (h: number, m: number) => `${h} h ${m} min`,
};
const es: typeof en = {
  title: 'Duración del sueño', series: 'Serie simulada', scope: 'Duraciones simuladas de FD30 de esta persona, aprobadas para revisión médica. No es una medición, evaluación ni interpretación.',
  chartLabel: (name, first, last) => `Duración simulada del sueño nocturno de ${name}, FD${first} a FD${last}`,
  day: 'Día de misión', duration: 'Duración', occurred: 'Ocurrió · UTC', received: 'Recibido · UTC', record: 'Registro', source: 'Fuente',
  coverage: (n, total) => `Cobertura: ${n} de ${total} noches recibidas`, notReceived: 'Sin registro recibido', records: 'Registros nocturnos y fuente',
  provenance: (adapter, version) => `Fuente: ${adapter} · ${version} · escenario simulado de FD30`,
  hm: (h, m) => `${h} h ${m} min`,
};
export const GROUND_SLEEP_TEXT = { en, es };
