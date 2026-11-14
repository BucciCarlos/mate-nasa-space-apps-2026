# M.A.T.E. — Medical & Astronaut Therapeutic Environment

**English** · [Español](#español)

> **Status: draft.** M.A.T.E. is being built by Team Sora for the NASA Space Apps Challenge 2026, challenge *Create Health Monitoring Software for Astronauts on Space Missions*. There is no public build, deployed link or video yet; they will be added here when they exist.

## English

### What it is

On long missions, astronauts carry much of the responsibility for noticing changes in their own health. M.A.T.E. is a health, wellbeing and mission-context platform built around that responsibility:

- **Onboard:** each crew member has one personal companion that stays the same before, during and after flight. It explains what changed in their context, helps them record observations, and lets them decide what to share.
- **Ground:** a professional console where mission operators and medical professionals follow each mission, each seeing only what their role allows.
- **One shared state through a simulated Ground–space link**, so pending deliveries and loss of signal are visible rather than hidden.

M.A.T.E. is a prototype for demonstration. **It is not a medical device.** It does not diagnose, does not recommend treatments, and never decides whether someone may perform a task.

### What is real and what is simulated

| Real (verifiable, with source shown in the app) | Simulated (always labelled "Simulated" in the app) |
|---|---|
| NASA Human Research Program pages on spaceflight risks and hazards (challenge resources) | The ISS and cislunar crews: fictional people |
| NASA OSDR lab data from the real Inspiration4 crew (de-identified codes, before and after flight), shown as separate evidence | Mission agendas, plans and the planning rule that moves blocks |
| ISS radiation and cabin-environment records from NASA archives (evidence views; some still pending verification) | The Ground–space link: delays are demo pacing, not physical latency |
| Canadian Space Agency and NASA-STD-3001 content, quoted as text | The companion's conversation (guided intents; no AI model runs in the app) |

M.A.T.E. never invents physiological values, histories, thresholds or predictions. When it has no evidence, it says so.

### Run it locally (planned stack: React, TypeScript, Vite, plain CSS)

Requirements: Node.js 20 or later. These commands will work once the application code lands (milestone M1):

```bash
npm install
npm run dev          # development server
npm test             # unit tests
npm run build        # production build in dist/
npm run preview      # serve dist/ locally; works without internet
```

After `npm install`, the app needs no network: all data ships with it.

### Guided journey (milestone M1)

1. Open the app. You start **Onboard**, as Lucía Ferraro (fictional) on the ISS.
2. Switch to **Ground** › ISS › Agenda as *Mission operator*. Select "Payload hardware swap" and advance it by 90 minutes. The preview shows how the planned rest window changes.
3. Send the update and watch it travel the simulated link: *In transit* → *Delivered*.
4. Go back **Onboard**. The companion tells you that Ground updated your schedule. Ask "Show me": it opens your agenda and highlights the change.
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
- **Un estado compartido a través de un enlace Tierra–nave simulado**, para que las entregas pendientes y la pérdida de señal se vean en lugar de ocultarse.

M.A.T.E. es un prototipo de demostración. **No es un dispositivo médico.** No diagnostica, no recomienda tratamientos y nunca decide si alguien puede realizar una tarea.

### Qué es real y qué es simulado

| Real (verificable, con la fuente visible en la app) | Simulado (siempre marcado como «Simulado» en la app) |
|---|---|
| Páginas del Programa de Investigación Humana de NASA sobre riesgos y peligros del vuelo espacial (recursos del desafío) | Las tripulaciones de la EEI y de la misión cislunar: personas ficticias |
| Datos de laboratorio de NASA OSDR de la tripulación real de Inspiration4 (códigos desidentificados, antes y después del vuelo), mostrados como evidencia separada | Las agendas de misión, los planes y la regla de planificación que mueve los bloques |
| Registros de radiación y ambiente de cabina de la EEI de archivos de NASA (vistas de evidencia; algunos aún pendientes de verificación) | El enlace Tierra–nave: los tiempos son un ritmo de demostración, no la latencia física |
| Contenido de la Agencia Espacial Canadiense y de NASA-STD-3001, citado como texto | La conversación del compañero (intenciones guiadas; en la app no se ejecuta ningún modelo de IA) |

M.A.T.E. nunca inventa valores fisiológicos, historiales, umbrales ni predicciones. Cuando no tiene evidencia, lo dice.

### Ejecutarlo localmente (stack previsto: React, TypeScript, Vite, CSS normal)

Requisitos: Node.js 20 o superior. Estos comandos funcionarán cuando llegue el código de la aplicación (hito M1):

```bash
npm install
npm run dev          # servidor de desarrollo
npm test             # pruebas unitarias
npm run build        # build de producción en dist/
npm run preview      # sirve dist/ localmente; funciona sin internet
```

Después de `npm install`, la app no necesita red: todos los datos viajan con ella.

### Recorrido guiado (hito M1)

1. Abrí la app. Empezás **A Bordo**, como Lucía Ferraro (ficticia) en la EEI.
2. Pasá a **Tierra** › EEI › Agenda como *Operador de misión*. Seleccioná «Cambio de hardware de carga útil» y adelantalo 90 minutos. La vista previa muestra cómo cambia la ventana de descanso planificada.
3. Enviá la actualización y seguí su viaje por el enlace simulado: *En tránsito* → *Entregado*.
4. Volvé **A Bordo**. El compañero te avisa que Tierra actualizó tu agenda. Pedile «Mostrame»: abre tu agenda y resalta el cambio.
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
