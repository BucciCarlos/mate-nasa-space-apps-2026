// Default source registry for the Sources page (04 §3 and §3.1). IDs, URLs and statuses follow that table.
// A host may pass its own list through the `sources` prop. DOIs and the CC0 note of the two Inspiration4 studies come from the
// DataCite snapshots (2026-11-15); redistribution register: 04 §9.1.
import type { EvidenceSource, Text } from './evidenceTypes';

const t = (en: string, es: string): Text => ({ en, es });
const GOV: Text = t('U.S. Government work; cited with a link. No NASA logos are used.', 'Obra del Gobierno de EE. UU.; se cita con enlace. No se usan logos de NASA.');
const OSDR_REUSE: Text = t(
  'OSDR distributes its data under NASA’s Science Information Policy (SPD-41a: open availability and reuse, subject to applicable restrictions) and asks for citation and credit. The DataCite record of the study declares CC0 1.0. CC0 is declared at study level; public file access (restricted: false) is not a separate file licence. No contrary condition was found for the two selected SUBMITTED files. Conditions and hashes: 04 §9.1.',
  'OSDR distribuye sus datos bajo la Science Information Policy de NASA (SPD-41a: disponibilidad y reutilización abiertas, con las restricciones aplicables) y pide cita y crédito. El registro DataCite del estudio declara CC0 1.0. CC0 se declara a nivel de estudio; la descarga pública (restricted: false) no es una licencia independiente de archivo. No se halló una condición contraria para los dos SUBMITTED seleccionados. Condiciones y hashes: 04 §9.1.',
);
const OSDR_CREDIT: Text = t('Data are courtesy of the NASA Open Science Data Repository (https://osdr.nasa.gov/bio/repo), plus the dataset citation.', 'Data are courtesy of the NASA Open Science Data Repository (https://osdr.nasa.gov/bio/repo), más la cita del conjunto de datos.');

export const EVIDENCE_SOURCES: readonly EvidenceSource[] = [
  {
    id: 'nasa-hrp-risks', title: 'Risks of Human Spaceflight', publisher: 'NASA Human Research Program', url: 'https://www.nasa.gov/hrp/risks/',
    kind: 'nasa_resource', challengeResource: true, accessedAt: '2026-11-14', status: 'verified',
    coverage: t('The 17 risks of human spaceflight; all 17 risk pages respond.', 'Los 17 riesgos del vuelo espacial humano; las 17 páginas de riesgo responden.'),
    supports: t('Challenge resource. Frames the module catalog.', 'Recurso del desafío. Estructura el catálogo de módulos.'), reuse: GOV,
  },
  {
    id: 'nasa-hrp-risk-sleep', title: 'Risk from Inadequate Sleep and Irregular Schedules', publisher: 'NASA Human Research Program',
    url: 'https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/', kind: 'nasa_resource', challengeResource: true, accessedAt: '2026-11-14', status: 'verified',
    coverage: t('Page last updated 2025-05-16.', 'Página actualizada por última vez el 2025-05-16.'),
    supports: t('Context for sleep: stressors and countermeasures named by NASA, without inferring outcomes.', 'Contexto de sueño: factores de estrés y contramedidas que nombra NASA, sin inferir resultados.'), reuse: GOV,
  },
  {
    id: 'nasa-hrp-risk-ops-support', title: 'Risk of Inadequate Systems Operations Support', publisher: 'NASA Human Research Program',
    url: 'https://www.nasa.gov/reference/risk-of-inadequate-systems-operations-support/', kind: 'nasa_resource', challengeResource: true, accessedAt: '2026-11-14', status: 'verified',
    coverage: t('Page last updated 2025-05-16.', 'Página actualizada por última vez el 2025-05-16.'),
    supports: t('Context for operating without real-time Ground support.', 'Contexto para operar sin apoyo de Tierra en tiempo real.'), reuse: GOV,
  },
  {
    id: 'nasa-hrp-hazards', title: '5 Hazards of Human Spaceflight', publisher: 'NASA Human Research Program', url: 'https://www.nasa.gov/hrp/hazards/',
    kind: 'nasa_resource', challengeResource: true, accessedAt: '2026-11-14', status: 'verified',
    coverage: t('The five hazards.', 'Los cinco peligros.'), supports: t('Framing of the catalog and of the environment context.', 'Encuadre del catálogo y del contexto ambiental.'), reuse: GOV,
  },
  {
    id: 'nasa-hrp-ongoing', title: 'Ongoing HRP Research in Space', publisher: 'NASA Human Research Program', url: 'https://www.nasa.gov/hrp/ongoing-hrp-research/',
    kind: 'nasa_resource', challengeResource: true, accessedAt: '2026-11-14', status: 'verified',
    coverage: t('Current HRP investigations.', 'Investigaciones vigentes del HRP.'), supports: t('Context for concept cards.', 'Contexto para las fichas conceptuales.'), reuse: GOV,
  },
  {
    id: 'csa-radiation', title: 'Monitoring radiation for astronaut health', publisher: 'Canadian Space Agency',
    url: 'https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp', kind: 'partner_resource', challengeResource: true, accessedAt: '2026-11-14', status: 'verified',
    coverage: t('Article of 2026-02-26.', 'Artículo del 2026-02-26.'),
    supports: t('Radiation context: neutrons and the CANS instrument. The quote is re-checked before release.', 'Contexto de radiación: neutrones y el instrumento CANS. La cita se vuelve a comprobar antes de publicar.'),
    reuse: t('CSA site terms; short quotes with a link.', 'Términos del sitio de CSA; citas cortas con enlace.'),
  },
  {
    id: 'csa-why-science', title: 'Why do we conduct science experiments in space?', publisher: 'Canadian Space Agency',
    url: 'https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp', kind: 'partner_resource', challengeResource: true, accessedAt: '2026-11-14', status: 'verified',
    coverage: t('Explanatory page.', 'Página explicativa.'), supports: t('Context for concept cards.', 'Contexto para las fichas conceptuales.'),
    reuse: t('CSA site terms; short quotes with a link.', 'Términos del sitio de CSA; citas cortas con enlace.'),
  },
  {
    id: 'osdr-osd-575', title: 'SpaceX Inspiration4 Blood Serum Metabolic Panel and Immune/Cardiac Cytokine Arrays (Comprehensive Metabolic Panel and Multiplex)',
    publisher: 'NASA Open Science Data Repository', url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-575', doi: '10.26030/mc5d-p710', kind: 'dataset', challengeResource: false, accessedAt: '2026-11-15', status: 'verified',
    coverage: t('Four crew members (codes C001–C004); ground samples at L-92, L-44, L-3, R+1, R+45, R+82, R+194 around the 2021-09-16/18 flight. No in-flight samples in the metabolic panel file.', 'Cuatro tripulantes (códigos C001–C004); muestras en tierra en L-92, L-44, L-3, R+1, R+45, R+82, R+194 en torno al vuelo del 2021-09-16/18. Sin muestras en vuelo en el archivo del panel metabólico.'),
    supports: t('Inspiration4 evidence: glucose and calcium.', 'Evidencia de Inspiration4: glucosa y calcio.'), attribution: OSDR_CREDIT, reuse: OSDR_REUSE,
    version: t('Study version 3; DataCite publisher: NASA GeneLab.', 'Versión de estudio 3; editor de DataCite: NASA GeneLab.'),
    citation: t("Reconstructed from DataCite; not exported from the OSDR Citation button. Mason, Christopher E; Overbey, Eliah G; Grigorev, Kirill; Nelson, Theodore M (2024). SpaceX Inspiration4 Blood Serum Metabolic Panel and Immune/Cardiac Cytokine Arrays (Comprehensive Metabolic Panel and Multiplex). NASA Open Science Data Repository, Version 3. https://doi.org/10.26030/mc5d-p710", "Reconstruida desde DataCite; no exportada del bot\u00f3n Citation de OSDR. Mason, Christopher E; Overbey, Eliah G; Grigorev, Kirill; Nelson, Theodore M (2024). SpaceX Inspiration4 Blood Serum Metabolic Panel and Immune/Cardiac Cytokine Arrays (Comprehensive Metabolic Panel and Multiplex). NASA Open Science Data Repository, Version 3. https://doi.org/10.26030/mc5d-p710"),
    subset: { file: 'i4-labs.json', sha256: 'ce46fbec7621ecfee217d4dfcdf94f2bd175ef46c811d4196f6237c0d92705dc' },
  },
  {
    id: 'osdr-osd-569', title: 'Whole Blood Measurements from the SpaceX Inspiration4 Mission (RNA-seq, epitranscriptome, WGS, clonal hematopoiesis, CBC)',
    publisher: 'NASA Open Science Data Repository', url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-569', doi: '10.26030/e0rx-sh52', kind: 'dataset', challengeResource: false, accessedAt: '2026-11-15', status: 'verified',
    coverage: t('The same four crew members and seven timepoints; the complete blood count was run at ground timepoints.', 'Los mismos cuatro tripulantes y siete momentos; el hemograma se hizo en momentos en tierra.'),
    supports: t('Inspiration4 evidence: hemoglobin, red and white blood cells.', 'Evidencia de Inspiration4: hemoglobina, glóbulos rojos y blancos.'), attribution: OSDR_CREDIT, reuse: OSDR_REUSE,
    version: t('Study version 4; DataCite publisher: NASA GeneLab.', 'Versión de estudio 4; editor de DataCite: NASA GeneLab.'),
    citation: t("Reconstructed from DataCite; not exported from the OSDR Citation button. Mason, Christopher E; Overbey, Eliah G.; Grigorev, Kirill; Nelson, Theodore M; Garcia Medina, J. Sebastian (2024). Whole Blood Measurements from the SpaceX Inspiration4 Mission (RNA-seq, epitranscriptome, WGS, clonal hematopoiesis, CBC). NASA Open Science Data Repository, Version 4. https://doi.org/10.26030/e0rx-sh52", "Reconstruida desde DataCite; no exportada del bot\u00f3n Citation de OSDR. Mason, Christopher E; Overbey, Eliah G.; Grigorev, Kirill; Nelson, Theodore M; Garcia Medina, J. Sebastian (2024). Whole Blood Measurements from the SpaceX Inspiration4 Mission (RNA-seq, epitranscriptome, WGS, clonal hematopoiesis, CBC). NASA Open Science Data Repository, Version 4. https://doi.org/10.26030/e0rx-sh52"),
    subset: { file: 'i4-labs.json', sha256: 'ce46fbec7621ecfee217d4dfcdf94f2bd175ef46c811d4196f6237c0d92705dc' },
  },
  {
    id: 'osdr-eda', title: 'Environmental Data Application', publisher: 'NASA Open Science Data Repository', url: 'https://visualization.osdr.nasa.gov/eda/', kind: 'dataset', challengeResource: false, accessedAt: '2026-11-15', status: 'partial',
    coverage: t('Windows of biology payload missions (Rodent Research, APEX, VEG; 2014–2024); not continuous ISS telemetry. Unit, sensor, location and version are not documented.', 'Ventanas de misiones de carga biológica (Rodent Research, APEX, VEG; 2014–2024); no es telemetría continua de la EEI. La unidad, el sensor, la ubicación y la versión no están documentados.'),
    supports: t('Cabin CO₂ context. Shown as “Pending verification”; no readings.', 'Contexto de CO₂ de cabina. Se muestra como «Pendiente de verificación»; sin lecturas.'),
    attribution: t('Data and visualizations are courtesy of the Environmental Data Application (EDA), Version #.', 'Data and visualizations are courtesy of the Environmental Data Application (EDA), Version # (número de versión pendiente).'),
    reuse: t('Cite OSDR (EDA credit line). Redistribution conditions are recorded before any data is committed (04 §9).', 'Citar a OSDR (línea de crédito de EDA). Las condiciones de redistribución se registran antes de commitear datos (04 §9).'),
  },
  {
    id: 'cdaweb-iss-tepc', title: 'ISS_DOSANL_TEPC', publisher: 'NASA SPDF/CDAWeb (data provider: NASA Space Radiation Analysis Group, JSC)',
    url: 'https://cdaweb.gsfc.nasa.gov/misc/NotesI.html#ISS_DOSANL_TEPC', doi: '10.48322/0ba1-1764', kind: 'dataset', challengeResource: false, accessedAt: '2026-11-15', status: 'partial',
    coverage: t('2010-04-29 → 2018-04-11; one window is shown. The location code is not decoded.', '2010-04-29 → 2018-04-11; se muestra una ventana. El código de ubicación no está decodificado.'),
    supports: t('Ambient radiation of an area monitor inside the ISS (DOSE, µGy/min). Never a personal dose.', 'Radiación ambiental de un monitor de área dentro de la EEI (DOSE, µGy/min). Nunca una dosis personal.'),
    attribution: t('Cite the DOI 10.48322/0ba1-1764.', 'Citar el DOI 10.48322/0ba1-1764.'),
    reuse: t('The SPDF data use policy declares CC0 unless otherwise indicated; the product notes state no restriction.', 'La política de uso de datos de SPDF declara CC0 salvo indicación; las notas del producto no declaran restricciones.'),
    version: t('TEPC 1003; analysis software 3.1. Archive-file revision unavailable; raw response pinned by SHA-256.', 'TEPC 1003; software de análisis 3.1. Revisión de archivo no disponible; respuesta original fijada por SHA-256.'),
    citation: t('NASA Space Radiation Analysis Group, Johnson Space Center. ISS_DOSANL_TEPC. NASA SPDF/CDAWeb. DOI 10.48322/0ba1-1764. Window: 2014-03-01–2014-03-08 UTC, 9,998 readings.', 'NASA Space Radiation Analysis Group, Johnson Space Center. ISS_DOSANL_TEPC. NASA SPDF/CDAWeb. DOI 10.48322/0ba1-1764. Ventana: 2014-03-01–2014-03-08 UTC, 9.998 lecturas.'),
    subset: { file: 'tepc-dose.json', sha256: 'caae7e6f2470b3402d437bc8a48c06dd834c3ba94dd91150543da284fa8d5a68' },
  },
  {
    id: 'nasa-std-3001-v1', title: 'NASA-STD-3001 Vol. 1 Rev C', publisher: 'NASA', url: 'https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf',
    kind: 'standard', challengeResource: false, accessedAt: '2026-11-14', status: 'verified',
    coverage: t('§4.8.2, p. 39: [V1 4030], an individual career dose limit.', '§4.8.2, p. 39: [V1 4030], un límite individual de dosis de carrera.'),
    supports: t('Standard text next to the radiation series; never related to area-monitor data.', 'Texto de norma junto a la serie de radiación; nunca se relaciona con datos de un monitor de área.'), reuse: t('Public.', 'Público.'),
  },
  {
    id: 'nasa-std-3001-v2', title: 'NASA-STD-3001 Vol. 2 Rev F', publisher: 'NASA', url: 'https://www.nasa.gov/wp-content/uploads/2025/05/nasa-std-3001-vol-2.pdf',
    kind: 'standard', challengeResource: false, accessedAt: '2026-11-14', status: 'verified',
    coverage: t('§6.2.1.3, p. 53: [V2 6004], one-hour average ppCO₂ of no more than 3 mmHg.', '§6.2.1.3, p. 53: [V2 6004], promedio de una hora de ppCO₂ no mayor que 3 mmHg.'),
    supports: t('Standard text next to the CO₂ card; not a line on a chart.', 'Texto de norma junto a la ficha de CO₂; no es una línea en un gráfico.'), reuse: t('Public.', 'Público.'),
  },
  {
    id: 'osdr-radlab', title: 'RadLab', publisher: 'NASA Open Science Data Repository', url: 'https://visualization.osdr.nasa.gov/radlab/', kind: 'dataset', challengeResource: false, accessedAt: '2026-11-14', status: 'pending',
    coverage: t('Application and documentation returned HTTP 500; units undocumented.', 'La aplicación y la documentación respondieron HTTP 500; unidades sin documentar.'),
    supports: t('Not used yet. Possible per-module ISS dose series later.', 'Sin uso por ahora. Posible serie de dosis por módulo más adelante.'), reuse: t('Not assessed.', 'No evaluada.'),
  },
  {
    id: 'nasa-donki', title: 'DONKI space weather database', publisher: 'NASA', url: 'https://api.nasa.gov/', kind: 'dataset', challengeResource: false, accessedAt: '2026-11-14', status: 'verified',
    coverage: t('Historical solar events.', 'Eventos solares históricos.'), supports: t('Not used yet. Possible solar-event context later.', 'Sin uso por ahora. Posible contexto de eventos solares más adelante.'), reuse: t('Public API; snapshot at build.', 'API pública; instantánea al compilar.'),
  },
  {
    id: 'barger-2014', title: 'Prevalence of sleep deficiency and use of hypnotic drugs in astronauts before, during, and after spaceflight: an observational study',
    publisher: 'Lancet Neurology 2014;13:904–12 (Barger et al.)', url: 'https://pubmed.ncbi.nlm.nih.gov/25127232/', doi: '10.1016/S1474-4422(14)70122-X', kind: 'publication', challengeResource: false, accessedAt: '2026-11-15', status: 'verified',
    coverage: t('Abstract: 21 astronauts on 13 ISS missions, wrist actigraphy. Group aggregate of other crews.', 'Resumen: 21 astronautas en 13 misiones de la EEI, actigrafía de muñeca. Agregado de grupo de otras tripulaciones.'),
    supports: t('Published aggregate in the sleep view. Not a series and not anyone’s record here.', 'Agregado publicado en la vista de sueño. No es una serie ni el registro de nadie acá.'),
    reuse: t('© 2014 Elsevier Ltd. All rights reserved. Only published numerical facts and original method/population descriptions are included, with citation; no article text, figures or table layout are redistributed. No open licence for the article is claimed.', '© 2014 Elsevier Ltd. Todos los derechos reservados. Solo se incluyen hechos numéricos publicados y descripciones propias del método/población, con cita; no se redistribuyen texto del artículo, figuras ni composición de tablas. No se afirma una licencia abierta del artículo.'),
    version: t('Published article, 2014; PMC author manuscript available 2015-09-01. Four ISS actigraphy mean/SD pairs, not an individual dataset.', 'Artículo publicado, 2014; manuscrito de autor en PMC desde 2015-09-01. Cuatro pares media/DE de actigrafía EEI, sin conjunto individual.'),
    subset: { file: 'sleep-aggregate.json', sha256: '95b860c712336e2d2c6987aba31bad8b97ebebec6f43660c7a4d0a172c0c232c' },
  },
  // 04 §3.1: framing sources, not data feeds
  {
    id: 'standard-measures', title: 'Standard Measures During Spaceflight (NTRS 20230014025)', publisher: 'NASA NTRS', url: 'https://ntrs.nasa.gov/citations/20230014025', kind: 'publication', challengeResource: false, accessedAt: '2026-11-14', status: 'verified',
    coverage: t('Conference abstract.', 'Resumen de congreso.'), supports: t('Research-inspired FD30 setting. No universal testing frequency and no immediate onboard analyzer.', 'Escenario FD30 inspirado en investigación. Sin frecuencia universal de controles ni analizador inmediato a bordo.'), reuse: GOV,
  },
  {
    id: 'csa-sleeping', title: 'Sleeping in space', publisher: 'Canadian Space Agency', url: 'https://www.asc-csa.gc.ca/eng/astronauts/living-in-space/sleeping-in-space.asp', kind: 'partner_resource', challengeResource: false, accessedAt: '2026-11-14', status: 'verified',
    coverage: t('Official page.', 'Página oficial.'), supports: t('Separates allocated sleep time from sleep actually obtained. No measurement for any profile.', 'Distingue el tiempo asignado para dormir del sueño realmente obtenido. Sin medición para ningún perfil.'),
    reuse: t('CSA site terms; short quotes with a link.', 'Términos del sitio de CSA; citas cortas con enlace.'),
  },
  {
    id: 'nasa-spaceflight-qa', title: 'NASA Spaceflight Q&A', publisher: 'NASA', url: 'https://robotics.nasa.gov/spaceflight-qa/', kind: 'nasa_resource', challengeResource: false, accessedAt: '2026-11-14', status: 'verified',
    coverage: t('Exercise-scheduling section.', 'Sección sobre horarios de ejercicio.'), supports: t('Equipment availability and variable schedules. No universal daily regimen.', 'Disponibilidad de equipos y horarios variables. Sin régimen diario universal.'), reuse: GOV,
  },
  {
    id: 'standard-measures-methods', title: 'Spaceflight Standard Measures (Hardy et al., 2025), methods', publisher: 'PubMed Central', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12612093/', kind: 'publication', challengeResource: false, accessedAt: '2026-11-14', status: 'verified',
    coverage: t('Biochemistry section.', 'Sección de bioquímica.'), supports: t('Research collection and processing are not the hypothetical demo analyzer.', 'La colección y el procesamiento de investigación no son el analizador hipotético de la demo.'),
    reuse: t('Cite; follow the journal’s terms.', 'Citar; seguir los términos de la revista.'),
  },
  {
    id: 'nasa-std-3001-v2-interfaces', title: 'NASA-STD-3001 Vol. 2 §10, Crew Interfaces', publisher: 'NASA', url: 'https://www.nasa.gov/reference/10-0-crew-interfaces-vol-2/', kind: 'standard', challengeResource: false, accessedAt: '2026-11-14', status: 'verified',
    coverage: t('Web section.', 'Sección web.'), supports: t('Design reference for consistency and visible status. Not a certification.', 'Referencia de diseño sobre consistencia y estado visible. No es una certificación.'), reuse: t('Public.', 'Público.'),
  },
];

export const sourceById = (list: readonly EvidenceSource[], id: string): EvidenceSource | undefined => list.find(s => s.id === id);
