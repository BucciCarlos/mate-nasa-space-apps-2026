// CAT08: strings of the detail dialogs. Card content stays in catalogModules.ts; these are the dialog-only texts.
// No thresholds, alerts, diagnoses or invented figures. Context only says what a module would follow and why NASA lists the area.
import type { ModuleId, Text } from './catalogTypes';
const t = (en: string, es: string): Text => ({ en, es });

const MODAL_UI_SOURCE = {
  en: {
    viewDetail: 'View detail', close: 'Close', first: 'What you will see first', missing: 'What is missing', why: 'What would be followed and why it matters',
    source: 'Source', newTab: '(opens in a new tab)', classes: { fd30: 'FD30 data', evidence: 'Historical evidence', context: 'Context' },
    scopeContext: 'Public and context content. No personal data is read here.',
    scopeOnboard: 'Read from your active profile at the current mission time. Nothing is sent.',
    scopeOperator: 'Operational view. Only the allowlisted operational plan is read; no personal record.',
    scopeMedical: 'Medical view. Only the same allowlisted operational plan is read; there are no delivered medical summaries and no personal record.',
    noMedicalSummaries: 'No medical summaries have been received for FD30. Selecting this role is not consent, and no record is shown or implied.',
    planned: 'Planned', notIntake: 'Planned meal windows do not record intake or hydration.', notAttendance: 'A reservation or a shared time does not confirm attendance or activity.',
    openLab: 'Open my samples', openExercise: 'Open my Exercise', openAgenda: 'Open my agenda', openCrew: 'Open Crew dynamics', openEvidence: 'Open Sources & evidence', openEvidenceLabs: 'Open the laboratory evidence', openRadiation: 'View full series', openGroundAgenda: 'Open the operational agenda',
    simulatedPulse: 'Simulated for FD30; not a measurement.', noPulse: 'Your profile has no pulse reading in FD30. Only the simulated exercise session of Lucía carries one.', pulseNow: 'Current pulse', pulseMean: 'Mean pulse over the received readings', readings: (n: number) => `${n} available readings`, noReading: 'No current reading',
    sessions7: 'Sessions, last 7 days', sessionsCount: (n: number, days: number) => `${n} sessions in ${days} days`, noSessions: 'No session in this range',
    meals: 'Planned meals', noMeals: 'No meal is planned in your agenda.',
    ownSamples: 'Your FD30 samples', sample: { blood: 'Blood sample', urine: 'Urine sample' }, stage: { collection: 'Sample taken', analysis: 'Analysis started', result: 'Result availability reported' }, plannedCollection: 'Collection planned', noSamples: 'You have no FD30 sample records.', noValues: 'No values: only the process steps are recorded.',
    otherCrew: 'Another crew (Inspiration4)', wbc: 'White blood cells', wbcLine: (lo: string, hi: string, unit: string, n: number) => `Between ${lo} and ${hi} ${unit} across ${n} readings from other people. Not your values and not this crew’s.`,
    crewTotals: 'Planned minutes, last 7 days', crewPlanned: 'Planned', crewShared: 'Shared with someone', crewAlone: 'Without overlap', crewRest: 'Planned rest', minutes: 'min',
    reservations: 'Equipment reservations (planned)', noReservations: 'No equipment reservation is planned.',
    mealWindows: 'Planned meal windows', planVersion: 'Plan in force', planBlocks: 'Planned blocks today', autonomyNote: 'This is the plan currently in force. FD30 keeps no history of versions or rule traces, so nothing here is an automatic edit.',
    medicalSlots: 'Planned medical slots in the operational plan', none: 'None',
    radTitle: 'Radiation measured by an area monitor', radPeriod: 'Period (UTC)', radUnit: 'Unit', radRows: 'Readings', radMin: 'Lowest', radMax: 'Highest', radGap: 'Gap, not filled', radGapLine: (min: number, from: string, to: string) => `${min} min without a reading, ${from} → ${to} UTC. The line breaks there; nothing is interpolated.`,
    radNotPersonal: 'Historical evidence of an area monitor inside the ISS. It is not a personal dose, not a live reading and not FD30 data. No dose or fraction of any limit is calculated.', radNoData: 'The radiation series is not available in this build.',
    radUnitValue: 'µGy/min, absorbed dose rate', radChartLabel: 'Compact chart of the absorbed dose rate over the window; gaps are shaded',
    evaTitle: 'Pressure change before a spacewalk (NASA OCHMO-TB-037, Rev D)',
    evaLine1: 'NASA’s technical brief explains why a spacewalk needs preparation: the pressure inside the cabin and inside the spacesuit are different.',
    evaLine2: 'When pressure drops quickly, nitrogen dissolved in the body can form bubbles, which causes decompression sickness. NASA reduces that risk with a prebreathe protocol before the spacewalk.',
    evaLine3: 'These figures are historical context from the brief. They are not an FD30 plan, a schedule or an instruction.',
    evaCabin: 'Cabin pressure, historically: 14.7 psia', evaSuit: 'Spacesuit pressure, historically: 4.3 psia',
    microTitle: 'Public sample counts from two different studies (NASA OSDR)',
    microLine: 'These are the numbers of samples in the public record of two separate studies of the ISS microbiome. They are not levels of contamination, not results for this crew and not FD30 data. No chart is shown because the studies document no measured quantity with a verified unit.',
    microHead: ['Study', 'Samples', 'Locations', 'Method'] as const,
    microRows: [['OSD-65 · Microbial Observatory (ISS-MO): Microbial diversity', '46', '8 locations, two sessions three months apart', '16S and ITS amplicon sequencing'], ['OSD-252 · Microbial Observatory of Pathogenic Virus, Bacteria, and Fungi', '64', '8 habitable locations', 'Shotgun metagenomic sequencing']] as const,
    muscleTitle: 'Scheduled muscle assessment',
    muscleNote: 'This is a planned time only. It does not confirm that the assessment was done, there is no result, and it is not linked to an Exercise session.',
    noData: 'No usable data for this card.',
  },
  es: {
    viewDetail: 'Ver detalle', close: 'Cerrar', first: 'Qué verás primero', missing: 'Qué falta', why: 'Qué se seguiría y por qué importa',
    source: 'Fuente', newTab: '(se abre en una pestaña nueva)', classes: { fd30: 'Datos de FD30', evidence: 'Evidencia histórica', context: 'Contexto' },
    scopeContext: 'Contenido público y de contexto. Aquí no se lee ningún dato personal.',
    scopeOnboard: 'Se lee de tu perfil activo a la hora de misión actual. No se envía nada.',
    scopeOperator: 'Vista operativa. Solo se lee el plan operativo permitido; ningún registro personal.',
    scopeMedical: 'Vista médica. Solo se lee el mismo plan operativo permitido; no hay resúmenes médicos entregados ni registros personales.',
    noMedicalSummaries: 'No se recibieron resúmenes médicos de FD30. Elegir este rol no es consentimiento, y no se muestra ni se insinúa ningún registro.',
    planned: 'Planificado', notIntake: 'Las comidas planificadas no registran ingesta ni hidratación.', notAttendance: 'Una reserva o un horario compartido no confirma asistencia ni actividad.',
    openLab: 'Abrir mis muestras', openExercise: 'Abrir mi Ejercicio', openAgenda: 'Abrir mi agenda', openCrew: 'Abrir Dinámica de la tripulación', openEvidence: 'Abrir Fuentes y evidencia', openEvidenceLabs: 'Abrir la evidencia de laboratorio', openRadiation: 'Ver serie completa', openGroundAgenda: 'Abrir la agenda operativa',
    simulatedPulse: 'Simulado para FD30; no es una medición.', noPulse: 'Tu perfil no tiene lectura de pulso en FD30. Solo la sesión de ejercicio simulada de Lucía la tiene.', pulseNow: 'Pulso actual', pulseMean: 'Pulso medio de las lecturas recibidas', readings: (n: number) => `${n} lecturas disponibles`, noReading: 'Sin lectura actual',
    sessions7: 'Sesiones, últimos 7 días', sessionsCount: (n: number, days: number) => `${n} sesiones en ${days} días`, noSessions: 'Ninguna sesión en este rango',
    meals: 'Comidas planificadas', noMeals: 'No hay comidas planificadas en tu agenda.',
    ownSamples: 'Tus muestras de FD30', sample: { blood: 'Muestra de sangre', urine: 'Muestra de orina' }, stage: { collection: 'Muestra tomada', analysis: 'Análisis iniciado', result: 'Disponibilidad de resultado informada' }, plannedCollection: 'Toma planificada', noSamples: 'No tenés registros de muestras de FD30.', noValues: 'Sin valores: solo se registran los pasos del proceso.',
    otherCrew: 'Otra tripulación (Inspiration4)', wbc: 'Glóbulos blancos', wbcLine: (lo: string, hi: string, unit: string, n: number) => `Entre ${lo} y ${hi} ${unit} en ${n} lecturas de otras personas. No son tus valores ni los de esta tripulación.`,
    crewTotals: 'Minutos planificados, últimos 7 días', crewPlanned: 'Planificado', crewShared: 'Compartido con alguien', crewAlone: 'Sin coincidencia', crewRest: 'Descanso planificado', minutes: 'min',
    reservations: 'Reservas de equipo (planificadas)', noReservations: 'No hay reservas de equipo planificadas.',
    mealWindows: 'Ventanas de comida planificadas', planVersion: 'Plan vigente', planBlocks: 'Bloques planificados de hoy', autonomyNote: 'Este es el plan vigente. FD30 no guarda historial de versiones ni trazas de reglas, así que nada de esto es una edición automática.',
    medicalSlots: 'Franjas médicas planificadas en el plan operativo', none: 'Ninguna',
    radTitle: 'Radiación medida por un monitor de área', radPeriod: 'Período (UTC)', radUnit: 'Unidad', radRows: 'Lecturas', radMin: 'Más baja', radMax: 'Más alta', radGap: 'Hueco, sin rellenar', radGapLine: (min: number, from: string, to: string) => `${min} min sin lectura, ${from} → ${to} UTC. La línea se corta ahí; no se interpola nada.`,
    radNotPersonal: 'Evidencia histórica de un monitor de área dentro de la EEI. No es una dosis personal, ni una lectura en vivo, ni datos de FD30. No se calcula dosis ni fracción de ningún límite.', radNoData: 'La serie de radiación no está disponible en esta compilación.',
    radUnitValue: 'µGy/min, tasa de dosis absorbida', radChartLabel: 'Gráfico compacto de la tasa de dosis absorbida en la ventana; los huecos están sombreados',
    evaTitle: 'Cambio de presión antes de una caminata espacial (NASA OCHMO-TB-037, Rev D)',
    evaLine1: 'El resumen técnico de la NASA explica por qué una caminata espacial requiere preparación: la presión dentro de la cabina y dentro del traje es distinta.',
    evaLine2: 'Cuando la presión baja rápido, el nitrógeno disuelto en el cuerpo puede formar burbujas, lo que causa la enfermedad por descompresión. La NASA reduce ese riesgo con un protocolo de prebreathe antes de la caminata.',
    evaLine3: 'Estas cifras son contexto histórico del resumen. No son un plan de FD30, un horario ni una instrucción.',
    evaCabin: 'Presión de la cabina, históricamente: 14,7 psia', evaSuit: 'Presión del traje, históricamente: 4,3 psia',
    microTitle: 'Conteos públicos de muestras de dos estudios distintos (NASA OSDR)',
    microLine: 'Son los números de muestras del registro público de dos estudios separados del microbioma de la EEI. No son niveles de contaminación, no son resultados de esta tripulación ni datos de FD30. No se muestra un gráfico porque los estudios no documentan una cantidad medida con unidad verificada.',
    microHead: ['Estudio', 'Muestras', 'Lugares', 'Método'] as const,
    microRows: [['OSD-65 · Microbial Observatory (ISS-MO): diversidad microbiana', '46', '8 lugares, dos sesiones separadas por tres meses', 'Secuenciación de amplicones 16S e ITS'], ['OSD-252 · Observatorio microbiano de virus, bacterias y hongos patógenos', '64', '8 lugares habitables', 'Secuenciación metagenómica shotgun']] as const,
    muscleTitle: 'Evaluación muscular programada',
    muscleNote: 'Es solo un horario planificado. No confirma que la evaluación se haya hecho, no hay resultado y no está vinculada a una sesión de Ejercicio.',
    noData: 'No hay datos utilizables para esta ficha.',
  },
} as const;
type Widen<T> = T extends string ? string : T extends (...a: infer A) => infer R ? (...a: A) => R : T extends object ? { [K in keyof T]: Widen<T[K]> } : T;
export type ModalMessages = Widen<typeof MODAL_UI_SOURCE['en']>;
export const MODAL_UI: Record<'en' | 'es', ModalMessages> = MODAL_UI_SOURCE;

/** First sentence of every dialog and the "what would be followed and why it matters" paragraph. No figures, no thresholds. */
export const MODAL_COPY: Record<ModuleId, { first: Text; why: Text }> = {
  'MOD-CARDIO': {
    first: t('There are no cardiovascular records of your own. This is what exists in FD30 and what is missing.', 'No hay registros cardiovasculares propios. Esto es lo que existe en FD30 y lo que falta.'),
    why: t('It would follow heart-related measurements over a mission, because NASA lists cardiovascular adaptation to weightlessness among the risks of human spaceflight. Any such record would belong to its owner and needs a verified instrument first.',
      'Seguiría mediciones del corazón a lo largo de una misión, porque la NASA incluye la adaptación cardiovascular a la ingravidez entre los riesgos del vuelo espacial. Cualquier registro así pertenecería a su dueño y necesita antes un instrumento verificado.'),
  },
  'MOD-MSK': {
    first: t('Your exercise sessions of the last 7 days, from the same records as your Exercise module.', 'Tus sesiones de ejercicio de los últimos 7 días, de los mismos registros que tu módulo de Ejercicio.'),
    why: t('It would follow how often and how long you train, together with bone and muscle monitoring, because muscle and bone change without gravity. FD30 records sessions only; it sets no targets and measures no bone or strength.',
      'Seguiría con qué frecuencia y cuánto entrenás, junto con el seguimiento de hueso y músculo, porque músculo y hueso cambian sin gravedad. FD30 registra solo sesiones; no fija metas ni mide hueso ni fuerza.'),
  },
  'MOD-NUTR': {
    first: t('Only planned meals exist today. Meals record no intake; Home counts only simulated water intakes.', 'Hoy solo existen comidas planificadas. Las comidas no registran ingesta; Inicio solo cuenta tomas de agua simuladas.'),
    why: t('It would follow what is eaten and drunk against what was planned, because adequate food and nutrition is a listed spaceflight risk. FD30 has the plan and a count of simulated water intakes, not the intake itself.',
      'Seguiría lo que se come y se bebe frente a lo planificado, porque una alimentación y nutrición adecuadas es un riesgo listado del vuelo espacial. FD30 tiene el plan y un conteo de tomas de agua simuladas, no la ingesta.'),
  },
  'MOD-IMMUNE': {
    first: t('Your FD30 sample steps, and below them public evidence from another crew. They are kept apart.', 'Los pasos de tus muestras de FD30 y, debajo, evidencia pública de otra tripulación. Se mantienen separados.'),
    why: t('It would relate the sample workflow with immune measures over a mission, because immune responses can change in flight. Today there are process steps and no immune values for anyone in this crew.',
      'Relacionaría el proceso de las muestras con medidas inmunitarias a lo largo de una misión, porque las respuestas inmunitarias pueden cambiar en vuelo. Hoy hay pasos del proceso y ningún valor inmunitario de esta tripulación.'),
  },
  'MOD-SANS': {
    first: t('What SANS is and which checks exist for it. FD30 has no eye examinations or images.', 'Qué es el SANS y qué controles existen. FD30 no tiene exámenes ni imágenes oculares.'),
    why: t('It would follow vision checks and eye imaging on long missions, because spaceflight-associated neuro-ocular syndrome is a listed risk. It needs verified examinations before any value could be shown.',
      'Seguiría los controles de visión y las imágenes oculares en misiones largas, porque el síndrome neuroocular asociado al vuelo espacial es un riesgo listado. Necesita exámenes verificados antes de poder mostrar cualquier valor.'),
  },
  'MOD-SENSORI': {
    first: t('What changes with gravity and when it would be assessed. FD30 has no sensorimotor tests.', 'Qué cambia con la gravedad y cuándo se evaluaría. FD30 no tiene pruebas sensoriomotoras.'),
    why: t('It would follow balance and orientation tests around gravity transitions, because the sensorimotor and vestibular systems adapt. No test, score or countdown exists here.',
      'Seguiría pruebas de equilibrio y orientación en las transiciones de gravedad, porque los sistemas sensoriomotor y vestibular se adaptan. Aquí no existe ninguna prueba, puntaje ni cuenta regresiva.'),
  },
  'MOD-COG': {
    first: t('There are no tests, scores or results. This is what a voluntary attention check would be.', 'No hay pruebas, puntajes ni resultados. Esto es lo que sería un chequeo voluntario de atención.'),
    why: t('It would offer short, voluntary tasks kept private to the person, because attention and performance are studied in NASA’s research on crews. It would never be a score shown to anyone else.',
      'Ofrecería tareas breves y voluntarias, privadas para la persona, porque la atención y el desempeño se estudian en la investigación de la NASA con tripulaciones. Nunca sería un puntaje mostrado a otras personas.'),
  },
  'MOD-CREW': {
    first: t('Planned time together and alone, from the operational plan of the last 7 days.', 'Tiempo planificado juntos y a solas, del plan operativo de los últimos 7 días.'),
    why: t('It would help see how shared and separate time is planned for a crew, because teamwork is a listed risk. Shared time is a planning fact: it confirms neither joint activity nor measured rest.',
      'Ayudaría a ver cómo se planifica el tiempo compartido y separado de una tripulación, porque el trabajo en equipo es un riesgo listado. El tiempo compartido es un dato de planificación: no confirma actividad conjunta ni descanso medido.'),
  },
  'MOD-EVA': {
    first: t('FD30 has no spacewalk plan or suit readings. This explains what would be prepared.', 'FD30 no tiene una caminata espacial planificada ni lecturas del traje. Esto explica qué se prepararía.'),
    why: t('It would help prepare and review a spacewalk, because moving between cabin and suit pressure needs planning. The pressures shown are historical context from NASA, not a requirement or a plan.',
      'Ayudaría a preparar y revisar una caminata espacial, porque pasar de la presión de la cabina a la del traje requiere planificación. Las presiones que se muestran son contexto histórico de la NASA, no un requisito ni un plan.'),
  },
  'MOD-MICRO': {
    first: t('There are no microbial results. This explains what would be sampled and why.', 'No hay resultados microbianos. Esto explica qué se muestrearía y por qué.'),
    why: t('It would follow environmental sampling of the habitat and how microbes interact with the people living in it, because that interaction is a listed risk. The public sample counts of two OSDR studies are shown as coverage, with no sequencing data or units.',
      'Seguiría el muestreo ambiental del hábitat y cómo interactúan los microbios con las personas que viven en él, porque esa interacción es un riesgo listado. Los conteos públicos de muestras de dos estudios de OSDR se muestran como cobertura, sin datos de secuenciación ni unidades.'),
  },
  'MOD-LOADS': {
    first: t('There are no load records and no landing date. This explains what would be studied.', 'No hay registros de cargas ni fecha de aterrizaje. Esto explica qué se estudiaría.'),
    why: t('It would relate launch and landing loads with crew records, because injury from dynamic loads is a listed risk. FD30 has no vehicle data, so nothing is counted down or estimated.',
      'Relacionaría las cargas de lanzamiento y aterrizaje con los registros de la tripulación, porque la lesión por cargas dinámicas es un riesgo listado. FD30 no tiene datos del vehículo, así que no se cuenta ni se estima nada.'),
  },
  'MOD-AUTONOMY': {
    first: t('The plan currently in force, and what a local consultation is. It is not an automatic edit.', 'El plan vigente y qué es una consulta local. No es una edición automática.'),
    why: t('It would show which version of the plan is in force and who changed it, because with a delayed link plans must be usable on board. FD30 only knows the current plan.',
      'Mostraría qué versión del plan está vigente y quién la cambió, porque con un enlace demorado los planes deben poder usarse a bordo. FD30 solo conoce el plan vigente.'),
  },
  'MOD-MED': {
    first: t('There is no clinical guidance, imaging or connected device here.', 'Aquí no hay guía clínica, imágenes ni dispositivo conectado.'),
    why: t('It would support examinations and care when Ground is delayed, with guidance approved by specialists. Nothing clinical is generated here, and no medical summary has been delivered.',
      'Apoyaría los exámenes y la atención cuando la Tierra está demorada, con guías aprobadas por especialistas. Aquí no se genera nada clínico y no se entregó ningún resumen médico.'),
  },
  'MOD-RAD': {
    first: t('What a public radiation monitor inside the ISS measured in one historical week. It is not anyone’s dose.', 'Qué midió, en una semana histórica, un monitor público de radiación dentro de la EEI. No es la dosis de nadie.'),
    why: t('Radiation is a listed spaceflight risk. A personal dose would need a personal dosimeter or a verified model with its own consent rules; an area monitor shows the environment, not a person.',
      'La radiación es un riesgo listado del vuelo espacial. Una dosis personal necesitaría un dosímetro personal o un modelo verificado con sus propias reglas de consentimiento; un monitor de área muestra el ambiente, no a una persona.'),
  },
};
