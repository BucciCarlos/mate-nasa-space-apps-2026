// Single registry of the 13 health/operations concept cards (01 §5.2). No values, thresholds or diagnoses.
// Risk names are those mapped in the spec; their NASA pages are reached through the registered index `nasa-hrp-risks`.
import type { CatalogModule, Capability, Text } from './catalogTypes';

const t = (en: string, es: string): Text => ({ en, es });

const SOURCE_PENDING: Capability = {
  id: 'data-source', status: 'concept', verified: false,
  label: t('Data source and instrument', 'Fuente de datos e instrumento'),
  note: t('Not selected. Pending verification against primary documentation.', 'Sin seleccionar. Pendiente de verificación con documentación primaria.'),
};

export const CATALOG_MODULES: readonly CatalogModule[] = [
  {
    id: 'MOD-CARDIO', specTier: 'concept', surfaces: ['onboard', 'ground'],
    title: t('Cardiovascular', 'Cardiovascular'),
    solves: t('Would bring a crew member’s cardiovascular context into one place, kept apart from the plan and from workflow events.',
      'Reuniría en un solo lugar el contexto cardiovascular de una persona, separado del plan y de los eventos de flujo.'),
    onboard: t('Your own cardiovascular records, if a verified source ever provides them.',
      'Tus propios registros cardiovasculares, si alguna vez una fuente verificada los aporta.'),
    ground: {
      operational: t('Whether cardiovascular checks take agenda time or equipment. No health content.',
        'Si los controles cardiovasculares ocupan tiempo de agenda o equipos. Sin contenido de salud.'),
      medical: t('Source-provided records after consent, with provenance and no derived flags.',
        'Registros aportados por la fuente, con consentimiento, procedencia y sin alertas derivadas.'),
    },
    backing: { kind: 'risk', sourceId: 'nasa-hrp-risks', risks: [t('Cardiovascular Adaptations', 'Adaptaciones cardiovasculares (Cardiovascular Adaptations)')] },
    dataNeeds: [
      t('Source-defined cardiovascular variables with units and instrument', 'Variables cardiovasculares definidas por la fuente, con unidad e instrumento'),
      t('Confirmed person–record association and acquisition time', 'Asociación persona–registro confirmada y hora de adquisición'),
      t('Flight phase and protocol of each record', 'Fase de vuelo y protocolo de cada registro'),
    ],
    notBuilt: t('No verified cardiovascular source is connected. The FD30 day has no heart-rate or blood-pressure data.',
      'No hay una fuente cardiovascular verificada conectada. El día FD30 no tiene datos de frecuencia cardíaca ni de presión.'),
    capabilities: [SOURCE_PENDING],
  },
  {
    id: 'MOD-MSK', specTier: 'concept', surfaces: ['onboard', 'ground'],
    title: t('Muscle, bone and exercise', 'Músculo, hueso y ejercicio'),
    solves: t('Would connect exercise sessions with musculoskeletal context without turning session time into a fitness verdict.',
      'Conectaría las sesiones de ejercicio con el contexto musculoesquelético sin convertir el tiempo de sesión en un veredicto de aptitud.'),
    onboard: t('You can already open your exercise sessions in FD30. Bone monitoring is not available.',
      'Ya podés abrir tus sesiones de ejercicio en FD30. El monitoreo óseo no está disponible.'),
    ground: {
      operational: t('Exercise reservations and equipment use in the agenda.',
        'Reservas de ejercicio y uso de equipos en la agenda.'),
      medical: t('Future muscle and bone records from verified sources, with consent. None exist in the prototype.',
        'Registros musculares y óseos futuros de fuentes verificadas, con consentimiento. No existe ninguno en el prototipo.'),
    },
    backing: { kind: 'risk', sourceId: 'nasa-hrp-risks', risks: [
      t('Reduced Cardiorespiratory and Musculoskeletal Fitness', 'Reducción de la aptitud cardiorrespiratoria y musculoesquelética (Reduced Cardiorespiratory and Musculoskeletal Fitness)'),
      t('Spaceflight-Induced Bone Changes', 'Cambios óseos inducidos por el vuelo espacial (Spaceflight-Induced Bone Changes)'),
    ] },
    dataNeeds: [
      t('Source-defined exercise metrics with units', 'Métricas de ejercicio definidas por la fuente, con unidad'),
      t('Bone measurements from a verified protocol and instrument', 'Mediciones óseas de un protocolo e instrumento verificados'),
      t('Person, session and flight-phase association', 'Asociación con persona, sesión y fase de vuelo'),
    ],
    notBuilt: t('Only the simulated exercise workflow exists. No bone, strength or fitness data source is selected.',
      'Solo existe el flujo simulado de ejercicio. No hay fuente seleccionada de datos óseos, de fuerza ni de aptitud.'),
    capabilities: [
      {
        id: 'fd30-exercise', status: 'available', verified: true,
        label: t('FD30 exercise sessions', 'Sesiones de ejercicio FD30'),
        note: t('Simulated equipment workflow (planned, in progress, completed) for your own profile. Personal: not sent to Ground.',
          'Flujo de equipo simulado (previsto, en curso, finalizado) para tu propio perfil. Personal: no se envía a Tierra.'),
        href: { onboard: '#/onboard/personal/exercise' },
      },
      {
        id: 'bone-monitoring', status: 'concept', verified: false,
        label: t('Bone monitoring', 'Monitoreo óseo'),
        note: t('Not implemented: no data, no instrument, no view.', 'No implementado: sin datos, sin instrumento, sin vista.'),
      },
      {
        id: 'fitness-assessment', status: 'concept', verified: false,
        label: t('Strength and fitness assessment', 'Evaluación de fuerza y aptitud'),
        note: t('Not implemented. The prototype issues no fitness verdict.', 'No implementada. El prototipo no emite veredictos de aptitud.'),
      },
    ],
  },
  {
    id: 'MOD-NUTR', specTier: 'concept', surfaces: ['onboard', 'ground'],
    title: t('Nutrition and hydration', 'Nutrición e hidratación'),
    solves: t('Would place food and hydration planning context next to the agenda.',
      'Ubicaría el contexto de planificación de comidas e hidratación junto a la agenda.'),
    onboard: t('Meal times already appear as plan blocks. Intake records are not available.',
      'Las comidas ya aparecen como bloques del plan. No hay registros de ingesta.'),
    ground: {
      operational: t('Meal and supply windows as planning constraints.', 'Ventanas de comida y suministros como restricciones de planificación.'),
      medical: t('Future intake or hydration records from verified sources, with consent.', 'Registros futuros de ingesta o hidratación de fuentes verificadas, con consentimiento.'),
    },
    backing: { kind: 'risk', sourceId: 'nasa-hrp-risks', risks: [t('Inadequate Food and Nutrition', 'Alimentación y nutrición inadecuadas (Inadequate Food and Nutrition)')] },
    dataNeeds: [
      t('Intake and hydration records with source and units', 'Registros de ingesta e hidratación con fuente y unidad'),
      t('Menu or supply data from a verified source', 'Datos de menú o suministros de una fuente verificada'),
      t('Person and time association', 'Asociación con persona y hora'),
    ],
    notBuilt: t('No intake or hydration source is defined. The prototype prescribes no diet.',
      'No hay fuente de ingesta ni de hidratación definida. El prototipo no prescribe dietas.'),
    capabilities: [SOURCE_PENDING],
  },
  {
    id: 'MOD-IMMUNE', specTier: 'concept', surfaces: ['onboard', 'ground'],
    title: t('Immune system', 'Sistema inmunitario'),
    solves: t('Would explain the immune-research context and, later, show real evidence from another crew, kept separate.',
      'Explicaría el contexto de investigación inmunitaria y, más adelante, mostraría evidencia real de otra tripulación, por separado.'),
    onboard: t('What is studied about immune changes. Nothing here is about you.',
      'Qué se estudia sobre los cambios inmunitarios. Nada de esto es sobre vos.'),
    ground: {
      operational: t('No operational data. Sample-collection time would appear in the agenda only if a protocol is approved.',
        'Sin datos operativos. El tiempo de toma de muestras aparecería en la agenda solo si se aprueba un protocolo.'),
      medical: t('A future evidence view of real data from another mission, never mapped to this crew.',
        'Una futura vista de evidencia con datos reales de otra misión, nunca asignados a esta tripulación.'),
    },
    backing: { kind: 'risk', sourceId: 'nasa-hrp-risks', risks: [t('Altered Immune System Responses', 'Respuestas alteradas del sistema inmunitario (Altered Immune System Responses)')] },
    dataNeeds: [
      t('De-identified real dataset with documented analytes, units and timepoints', 'Conjunto de datos real desidentificado con analitos, unidades y tiempos documentados'),
      t('Redistribution conditions recorded before bundling any data', 'Condiciones de redistribución registradas antes de incluir datos'),
    ],
    notBuilt: t('The evidence view is planned for a later milestone and has not been built.',
      'La vista de evidencia está prevista para un hito posterior y no está construida.'),
    capabilities: [{
      id: 'osd-575-cytokines', status: 'concept', verified: false,
      label: t('Inspiration4 cytokine evidence (OSD-575)', 'Evidencia de citoquinas de Inspiration4 (OSD-575)'),
      note: t('Not implemented. The dataset is registered; its cytokine subset is pending verification.',
        'No implementada. El conjunto de datos está registrado; su subconjunto de citoquinas está pendiente de verificación.'),
    }],
  },
  {
    id: 'MOD-SANS', specTier: 'concept', surfaces: ['onboard', 'ground'],
    title: t('Vision and brain (SANS)', 'Visión y cerebro (SANS)'),
    solves: t('Would organize vision and eye-exam context across the mission.',
      'Organizaría el contexto de visión y de exámenes oculares a lo largo de la misión.'),
    onboard: t('Which vision checks are planned for you. No results are shown.',
      'Qué controles de visión tenés planificados. No se muestran resultados.'),
    ground: {
      operational: t('Exam slots and equipment time in the agenda.', 'Turnos de examen y tiempo de equipos en la agenda.'),
      medical: t('Future exam records from a verified source, with consent. No imaging is built.', 'Registros futuros de exámenes de una fuente verificada, con consentimiento. No hay imágenes construidas.'),
    },
    backing: { kind: 'risk', sourceId: 'nasa-hrp-risks', risks: [t('Spaceflight Associated Neuro-ocular Syndrome', 'Síndrome neuroocular asociado al vuelo espacial (Spaceflight Associated Neuro-ocular Syndrome)')] },
    dataNeeds: [
      t('Exam type, instrument and protocol', 'Tipo de examen, instrumento y protocolo'),
      t('Record association and flight phase', 'Asociación del registro y fase de vuelo'),
      t('Image or report rights and format', 'Derechos y formato de imágenes o informes'),
    ],
    notBuilt: t('No imaging or eye-exam source exists in the prototype.', 'No existe una fuente de imágenes ni de exámenes oculares en el prototipo.'),
    capabilities: [SOURCE_PENDING],
  },
  {
    id: 'MOD-SENSORI', specTier: 'concept', surfaces: ['onboard', 'ground'],
    title: t('Balance and sensorimotor', 'Equilibrio y sensoriomotor'),
    solves: t('Would give context for balance and orientation adaptation around gravity transitions.',
      'Daría contexto sobre la adaptación del equilibrio y la orientación en los cambios de gravedad.'),
    onboard: t('Context for adapting to gravity changes. No tests or scores.', 'Contexto para adaptarte a los cambios de gravedad. Sin pruebas ni puntajes.'),
    ground: {
      operational: t('Adaptation time around transitions as a planning constraint.', 'Tiempo de adaptación en las transiciones como restricción de planificación.'),
      medical: t('Future test records from a verified protocol, with consent.', 'Registros futuros de pruebas con un protocolo verificado, con consentimiento.'),
    },
    backing: { kind: 'risk', sourceId: 'nasa-hrp-risks', risks: [t('Altered Sensorimotor and Vestibular Function', 'Función sensoriomotora y vestibular alterada (Altered Sensorimotor and Vestibular Function)')] },
    dataNeeds: [
      t('Test protocol and instrument', 'Protocolo e instrumento de prueba'),
      t('Flight phase and timing', 'Fase de vuelo y momento'),
      t('Person association', 'Asociación con la persona'),
    ],
    notBuilt: t('No sensorimotor test or data source is part of the prototype.', 'El prototipo no incluye pruebas ni fuentes de datos sensoriomotoras.'),
    capabilities: [SOURCE_PENDING],
  },
  {
    id: 'MOD-COG', specTier: 'concept', surfaces: ['onboard'],
    title: t('Attention and cognitive performance', 'Atención y desempeño cognitivo'),
    solves: t('Would offer a future voluntary self-check that never yields a verdict and never gates a flow.',
      'Ofrecería en el futuro un autochequeo voluntario que nunca da un veredicto ni bloquea un flujo.'),
    onboard: t('Future: an optional, private self-check. Not available now.', 'A futuro: un autochequeo opcional y privado. Hoy no está disponible.'),
    backing: { kind: 'context', sourceId: 'nasa-hrp-ongoing', topic: t('Standard Measures', 'Standard Measures') },
    dataNeeds: [
      t('A validated task and protocol', 'Una tarea y un protocolo validados'),
      t('Explicit consent and private storage', 'Consentimiento explícito y almacenamiento privado'),
      t('No sharing by default', 'Sin compartir por defecto'),
    ],
    notBuilt: t('No validated task is selected. A self-check result must never gate work or reach Ground by default.',
      'No hay una tarea validada seleccionada. El resultado de un autochequeo nunca debe bloquear tareas ni llegar a Tierra por defecto.'),
    capabilities: [SOURCE_PENDING],
  },
  {
    id: 'MOD-CREW', specTier: 'concept', surfaces: ['onboard', 'ground'],
    title: t('Crew dynamics', 'Dinámica de la tripulación'),
    solves: t('Would show shared operational planning context, such as overlaps and rest windows, without judging the team.',
      'Mostraría contexto operativo compartido, como solapamientos y ventanas de descanso, sin juzgar al equipo.'),
    onboard: t('Share operational requests only when you choose. Specified, not implemented.', 'Compartir pedidos operativos solo cuando lo decidas. Especificado, no implementado.'),
    ground: {
      operational: t('Agenda overlaps and planned rest windows as operational facts.', 'Solapamientos de agenda y ventanas de descanso planificadas como hechos operativos.'),
      medical: t('No team-stress inference. Only what each person decides to share.', 'Sin inferencia de estrés del equipo. Solo lo que cada persona decide compartir.'),
    },
    backing: { kind: 'risk', sourceId: 'nasa-hrp-risks', risks: [t('Inadequate Teamwork', 'Trabajo en equipo inadecuado (Inadequate Teamwork)')] },
    dataNeeds: [
      t('Delivered agenda and crew roles', 'Agenda entregada y roles de la tripulación'),
      t('Only messages each person explicitly shares', 'Solo mensajes que cada persona comparte de forma explícita'),
    ],
    notBuilt: t('The limited Commander view is specified but not built. No team metric is computed.',
      'La vista limitada del Comandante está especificada pero no construida. No se calcula ninguna métrica de equipo.'),
    capabilities: [{
      id: 'commander-crew', status: 'concept', verified: true,
      label: t('Commander Crew view', 'Vista Tripulación del Comandante'),
      note: t('Specified, not implemented.', 'Especificada, no implementada.'),
    }],
  },
  {
    id: 'MOD-EVA', specTier: 'concept', surfaces: ['onboard', 'ground'],
    title: t('Spacewalks and pressure transitions', 'Caminatas espaciales y cambios de presión'),
    solves: t('Would gather spacewalk and pressure-transition preparation in one timeline.',
      'Reuniría en una sola línea de tiempo la preparación de caminatas espaciales y cambios de presión.'),
    onboard: t('Your planned spacewalk preparation steps. No physiological monitoring.', 'Tus pasos planificados de preparación para la caminata. Sin monitoreo fisiológico.'),
    ground: {
      operational: t('Preparation windows, suit and airlock time as planning constraints.', 'Ventanas de preparación, traje y esclusa como restricciones de planificación.'),
      medical: t('Future pre- and post-spacewalk records from verified sources, with consent.', 'Registros futuros previos y posteriores a la caminata de fuentes verificadas, con consentimiento.'),
    },
    backing: { kind: 'risk', sourceId: 'nasa-hrp-risks', risks: [
      t('Decompression Sickness', 'Enfermedad por descompresión (Decompression Sickness)'),
      t('Hypoxia', 'Hipoxia (Hypoxia)'),
      t('Injury and Compromised Performance from Spacewalks', 'Lesiones y desempeño comprometido en caminatas espaciales (Injury and Compromised Performance from Spacewalks)'),
    ] },
    dataNeeds: [
      t('Spacewalk timeline and preparation protocol from a verified source', 'Cronograma y protocolo de preparación de una fuente verificada'),
      t('Suit and environment data with units and instrument', 'Datos de traje y ambiente con unidad e instrumento'),
      t('Person and phase association', 'Asociación con persona y fase'),
    ],
    notBuilt: t('No spacewalk plan, suit or environment source is part of the prototype.', 'El prototipo no incluye planes de caminata ni fuentes de traje o ambiente.'),
    capabilities: [SOURCE_PENDING],
  },
  {
    id: 'MOD-MICRO', specTier: 'concept', surfaces: ['onboard', 'ground'],
    title: t('Microbes and habitat hygiene', 'Microbios e higiene del hábitat'),
    solves: t('Would show habitat hygiene and microbial sampling as environmental context, not personal information.',
      'Mostraría la higiene del hábitat y el muestreo microbiano como contexto ambiental, no como información personal.'),
    onboard: t('When habitat sampling or cleaning is planned.', 'Cuándo está planificado el muestreo o la limpieza del hábitat.'),
    ground: {
      operational: t('Sampling and housekeeping tasks in the agenda.', 'Tareas de muestreo y mantenimiento en la agenda.'),
      medical: t('Future environmental results from a verified source, never a personal diagnosis.', 'Resultados ambientales futuros de una fuente verificada, nunca un diagnóstico personal.'),
    },
    backing: { kind: 'risk', sourceId: 'nasa-hrp-risks', risks: [t('Host-Microorganism Interactions', 'Interacciones huésped–microorganismo (Host-Microorganism Interactions)')] },
    dataNeeds: [
      t('Sampling location, method and time', 'Lugar, método y hora del muestreo'),
      t('Verified environmental dataset with units', 'Conjunto de datos ambiental verificado, con unidades'),
      t('Kept separate from personal records', 'Separado de los registros personales'),
    ],
    notBuilt: t('No environmental microbiology dataset is selected or verified.', 'No hay un conjunto de datos de microbiología ambiental seleccionado ni verificado.'),
    capabilities: [SOURCE_PENDING],
  },
  {
    id: 'MOD-LOADS', specTier: 'concept', surfaces: ['onboard', 'ground'],
    title: t('Launch and landing loads', 'Cargas de lanzamiento y aterrizaje'),
    solves: t('Would explain launch and landing load context and the planning that follows landing.',
      'Explicaría el contexto de cargas del lanzamiento y el aterrizaje y la planificación posterior al aterrizaje.'),
    onboard: t('Context before launch or landing. No personal load data.', 'Contexto antes del lanzamiento o el aterrizaje. Sin datos personales de carga.'),
    ground: {
      operational: t('Seating, landing and recovery logistics as planning context.', 'Logística de asientos, aterrizaje y recuperación como contexto de planificación.'),
      medical: t('Future post-landing records from a verified source, with consent.', 'Registros futuros posteriores al aterrizaje de una fuente verificada, con consentimiento.'),
    },
    backing: { kind: 'risk', sourceId: 'nasa-hrp-risks', risks: [t('Injury from Dynamic Loads', 'Lesiones por cargas dinámicas (Injury from Dynamic Loads)')] },
    dataNeeds: [
      t('Vehicle load data with units from a verified source', 'Datos de carga del vehículo con unidad de una fuente verificada'),
      t('Phase and time', 'Fase y hora'),
      t('Person association for any personal record', 'Asociación con la persona para cualquier registro personal'),
    ],
    notBuilt: t('No vehicle or landing data source is part of the prototype.', 'El prototipo no incluye fuentes de datos del vehículo ni del aterrizaje.'),
    capabilities: [SOURCE_PENDING],
  },
  {
    id: 'MOD-AUTONOMY', specTier: 'concept', surfaces: ['onboard', 'ground'],
    title: t('Earth-independent operations', 'Operaciones independientes de la Tierra'),
    solves: t('Shows what the onboard core decided and why when Ground is delayed or the link is down.',
      'Muestra qué decidió el núcleo a bordo y por qué cuando Tierra está demorada o el enlace está caído.'),
    onboard: t('FD30 offers local consultation of the personal plan and scripted events. Autonomous plan changes are a future concept.',
      'FD30 permite consultar localmente el plan personal y eventos guionados. Los cambios autónomos de agenda son un concepto futuro.'),
    ground: {
      operational: t('FD30 shows the operational plan and equipment reservations. Link queues and plan updates are not available in this version.',
        'FD30 muestra el plan operativo y las reservas de equipos. Esta versión no ofrece colas de enlace ni actualizaciones del plan.'),
      medical: t('No medical records or delivery channel are provided by this capability in FD30.',
        'Esta capacidad no ofrece registros médicos ni un canal de entrega en FD30.'),
    },
    backing: {
      kind: 'risk', sourceId: 'nasa-hrp-risk-ops-support',
      risks: [t('Inadequate Systems Operations Support', 'Soporte inadecuado de operaciones de sistemas (Inadequate Systems Operations Support)')],
      statement: t('“Risk of adverse mission outcomes due to Earth independent human-systems operation”',
        '«Risk of adverse mission outcomes due to Earth independent human-systems operation» (enunciado original de la fuente)'),
    },
    dataNeeds: [
      t('Plan versions and rule traces', 'Versiones del plan y trazas de reglas'),
      t('Link status and message times', 'Estado del enlace y horas de los mensajes'),
      t('No personal health data', 'Ningún dato personal de salud'),
    ],
    notBuilt: t('Autonomous plan editing, rule traces and message-link delivery are not offered in FD30.', 'FD30 no ofrece edición autónoma del plan, trazas de reglas ni entrega de mensajes por enlace.'),
    capabilities: [
      {
        id: 'autonomous-plan-link', status: 'concept', verified: false,
        label: t('Autonomous plan changes and delayed-link support', 'Cambios autónomos del plan y soporte con enlace demorado'),
        note: t('Future capability; no task editing or message queue is exposed in FD30.',
          'Capacidad futura; FD30 no expone edición de tareas ni cola de mensajes.'),
      },
      {
        id: 'broader-decision-support', status: 'concept', verified: false,
        label: t('Broader decision support', 'Soporte de decisiones más amplio'),
        note: t('Not implemented.', 'No implementado.'),
      },
    ],
  },
  {
    id: 'MOD-MED', specTier: 'concept', surfaces: ['onboard', 'ground'],
    title: t('Autonomous medical care', 'Atención médica autónoma'),
    solves: t('Would describe how exam guidance, imaging and medication support could work without real-time Ground.',
      'Describiría cómo podrían funcionar la guía de examen, las imágenes y el apoyo con medicación sin Tierra en tiempo real.'),
    onboard: t('Context only. No exam guidance, imaging or treatment advice is built.', 'Solo contexto. No hay guía de examen, imágenes ni consejos de tratamiento.'),
    ground: {
      operational: t('Time and equipment for medical procedures as planning constraints.', 'Tiempo y equipos para procedimientos médicos como restricciones de planificación.'),
      medical: t('Future authorized records and procedures. Nothing clinical is generated here.', 'Registros y procedimientos autorizados a futuro. Aquí no se genera nada clínico.'),
    },
    backing: { kind: 'context', sourceId: 'nasa-hrp-ongoing', topic: t('Tempus Pro', 'Tempus Pro') },
    dataNeeds: [
      t('Verified device outputs with units', 'Salidas de dispositivos verificadas, con unidad'),
      t('Clinical protocol and authority approved by specialists', 'Protocolo clínico y autoridad aprobados por especialistas'),
      t('Consent and access rules', 'Reglas de consentimiento y acceso'),
    ],
    notBuilt: t('Imaging, treatment guidance and device integration need specialist validation that does not exist yet.',
      'Las imágenes, la guía de tratamiento y la integración de dispositivos requieren una validación de especialistas que todavía no existe.'),
    capabilities: [{
      id: 'medical-device', status: 'concept', verified: false,
      label: t('Connected medical device', 'Dispositivo médico conectado'),
      note: t('Not connected. Device capabilities are pending verification.', 'Sin conexión. Las capacidades del dispositivo están pendientes de verificación.'),
    }],
  },
];

/** Status levels a card really has: concept always (01 §5.2), plus whatever exists. */
export function moduleLevels(module: CatalogModule): ('available' | 'evidence' | 'concept')[] {
  const present = new Set(module.capabilities.map(c => c.status));
  return (['available', 'evidence', 'concept'] as const).filter(s => s === 'concept' || present.has(s));
}

export function modulesFor(surface: 'onboard' | 'ground'): CatalogModule[] {
  return CATALOG_MODULES.filter(m => m.surfaces.includes(surface));
}
