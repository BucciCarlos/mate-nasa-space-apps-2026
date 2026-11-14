# 03 — Experience and bilingual design

Status: draft for team review · 2026-11-14

## 1. Shell (M1 MUST)

The header is shared by both surfaces. From left to right:

1. The **M.A.T.E.** wordmark (CSS text, no image).
2. **Perspective switch:** Ground | Onboard.
3. Ground only: the **mission selector** (ISS | Cislunar mission).
4. Ground only: the **role switch** (Mission operator | Medical professional), with the hint "Demonstration filter — not access control".
5. The **link indicator** for the current mission.
6. The mission clock: `FD n · hh:mm UTC`.
7. The **language switch**: EN | ES.
8. A menu with Settings and Restart scenario.

The perspective switch exists because the prototype runs both ends of the system in one tab. Switching perspective keeps the state and each side's last view (02 §3.2).

## 2. Ground console: professional, dense, precise

| Screen | Route | Contents | Milestone |
|---|---|---|---|
| Agenda | `#/ground/:missionId/agenda` | Crew lanes (rows) × time (columns, UTC), covering the current day and the next one. Blocks show their kind as text, not only color. A "now" line. Selecting a movable task opens a side panel with: task details; **Advance by** 30 / 60 / 90 / 120 min; a live preview from `advanceTask` (per crew member: moved blocks and planned rest window before → after, Δ; or the conflict); the label "Planning rule (simulated)"; **Send update**, for the mission operator only (the medical professional sees the panel read-only). Sent changes are listed with their message status. | M1 |
| Link | `…/link` | Link status and **Set link down / Set link up** (mission operator only). The pacing note "Simulated link — transit time is demo pacing, not physical latency". Uplink and downlink lists with status and UTC times. Until a downlink message is delivered, its row shows only "Message from crew — content available on arrival" and its status, for both roles (02 §9.4). | M1 |
| Crew | `…/crew` | Crew cards (name, role title, "No link since …" when relevant). Received summaries, filtered by role (02 §9.3). | M1 |
| Log | `…/log` | Mission log filtered by role. Each entry has a "Why?" disclosure showing its inputs or rule trace. | M1 |
| Evidence and Sources | `…/modules/:moduleId`, `#/sources` | Same shared components as Onboard | M2 |

## 3. Onboard: clear, conversational, humane

| Screen | Route | Contents | Milestone |
|---|---|---|---|
| Today | `#/onboard/today` | Greeting with the crew member's name. The next 3 blocks. Notice cards (plan change, with the rest-window Δ). The link banner when the link is down. Quick actions: Open agenda · Log an observation. | M1 |
| Agenda | `#/onboard/agenda` | Timeline for `ui.agendaRange`; by default from today 12:00 UTC to tomorrow 12:00 UTC, which includes the night. When a change is highlighted: the before position is shown as a dashed outline labelled "Before", the new one solid and labelled "After", and every moved block has the label "Changed". The rest-window summary reads, e.g., "Planned rest window: 8 h 30 min → 7 h 00 min (−1 h 30 min)", and the Before/After labels show the intervals (21:30–06:00 UTC → 21:30–04:30 UTC). Also: a "Sleep records" area with its empty state, and a "Why this matters" link that opens the source popover. | M1 |
| Observations | `#/onboard/observations` | Form and list as described in 02 §9.1. | M1 |
| Companion panel | (overlay on every Onboard view) | Width ≥ 1024 px: docked on the right (360 px), collapsible to a 56 px rail with the avatar. Narrower: a bottom sheet with a collapsed bar ("Ask Mate…"). Contents: conversation, notice cards, chips, text input, microphone button (simulated). Always reachable through a button whose accessible name is "Open companion". On desktop it never covers the main content. | M1 |
| Evidence modules | `#/onboard/modules/:moduleId` | MOD-SLEEP, MOD-LABS, MOD-RAD, MOD-ENV (04 §4–§7) | M2 |
| Catalog and body map | `#/onboard/modules` | All modules with tier badge, the NASA risk link and "what it contributes". Body map: an SVG figure with about 8 clickable regions leading to modules. Region shading encodes **tier and data availability, never health status**; a legend says so. | M3 |
| Journey | `#/onboard/journey` | Tabs Pre-flight · In-flight · Post-flight. Same companion name and color in all three. Contents: simulated plans, the person's own observations, and the link to MOD-LABS with the "another, real crew" disclaimer (01 §5.3). | M3 |
| Settings | `#/settings` | Language, Restart scenario (M1); companion name and color (M3). | M1 / M3 |

**In-app guide (M3):** a "Guide" panel listing the M1 journey steps (05 §2.2). Each step is ticked automatically from state; the guide never acts by itself.

## 4. Visual identity (plain CSS)

- Tokens live in `styles/tokens.css`: colors, 4 px spacing grid, radii and type scale. Two surfaces via `[data-surface="ground"]` and `[data-surface="onboard"]`.
- **Ground:** dark slate background, dense tables, tabular numerals, cyan accent, monospace for times.
- **Onboard:** light warm-neutral background, larger type (16–18 px base), teal accent. The companion's accent color is customizable in M3 from six presets.
- **Semantic styles never rely on color alone:**

| Meaning | Style |
|---|---|
| Changed | amber outline + "Changed" label |
| Simulated | dashed border + badge |
| Real data | solid style + badge |
| No data | hatched area + text |
| Link down | banner + icon + text |
| No evidence | icon + "No evidence" label |

- **Companion avatar:** an abstract CSS/SVG orb with the initial of the companion's name. No human likeness, no generated imagery. Default name: **Mate**.
- **Forbidden:** NASA insignia ("meatball"), logotype ("worm") or seal; mission patches; agency or national flags; images or likeness of real astronauts; anything implying NASA endorsement. Space Apps rules require a visible watermark on any image or video generated with AI ("SI") tools, and none is planned.
- **Motion:** transitions of 200 ms or less; respect `prefers-reduced-motion`.

## 5. Provenance in the UI (CORE-PROV)

| Badge EN | Badge ES | Meaning |
|---|---|---|
| Simulated | Simulado | Part of the fictional scenario: crew, agenda, link, plans, conversation |
| Your entry | Tu registro | Entered by the crew member in this session |
| NASA resource | Recurso NASA | Content from a NASA page or standard |
| Partner resource | Recurso de agencia asociada | Content from a partner agency (e.g. CSA) |
| Real flight data | Dato real de vuelo | Measured on a real crew or vehicle around a real flight (mission and phase shown) |
| Published result | Resultado publicado | A number reported in a peer-reviewed publication |
| Calculated | Calculado | Computed by M.A.T.E. from the inputs shown (formula in the popover) |
| Pending verification | Pendiente de verificación | The source or a field has not been verified |
| No data | Sin datos | No value exists for this item |

Clicking or focusing a badge opens a popover with the source title, publisher, URL, access date, what the source supports, and any transformations. In M2 it also links to the Sources page.

## 6. Accessibility (MUST, target WCAG 2.2 AA)

- Semantic landmarks (`header`, `nav`, `main`, `aside` for the companion), one `h1` per view, headings in order.
- Everything is operable by keyboard, with a visible focus ring and no keyboard traps. The bottom sheet and dialogs restore focus when closed.
- When the companion opens a view, focus moves to that view's heading and a polite live region announces what was done.
- `<html lang>` follows `state.locale`. User text is wrapped in an element whose `lang` is the text's own language.
- Charts have a text summary and a "Show as table" alternative. The agenda timeline is also available as a list.
- Contrast at least 4.5:1 for text and 3:1 for UI components. Targets at least 24 × 24 px. Information is never conveyed by color alone.
- All accessible names, labels, live-region messages and alt texts come from the catalogs.

## 7. Bilingual architecture (CORE-I18N, MUST)

### 7.1 Catalogs (no i18n library)

- `src/i18n/en.ts` exports `en` and is the source of truth.
- `src/i18n/es.ts` exports `es` typed as `Messages` (in `types.ts`). `Messages` maps every string to `string` and every function to the same signature, so a missing or extra key fails `tsc`.
- Interpolation uses functions, e.g. `restChange: (p: { before: string; after: string; delta: string }) => string`. Values are formatted with the helpers of §7.3 **before** interpolation.
- Namespaces: `common`, `shell`, `ground`, `onboard`, `agenda`, `companion`, `observations`, `provenance`, `modules`, `evidence`, `errors`, `a11y`.
- Components get messages through `useT()`. No user-visible literal text in `.tsx` files: `scripts/check-literals.mjs` enforces this (05 §6).

### 7.2 Locale state

- `state.locale` is `en` or `es`, and defaults to `en`.
- Switching updates `<html lang>` and re-renders. Everything else is preserved: route, range, highlight, conversation, observations, messages.

### 7.3 Formats (`src/i18n/format.ts`)

| Item | Rule | EN | ES |
|---|---|---|---|
| Locale tags | `Intl` locale | `en-US` | `es-AR` |
| Time | 24 h, UTC, suffix | `06:00 UTC` | `06:00 UTC` |
| Date | weekday + day + month name | `Wed, Mar 10` | `mié, 10 mar` |
| Duration | hours and minutes | `7 h 00 min` | `7 h 00 min` |
| Delta | sign + Unicode minus | `−1 h 30 min` | `−1 h 30 min` |
| Decimal | locale separator | `9.6` | `9,6` |
| Units | symbol after a narrow no-break space; never translated | `83 mg/dL` | `83 mg/dL` |
| Count units | language-neutral notation | `4.58 10⁶/µL` | `4,58 10⁶/µL` |
| Mission phase | kept as published; translated tooltip | `L-92` ("92 days before launch") | `L-92` ("92 días antes del lanzamiento") |

### 7.4 Never translated

- Proper names: fictional crew names, the companion's name.
- Dataset and study identifiers: `OSD-575`, `LSDS-8`, `C001`, `ISS_DOSANL_TEPC`.
- Requirement IDs: `[V2 6004]`.
- Source titles, shown in their original language.
- Analyte names as written in the source file. These appear in the provenance popover; the display name is translated.

### 7.5 Scenario and content text

Scenario JSON and `modules.json` hold human-facing text as `{ "en": …, "es": … }`. A unit test checks that both values are present and not empty.

### 7.6 User-generated text

Never machine-translated. It is displayed verbatim, with its `lang` attribute, and with the tag "Written in Spanish" / "Escrito en inglés" when its language differs from the UI language.

### 7.7 Spanish style

- Onboard conversational text uses rioplatense *voseo* ("¿Querés registrar una observación?").
- Ground uses impersonal, professional forms ("Enviar actualización").
- Terms follow the glossary.

### 7.8 Glossary (canonical terms)

| English | Español | English | Español |
|---|---|---|---|
| Ground (console) | Tierra (consola) | Onboard | A Bordo |
| ISS | EEI | Cislunar mission | Misión cislunar |
| Mission operator | Operador de misión | Medical professional | Profesional médico |
| Crew member | Tripulante | Companion | Compañero |
| Agenda / schedule | Agenda | Task | Tarea |
| Advance (move earlier) | Adelantar | Planned rest window | Ventana de descanso planificada |
| Sleep (block) | Sueño | Post-sleep | Rutina al despertar |
| Pre-sleep | Preparación para dormir | Link | Enlace |
| Link down | Sin enlace | Queued | En cola |
| In transit | En tránsito | Delivered | Entregado |
| Observation | Observación | Private note | Nota privada |
| Share a summary | Compartir un resumen | Evidence | Evidencia |
| Source | Fuente | Simulated | Simulado |
| Real flight data | Dato real de vuelo | Published result | Resultado publicado |
| Calculated | Calculado | No data | Sin datos |
| Pending verification | Pendiente de verificación | Pre-flight / In-flight / Post-flight | Prevuelo / En vuelo / Posvuelo |
| Mission log | Registro de misión | Flight Day (FD) | Día de vuelo (FD) |
| Planning rule (simulated) | Regla de planificación (simulada) | Restart scenario | Reiniciar escenario |

### 7.9 Reference strings for M1 acceptance

The catalogs must contain these strings, with exactly this meaning; small wording changes are allowed only in both languages at once. `{…}` are formatted parameters.

| Key | EN | ES |
|---|---|---|
| `shell.perspective.ground` | Ground | Tierra |
| `shell.perspective.onboard` | Onboard | A Bordo |
| `shell.role.missionOperator` | Mission operator | Operador de misión |
| `shell.role.medicalProfessional` | Medical professional | Profesional médico |
| `shell.role.demoNote` | Demonstration filter — not access control | Filtro de demostración — no es control de acceso |
| `shell.mission.iss` | ISS | EEI |
| `shell.mission.cislunar` | Cislunar mission | Misión cislunar |
| `link.up` | Link up | Enlace activo |
| `link.down` | No link | Sin enlace |
| `link.pacingNote` | Simulated link — transit time is demo pacing, not physical latency | Enlace simulado — el tiempo de tránsito es un ritmo de demostración, no la latencia física |
| `message.queued` | Queued — waiting for link | En cola — esperando enlace |
| `message.inTransit` | In transit | En tránsito |
| `message.delivered` | Delivered | Entregado |
| `ground.advanceBy` | Advance by | Adelantar |
| `ground.sendUpdate` | Send update | Enviar actualización |
| `ground.conflict` | Conflicts with: {blocks} | Se superpone con: {blocks} |
| `ground.summaryRestricted` | Crew summary received — content visible to the medical role only | Resumen de tripulante recibido — contenido visible solo para el rol médico |
| `ground.downlinkPending` | Message from crew — content available on arrival | Mensaje de la tripulación — el contenido estará disponible al recibirse |
| `agenda.restChange` | Planned rest window: {before} → {after} ({delta}) | Ventana de descanso planificada: {before} → {after} ({delta}) |
| `agenda.restUnchanged` | Planned rest window unchanged | La ventana de descanso planificada no cambia |
| `agenda.changed` | Changed | Cambiado |
| `agenda.before` / `agenda.after` | Before / After | Antes / Después |
| `agenda.planningRule` | Planning rule (simulated) | Regla de planificación (simulada) |
| `agenda.noSleepRecords` | No sleep records for this crew member in the prototype | No hay registros de sueño de este tripulante en el prototipo |
| `onboard.notice.planChange` | Ground updated your schedule | Tierra actualizó tu agenda |
| `onboard.linkDownBanner` | No link with Ground since {time}. New updates and the summaries you share will wait. | Sin enlace con Tierra desde las {time}. Las novedades y los resúmenes que compartas quedan en espera. |
| `companion.noComparableRecords` | I don't have comparable sleep records for you, so I can't tell how this change may affect your rest. If you want, you can log an observation. | No tengo registros de sueño comparables tuyos, así que no puedo saber cómo puede afectar este cambio a tu descanso. Si querés, podés registrar una observación. |
| `companion.noEvidence` | No evidence | Sin evidencia |
| `companion.notUnderstood` | I didn't understand that. You can ask: | No entendí la consulta. Podés preguntar: |
| `companion.changeNoneLinkDown` | No new updates from Ground since {time}. Anything Ground sent may be waiting for the link. | No hay novedades de Tierra desde las {time}. Lo que Tierra haya enviado puede estar esperando el enlace. |
| `companion.voiceSheetTitle` | Simulated voice query — no audio is recorded | Consulta de voz simulada — no se graba audio |
| `companion.voiceTag` | Simulated voice | Voz simulada |
| `observations.privateHint` | Private: stays on board and is never sent | Privada: queda a bordo y nunca se envía |
| `observations.shareToggle` | Share a summary with the Ground medical team | Compartir un resumen con el equipo médico en Tierra |
| `observations.previewTitle` | Exactly this will be sent | Se enviará exactamente esto |
| `observations.waitingForLink` | Waiting for link | Esperando enlace |
| `observations.deliveredToGround` | Delivered to Ground | Entregado a Tierra |
| `provenance.simulated` | Simulated | Simulado |
| `provenance.nasaResource` | NASA resource | Recurso NASA |
| `common.writtenIn` | Written in {language} | Escrito en {language} |
