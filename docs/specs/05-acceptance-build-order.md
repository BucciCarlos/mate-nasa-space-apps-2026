# 05 — Acceptance criteria and build order

Status: draft for team review · 2026-11-14

## 1. Milestones

| Milestone | Goal | Includes | Exit criteria |
|---|---|---|---|
| **M1 — Integration journey** | An ISS schedule change travels Ground → crew → Ground, in English and Spanish | CORE-MISSION, CORE-AGENDA, CORE-LINK, CORE-ENGINE, CORE-COMPANION (M1 intents), CORE-OBS, CORE-ROLES (filters), CORE-PROV (badges, M1 citations), CORE-I18N; cislunar profile on Ground | §2 passes in both languages; §5 unit tests green; §8 definition of done |
| **M1.1 — Onboard day (next)** | One visual FD30 day with automatic simulated updates | Profile partition, movable per-profile floating characters (initially lower-right) with written chat initially closed, private voluntary check-in, per-signal provenance, preloaded history, Commander Crew and consented requests, event playback; blood main path. Local fictional capsule is optional after the main journey | §10 in EN/ES plus M1 regression; no clinical values required |
| **M2 — Evidence layer** | Real, traceable NASA and partner content is visible | Sources page; MOD-SLEEP, MOD-LABS, MOD-RAD, MOD-ENV with their fallback states; data pipeline (04 §10) | §3 |
| **M3 — Breadth and continuity** | The integral platform is navigable | CORE-CATALOG with body map; concept cards for every remaining module; CORE-JOURNEY; companion customization (name, color); CORE-GUIDE; companion intents that open and explain modules | §4 |
| **M4 — Enhancements** | SHOULD items | Future verified automatic sleep records (02 §6.4); spoken replies (02 §8.5); audit view; more lab analytes and cytokines; DONKI events; RadLab series; "Change vs own pre-flight" toggle | — |

**M1 is the first integration milestone, not the limit of the app.** FUTURE items: 01 §7.

## 2. M1 — Requirements and acceptance

### 2.1 Requirements

| ID | Requirement | Contract | Verified by |
|---|---|---|---|
| R-M1-01 | Shell with perspective, mission, role and language switches; language switch preserves all state | 03 §1, 03 §7.2 | A1, E1 |
| R-M1-02 | ISS and cislunar missions isolated | 02 §4 | D1–D2, U-ISO |
| R-M1-03 | Ground agenda editor: advance a movable task with a live preview of planned rest-window changes or conflicts | 02 §6.3, 03 §2 | A2, C1, U-AG |
| R-M1-04 | Simulated link: queued, in transit, delivered; link down and up; stable FIFO per mission (L1–L5), including messages created while the queue drains and a second link cut; independent queues per mission | 02 §7, §7.1 | A3, C2–C7, U-LINK-01…03 |
| R-M1-05 | Onboard computes the change on delivery and shows a notice that never navigates by itself | 02 §6.2, §8.2 | A4, U-AG-05 |
| R-M1-06 | Companion: guided chips, free text in EN and ES, simulated voice, fallback | 02 §8 | A5–A8, U-COMP |
| R-M1-07 | Companion UI actions: open agenda, select period, highlight, open source, open form; announced; run only on request | 02 §8.4 | A5, A7, G1 |
| R-M1-08 | No inference without comparable records | 02 §6.4 | A6, U-COMP-02 |
| R-M1-09 | Visible NASA resource with its source popover | 04 §3 | A7 |
| R-M1-10 | Observation private by default; optional summary with an exact preview | 02 §9.1 | A9, U-OBS |
| R-M1-11 | Ground receives only the authorized summary, and nothing of it before delivery, for either role; role filters after delivery | 02 §9.2–9.4 | A10, C4, C6–C7, E2, U-ROLE-01…03 |
| R-M1-12 | Link-down behaviour on both sides | 02 §10 | C2–C7 |
| R-M1-13 | Provenance badges on all M1 data | 03 §5 | H1 |
| R-M1-14 | Persistence: reload keeps state, an independent new tab starts fresh, restart works | 02 §3.3 | E3–E5, U-PERSIST |
| R-M1-15 | Works offline from a local build; no runtime requests | 02 §1 | F1 |
| R-M1-16 | Keyboard operable; `lang` follows the locale; no color-only meaning | 03 §6 | G1–G3 |
| R-M1-17 | No readiness verdicts and no flow gated by a cognitive test | 01 §2 P6 | H2 |
| R-M1-18 | No user-visible literal text in components; catalogs complete in both languages | 03 §7.1 | `check-literals`, `tsc`, U-I18N |

### 2.2 Acceptance script A: main journey

Run it twice from a fresh tab: once in English, once in Spanish (switch to ES at step A1). Expected texts come from 03 §7.9. Times are UTC.

| Step | Action | Expected — EN | Expected — ES |
|---|---|---|---|
| A1 | Open the app in a new tab. | Onboard › Today for Lucía Ferraro, ISS, FD 41; header shows "Link up". Agenda items carry the Simulated badge. | Same, with "A Bordo", "EEI", "Enlace activo", "Simulado". |
| A2 | Switch to Ground › ISS › Agenda as mission operator. Select "Payload hardware swap" (Mar 10, 07:30–09:00) and choose Advance by 90 min. | The preview for Lucía Ferraro and Tomás Ibarra shows "Planned rest window: 8 h 30 min → 7 h 00 min (−1 h 30 min)" and "Planning rule (simulated)". Mei Okada is not listed. | "Ventana de descanso planificada: 8 h 30 min → 7 h 00 min (−1 h 30 min)", "Regla de planificación (simulada)". |
| A3 | Click Send update. Open Ground › ISS › Link, then Ground › Cislunar › Link. | ISS: an uplink message "In transit", then "Delivered" after about 4 s. Cislunar: no new message. | "En tránsito" → "Entregado". |
| A4 | Switch to Onboard. | Today shows "Ground updated your schedule" with −1 h 30 min; the companion shows the same notice with chips. The view did not change by itself. | "Tierra actualizó tu agenda". |
| A5 | Click the chip "Show me", or type "show me" / "mostrame". | Agenda opens for Mar 9 20:30 → Mar 10 10:00. The task, post-sleep and sleep blocks show Before (dashed) and After (solid) with "Changed". Focus is on the Agenda heading. The reply lists the actions performed. | "Antes", "Después", "Cambiado". |
| A6 | Type "How will this affect me?" / "¿Cómo me va a afectar?". | The reply carries the label "No evidence" and says there are no comparable sleep records. No estimate of any kind. The agenda shows "No sleep records for this crew member in the prototype". | "Sin evidencia"; "No tengo registros de sueño comparables tuyos…". |
| A7 | Type "Why does this matter?" / "¿Por qué importa?". | The reply cites "Risk from Inadequate Sleep and Irregular Schedules" with the badge NASA resource. The popover shows the URL and "accessed 2026-11-14". | "Recurso NASA". |
| A8 | Type "qwerty". Then open the microphone and choose "What changed?". | "I didn't understand that. You can ask:" with chips. The sheet title says no audio is recorded. The user turn carries the tag "Simulated voice" and gets a normal reply. | "No entendí la consulta. Podés preguntar:", "Consulta de voz simulada — no se graba audio", "Voz simulada". |
| A9 | Click Log an observation. Select topic Rest; private note "Me cuesta dormir con cambios de horario."; turn Share on; comment "Please review my schedule."; Save. | The preview lists the topic and the related change, and **not** the private note. The observation then shows "In transit" → "Delivered to Ground". | "Se enviará exactamente esto", "Entregado a Tierra". |
| A10 | Ground › ISS › Crew as medical professional, then as mission operator. | Medical: topic "Rest" in the Ground language, the related change, and the comment verbatim with its language tag; no private note anywhere. Operator: "Crew summary received — content visible to the medical role only" with crew member and time; no topic, no comment. | Medical: "Descanso"; operator: "Resumen de tripulante recibido — contenido visible solo para el rol médico". |

### 2.3 Script C: link down

| Step | Action | Expected |
|---|---|---|
| C1 | Ground › ISS › Agenda: select "Sample processing" (Mei, 14:00–16:00), Advance by 90. | "Conflicts with: Midday meal" / "Se superpone con: Almuerzo"; Send disabled. Advance by 60: allowed, "Planned rest window unchanged". |
| C2 | Ground › ISS › Link: Set link down. Advance "Payload hardware swap" by 30 and send. | Message "Queued — waiting for link" / "En cola — esperando enlace". |
| C3 | Onboard. | Banner "No link with Ground since {time}…". "What changed?" describes the first change and adds that newer updates may be waiting. Log an observation with topic Workload, Share on, comment "Second note". It shows "Waiting for link" / "Esperando enlace". |
| C4 | Link still down. On Ground › ISS, check Link, Crew and Log, first as medical professional, then as mission operator. Switch EN → ES → EN. | For both roles and both languages, the pending downlink row shows only "Message from crew — content available on arrival" / "Mensaje de la tripulación — el contenido estará disponible al recibirse" and its status. No topic, no comment, no crew member name, no related change, in any view or disclosure. As medical professional, Send update and the link control are absent or disabled. |
| C5 | With the ISS link still down, advance the cislunar "Communications window rehearsal" by 30 and send. | The cislunar message is delivered after about 6 s. The ISS queue does not change. |
| C6 | Set the ISS link up. Within 1 s, before anything is delivered, advance "Sample processing" (Mei) by 60 and send. | Ground › ISS › Link shows "Delivered" in creation order: the C2 plan update, then the C3 summary, then the C6 plan update. The newer message is never delivered before the older ones. The banner disappears. Onboard: one new notice, 7 h 00 min → 6 h 30 min (−30 min); none for Mei's change. Ground: the medical professional now sees the "Second note" summary with topic Workload in the current language; the operator sees only the restricted marker with crew member and time. |
| C7 | Second cut. As operator, advance "Payload hardware swap" by 30 and send, then set the link down before it is delivered (within about 4 s). Onboard, log an observation with Share on. Set the link up. | The plan update goes back to "Queued" and is delivered after the link returns, followed by the new summary, in that order. Onboard gets one notice, 6 h 30 min → 6 h 00 min (−30 min); the plan versions reach the agenda in order, with none skipped. Before delivery, Ground shows only status metadata for the new summary (as in C4). |

### 2.4 Script D: mission isolation

| Step | Action | Expected |
|---|---|---|
| D1 | Ground › Cislunar mission › Agenda: advance "Communications window rehearsal" by 60 and send. | Delivered after about 6 s; the cislunar log shows the change. |
| D2 | Check ISS Link, ISS Log, and Onboard Today, Agenda and the companion ("What changed?"). | No trace of the cislunar change anywhere. |

### 2.5 Script E: language and persistence

| Step | Action | Expected |
|---|---|---|
| E1 | After A5, switch EN → ES → EN. | Route, range, highlight, notices, messages and conversation stay. Past companion replies re-render in the new language. |
| E2 | After A9 (private note and shared summary exist), switch EN → ES → EN, on Onboard › Observations and on Ground › ISS › Crew as medical professional. | The Spanish private note stays exactly as typed, Onboard only, tagged "Written in Spanish" while the UI is in English. On Ground, the shared comment stays verbatim with its language tag, and the topic "Rest" / "Descanso" re-renders in the UI language. A summary still pending stays content-free in both languages (C4). |
| E3 | Reload the tab. | Same state and view. |
| E4 | Open a new, independent tab or window and enter or paste the app URL. Do not duplicate or restore a tab, and do not open it from a link inside the app. | Fresh scenario. |
| E5 | Settings › Restart scenario. | Fresh scenario; the current language is kept. |

### 2.6 Script F: offline build

| Step | Action | Expected |
|---|---|---|
| F1 | `npm run build && npm run preview`; disconnect the network; reload; repeat A1–A10. | Everything works. The browser's network panel shows only requests to the local preview server. |

### 2.7 Script G: accessibility

| Step | Action | Expected |
|---|---|---|
| G1 | Complete A2–A10 with the keyboard only. | Possible, with visible focus. Companion actions are announced through the live region. |
| G2 | Inspect `<html lang>` while switching language. | `en` / `es`. |
| G3 | Review the highlight and status styles. | Every changed or status element has a text label, not only a color. |

### 2.8 Script H: content checks

| Step | Check | Expected |
|---|---|---|
| H1 | Every M1 data element | It has a provenance badge or sits in a region labelled Simulated. |
| H2 | Search both catalogs | No "fit", "unfit", "apto" or "no apto" (or equivalent verdicts); no flow requires a cognitive test. |
| H3 | Assets | No NASA insignia, logotype or seal, no mission patches, no images of real people. |

## 3. M2 acceptance (Evidence)

- `#/sources` lists every source in 04 §3 with title, publisher, URL, access date, what it supports, status and reuse note, in both languages.
- **MOD-LABS:**
  - five analytes, codes C001–C004, seven timepoints, a flight band labelled "no samples in these files";
  - no sex, no reference ranges, no flags, no cross-subject mean;
  - disclaimer, glucose note and attribution visible;
  - table view available;
  - output file checksums and transformations shown in the provenance popover;
  - the pipeline's validation per participant–analyte–timepoint passes (04 §4.6): 140 combinations, exactly one record each, expected unit;
  - the no-data state (04 §4.5) renders when `i4-labs.json` is absent or invalid: provenance and the reason it is pending, no curves and no values.
  - **Closing rule:** the no-data state must exist, but it does **not** close M2. M2 closes only with MOD-LABS showing validated data, unless the team records an explicit exception, for example a source that changed or became unavailable.
- **MOD-RAD and MOD-ENV:**
  - measurement card with detector, location, dates, unit, coverage, "What it measures" and "What it does not represent", including "Not documented by source" where it applies;
  - MOD-RAD separates the TEPC **area monitor** reading from the **personal** career dose limit [V1 4030]. No personal dose and no fraction or percentage of that limit is computed from `DOSE`.
  - standards are shown as text;
  - the fallback state renders when the data file is absent. For these two modules, unlike MOD-LABS, the fallback is enough to close M2, because their sources are only partially verified (04 §5–§6).
- **MOD-SLEEP:** the NASA quotes and the empty personal section.
- All of the above in EN and ES, with locale number formats (`9.6` / `9,6`).

## 4. M3 acceptance (Breadth and continuity)

- **Catalog:** every module of 01 §5 with tier badge, NASA risk link and what it contributes. All 17 NASA HRP risks are reachable.
- **Body map:** keyboard-accessible regions with tier shading and a legend stating that the shading is not health status.
- **Journey:** three tabs with the same companion name and color. Simulated plans carry badges. Post-flight links to MOD-LABS with the "another, real crew" disclaimer.
- **Companion customization:** name and color persist across views and language switches.
- **Guide panel:** lists the A-script steps and ticks them from state.

## 5. Unit tests (Vitest; pure functions) — required for M1

| ID | Test |
|---|---|
| U-AG-01…04 | The expected results in 04 §8.1, including the `conflict` and `invalid_amount` cases (advance 45 → `invalid_amount`; a non-movable block → `not_movable`). |
| U-AG-05 | Ground `perCrew` equals the Onboard `Notice` moves and rest for the same change. |
| U-LINK-01 | Send with the link up → `in_transit`. A tick before `deliverAtMs` changes nothing (same object). A tick after → delivered: Onboard plan version 2, a notice for `iss:crew-lf`, none for Mei-only changes. |
| U-LINK-02 | Link down: sending → `queued`. Setting the link down during transit → `queued` with the same `seq`. Nothing is delivered while the link is down. Setting it up → delivered in increasing `seq`, each no sooner than `transitMs` after re-entering transit (02 §7.1, L1–L3). |
| U-LINK-03 | Mixed sequence on the ISS (02 §7.1):<br>1. Deliver plan change A (version 2).<br>2. Set the link down. Send plan changes B (version 3) and C (version 4), both affecting `iss:crew-lf`, and save shared summary S1.<br>3. Set the link up at *t*. At *t* + 100 ms, send plan change D (version 5, Mei only) and save summary S2.<br>4. Before everything is delivered, cut the link a second time, then set it up again.<br>5. Meanwhile, send one cislunar change.<br>Run with tick intervals of 50, 500 and 1000 ms.<br>Assert:<br>• ISS delivery order B, C, S1, D, S2 (increasing `seq`); no message ever delivered before its predecessor;<br>• Onboard plan versions observed 3 → 4 → 5 with no skip; one notice each for B and C, none for D;<br>• the defensive version guard never fires;<br>• the cislunar message keeps its own pacing and does not change the ISS order (L4). |
| U-ISO-01 | An ISS change leaves `state.missions.cislunar` deep-equal to before, and vice versa. |
| U-ISO-02 | An action whose entity ID has the wrong prefix returns the same state. |
| U-ROLE-01 | Ground selector outputs, searched recursively, never contain `privateNote`, observations, conversation turns or notices, for either role. |
| U-ROLE-02 | Operator inbox items contain no topics or comment. |
| U-ROLE-03 | A `CrewSummaryMessage` is checked in four states: `queued` (link down), `in_transit`, `queued` again after a cut, and `delivered`.<br>• While not delivered: the outputs of every Ground selector (Link, Crew, Log, disclosures), for both roles, contain none of the summary's `topics`, `comment`, `relatedChangeId` or `crewId`, searched recursively. The rendered EN and ES row text contains no topic label or comment.<br>• After delivery: the medical professional's outputs contain the topics and comment; the mission operator's contain only crew member, time received and the restricted marker. |
| U-OBS-01 | Save without sharing → no message. Save with sharing → one message whose summary has no private note. |
| U-COMP-01 | `matchIntent`: at least 3 EN and 3 ES samples per intent, with and without accents and question marks (e.g. "¿Qué cambió?", "que cambio", "What changed?"), resolve to the expected intent. Nonsense resolves to `unknown`. |
| U-COMP-02 | `rest.effect_on_me` without records → status `no_evidence`, and no numeric parameters. |
| U-COMP-03 | Every companion template renders a non-empty string in `en` and `es` with sample parameters. |
| U-I18N-01 | Every bilingual field in the scenario files and `sources.json` is non-empty in both languages. Catalog parity is checked by `tsc`. |
| U-SCN-01 | Scenario files satisfy 02 §11. |
| U-ROUTE-01 | `parseRoute` ∘ `toHash` round-trips every route; unknown hashes → `null`. |
| U-PERSIST-01 | Snapshot round-trip. A `schemaVersion` mismatch or corrupt JSON → fresh state. |

## 6. Tooling check: `scripts/check-literals.mjs` (M1)

- A Node script without dependencies that scans `src/**/*.tsx`.
- It fails if it finds:
  - JSX text nodes containing letters;
  - string literals with letters in the attributes `aria-label`, `title`, `placeholder`, `alt` or `label`.
- Allowed exceptions: lines marked `// i18n-ignore` with a reason (expected: none or almost none).
- Exposed as `npm run check:i18n`.

## 7. Build order for M1

1. Scaffold the Vite React TypeScript app (02 §1), tokens and base CSS, the shell, hash routing and `check-literals`.
2. i18n: catalogs and types, `format.ts`, language switch.
3. Types (02 §5), scenario files (04 §8), `createInitialState`, U-SCN and U-I18N tests.
4. Domain: `advanceTask`, `diffForCrew`, U-AG tests.
5. Reducer: change sending, link, clock, isolation; U-LINK and U-ISO tests.
6. Ground views: Agenda with preview and send, Link, Log.
7. Onboard views: Today, Agenda (range, highlight, Before/After), notices.
8. Companion: intents, `respond`, actions, simulated voice; U-COMP tests.
9. Observations, sharing, Ground Crew inbox, role selectors; U-OBS and U-ROLE tests.
10. Link-down states, empty states, error boundary, Not-found view.
11. Persistence and Restart scenario; U-PERSIST test.
12. Accessibility pass; scripts A–H in EN and ES; offline check.

## 8. Definition of done (every milestone)

- `tsc --noEmit` clean; `vitest run` green; `vite build` succeeds; `npm run check:i18n` clean.
- The milestone's acceptance scripts pass in English and in Spanish.
- No runtime network requests.
- Where behaviour had to differ from the specs, the specs were updated first by the spec maintainer; implementation never silently diverges.

## 9. After M1

- **Next: M1.1** (§10), before the evidence/catalog expansion. It does not waive the later M2/M3 scope or change M2 data-closing criteria.

- **M2:** Sources page → MOD-SLEEP (reuses the M1 citation) → MOD-LABS (pipeline, then view) → MOD-RAD (TEPC) → MOD-ENV (EDA). A module whose data is not ready ships with its fallback state. MOD-LABS still has to meet the closing rule of §3.
- **M3:** catalog and concept cards → body map → journey → companion customization → guide panel → module intents.
- **M4:** pick from §1 as time allows.

## 10. M1.1 — Onboard day acceptance and build order

### 10.1 Reproducible bilingual day (MUST)

Run the mandatory core from a fresh v2 scenario with the optional family extension disabled, twice, EN then ES. Choose the separate FD30 day fixture, enter Demo mode, View as Lucía; chat closed. All times below are mission UTC on Mar 10, 2027. Initial time 05:55, FD30; first day is Feb 9. The M1 regression fixture is not edited. Use Next event to avoid waiting; it advances all due events for the mission (02 §12.2). No manual action asserts that a physiological activity happened. The following expectations are specifications for future implementation, not claims of executed tests.

| ID | Jury action / automatic arrival | Expected EN | Expected ES |
|---|---|---|---|
| J0 | Open Today before the first event. Inspect history/source disclosures. | FD30; Lucía's Sprout visible, chat closed; Simulated workflow history includes previous planned rest with No record, previous equipment workflow without metrics and stored blood workflow without result. Three distinct provenance lanes; future analyzer disclosure visible. | FD30; Sprout visible; Historial de proceso simulado, Sin registro, Sin métricas disponibles; agenda, reporte simulado y evidencia real de otra misión separados. |
| J1 | Next event: 06:00 episode-ended arrival. | Automatic greeting; Today shows Planned rest window separately from Recorded sleep · No record, with own observations or No observations. Character shows New update. No chat opens, no wake click or manual sleep value. | Saludo automático; Ventana de descanso planificada separada de Sueño registrado · Sin registro; observaciones propias o Sin observaciones; Nueva novedad. |
| J2 | Step through 09:15 blood collection and 09:20 analysis; inspect each card. | Collection planned → Sample taken → Analyzing, all simulated. Future onboard analysis disclosure stays visible; current-practice context separately says stored/awaiting return or analysis. No clinical result or immediate-ISS-practice claim. | Toma prevista → Muestra tomada → Análisis en curso; Análisis futuro a bordo — simulado; contexto separado de almacenamiento/espera de retorno o análisis. |
| J3 | Next events 09:25 and 09:30, secondary urine workflow. | Independent urine sample statuses, explicitly optional future path, not a requirement of inflight Standard Measures. Blood state is unchanged. | Estados de orina independientes; vía futura opcional; no se presenta como protocolo de orina en vuelo de Standard Measures. |
| J4 | Next event 10:30, exercise start. | Planned → In progress for Lucía from simulated equipment. No Start training button. Planned agenda does not assert attendance. | Previsto → En curso, desde equipo simulado. No requiere Comenzar entrenamiento. |
| J5 | Next event 11:30, exercise finish. | Completed; No metrics available. Sprout visibly shows news with chat closed and no navigation/focus theft. Choose View my summary on character: Today selects/highlights this session and announces the action; chat need not open. | Finalizado; Sin métricas disponibles. Novedad visible. Ver mi resumen selecciona/resalta la sesión y anuncia la acción. |
| J6 | Next event 11:45, blood result workflow. | Result available + No usable values + No comparable record + Source review status not reported. Simulated future capability, not clinical all-clear. Character marks news; View my summary selects this blood result, never the older exercise card or another person's evidence. | Resultado disponible + Sin valores utilizables + Sin registro comparable + El origen no informó un estado de revisión. Sin diagnóstico ni “todo bien”. |
| J7 | Optional next event 11:50, urine result workflow. | Separate result availability with no values; no overwrite of blood and no inferred comparable assay. Next event then says End of scripted day. | Resultado separado sin valores; no reemplaza sangre. Fin de la jornada guionada. |

Execute J1–J6 once without advancing controls too, using a deterministic test clock or ticks covering the same instants: events ingest automatically. With reduced motion, idle/news/interaction still differ by silhouette pose, marker and text. At desktop and 320 px mobile, inspect both updated wireframes' hierarchy and the floating character and its edge-adapting notice; essential controls remain reachable. Perform V1–V3 (§10.5) too. Check keyboard activation, focus restoration, translated accessible names, and no horizontal page scrolling in both languages. These visual checks do not assert specialist approval.

### 10.2 Profiles, sharing and failure cases (MUST)

| ID | Setup and action | Expected in EN and ES |
|---|---|---|
| P1 | Before J5, type a private note draft and chat turn for Lucía without sharing. Change View as to Mei, then Tomás, then Lucía. | Same mission time/offset, shared delivered plan, queues and processed IDs throughout. Mei has Sail and her own empty records/chat/drafts; Tomás has Beacon and his own profile plus Crew. No Lucía content appears during switching. Returning restores Lucía's draft/chat and unread state; chat stays closed. Language switch and reload preserve all owner partitions. |
| P2 | Switch away from Lucía before a due equipment event; let it arrive while viewing Mei. | Lucía's history/unread marker updates, no announcement or card leaks on Mei. On return Lucía sees her event once. Pending actions from an old profile do not execute in the new profile. |
| P3 | As Lucía, compose operational replanning request linked to the hardware task; inspect preview, cancel, then preview and send. | Preview shows exact message, Lucía → Tomás (Commander), interval/reference and local visibility/absence of recall. Cancel sends nothing. Send delivers only that immutable message to Tomás. No private note/chat/result is auto-copied. Link-down does not block this local channel. |
| P4 | As Tomás open Crew, then as Mei try the same route/hash. Check Ground in both roles too. | Tomás sees team delivered operational agenda, overlaps, planned rest windows and Lucía's explicitly shared request. No recorded sleep, stress, clinical results, sample statuses, private drafts, notes or chat from others. His own summary action opens only his summary. Mei cannot open Crew or read the request. Neither Ground role receives this request. Commander cannot edit/send a plan or forward to medical by this flow. |
| P5 | Inject a duplicate event, a wrong-mission event and an unconfirmed-person event in a test fixture. Reload and advance. | No duplicate history/notice, no cross-mission write, no personal attribution of unconfirmed data. Content-free diagnostic explains rejected/unassigned status. Simulated preload is not replayed as novelty. |
| P6 | Test a source-marked-for-review status fixture without values, then missing review status. | First relays Marked for review by source / Marcado para revisión por el origen with simulation/source/time; second says not reported. Neither produces diagnosis, normality, score, automatic sharing or fabricated value. A missing start/sample predecessor is incomplete history, not a manufactured record. |
| P7 | Hide Demo mode; wait for an event, then re-enable it and deliberately reset. | No View as/Next event in astronaut controls; automatic events still process. Re-enabling does not reset. Confirmed Restart resets all demo partitions/clock/history to fixture defaults, keeps locale/Mode and restores immutable preload. |
| P8 | With link down, process local exercise/lab events; send a separate explicitly consented medical summary through M1's observation form. | Local events still arrive. Ground sees no automatic result or clinical payload. Medical summary stays content-free for both Ground roles until delivered; after link recovery, medical sees only authorized content and operator only the existing restricted marker. No automatic attachment or Commander access is introduced. |

### 10.3 M1 continuity and implementation sequence

- Run A1–A10, C, D and E of §2 using the **unchanged M1 regression fixture**, default Lucía, in both languages. Preserve 90-minute advancement, same planned-rest calculation, correct recipients, Show me action, empty comparable-sleep response, NASA source, consent and FIFO. In M1.1 also verify both Lucía and Tomás get their own hardware-task notice while Mei gets none. The new selectors may not mix an inactive owner's notes into any Ground view.
- Contract tests to add when implementing: `U-PROFILE` (ownership/drafts/stale actions/commander routes), `U-DAY` (common clock, due ordering, idempotency, preload and unknown attribution), `U-SAMPLE` (blood/urine state, unavailable values, source flags), `U-CREW` (exact-message preview and recipient isolation), `U-CHARACTER` (scoped once-only summary/change actions). Preserve existing U-LINK/U-ROLE/U-AG/U-COMP; absence of comparable records remains a tested outcome. No tests or app changes are executed by this specification task.
- Build order after spec review: profile partition + schema2 persistence → shared event clock and provenance-labelled FD30 fixture/preload → Today day rail and summaries → floating per-profile character position/responsive independent chat/states/actions → private optional check-in using Observations → Commander Crew and voluntary request preview → integrate unchanged Ground-medical flow → bilingual, reduced-motion, mobile and regression acceptance. Do not build a disconnected module per source before the day works end-to-end.
- Closing M1.1 requires the mandatory core §10 scripts (including V1–V5) and §8 checks when implemented. The optional capsule test FAM1–FAM4 (§10.6) is required only if that extension is included; omission never fails core acceptance. No real numeric clinical dataset, live sensor, generated asset or immediate onboard ISS assay is a prerequisite. The source-limits disclosures and explicit no-values states are requirements, not excuses to fabricate a result. M2's separate validated-evidence closing rule remains in §3.
- Team drafts have been received; authorship/discipline attribution and specialist endorsement remain pending where unconfirmed. Clinical thresholds, recommendations, interpretation of biomarkers/sleep/stress and validation of supportive language remain open for those teams. No conclusion or endorsement is inferred; this neutral workflow spec is ready for review, not a clinical validation or implementation authorization.

### 10.4 Personal module access without an event (MUST, EN/ES)

Use the initial FD30 day fixture at 05:55 with a deterministic test clock held at that instant, preloaded history already processed, no unread notification and chat closed. Do not use Next event. Run N1–N3 once in English and once in Spanish, on desktop and mobile. Holding time here is a test setup, not a new jury control.

| ID | Action | Expected EN | Expected ES |
|---|---|---|---|
| N1 | For each module, open it from Onboard navigation, return to Today and use its card, then return and use Mate's module action with chat closed. | Sleep, Exercise and Laboratory each open their canonical personal route (02 §12.6). For each module, all three entries show the same active owner and history/detail, never scientific Evidence. No pending news or clock advance is needed; chat stays closed. Mission time/offset, processed IDs and link state are unchanged by navigation. | Sueño, Ejercicio y Laboratorio abren sus rutas personales canónicas. Para cada módulo, navegación, tarjeta de Hoy y acción de Mate muestran el mismo perfil e historial/detalle, sin abrir evidencia científica ni el chat. No requieren novedades ni avanzar el reloj; navegar no cambia el reloj, eventos procesados ni enlace. |
| N2 | Inspect Lucía's preloaded history through those entries; then View as Mei and repeat. | Lucía's available simulated history is readable immediately: planned rest versus recorded sleep No record; previous exercise workflow with No metrics available; stored blood sample with no usable result. Mei sees only her own history or explicit No record / No usable values states. No invented measurement, copied record or manual-entry requirement. | El historial simulado de Lucía se consulta desde el inicio: descanso planificado separado de sueño registrado Sin registro; ejercicio previo Sin métricas disponibles; muestra de sangre almacenada sin resultado utilizable. Mei ve solo su historial o Sin registro / Sin valores utilizables, sin datos inventados, copiados ni carga manual obligatoria. |
| N3 | After the initial-time checks, release the test clock and process the existing day events. Revisit modules from each entry, with and without the detail already open; also check navigation outside Demo mode. | Confirmed events automatically refresh the same owner's personal modules and Today cards. Opening/reopening does not replay events, duplicate history or depend on unread news. All three navigation entries remain available outside Demo mode; M1 and Evidence routes retain their existing meaning. | Los eventos confirmados actualizan automáticamente los módulos personales y tarjetas de Hoy del mismo perfil. Abrirlos no reproduce eventos ni duplica historial y no depende de novedades pendientes. Los tres accesos siguen disponibles fuera de Modo muestra; M1 y las rutas de evidencia mantienen su significado. |

### 10.5 SPEC03 visual closure and voluntary check-in (core MUST, EN/ES)

Run on desktop (at least 1024 px wide) and mobile (320 px wide), first EN then ES, in normal and reduced-motion settings. Use the FD30 fixture and deterministic test clock of §10.4 for initial access checks; then release it for automatic events. These are future implementation checks, not tests executed by this documentation task.

| ID | Action | Expected EN | Expected ES |
|---|---|---|---|
| V1 | Initial load/reload with a saved conversation. Navigate Today → Sleep → Exercise → Laboratory with no unread notice and chat closed, using navigation, Today cards and Mate's separate module actions (N1–N3). | Written chat starts closed; own conversation/draft retained. The original character retains its preferred floating position on every view, initially lower-right; essential controls remain reachable at scroll, zoom or keyboard focus (IMP02 amendment; §10.7). Same owner/detail from all entries; no clock/event advance is required. | El chat escrito arranca cerrado; conserva conversación/borrador propios. Personaje flotante visible en Hoy, Sueño, Ejercicio y Laboratorio, inicialmente abajo a la derecha; conserva su preferencia y mantiene accesibles los controles esenciales (§10.7). Todos los accesos abren el mismo perfil/detalle, sin requerir avanzar reloj/eventos. |
| V2 | Activate the character with keyboard and touch; type a draft, close, reopen, navigate, switch EN/ES, then switch profiles and return. Test desktop resize, mobile rotation and virtual keyboard. | Character activation opens lateral chat with reflow on desktop, bottom panel on mobile. Close chat/Escape restores focus; character remains visible and text persists only under its owner. No old-owner turn/draft/announcement appears in another profile. All controls/content remain reachable; initial/profile-entry chat stays closed. | Activar el personaje abre chat lateral que adapta el contenido en escritorio o panel inferior en móvil. Cerrar chat/Escape devuelve foco; el personaje sigue visible. Conversación/borrador solo de su dueño, sin filtrarse al cambiar de perfil. Todo control/contenido sigue accesible; al iniciar o cambiar perfil el chat está cerrado. |
| V3 | Repeat J1, J4–J6 (wake → exercise start/finish → blood-result notice) with chat closed, without manual wake/start/metric entry. Inspect each signal card and unread character state. | Automatic owner-scoped updates. Pose/expression + brief event text distinguish news with reduced motion too; no automatic chat opening/navigation/focus theft. Cards identify instrument/adapter, variable, unit or explicit absence, nature, phase, source and availability (04 §11.4). Unverified capability stays labelled; no values or all-clear are fabricated. | Actualización automática del dueño correcto. Postura/expresión y texto breve señalan la novedad también con movimiento reducido; no abre chat, navega ni roba foco. Ficha con instrumento/adaptador, variable, unidad o ausencia explícita, naturaleza, fase, fuente y disponibilidad. Capacidad sin verificar no se vuelve dato; sin cifras ni “todo bien” inventados. |
| V4 | Open Optional check-in; leave empty, Skip or Cancel; in another run ignore it entirely while advancing the automatic day. | No entry/message, score, inference, dissemination, plan change or blocking of clocks/monitoring. No skip/noncompliance penalty; day completes without responding. | Omitir, cancelar, dejar vacío o ignorar el check-in no crea registro/envío, puntaje, inferencia, difusión, cambio de agenda ni bloqueo del reloj/monitoreo. No hay penalización por omitir; se completa la jornada sin responder. |
| V5 | Save a qualitative day comment or leisure preference privately through Observations. Inspect the list, then switch profiles, Ground roles and Commander Crew. Change language and reload. | Private check-in — not shared. Owner sees original text/language and retained draft/history; other viewers get no text or private log. No sharing toggle/action for this path, copied medical summary/request, inferred cause, automatic hobby booking or new plan version. Ordinary M1 medical sharing still passes P8 and §10.3 separately. | Check-in privado — no se comparte. Dueño conserva texto/idioma, borrador e historial; otros perfiles, Comandante y Tierra no lo ven. Sin control de compartir, copia a resumen/solicitud, causa inferida, reserva automática ni versión nueva de agenda. El canal médico de M1 sigue sus pruebas separadas. |

### 10.6 Optional local fictional capsule (separate extension acceptance)

Run only when the extension in 02 §12.8 is included, after the main blood-result journey, on desktop/mobile and EN/ES with chat closed. No real media transport is tested or specified.

| ID | Action | Expected EN | Expected ES |
|---|---|---|---|
| FAM1 | Enable the optional fixture; after the main journey process the 12:05 capsule event for Lucía. | Family capsule available + Fictional local capsule beside her visible character; no body preview, chat opening, navigation, media playback or automatic read. | Cápsula familiar disponible + Cápsula ficticia local junto al personaje visible de Lucía; sin mostrar cuerpo, abrir chat, navegar, reproducir medios ni marcar leída automáticamente. |
| FAM2 | As Lucía explicitly choose Open capsule; close and reopen, switch EN/ES and reload. | Owner-scoped local text detail opens only on request, with fictional sender/recipient/source; opening marks read once. Text remains locally available, never a real family message or therapeutic claim. Close restores focus; conversation is unaffected. | Abrir cápsula muestra texto local solo a pedido, con remitente/destinatario ficticios y procedencia; marca leída una vez. Sigue disponible localmente, sin presentarse como mensaje real ni beneficio terapéutico. Cerrar devuelve foco y no altera conversación. |
| FAM3 | Let arrival occur while viewing Mei; inspect Mei, Commander Crew and both Ground roles, and try opening Lucía's capsule ID as Tomás. Return to Lucía. | Only Lucía has capsule/unread state. No payload, sender, existence/count or announcement leaks elsewhere; unauthorized open is unavailable. Return shows her unread notice with chat closed until she opens it. Ground link status does not control the local capsule. | Solo Lucía tiene cápsula/estado pendiente. No se filtran contenido, remitente, existencia/contador ni anuncio a Mei, Comandante o Tierra; acceso ajeno no disponible. Al volver ve su novedad con chat cerrado hasta abrirla. Es local e independiente del enlace de Tierra. |
| FAM4 | Replay the event, reload, reset deliberately, and run the main fixture with extension disabled. | No duplicate receipt or repeated acknowledged news; reset restores the enabled fixture. Disabled extension needs no capsule/assets and cannot fail core acceptance; End of scripted day refers only to enabled events. | Sin duplicados ni repetición de novedad ya reconocida; reinicio restaura el escenario habilitado. Deshabilitada, no exige cápsula/assets ni falla el recorrido principal; Fin de jornada guionada se refiere solo a eventos habilitados. |

### 10.7 IMP02 — Floating companions, limited Today/Sleep cut (EN/ES)

Authorized change: lower-right is the initial location, replacing the fixed position of SPEC03. Run on desktop and 390 px, in EN and ES, with normal/reduced motion. The cut includes the three existing fictional profiles and Today/Sleep only. Exercise, Laboratory, Commander, check-in and capsule are not prerequisites or new screens.

| ID | Action | Expected EN | Expected ES |
|---|---|---|---|
| F1 | Drag Sprout with mouse/touch; release, scroll, open Sleep and return. | Drag/release never opens chat. Same viewport position across scroll/navigation; drop stays visible, clear of essential controls. Tap opens independent side/bottom chat; Close retains character/conversation. | Arrastrar/soltar no abre chat. Misma posición al desplazar/navegar; queda visible y no tapa controles esenciales. Tocar abre chat lateral/inferior independiente; cerrar conserva personaje/conversación. |
| F2 | View as Tomás, move Beacon, type a draft/turn; return to Lucía, then Mei/Sail. | Distinct monochrome silhouettes. Each retains its own position, turns/draft and private history; no Lucía wake record for others. Clock/event cursor do not reset. Switching closes chat/movement UI; stale owner writes discarded. | Siluetas distintas en monocromo. Cada uno conserva posición, conversación/borrador e historial propios; otros no reciben el registro de Lucía. Reloj/eventos no se reinician. Cambiar cierra chat/movimiento y descarta escrituras del dueño anterior. |
| F3 | Reload; narrow/widen viewport; repeat with chat open/closed. | Positions/chat history persist; chat starts closed. Effective position stays visible, returning to the saved preference when space returns; resize never overwrites it. Chat location is independent. | Persisten posiciones/conversaciones; chat arranca cerrado. Posición efectiva visible y vuelve a la preferencia al recuperar espacio; cambiar ancho no la sobrescribe. Chat independiente. |
| F4 | Verify no Position button/menu; Tab to the character, M, arrows/Shift+arrows, Enter; repeat and Escape; Home. | No Position button/menu or replacement position control; the only control beside the character is the info button. Translated keyboard hints are in the info card, which shows the move instructions while movement mode is active; bounded movement, commit/cancel without chat. Home resets only current owner to initial lower-right; other position and FD30 unchanged. | Sin botón/menú de Posición ni otro control de posición; el único control junto al personaje es el botón de información. Las instrucciones traducidas están en el cuadro de información, que muestra las de movimiento mientras ese modo está activo; movimiento acotado, confirmar/cancelar sin chat. Home restablece solo al dueño activo abajo a la derecha; otro compañero y FD30 sin cambios. |
| F5 | Leave character near each edge, then Next event while Lucía is active and while another profile is active. | Lucía's wake updates only her history/unread state; her info button shows the news marker at her retained position, the card stays closed, and nothing moves, opens chat or navigates. Other profiles show no Lucía greeting/result; reduced motion preserves pose/text. | Despertar solo actualiza historial/novedad de Lucía; su botón de información muestra el marcador de novedad donde quedó, el cuadro sigue cerrado y nada se mueve, abre el chat ni navega. Otros perfiles no muestran su saludo/registro; mismo significado sin movimiento. |
| F6 | PET01 — Info card. Load and reload; navigate Today → Sleep; View as each profile; leave news pending. Then use the info button, with chat closed and open. Repeat on desktop and 390 px, in EN/ES, with normal/reduced motion. | The card is closed on load, after navigation, on profile switch and when news arrives. The info button has the accessible name Companion information; with news it also carries a "!" badge and the name adds 1 new update. The button opens and closes the card without opening chat; chat and card open and close independently. The open card is fully inside the screen at every corner, on desktop and mobile. It shows the news and View my summary (opens the right detail, closes the card, no chat) and keeps the three module accesses when there is no news. Escape closes the card and focus returns to the info button; with focus in chat, Escape closes only the chat. | La tarjeta está cerrada al cargar, al navegar, al cambiar de perfil y cuando llega una novedad. El botón de información se llama Información del compañero; con novedad suma una insignia "!" y el nombre agrega 1 novedad. Abre y cierra el cuadro sin abrir el chat; chat y cuadro se abren y cierran de forma independiente. El cuadro abierto queda dentro de la pantalla en cada esquina, en escritorio y móvil. Muestra la novedad y Ver mi resumen (abre el detalle correcto, cierra el cuadro, sin chat) y conserva los tres accesos a módulos si no hay novedades. Escape cierra el cuadro y el foco vuelve al botón de información; con foco en el chat, Escape cierra solo el chat. |
| F7 | Tap the character with the info card open and closed; drag it and release; open the card by keyboard from the character (Tab). | Tapping the character opens chat and drag/release never opens chat or the card; neither changes the saved position of another profile. Tab order is character → info button → card actions. | Tocar el personaje abre el chat; arrastrar y soltar no abre el chat ni el cuadro, y no cambia la posición guardada de otro perfil. El orden de Tab es personaje → botón de información → acciones del cuadro. |
