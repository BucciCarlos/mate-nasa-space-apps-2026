# 05 — Acceptance criteria and build order

Status: draft for team review · 2026-11-14

## 1. Milestones

| Milestone | Goal | Includes | Exit criteria |
|---|---|---|---|
| **M1 — Integration journey** | An ISS schedule change travels Ground → crew → Ground, in English and Spanish | CORE-MISSION, CORE-AGENDA, CORE-LINK, CORE-ENGINE, CORE-COMPANION (M1 intents), CORE-OBS, CORE-ROLES (filters), CORE-PROV (badges, M1 citations), CORE-I18N; cislunar profile on Ground | §2 passes in both languages; §5 unit tests green; §8 definition of done |
| **M2 — Evidence layer** | Real, traceable NASA and partner content is visible | Sources page; MOD-SLEEP, MOD-LABS, MOD-RAD, MOD-ENV with their fallback states; data pipeline (04 §10) | §3 |
| **M3 — Breadth and continuity** | The integral platform is navigable | CORE-CATALOG with body map; concept cards for every remaining module; CORE-JOURNEY; companion customization (name, color); CORE-GUIDE; companion intents that open and explain modules | §4 |
| **M4 — Enhancements** | SHOULD items | Sleep diary feeding comparable records (02 §6.4); spoken replies (02 §8.5); audit view; Onboard crew-member switcher within the ISS mission; more lab analytes and cytokines; DONKI events; RadLab series; "Change vs own pre-flight" toggle | — |

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

- **M2:** Sources page → MOD-SLEEP (reuses the M1 citation) → MOD-LABS (pipeline, then view) → MOD-RAD (TEPC) → MOD-ENV (EDA). A module whose data is not ready ships with its fallback state. MOD-LABS still has to meet the closing rule of §3.
- **M3:** catalog and concept cards → body map → journey → companion customization → guide panel → module intents.
- **M4:** pick from §1 as time allows.
