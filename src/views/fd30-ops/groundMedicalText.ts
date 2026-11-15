const en = {
  title: 'Health review', intro: 'Medical projection · simulated FD30 data at the mission cursor',
  heart: 'Heart rate', spo2: 'SpO₂', bpm: 'bpm', percent: '%',
  clockPattern: 'Illustrative clock pattern · not received telemetry', sessionPulse: 'Simulated exercise telemetry · current minute',
  missingPulse: 'No session reading this minute', sleepLatest: 'Latest received night', sleepMissing: 'No sleep record received at this cursor.',
  fd30Missing: 'FD30: no received record', laboratory: 'Latest laboratory records', exercise: 'Exercise records',
  noSamples: 'No samples received at this cursor.', noValues: 'No usable result values', noResult: 'No result received',
  blood: 'Blood', urine: 'Urine', collection: 'Sample taken', analysis: 'Analysis started', result: 'Result availability reported', stored: 'Stored · awaiting analysis',
  incomplete: 'Incomplete workflow', occurred: 'Occurred', received: 'Received', utc: 'UTC',
  live: 'Session in progress', elapsed: 'min elapsed', completed: 'Latest completed session', noSession: 'No session record received at this cursor.',
  noLive: 'FD30: no session record received', reservation: 'FD30 reservation · not a recorded session', minutes: 'min',
  source: 'Source', details: 'Record details and provenance', simulated: 'Simulated records', power: 'W', cadence: 'rpm', unavailable: 'Unavailable',
};
const es: typeof en = {
  title: 'Revisión de salud', intro: 'Proyección para Medicina · datos simulados de FD30 al cursor de misión',
  heart: 'Frecuencia cardíaca', spo2: 'SpO₂', bpm: 'lpm', percent: '%',
  clockPattern: 'Patrón ilustrativo del reloj · no es telemetría recibida', sessionPulse: 'Telemetría de ejercicio simulada · minuto actual',
  missingPulse: 'Sin lectura de sesión en este minuto', sleepLatest: 'Última noche recibida', sleepMissing: 'Sin registro de sueño recibido a este cursor.',
  fd30Missing: 'FD30: sin registro recibido', laboratory: 'Últimos registros de laboratorio', exercise: 'Registros de ejercicio',
  noSamples: 'Sin muestras recibidas a este cursor.', noValues: 'Sin valores de resultado utilizables', noResult: 'Sin resultado recibido',
  blood: 'Sangre', urine: 'Orina', collection: 'Muestra tomada', analysis: 'Análisis iniciado', result: 'Disponibilidad de resultado informada', stored: 'Almacenada · a la espera de análisis',
  incomplete: 'Flujo incompleto', occurred: 'Ocurrió', received: 'Recibido', utc: 'UTC',
  live: 'Sesión en curso', elapsed: 'min transcurridos', completed: 'Última sesión completada', noSession: 'Sin registro de sesión recibido a este cursor.',
  noLive: 'FD30: sin registro de sesión recibido', reservation: 'Reserva FD30 · no es una sesión registrada', minutes: 'min',
  source: 'Fuente', details: 'Detalle de registros y procedencia', simulated: 'Registros simulados', power: 'W', cadence: 'rpm', unavailable: 'No disponible',
};
export const GROUND_MEDICAL_TEXT = { en, es };
