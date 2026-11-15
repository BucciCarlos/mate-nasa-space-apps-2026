# 03 — Experience and bilingual design

Status: draft for team review · 2026-11-14 · MATE-SPEC02: M1.1 extension in §8. M1 screens below remain the regression baseline; §8 replaces the character/chat arrangement for the next delivery.

## 1. Shell (M1 MUST)

The header is shared by both surfaces. From left to right:

1. The **M.A.T.E.** wordmark (CSS text, no image).
2. **Perspective switch:** Ground | Onboard.
3. Ground only: the **mission selector** (ISS | Cislunar mission).
4. Ground only: the **role switch** (Mission operator | Medical professional), with the hint "Demonstration filter — not access control".
5. The **link indicator** for the current mission.
6. The mission clock: `FD n · hh:mm UTC`.
7. The **language switch**: EN | ES.
8. A menu with Settings and Restart scenario. In M1.1, View as and Next event appear only in a separately labelled Demo mode area (§8; UX02: a floating panel opened from a round button, not a fixed bar); no destination switch is added Onboard.

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

- **Companion identity (M1.1):** original characters with distinct silhouettes and per-profile identities, defined in §8.2. This replaces the M1 orb-with-initial direction. Chat is one tool of the character, not its entire presence.
- **Forbidden:** NASA insignia ("meatball"), logotype ("worm") or seal; mission patches; agency or national flags; images or likeness of real astronauts; anything implying NASA endorsement. Space Apps rules require a visible watermark on any image or video generated with AI ("SI") tools, and none is planned.
- **Motion:** transitions of 200 ms or less; respect `prefers-reduced-motion`.

## 5. Provenance in the UI (CORE-PROV)

| Badge EN | Badge ES | Meaning |
|---|---|---|
| Simulated | Simulado | Part of the fictional scenario: crew, agenda, link, plans, conversation |
| FD30 telemetry · not measured | Telemetría de FD30 · no medida | Original deterministic FD30 W/rpm fixture and sole Lucía pulse exception, explicitly not measured (IMP05/IMP06, 04 §11.6–§11.7) |
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

## 8. M1.1 — A visual Onboard day

Contracts: [02 §12](02-architecture-contracts.md#12-m11--profiles-and-automatic-onboard-day-normative-extension). Fixture: [04 §11](04-data-traceability.md#11-m11--day-fixture-and-event-provenance). Acceptance: [05 §10](05-acceptance-build-order.md#10-m11--onboard-day-acceptance-and-build-order).

### 8.1 Screen hierarchy and actions

Today is the main FD30 day view: current profile + common mission clock, a dominant latest-event summary, its planned-versus-recorded distinction, and a chronological rail connecting wake, training and samples/results. Own voluntary observations appear in a separate contextual section; an empty section says No observations, not a fabricated note. Each event has a source/association disclosure and Simulated badge. Result available and No usable values may appear together. Display the three provenance lanes and preloaded-history disclosure of 04 §11.2; the blood analyzer rail/result says Future onboard analysis — simulated / Análisis futuro a bordo — simulado. Urine is secondary, not presented as an inflight Standard Measures requirement. No clinical green check appears just because analysis finished.

Written chat starts **closed** on initial load/reload and after a profile switch. **Authorized IMP02 amendment to SPEC03:** the original character floats above the view; lower-right is the initial position only. Drag with mouse/finger to another visible position outside essential controls. It retains viewport position through scroll and Today/Sleep navigation. Each profile remembers its own normalized preference; viewport/chat/keyboard constraints may temporarily project the effective position without overwriting that preference (02 §12.5.1). Essential navigation, jury controls, form/actions and chat controls remain reachable even when content scrolls under the character. This replaces the mandatory reserved lower-right gutter/footer, while preserving the current visual hierarchy.

A tap/click opens written chat, while dragging and releasing never opens it. The final approved IMP02 cut removes the visible Position / Posición button and its menu, without another floating control **on the companion**. UX02 authorizes one separate floating control in the demo, the Demo mode button (§8.13); it is never part of the companion and never replaces it. Tab focuses the character; M enables arrows (8 px), Shift+arrows (32 px), Enter to confirm and Escape to cancel. Home resets this companion only. Translated instructions are in the info card (and shown while movement mode is active) and are exposed as an accessible description; movement, confirm/cancel and reset never open chat. Enter/Space outside movement mode still opens chat. The info card switches sides and stays clamped inside the usable viewport near all edges, on desktop and mobile; no clipped text or controls. View as in Demo mode switches Lucía/Sprout, Tomás/Beacon and Mei/Sail without restarting FD30, carrying over private records or reusing conversations. The previously selected profile's unsent text is preserved privately; the next profile starts with chat/movement controls closed.

The chat's placement is independent of the character: desktop lateral column reallocating main content, mobile bottom region with its own scroll. Main content stays reachable, the character stays visible, and temporary adjustment around chat/keyboard does not overwrite its saved preference. Close chat and Escape restore focus to the character and retain that owner's conversation/draft. Events signal news where the character was left, without autonomous movement, chat opening, navigation or focus theft. Reduced motion changes pose/text immediately.

The on-demand info card, opened by a discreet info button (ⓘ) beside the character, provides View my summary and module actions, plus Show me what changed when applicable. The card starts closed, never opens by itself and is independent of chat. These controls never require opening chat; do not nest the info button or the card inside the character button. The info button has a translated accessible name (Companion information / Información del compañero). They execute the actions in 02 §12.5–12.6. An ordinary event changes the character's posture/expression, marks the info button (a "!" badge plus an accessible name that includes the news, never color alone) and updates the short text in the card (for example Training completed / Entrenamiento finalizado), without opening chat or the card, stealing focus or navigating. Capsule notices use the same rule when the optional extension is enabled. The brief notice contains no capsule body or other profile's private content.

Demo controls are visually separate from astronaut tasks, titled Demo mode — not authentication / Modo muestra — no es autenticación. View as shows the three fictional ISS names and role titles. Next event shows the target mission UTC time; Restart scenario confirms its scope. There are no I woke up, Start training, Sample taken or Enter result controls. Event history can be read after arrival; it is not a manual wizard. Outside Demo mode the clock and automatic event processing continue, with jury controls absent.

### 8.13 UX02 — Demo mode floating panel

- Demo controls leave the fixed bar. In Onboard and Ground a round button (≥44 px, accessible name Demo mode / Modo muestra, no visible text) sits on the left edge, folded at start. It opens a non-modal floating panel shaped as a short strip across the viewport width (compact rows, as little height as possible; the clock's scale and explanatory notes stay available to assistive technology only), whose title bar is a second vertical-only drag handle, with the unchanged controls: title and hint, perspective switch, Sources & evidence / Fuentes y evidencia, View as (Onboard only), Next event, Restart scenario and the 24-hour clock. The panel is positioned over the page: it never shifts, scrolls or resizes it, stays inside the visible viewport (including `visualViewport`) and scrolls internally when it does not fit, notably on mobile. A close button is always visible. There is no backdrop and no close on outside click.
- The button drags only vertically with mouse or touch (8 px threshold, `touch-action: none`), within a fixed top margin below the header and the bottom edge. A drag never opens the panel; a tap or click does. Its height is one fraction shared by both perspectives, stored in its own session key (`mate:fd30:demo-dock:v1`), unaffected by View as, Restart scenario or perspective changes, and recomputed on resize. The simulation snapshot, reducer and Mate's stored position are untouched.
- Keyboard: Enter/Space on the button toggle the panel and keep focus on it; Tab continues into the panel. Alt+↑/↓ moves the focused button 8 px (Shift: 32 px) and never opens it. Escape closes only the top layer: the open panel first (returning focus to the button), then the companion card, the chat or movement mode. Instructions are an accessible description in EN/ES.
- Mate no longer depends on the fixed bar's geometry. Its top bound is the header; the Demo button and the open panel are obstacles for its resting position, drop point and card, so neither control hides the other. When the screen is too small to separate them (open panel on mobile) the panel, as the top layer, covers Mate without moving its saved position.

### 8.2 Original character direction (SVG/CSS, no assets in this spec task)

Use original, compact, non-human characters with silhouettes readable in monochrome at about 64 px; no agency marks or real-person likenesses. The reference to ChatGPT pets is the **interaction of a persistent character with a user-opened chat** only: do not copy character designs, sprites, names, poses or app assets. Prefer a small layered inline SVG/CSS implementation; no animation library, remote image service or generated sprite sheet is required.

M1.1 silhouette specification, stable per profile (original design choices, not clinical personas): Lucía → Sprout, an upright seed-shaped body with two asymmetrical leaf fins; Tomás → Beacon, a squat trapezoid body with a forked crest; Mei → Sail, an elongated curved body with a large offset sail fin. These proper names stay untranslated. Each is identifiable without its name or color; none is an orb with an initial. Their personalities must not imply specialist advice or emotional assessment. Name/accent customization can remain M3; default distinct identities are M1.1 MUST.

| State | Static cue, always present | Optional motion |
|---|---|---|
| Idle / En reposo | Resting pose; Idle / En reposo text in the card | Small gentle movement, never needed for meaning |
| News / Novedad | Distinct attentive pose/expression + unread marker on the info button and a short event-specific text in the card (fallback New update / Nueva novedad) | One brief attention gesture; no continuous flashing/bouncing |
| Interaction / Interacción | Turned/pointing pose + Viewing summary / Mostrando resumen while an explicit action executes | Brief pose transition, then idle or news if unread events remain |

With reduced motion, replace movement by immediate pose/text changes; never suppress the unread cue or the character. No source review state is encoded as a worried/happy health verdict. Markers have accessible labels scoped to the active profile; inactive profiles do not announce private arrivals. Seen/read state is per event and profile. Closing chat leaves presence and unread state intact. Keyboard and touch activate the same actions; hover is never required.

### 8.3 Wireframe A — Today, news present, chat closed

```text
[ A Bordo / Onboard ] [Lucía · EEI/ISS] [FD30 · UTC] [EN/ES]
[ Hoy/Today | Sueño/Sleep | Ejercicio/Exercise | Laboratorio/Laboratory ]
[ Demo: Ver como/View as | Siguiente evento/Next event ]
+--------------------------------------------------------------+
| Hoy / Today — dominant event summary                         |
| SIMULADO / SIMULATED: Entrenamiento finalizado / Completed    |
| Sin métricas / No metrics available · Origen / Source         |
| [Ver resumen / View summary]                                 |
| Jornada / Day · cards: Sueño | Ejercicio | Laboratorio        |
| Agenda simulada | Reporte simulado | Evidencia de otra misión |
| [Check-in opcional / Optional check-in → Observaciones]       |
|                                       +--------------------+ |
| Floating initial position, movable    | [Sprout silhouette] | |
|                                       | Training completed | |
|                                       | Chat closed/cerrado| |
|                                       | [View my summary]  | |
|                                       | Keyboard: M / Home | |
+---------------------------------------+--------------------+-+
Desktop open: [reflowed Today/detail | lateral chat + Close/Cerrar]
Mobile open:  [scrollable Today/detail]
              [bottom chat panel + Close/Cerrar; character independent]
```

Desktop ≥1024 px: keep the current summary hierarchy and visual design; the character initially appears lower-right and may float anywhere usable. There is no mandatory presence gutter. Chat still opens in its own lateral column when main content fits, otherwise in the bottom region. Mobile: full silhouette and a legible edge-adapting short notice/action bubble float above the scrollable view, with essential controls given paint/hit-test priority; chat reserves its own bottom region. Keep character, notices and focus-only keyboard instructions within visual viewport/safe margins at 390 px and narrower widths. EN/ES wrap without horizontal overflow. All personal views share the same owner-scoped position, and navigation never opens chat. No-observation and optional check-in scope is unchanged. The first IMP02 slice implements Today/Sleep only; the rest of this wireframe remains later scope.

### 8.4 Wireframe B — Commander, Crew

```text
[ A Bordo / Onboard ] [Tomás · Commander/Comandante] [FD30 · UTC]
[ Hoy/Today | Mi agenda/My agenda | Tripulación/Crew ]
+--------------------------------------------------------------+
| Tripulación / Crew — operational planning dominates           |
| Profile/Perfil | received agenda | planned rest window        |
| Lucía          | tasks           | planned only                |
| Tomás          | tasks           | planned only                |
| Mei            | tasks           | planned only                |
| Solapamientos / Overlaps: activity + interval                  |
| Solicitudes compartidas / Shared operational requests         |
| sender → Tomás · exact voluntarily shared message             |
|                                       +--------------------+ |
| No teammate-private data here         | [Beacon silhouette]| |
|                                       | Idle / En reposo   | |
|                                       | Chat closed/cerrado| |
|                                       | [My summary]       | |
+---------------------------------------+--------------------+-+
```

Desktop uses aligned team lanes and a separate voluntary-request list, with the same floating per-profile character and independent chat layout as Today. Mobile stacks operational cards and requests; an explicitly opened bottom chat does not cover controls. Both languages retain the hierarchy. Beacon's summary/chat always belongs to **Tomás**, never the teammate whose lane is selected. No expand-control leads into a teammate's measured sleep, metrics, samples, check-in, capsule, notes or chat. Requests show only their authorized immutable message and sender/recipient. Request preview retains Message / Mensaje, named Recipient / Destinatario and Share with Commander / Compartir con Comandante, separate from medical sharing. Neither the check-in nor the optional capsule broadens Commander or Ground visibility.

### 8.5 Reference strings for the day (EN / ES)

| EN | ES |
|---|---|
| Demo mode — not authentication | Modo muestra — no es autenticación |
| View as | Ver como |
| Next event | Siguiente evento |
| End of scripted day | Fin de la jornada guionada |
| View my summary | Ver mi resumen |
| Show me what changed | Mostrame qué cambió |
| Good morning, {name}. An episode-ended event arrived. | Buen día, {name}. Llegó un evento de fin de episodio. |
| Planned rest window | Ventana de descanso planificada |
| Recorded sleep · No record | Sueño registrado · Sin registro |
| Planned / In progress / Completed | Previsto / En curso / Finalizado |
| No metrics available | Sin métricas disponibles |
| Collection planned / Sample taken / Analyzing / Result available | Toma prevista / Muestra tomada / Análisis en curso / Resultado disponible |
| No usable values / No comparable record | Sin valores utilizables / Sin registro comparable |
| Source review status not reported | El origen no informó un estado de revisión |
| Marked for review by source | Marcado para revisión por el origen |
| Association unconfirmed — not assigned to a profile | Asociación sin confirmar — sin atribuir a un perfil |
| No observations | Sin observaciones |
| Open chat / Close chat | Abrir chat / Cerrar chat |
| Optional check-in | Check-in opcional |
| Would you like to leave a comment about your day or a leisure preference? | ¿Querés dejar un comentario sobre tu día o una preferencia de ocio? |
| Save privately / Skip | Guardar en privado / Omitir |
| Private check-in — not shared | Check-in privado — no se comparte |
| Family capsule available / Open capsule | Cápsula familiar disponible / Abrir cápsula |
| Fictional local capsule | Cápsula ficticia local |
| Capability not verified | Capacidad sin verificar |
| Crew / Shared operational requests | Tripulación / Solicitudes operativas compartidas |
| Only the named Commander receives this message; it is not sent to Ground. Recall is not available. | Solo el Comandante indicado recibe este mensaje; no se envía a Tierra. No hay opción de retirarlo después. |

All ordinary content, status, empty/error text, accessible names, source disclosures and confirmation dialogs follow the typed EN/ES catalogs. Proper names and source identifiers retain the existing exceptions. No specialist opinion is implied by these provisional neutral strings.

### 8.6 Guidance for the visual implementation stage

Recommend **frontend-design** as a design guide when visual implementation is authorized; do not install or run it in this spec task, and do not make an unavailable skill a runtime dependency. The character directions above remain reviewable sketches in words, not approved assets. Use [NASA-STD-3001 Vol. 2 §10, Crew Interfaces](https://www.nasa.gov/reference/10-0-crew-interfaces-vol-2/) as a reference for consistent controls, direct presentation of status and understandable automation, with the revision checked at implementation. Apply this to clear Demo mode, source/time/association labels and explicit user authority over navigation/sharing. This is a reference for crew interfaces, not a claim that the prototype is certified or fully compliant, nor an authorization to expand Ground/Commander access to personal data.

### 8.7 Personal navigation with chat closed (M1.1 MUST)

Provide persistent Onboard entries Sleep / Sueño, Exercise / Ejercicio and Laboratory / Laboratorio. On mobile these remain keyboard/touch accessible in the navigation menu, without opening chat. Today always has a corresponding card for each module, including when it has no records; Mate's action list offers the same three entries independently of unread news. All three entry points open the same active-profile personal detail defined in 02 §12.6. Show the profile identity, available history from the beginning of FD30, provenance and explicit missing-data states. Do not redirect to scientific Evidence or require Next event to unlock a module. Device events refresh the detail and Today card automatically. Acceptance: 05 §10.4.

### 8.8 Wellbeing and optional capsule presentation

Today and Observations offer Optional check-in, clearly subordinate to the day summary. It opens the existing Observations view in the private qualitative path of 02 §12.7: day comment or leisure preference, no required score or response. Save privately, Cancel and Skip are reachable without advancing the day; simply leaving the form is allowed. A saved entry says Private check-in — not shared / Check-in privado — no se comparte. Do not show guilt prompts, adherence percentages, inferred mood, medical/Commander sharing controls or automatic leisure booking. The ordinary M1 medical-summary form remains a different path with its existing consent preview.

Only if the optional family extension is enabled, a brief capsule notice appears beside the recipient's character after the main journey, still with chat closed. It shows Fictional local capsule and Open capsule, not the message body. Explicit Open capsule opens an owner-scoped local text panel labelled with fictional sender, recipient and provenance; Close returns focus to its opener. It neither opens chat nor auto-plays media, and never appears in Commander Crew or Ground. Keep this separate from automatic medical monitoring and from the core acceptance; see 05 §10.6.


### 8.9 IMP05 — Time exploration and Exercise telemetry

The Demo area gains a labelled mission-UTC slider, previous/next event, ±15 minutes, play/pause and exploration/guided selector. Range: 00:00–23:59 (entry 05:55), visual close 24:00; slider minute steps with exact event buttons. Time changes never navigate in default exploration or reset chat/drafts/companion position. Explicit guided mode has only the once-per-start exception in 02 §12.9.

Today shows only the active person's planned agenda/equipment; reservations remain distinct from received exercise state. Exercise adds neutral SVG plots (power W, cadence rpm; IMP06 also simulated pulse bpm/lpm), a fixed full-session time axis, a receipt cursor, split lines at missing slots and a table toggle. Labels and live-region status are bilingual, with no color-only meaning. The synthetic label and source/version/session remain visible. At no-data moments show the reason, never empty bars implying zero. All controls and table columns fit narrow screens; graph/table selection survives time/profile changes.


### 8.10 IMP06 — Exercise session hierarchy

In the personal Exercise detail, show the reservation before confirmed start. In progress, lead with large pulse and elapsed mm:ss, then smaller W/rpm, the metric panel header carries the FD30 telemetry label (not measured) and the single linked asterisk of 04 §11.6; the readings below do not repeat it, and the planned reservation stays labelled as planned. Keep graph/table below; move detailed event provenance into disclosure rather than competing with the readings. No current slot/value means No current reading / Sin lectura actual, without stale values. At finish, replace current readings with a summary; historical samples remain inspectable. Keep the same cursor, owner isolation, bilingual units, neutral colors and keyboard/table access. Do not change Today, CAT01 navigation or Ground.

### 8.11 AGD01 — Personal FD30 Schedule / Agenda

Add Schedule / Agenda to FD30 personal navigation at `#/onboard/personal/agenda`; M1 `#/onboard/agenda` and Ground remain unchanged. Reuse `planFor(activeCrewId)`, the FD30 mission cursor and received events, with no additional agenda, clock or reducer. Show a wide horizontally scrollable single-person timeline with UTC ticks, an owner label, a Now / Ahora marker and an accessible list alternative. Include the complete FD30 plan through midnight, including future reservations such as Mei's; browsing never advances mission time. Center on now / Centrar en ahora only scrolls the viewport. Profile name and UTC context remain visible on narrow screens while the grid moves. Ticks update the marker without recentering a user's scroll.

DAY01: both agendas use the same `fd30-plan.2`, fixed 00:00–24:00 geometry, contextual 24:00 labels and clipped plan intervals in timeline/list/detail/cards. The FD29 rest keeps its original ID/start and displays “← from FD29 21:30”; the 21:30 rest has `continuesAfterDay`, stops visually at 24:00 and states that its end is not defined here. No complete night duration or FD31 activity is inferred. Ground names remain anchored and cards remain available; the 00:00 Now marker is included. Generic tasks approved under DA-4 and the common evening plan are fictional, labelled simulated schedule, not an official timetable. No minimap or density redesign is included.

Selecting a block exposes its planned interval, type and equipment if assigned. A reservation remains Planned even when a separate received simulated event confirms an activity. Link to the personal Exercise or Laboratory module only through an exact block→session/sample association and a received, confirmed same-owner start/collection within the planned interval. Do not infer links from task titles, create missing predecessors, or borrow another person's record. No event means an explicit plan-only state. Rewind removes future confirmations and links. Mate stays mounted and visible, with shared clock/profile, private data and position preserved through navigation. No Ground, M1 or medical-sharing change is authorized by AGD01.

### 8.12 OPS01 — Crew, voluntary wellbeing and Ground FD30

Offer Wellbeing / Bienestar and Operational requests / Solicitudes operativas in personal context navigation; replace the latter with Crew / Tripulación for Tomás. Crew is read-only operational planning, shared equipment reservations and explicit received operational messages. Noncommanders cannot reveal it through a direct hash. Wellbeing reuses the private Observations pattern: optional day comment or leisure preference, free text, Save privately / Guardar en privado, Cancel / Cancelar and Skip / Omitir, plus own entry history. No scores, inferred status, sharing control or automatic submission. Requests are a separate view with an exact-message consent preview; private notes are not prefilled or attached.

Ground FD30 has three cards, one per fictional person, with original illustrated portraits labelled fictional, current planned activity, current/next equipment reservation and elapsed planned-block time only when a current block exists. One neutral teal bar represents that time fraction, not health or confirmed work; its text explains the limit. With no block, show a reason and no bar, never a false zero. Opening a card focuses the operational detail; Operations receives the plan, and Medical additionally sees the explicit absence of authorized FD30 summaries. Role selection cannot reveal personal records. No clinical traffic lights, risk indicators or scientific role are added.

The FD30 perspective switch preserves Onboard identity and state, uses the existing mission controls, and keeps M1 internal (legacy public URLs redirect to FD30). Ground hides personal companion/chat, source-event labels and personal announcements. Onboard returns to its last operational section (Today initially; Catalog/Evidence do not overwrite it) with Mate, chat, drafts and position intact. EN/ES and mobile layouts retain all controls without horizontal overflow. Historical Evidence stays its separate labelled view and is never used as a live FD30 reading.


### Public navigation cut — MATE-FD30-01

This overrides public-entry/perspective references above; M1 screen descriptions remain internal regression documentation. `/` opens FD30 Onboard Today. Onboard's Ground action opens the FD30 overview; Ground offers overview, crew schedule, Catalog and a secondary Sources & evidence access, plus Onboard returning to the last operational page (Today initially). Catalog/Evidence visits do not overwrite that return destination. Use the same mission clock/profile/session throughout; retain language, conversation, draft, open chat and Mate position when returning.

No M1 menu, link or companion action is public. Autonomy is conceptual in FD30, without a link or an Available claim for the internal rule/link engine. Legacy URLs are replaced with FD30 equivalents before painting. Ground's reused wide timeline has three anchored names and a card-list alternative, reflects FD30 Now, and is consultation only. Its privacy-safe plan labels, equipment and planned state do not confirm attendance. No task edit, delivery queue or medical channel is carried over. EN/ES and mobile retain Sources & evidence and the personal Agenda.

### 8.13 HIST01 — Onboard sleep history (EN/ES)

Sleep opens in last7 mode (FD24–FD30); an explicit FD01–FD30 control expands the same history without moving the cursor. Show one general “Demo FD30 · fictional records / registros ficticios” label. Keep detailed provenance in Sources and evidence, not repeated per night. Present duration h:min by awakening FD/date, a neutral trend with a descriptive median (received n/N), selectable night cards, a readable mobile detail and an accessible table. Missing records are dashes/gaps, not zero, and lines cannot bridge them. Current FD30 before receipt says no record received at this cursor without exposing future duration. Full-range plots have horizontal scrolling; night selection focuses the detail without any mission-time action.

The detail separates duration, actual fictional episode end/receipt and the available plan. FD01–FD29 plans are unavailable in this cut, not fabricated from the current plan. A current-day planned window never supplies a sleep duration. Today identifies the latest received record by FD and separately states FD30 availability. Mate's sleep reply uses that same selector and last7 count, with no medical interpretation or other-person record. New replies are snapshots at their query cursor; prior conversation is retained.

Sources documents the original fictional adapter/version/scope/unit and transformations without any private rows, values, record counts by person or live availability. The published-aggregate Sleep evidence panel explicitly contains no personal histories and supplies none of their numbers. Both Ground roles retain the same operational plan and the absence of authorized medical summaries. No new scientific, medical sharing or Commander history access is added.

### 8.14 HIST02 — Onboard exercise history (EN/ES)

Exercise retains Lucía's live panel, current simulated pulse/power/cadence and missing-minute gap. At completed receipt it joins the canonical completed-session history once; the minute chart/table remain available. The history offers Last 7 days / Últimos 7 días and FD01–FD30, session power points by day, independently labelled protocol cohorts, and explicit per-day state buttons. Points are not joined across missing/incompatible sessions. Selection focuses the day detail; the table is an accessible alternative. Horizontal chart/table scrolling is local to each region at 390 px; controls remain at least 44 px. Per-profile view preferences never change the clock.

Detail shows aerobic type, fictional equipment, duration, available mean W/rpm, start/finish/reception UTC, protocol, power coverage and comparison eligibility/reason. No activity / Sin actividad, No record / Sin registro and Not applicable / No aplica remain distinct; future reservations and live sessions have their own labels. No steps, calories, pulse history, risk colours, clinical conclusions or causal language. Comparisons describe differences from the owner's reference, with cohort membership available in a disclosure. The full reference may predate the selected 7-day view and is labelled accordingly.

One general fictional-record label accompanies the history. The live telemetry retains its separate simulated/not-measured disclosure. Sources and evidence documents adapter/version/class/privacy, limited historical plan coverage, calculation rules and protocol limitations without exposing private rows in either perspective. Today and Mate share latest session/day/duration and last7 count; prior Exercise replies after a rewound cursor hide and return without regeneration. No Catalog or D-9 changes.

### 8.15 THEME01 — FD30 theme: palette Océano A1, Claro / Oscuro (EN/ES)

Scope: the FD30 experience, Onboard and Ground. M1 (its CSS, tokens and Settings view) is not part of this surface and is not changed; any style shared with M1 is overridden only inside `.fd30[data-surface]`.

**Tokens.** All FD30 colors live in `src/styles/fd30-theme.css`; no FD30 stylesheet carries a literal color (a test enforces it). Light is the base; dark applies under `html[data-fd30-theme="dark"]`. The M1 token names (`--bg-2`, `--fg`, `--line`, `--accent` ...) are remapped inside `.fd30` so shared components follow the theme without edits.

| Role | Claro | Oscuro |
|---|---|---|
| Page background (frames the cards) | `#E5F1EE` | `#0E1A1D` |
| Header, cards, panels (`--surface`) | `#FFFFFF` | `#172A2D` |
| Text (`--ink`) | `#15343A` | `#E6F0EE` |
| Secondary text (`--muted`) | `#4E6568` | `#A3BAB7` |
| Links and actions (`--link`, `--action`) | `#126862` | `#3FC1B9` |
| Brand accent (`--brand`), graphics and large marks only | `#17807B` | `#3FC1B9` |
| Text on a filled action (`--on-action`) | `#FFFFFF` | `#0E1A1D` |

The text color on a filled button is chosen for contrast with its fill, not fixed: white on `#126862` (6.6:1) and `#0E1A1D` on `#3FC1B9` (8.1:1). Each module keeps its own color for icons and charts (`--mod-sleep`, `--mod-exercise`, `--mod-lab`, `--mod-crew`, `--mod-wellbeing`) with a lighter dark-mode value; module colors are never the dominant fill of a card. The logo SVG has no background block and takes `--brand-body` and `--brand-accent`, so the silhouette and the pulse read in both themes.

**Contrast (MUST).** Text tokens reach 4.5:1 against the page background, the card surface and both tints in each theme; borders of controls, focus ring, module colors and logo reach 3:1 against page and card. `src/theme/theme.test.ts` computes this from the real tokens. Small text, focus rings and charts are included.

**Switch (MUST).** One button in the FD30 header toggles Claro ↔ Oscuro. There is no list of options and no "System" option, and the operating system's color scheme is never followed. Its accessible name is «Tema oscuro» / «Dark theme» with `aria-pressed` true in dark; its title names the action. The button is icon-only (sun / moon) and does not change the header height.

**Initial theme and persistence (MUST).** Without a saved preference the theme is Claro, even when the system prefers dark. The choice is saved locally (`mate:fd30:theme:v1`, values `light` / `dark`). Every storage access is guarded: if reading fails, or the saved value is invalid (including a legacy `system`), the theme is Claro; if saving fails, the switch still works for the session. Changing the theme never resets the mission clock, the active profile, the route or the chat, and never moves a draft.

**Acceptance.** (1) Fresh profile with the system in dark: Claro. (2) Toggle to Oscuro, reload: Oscuro. (3) Toggle with a chat open at 10:41: clock, profile, route, open chat, replies and draft unchanged. (4) Storage blocked: the toggle still changes the theme. (5) A legacy `system` value with the system in dark: Claro. (6) Onboard and Ground, 390 and 1440 px, EN and ES: no text below 4.5:1, no horizontal overflow, no color of the previous palette (chat, demo mode, charts, tables, focus rings).
