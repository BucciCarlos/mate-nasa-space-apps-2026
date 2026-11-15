# M.A.T.E. — Medical & Astronaut Therapeutic Environment

**English** · [Español](#español)

> **Status: draft.** M.A.T.E. is being built by Team Sora for the NASA Space Apps Challenge 2026, challenge *Create Health Monitoring Software for Astronauts on Space Missions*. There is no public build, deployed link or video yet; they will be added here when they exist.

## English

### What it is

On long missions, astronauts carry much of the responsibility for noticing changes in their own health. M.A.T.E. is a health, wellbeing and mission-context platform built around that responsibility:

- **Onboard:** each crew member has one personal companion that stays the same before, during and after flight. It explains what changed in their context, helps them record observations, and lets them decide what to share.
- **Ground:** a professional console where mission operators and medical professionals follow each mission, each seeing only what their role allows.
- **One FD30 state and mission clock across both perspectives.** The simulated link and delivery queues from M1 remain internal regression features.

M.A.T.E. is a prototype for demonstration. **It is not a medical device.** It does not diagnose, does not recommend treatments, and never decides whether someone may perform a task.

### What is real and what is simulated

| Real (verifiable, with source shown in the app) | Simulated (always labelled "Simulated" in the app) |
|---|---|
| NASA Human Research Program pages on spaceflight risks and hazards (challenge resources) | The ISS and cislunar crews: fictional people |
| NASA OSDR lab data from the real Inspiration4 crew (de-identified codes, before and after flight), shown as separate evidence | Mission agendas, plans and the planning rule that moves blocks |
| ISS radiation and cabin-environment records from NASA archives (evidence views; some still pending verification) | The Ground–space link: delays are demo pacing, not physical latency |
| Canadian Space Agency and NASA-STD-3001 content, quoted as text | The companion's conversation (guided intents; no AI model runs in the app) |

M.A.T.E. never invents physiological values, histories, thresholds or predictions. When it has no evidence, it says so.

### Run it locally (React 18, TypeScript, Vite 8, plain CSS)

Requirements: Node.js 22.12 or later (verified with Node 22.23 and npm 10). Commands verified on 2026-11-14:

```bash
npm install
npm run dev          # development server (Vite), prints a local URL
npm test             # unit tests (Vitest)
npm run typecheck    # tsc --noEmit
npm run check:i18n   # fails on user-visible literal text in components
npm run build        # type-check + production build in dist/
npm run preview      # serves dist/ at http://localhost:4173
```

After `npm install`, the app makes no network requests: every page, style and data file is served by the local server, so it works without internet. `dist/index.html` must be served (for example with `npm run preview`), not opened as a file.

FD30 is the only public experience: `/` opens Onboard › Today. Ground opens the FD30 overview; Onboard returns to the last operational section (Today on first use). M1 code and regression tests remain internal, without a public UI entry.

### FD30 public entry and perspectives

Run `npm run dev -- --host 127.0.0.1 --port 5173` and open **http://127.0.0.1:5173/**. The canonical Today route is `#/demo/fd30`; Ground is `#/demo/fd30/ground`, and its read-only crew schedule is `#/demo/fd30/ground/agenda`. Both perspectives share the FD30 clock/profile and preserve language, chat, draft and Mate position. Catalog and Sources & evidence remain accessible. Legacy M1 URLs are replaced with FD30 equivalents (or the corresponding overview), without an old-screen flash or redirect history entry. M1 task editing, link queues, medical delivery channel and cislunar scenario are internal only.

1. Before advancing, open **Sleep** from navigation, Today or Lira's info card (the ⓘ button beside the character). All use `#/onboard/personal/sleep`; FD29 simulated history is already readable. Return to Today.
2. In **Demo mode**, choose **Next event**. The 06:00 simulated episode-ended report updates Today and Sleep; Lira reacts and its ⓘ button shows a “!” badge, without opening chat or the card and without navigating. Open ⓘ to read the news and choose **View my summary**: it opens the same Sleep detail.
3. The planned window is 21:30–06:00 (8 h 30 min **planned**). Recorded sleep says **No record** throughout: no duration or quality measurement is supplied. Source disclosures distinguish the plan, a fictional device report and external research context.
4. Activate Lira to open chat; close with its labelled button or Escape. Conversation and draft survive closure, navigation, EN/ES and reload in this tab; reload starts with chat closed. **Restart preview** confirms and resets only this fixture. Its one event also arrives at 1× mission time without the skip control.

5. Drag Lira with mouse or touch; releasing a drag does not open chat. Tap to open chat in its independent side/bottom panel. Focus the character with Tab and press **M** to enable arrows (8 px), Shift+arrows (32 px), Enter to save and Escape to cancel. **Home** resets only that companion. There is no Position button or floating position menu. The ⓘ button opens an on-demand card (closed by default, independent of chat; Escape closes it and returns focus to ⓘ) that holds the keyboard hints and shows the move instructions while you move.
6. Use **View as** in Demo mode to switch Lucía/Lira, Tomás/Flop and Mei/Pip. Each keeps its position, conversation and draft. FD30 keeps running; the wake report belongs only to Lucía. Resize temporarily adapts the visible position without replacing the saved preference. The earlier single-profile preview snapshot is migrated; M1 storage is untouched.

The public FD30 menus expose the available operational sections. Ground schedule reuses the wide timeline, anchored crew names and card list, with existing FD30 plans; browsing, selecting or centering never changes mission time. Autonomy remains a concept in the Catalog and offers no M1 link. No deployment is included.

### Internal regression journey (milestone M1)

Historical reference for the preserved internal code/tests (`npm test`), not an accessible public workflow. Public aliases now resolve to FD30; the following M1 controls are not offered there.

1. Open the app. You start **Onboard**, as Lucía Ferraro (fictional) on the ISS.
2. Switch to **Ground** › ISS › Agenda as *Mission operator*. Select "Payload hardware swap" and advance it by 90 minutes. The preview shows how the planned rest window changes.
3. Send the update and watch it travel the simulated link: *In transit* → *Delivered*.
4. Go back **Onboard**. The companion tells you that Ground updated your schedule. Choose "Show me what changed" (or type it): it opens your agenda, selects the period and highlights the blocks that moved, before and after.
5. Ask "How will this affect me?". The companion explains that it has no comparable sleep records and therefore makes no inference.
6. Ask "Why does this matter?". It cites NASA's page on the risk from inadequate sleep and irregular schedules.
7. Log an observation. It is private by default; you can choose to share a summary.
8. On **Ground**, as *Medical professional*, read the shared summary. As *Mission operator*, you only see that a restricted summary arrived.

### Free exploration

- Switch language (EN/ES) at any time: nothing resets.
- Set the ISS link down on Ground and see what waits on each side.
- Open the cislunar mission on Ground: it has its own crew, agenda and link, completely isolated from the ISS.
- Later milestones add evidence views (Inspiration4 labs, radiation, cabin CO₂), the module catalog and body map, and the pre-flight / in-flight / post-flight journey.

### Video and app

The official demo video (30 seconds or less) is a short visual presentation. The public web app is the product to explore, and the video's length does not limit it.

The video limit and the other submission rules mentioned here come from the Space Apps 2026 submission guide, consulted through a web-archive copy dated 2026-11-13. They are still to be cross-checked against the organizers' own documents.

### Specifications

Canonical specs (English) with a bilingual index: [docs/specs/00-index.md](docs/specs/00-index.md)

| # | Document |
|---|---|
| 01 | [Product and scope](docs/specs/01-product-scope.md) |
| 02 | [Architecture and contracts](docs/specs/02-architecture-contracts.md) |
| 03 | [Experience and bilingual design](docs/specs/03-experience-i18n.md) |
| 04 | [Data and traceability](docs/specs/04-data-traceability.md) |
| 05 | [Acceptance criteria and build order](docs/specs/05-acceptance-build-order.md) |

### Data sources and credits

NASA Human Research Program (*5 Hazards of Human Spaceflight*, *Risks of Human Spaceflight*, *Ongoing HRP Research in Space*); NASA Open Science Data Repository (OSD-575, OSD-569, Environmental Data Application), with the credit line "Data are courtesy of the NASA Open Science Data Repository"; NASA SPDF/CDAWeb (ISS TEPC, DOI 10.48322/0ba1-1764); Canadian Space Agency; NASA-STD-3001. The full list with status and access dates is in [04-data-traceability.md](docs/specs/04-data-traceability.md) and, once built, on the in-app Sources page. M.A.T.E. does not use NASA logos or insignia and is not endorsed by NASA.

### Use of AI tools ("SI" in Space Apps 2026 rules)

*To be completed by the team before submission*, as the challenge rules require: which tools were used, for what (e.g. drafting specifications, writing code) and where.

### License

The original M.A.T.E. material by Team Sora (code, documentation and original design assets) is licensed under the **Apache License 2.0**; see [LICENSE](LICENSE). The team chose this license.

Third-party data and materials keep their own terms, credits and citation requirements, and are not relicensed by Apache-2.0. This includes NASA and Canadian Space Agency content, NASA OSDR and CDAWeb data, NASA-STD-3001 and cited publications. See [Data and traceability §9](docs/specs/04-data-traceability.md). This repository currently contains documentation only, with no data files.

### Team

Team Sora · NASA Space Apps Challenge 2026.

---

## Español

> **Estado: borrador.** M.A.T.E. está en construcción por el equipo Sora para el NASA Space Apps Challenge 2026, desafío *Create Health Monitoring Software for Astronauts on Space Missions*. Todavía no hay build público, enlace desplegado ni video; se agregarán aquí cuando existan.

### Qué es

En misiones largas, los astronautas cargan con buena parte de la responsabilidad de notar cambios en su propia salud. M.A.T.E. es una plataforma de salud, bienestar y contexto de misión pensada para esa responsabilidad:

- **A Bordo:** cada tripulante tiene un compañero personal que es el mismo antes, durante y después del vuelo. Le explica qué cambió en su contexto, lo ayuda a registrar observaciones y le permite decidir qué compartir.
- **Tierra:** una consola profesional donde operadores de misión y profesionales médicos siguen cada misión, cada uno viendo solo lo que su rol permite.
- **Un solo estado y reloj de misión FD30 entre ambas perspectivas.** El enlace simulado y las colas de entrega de M1 quedan como funciones de regresión internas.

M.A.T.E. es un prototipo de demostración. **No es un dispositivo médico.** No diagnostica, no recomienda tratamientos y nunca decide si alguien puede realizar una tarea.

### Qué es real y qué es simulado

| Real (verificable, con la fuente visible en la app) | Simulado (siempre marcado como «Simulado» en la app) |
|---|---|
| Páginas del Programa de Investigación Humana de NASA sobre riesgos y peligros del vuelo espacial (recursos del desafío) | Las tripulaciones de la EEI y de la misión cislunar: personas ficticias |
| Datos de laboratorio de NASA OSDR de la tripulación real de Inspiration4 (códigos desidentificados, antes y después del vuelo), mostrados como evidencia separada | Las agendas de misión, los planes y la regla de planificación que mueve los bloques |
| Registros de radiación y ambiente de cabina de la EEI de archivos de NASA (vistas de evidencia; algunos aún pendientes de verificación) | El enlace Tierra–nave: los tiempos son un ritmo de demostración, no la latencia física |
| Contenido de la Agencia Espacial Canadiense y de NASA-STD-3001, citado como texto | La conversación del compañero (intenciones guiadas; en la app no se ejecuta ningún modelo de IA) |

M.A.T.E. nunca inventa valores fisiológicos, historiales, umbrales ni predicciones. Cuando no tiene evidencia, lo dice.

### Ejecutarlo localmente (React 18, TypeScript, Vite 8, CSS normal)

Requisitos: Node.js 22.12 o superior (verificado con Node 22.23 y npm 10). Comandos verificados el 14/11/2026:

```bash
npm install
npm run dev          # servidor de desarrollo (Vite), imprime una URL local
npm test             # pruebas unitarias (Vitest)
npm run typecheck    # tsc --noEmit
npm run check:i18n   # falla si hay texto literal visible en los componentes
npm run build        # verificación de tipos + build de producción en dist/
npm run preview      # sirve dist/ en http://localhost:4173
```

Después de `npm install`, la app no hace ninguna petición de red: todas las páginas, estilos y datos los sirve el servidor local, así que funciona sin internet. `dist/index.html` debe servirse (por ejemplo con `npm run preview`), no abrirse como archivo.

FD30 es la única experiencia pública: `/` abre A bordo › Hoy. Tierra abre la portada FD30; A bordo vuelve a la última sección operativa (Hoy en el primer uso). El código y las pruebas de regresión de M1 quedan internos, sin entrada pública a su interfaz.

### Entrada pública y perspectivas FD30

Ejecutá `npm run dev -- --host 127.0.0.1 --port 5173` y abrí **http://127.0.0.1:5173/**. La ruta canónica de Hoy es `#/demo/fd30`; Tierra usa `#/demo/fd30/ground` y su agenda de consulta `#/demo/fd30/ground/agenda`. Ambas perspectivas comparten reloj y perfil de FD30 y conservan idioma, chat, borrador y posición de Mate. Catálogo y Fuentes y evidencia siguen accesibles. Las URLs de M1 se reemplazan por equivalentes FD30 o por la portada de la perspectiva, sin mostrar la pantalla vieja ni agregar una entrada de redirección al historial. La edición de tareas, las colas del enlace, el canal de entrega médica y el escenario cislunar de M1 quedan solo internos.

1. Antes de avanzar, abrí **Sueño** desde navegación, Hoy o la tarjeta de información de Lira (el botón ⓘ junto al personaje). Todos llegan a `#/onboard/personal/sleep`; el historial simulado de FD29 ya se puede consultar. Volvé a Hoy.
2. En **Modo muestra**, elegí **Siguiente evento**. El reporte simulado de fin de episodio de las 06:00 actualiza Hoy y Sueño; Lira reacciona y su botón ⓘ muestra una insignia «!», sin abrir el chat ni la tarjeta y sin navegar. Abrí ⓘ para leer la novedad y elegí **Ver mi resumen**: abre el mismo detalle de Sueño.
3. La ventana prevista es 21:30–06:00 (8 h 30 min **planificadas**). Sueño registrado dice **Sin registro** antes y después: no se recibió medición de duración o calidad. La procedencia distingue agenda, reporte ficticio y contexto externo de investigación.
4. Activá Lira para abrir el chat; cerralo con su botón etiquetado o Escape. Conversación y borrador se conservan al cerrar, navegar, cambiar EN/ES y recargar esta pestaña; la recarga arranca con el chat cerrado. **Reiniciar corte** pide confirmación y reinicia solo este escenario. Su único evento también llega con el reloj a velocidad 1×, sin usar el control de salto.

5. Arrastrá a Lira con mouse o dedo; soltar un arrastre no abre el chat. Tocarlo abre el panel lateral/inferior independiente. Enfocá el personaje con Tab y pulsá **M** para activar flechas (8 px), Shift+flechas (32 px), Enter para guardar y Escape para cancelar. **Home** restablece solo a ese compañero. No hay botón de Posición ni menú flotante de posición. El botón ⓘ abre una tarjeta a pedido (cerrada por defecto, independiente del chat; Escape la cierra y devuelve el foco a ⓘ) que contiene las instrucciones de teclado y muestra las de movimiento mientras movés al personaje.
6. Usá **Ver como** en Modo muestra para alternar Lucía/Lira, Tomás/Flop y Mei/Pip. Cada uno conserva posición, conversación y borrador. FD30 sigue corriendo; el reporte de despertar solo corresponde a Lucía. Cambiar el ancho adapta la posición visible sin reemplazar la preferencia guardada. Se migra el corte previo de un perfil; el almacenamiento de M1 no se modifica.

Los menús públicos de FD30 muestran las secciones operativas disponibles. La Agenda de Tierra reutiliza la línea de tiempo amplia, los nombres anclados y las tarjetas con los planes existentes: consultar, seleccionar o centrar no cambia la hora de misión. Autonomía sigue como concepto en Catálogo, sin enlace a M1. No incluye despliegue.

### Recorrido de regresión interno (hito M1)

Referencia histórica del código y las pruebas conservadas (`npm test`), sin acceso público al recorrido. Las URLs antiguas llevan a FD30; los controles de M1 descriptos abajo no se ofrecen allí.

1. Abrí la app. Empezás **A Bordo**, como Lucía Ferraro (ficticia) en la EEI.
2. Pasá a **Tierra** › EEI › Agenda como *Operador de misión*. Seleccioná «Cambio de hardware de carga útil» y adelantalo 90 minutos. La vista previa muestra cómo cambia la ventana de descanso planificada.
3. Enviá la actualización y seguí su viaje por el enlace simulado: *En tránsito* → *Entregado*.
4. Volvé **A Bordo**. El compañero te avisa que Tierra actualizó tu agenda. Elegí «Mostrame qué cambió» (o escribilo): abre tu agenda, selecciona el período y resalta los bloques que se movieron, antes y después.
5. Preguntale «¿Cómo me va a afectar?». El compañero explica que no tiene registros de sueño comparables y por eso no infiere nada.
6. Preguntale «¿Por qué importa?». Cita la página de NASA sobre el riesgo por sueño inadecuado y horarios irregulares.
7. Registrá una observación. Es privada por defecto; podés elegir compartir un resumen.
8. En **Tierra**, como *Profesional médico*, leé el resumen compartido. Como *Operador de misión*, solo ves que llegó un resumen restringido.

### Exploración libre

- Cambiá el idioma (EN/ES) cuando quieras: nada se reinicia.
- Cortá el enlace de la EEI desde Tierra y mirá qué queda en espera de cada lado.
- Abrí la misión cislunar en Tierra: tiene su propia tripulación, agenda y enlace, completamente aislados de la EEI.
- Los hitos siguientes suman vistas de evidencia (laboratorio de Inspiration4, radiación, CO₂ de cabina), el catálogo de módulos con mapa corporal y el viaje prevuelo / en vuelo / posvuelo.

### Video y app

El video oficial de demostración (30 segundos o menos) es una presentación visual breve. La app web pública es el producto para explorar, y la duración del video no la limita.

El límite del video y las demás reglas de envío mencionadas aquí provienen de la guía de envío de Space Apps 2026, consultada en una copia de archivo web del 13/11/2026. Todavía falta cotejarlas con los documentos propios de la organización.

### Especificaciones

Specs canónicas (en inglés) con índice bilingüe: [docs/specs/00-index.md](docs/specs/00-index.md)

| # | Documento |
|---|---|
| 01 | [Producto y alcance](docs/specs/01-product-scope.md) |
| 02 | [Arquitectura y contratos](docs/specs/02-architecture-contracts.md) |
| 03 | [Experiencia y diseño bilingüe](docs/specs/03-experience-i18n.md) |
| 04 | [Datos y trazabilidad](docs/specs/04-data-traceability.md) |
| 05 | [Criterios de aceptación y orden de construcción](docs/specs/05-acceptance-build-order.md) |

### Fuentes de datos y créditos

Programa de Investigación Humana de NASA (*5 Hazards of Human Spaceflight*, *Risks of Human Spaceflight*, *Ongoing HRP Research in Space*); NASA Open Science Data Repository (OSD-575, OSD-569, Environmental Data Application), con la línea de crédito «Data are courtesy of the NASA Open Science Data Repository»; NASA SPDF/CDAWeb (ISS TEPC, DOI 10.48322/0ba1-1764); Agencia Espacial Canadiense; NASA-STD-3001. La lista completa, con estado y fechas de consulta, está en [04-data-traceability.md](docs/specs/04-data-traceability.md) y, cuando exista, en la página Fuentes de la app. M.A.T.E. no usa logos ni insignias de NASA y no cuenta con su respaldo.

### Uso de herramientas de IA («SI» en las reglas de Space Apps 2026)

*A completar por el equipo antes del envío*, como exigen las reglas del desafío: qué herramientas se usaron, para qué (por ejemplo, redactar especificaciones o escribir código) y dónde.

### Licencia

El material original de M.A.T.E. del equipo Sora (código, documentación y recursos de diseño propios) se publica bajo la **Apache License 2.0**; ver [LICENSE](LICENSE). El equipo eligió esta licencia.

Los datos y materiales de terceros conservan sus propias condiciones, créditos y requisitos de cita, y Apache-2.0 no los relicencia. Esto incluye contenido de NASA y de la Agencia Espacial Canadiense, datos de NASA OSDR y CDAWeb, NASA-STD-3001 y las publicaciones citadas. Ver [Datos y trazabilidad §9](docs/specs/04-data-traceability.md). Por ahora este repositorio contiene solo documentación, sin archivos de datos.

### Equipo

Equipo Sora · NASA Space Apps Challenge 2026.
