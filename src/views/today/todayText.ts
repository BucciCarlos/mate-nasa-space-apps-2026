const en = {
  header: 'Today', clock: 'Mission UTC', open: 'Open',
  sleep: 'Sleep', sleepLast: 'Last available night', sleepMissing: 'FD30 record not received yet', sleepNone: 'No sleep record available',
  last7: 'Last 7 days', noRecordDay: 'No record', notReceivedDay: 'Not received yet', hoursUnit: 'h:min',
  exercise: 'Exercise', elapsed: 'Elapsed', recordedDuration: 'Recorded duration', minutes: 'min',
  nextReservation: 'Next reservation', todayReservation: 'Reservation today', lastWorkout: 'Last recorded workout', noWorkout: 'No workout record available',
  reservationNote: 'Reservation only · attendance is not confirmed', recentSessions: 'Recent sessions', noActivityDay: 'No session',
  laboratory: 'Laboratory', noSamples: 'No sample records for this profile.', sampleTime: 'UTC',
  wellbeing: 'Wellbeing', lastCheckin: 'Last private check-in', noCheckin: 'No private check-in at this mission time', writeCheckin: 'Write a check-in',
  private: 'Private to you',
  vsNight: (fd: string) => `vs ${fd}`, meanPulse: 'Mean heart rate', pulseUnit: 'bpm', readings: (n: number) => `average of ${n} available readings`,
  pulseNow: 'Heart rate now', durationLabel: 'Duration', recordedLabel: 'Recorded session',
  powerReference: 'Power · median of your latest 4 sessions',
};
const es: typeof en = {
  header: 'Hoy', clock: 'UTC de misión', open: 'Abrir',
  sleep: 'Sueño', sleepLast: 'Última noche disponible', sleepMissing: 'Aún no llegó el registro de FD30', sleepNone: 'No hay registro de sueño disponible',
  last7: 'Últimos 7 días', noRecordDay: 'Sin registro', notReceivedDay: 'Aún no recibido', hoursUnit: 'h:min',
  exercise: 'Ejercicio', elapsed: 'Transcurrido', recordedDuration: 'Duración registrada', minutes: 'min',
  nextReservation: 'Próxima reserva', todayReservation: 'Reserva de hoy', lastWorkout: 'Último entrenamiento registrado', noWorkout: 'No hay registro de entrenamiento disponible',
  reservationNote: 'Solo reserva · la asistencia no está confirmada', recentSessions: 'Sesiones recientes', noActivityDay: 'Sin sesión',
  laboratory: 'Laboratorio', noSamples: 'No hay registros de muestras para este perfil.', sampleTime: 'UTC',
  wellbeing: 'Bienestar', lastCheckin: 'Último check-in privado', noCheckin: 'Sin check-in privado a esta hora de misión', writeCheckin: 'Registrar un check-in',
  private: 'Privado para vos',
  vsNight: (fd: string) => `vs ${fd}`, meanPulse: 'Frecuencia cardíaca media', pulseUnit: 'lpm', readings: (n: number) => `promedio de ${n} lecturas disponibles`,
  pulseNow: 'Pulso actual', durationLabel: 'Duración', recordedLabel: 'Sesión registrada',
  powerReference: 'Potencia · mediana de tus últimas 4 sesiones',
};
export const TODAY_TEXT = { en, es };
