# 01 — Product and scope

Status: draft for team review · 2026-11-14 · Labels MUST / SHOULD / FUTURE as defined in [00-index](00-index.md).

## 1. Purpose

The challenge states that on long missions "astronauts carry much of the responsibility for spotting these changes in themselves". M.A.T.E. (Medical & Astronaut Therapeutic Environment) is a health, wellbeing and mission-context platform built around that responsibility:

- **Onboard**, each crew member has one personal companion that stays the same before, during and after flight. It explains what changed in their context, helps them record observations and lets them decide what to share.
- **Ground** is a professional console where mission operators and medical professionals follow each mission with role-appropriate visibility.
- Both ends share one coherent state through a **simulated Ground–space link**, so delays, pending deliveries and loss of signal are visible rather than hidden.

The prototype is a static web application and a decision-support demonstration. It is not a medical device: it does not diagnose, prescribe, or decide whether anyone may perform a task.

### Public experience — MATE-FD30-01

The public cut is FD30 only: Onboard and Ground are perspectives of the same fictional ISS mission, sharing its existing clock/profile/session. `/` opens Onboard Today. Ground opens the overview; returning Onboard restores the last operational section or Today on first use. Catalog and Sources & evidence remain accessible. Legacy M1 URLs redirect to FD30; M1's code and regression tests, task editing, simulated delivery queues, medical channel and cislunar UI remain internal. Ground's schedule is read-only and uses the existing FD30 plans. This entry/navigation change does not expand catalog scope or alter data/history contracts.

## 2. Principles (MUST in every milestone)

| ID | Principle |
|---|---|
| P1 | **One companion across phases.** The same companion (name, appearance, memory of the person's own records) accompanies pre-flight, in-flight and post-flight. |
| P2 | **Context before interpretation.** M.A.T.E. explains what changed in the crew member's context (agenda, link, environment). It never infers a health outcome it has no evidence for, and says so explicitly. |
| P3 | **No invented science.** No fabricated physiological values (sole exception: explicitly simulated FD30 Lucía pulse under 04 §11.7), clinical histories presented as measured evidence, thresholds, probabilities, risk scores or predictions. Explicitly simulated workflow history has the limits in 04 §11. The approved fictional duration/exercise histories and original non-clinical SLEEP03 demonstration score retain their bounded exceptions in 04 §§11.8–11.11; they are not medical risk scores. People, agendas, plans, link behaviour and conversation may be simulated and are always labelled as simulated. |
| P4 | **Provenance at the point of use.** Every data-bearing element shows where it comes from (03 §5, 04 §2). |
| P5 | **Private by default.** Private notes and companion conversations never leave Onboard. Ground only receives summaries the crew member explicitly chooses to share. |
| P6 | **No readiness verdicts.** Never "fit/unfit", "apto/no apto" or equivalents. No flow depends on a cognitive test. |
| P7 | **Bilingual.** Everything visible exists in English and Spanish; switching language never resets the journey or the state. |
| P8 | **Offline-capable.** Once served locally, every feature works without internet. No runtime network requests. |
| P9 | **Own identity.** No NASA insignia, logotype or seal, no mission patches or agency flags, no likeness of real astronauts. |

## 3. Users and roles in the prototype

| Surface | Role | Sees | Can do |
|---|---|---|---|
| Onboard | Astronaut: one fictional ISS crew member in M1; any of the three via Demo mode in M1.1 | Own agenda and notices, link status as known on board, own observations and conversation, evidence and concept modules | Ask the companion, log observations, choose to share a summary |
| Ground | Mission operator | Agendas of both missions, link and message status, mission log, *that* a crew summary arrived (not its content), evidence and concept modules | Advance tasks and send updates, set the simulated link up or down |
| Ground | Medical professional | Agendas (read-only), link status, content of shared summaries, mission log, evidence and concept modules | Read shared summaries |

Role switching on Ground is a **demonstration filter, not security**, and the UI says so (03 §1).
M1.1 adds the Commander as a crew member with their own companion and a limited Crew view (02 §12.4), not a third Ground role. FUTURE: crew medical officer, behavioral health, researcher roles and real authentication.

## 4. Mission profiles

| Profile | Status | Contents | Visible from |
|---|---|---|---|
| ISS / EEI — primary | M1 MUST | Fictional crew of 3, agenda, link, mission log and events; complete Ground ↔ Onboard journey | Ground and Onboard |
| Cislunar — secondary, limited | M1 MUST | Fictional crew of 4, its own mission clock, agenda, link, mission log and events; no Onboard interface | Ground only |
| Mars | FUTURE | — | — |

- **Isolation:** a change, message, notice or log entry belongs to exactly one mission and never appears in another (contract: 02 §4).
- **Onboard has no destination selector.** It remains bound to the ISS. M1 fixes the scenario user; M1.1 adds View as, in Demo mode only, for profiles within that mission (02 §12). Cislunar remains Ground-only.
- Fictional mission names must not use real NASA mission identifiers (e.g. "Artemis", "Gateway", expedition numbers).

## 5. Module catalog

Tiers:

- **Interactive:** functional logic and state.
- **Evidence:** real, verifiable data or NASA/partner content, always separated from the fictional crew. Evidence never becomes data of a fictional person.
- **Concept:** a card that states the module's purpose, the NASA risk it addresses, why it is not built in the prototype and what data would be needed. Concept cards contain no values.

### 5.1 Platform modules (Interactive)

| ID | Module | What it contributes | Milestone |
|---|---|---|---|
| CORE-MISSION | Mission context and isolation: profiles, mission clock, mission log | Multi-mission realism; Ground overview | M1 MUST |
| CORE-AGENDA | Agenda: Ground editor, Onboard agenda, planned-rest-window computation | The context change at the heart of M1 | M1 MUST |
| CORE-LINK | Simulated Ground–space link: queued, in transit, delivered, link down | Honest pending and stale states | M1 MUST |
| CORE-ENGINE | Event engine ("coordinator"): deterministic rules with rule traces ("Why am I seeing this?") | Explainability without generative AI | M1 MUST |
| CORE-COMPANION | Companion: guided intents, free text, simulated voice, UI actions; persistent original characters per profile in M1.1 | The conversational experience | M1 MUST (M1 intents); M1.1 MUST (characters and day actions); M3 MUST (module intents) |
| CORE-OBS | Observations and consented sharing | Self-report, privacy, the crew member's decision | M1 MUST |
| CORE-ROLES | Role filters (M1 MUST); limited onboard Commander view (M1.1 MUST); audit view of who received what (M4 SHOULD) | Professional console realism | M1 / M1.1 / M4 |
| CORE-PROV | Provenance badges (M1 MUST); Sources page (M2 MUST) | Validity and NASA traceability | M1 / M2 |
| CORE-I18N | English and Spanish everywhere | Non-negotiable requirement | M1 MUST |
| CORE-PROFILES | Owner-scoped Onboard profiles and limited Commander Crew | Identity continuity and voluntary operational sharing | M1.1 MUST |
| CORE-DAY | Automatic scripted local equipment events and common demo clock | One connected FD30 day with visible provenance and preloaded workflow history | M1.1 MUST |
| CORE-CATALOG | Module catalog and body map navigation | Breadth of the platform; the challenge's clickable human figure | M3 MUST |
| CORE-JOURNEY | Pre-flight / in-flight / post-flight journey with the same companion | The continuity that defines M.A.T.E. | M3 MUST |
| CORE-GUIDE | In-app guided-journey panel with step completion | The public app explains itself without a presenter | M3 MUST |

### 5.2 Health and environment modules

Every one of the 17 risks listed in the challenge resource *Risks of Human Spaceflight* (NASA HRP) is mapped to a module, and the catalog links to the NASA page of each risk (source IDs in 04 §3).

| ID | Module | Tier | NASA HRP risk(s) | What it contributes | Data basis | Milestone |
|---|---|---|---|---|---|---|
| MOD-SLEEP | Sleep and schedules | Evidence | Inadequate Sleep and Irregular Schedules | M1 explains a changed planned rest window without measured sleep. FD30 adds private fictional durations and the approved original M.A.T.E. demonstration score, separately from real evidence (04 §§11.8, 11.11) | NASA HRP risk page; SHOULD: published aggregate (04 §7) | Citation in M1; view M2 MUST |
| MOD-LABS | Real lab changes around a flight (Inspiration4) | Evidence | — (illustrates measurement and self-relative change; the challenge's "blood sugar levels in mg/dL" example) | Real flight-crew data from NASA OSDR shown as a separate, de-identified evidence view | OSD-575, OSD-569 (04 §4) | M2 MUST |
| MOD-RAD | Radiation environment | Evidence | Radiation-Induced Cancers | Area dose rate inside the ISS with detector, location, dates, unit and coverage; explains why there is no personal dose | CDAWeb ISS TEPC; CSA radiation article (challenge resource); NASA-STD-3001 text (04 §6) | M2 MUST (no-data state allowed while data is pending) |
| MOD-ENV | Cabin CO₂ | Evidence | — (hazard: Hostile/Closed Environments, from *5 Hazards of Human Spaceflight*) | Environmental context; difference between a habitat design requirement and a personal threshold | OSDR EDA; NASA-STD-3001 text (04 §5) | M2 MUST (partial verification; pending state allowed) |
| MOD-BEHAV | Behavioral health and wellbeing | Interactive (through CORE-OBS) + Concept card | Behavioral Conditions and Psychiatric Disorders | Private self-report and consented sharing; no inference from voice, face or heart rate | Crew member's own entries | M1 MUST (observations); M3 MUST (card) |
| MOD-CARDIO | Cardiovascular | Concept | Cardiovascular Adaptations | Scope and data needs | — | M3 MUST |
| MOD-MSK | Muscle, bone and exercise | Concept | Reduced Cardiorespiratory and Musculoskeletal Fitness; Spaceflight-Induced Bone Changes | Scope and data needs | — | M3 MUST |
| MOD-NUTR | Nutrition and hydration | Concept | Inadequate Food and Nutrition | Scope and data needs | — | M3 MUST |
| MOD-IMMUNE | Immune system | Concept (M4 SHOULD: Evidence with OSD-575 cytokines, 04 §4.2) | Altered Immune System Responses | Scope and data needs | — | M3 MUST |
| MOD-SANS | Vision and brain (SANS) | Concept | Spaceflight Associated Neuro-ocular Syndrome | Scope and data needs | — | M3 MUST |
| MOD-SENSORI | Balance and sensorimotor | Concept | Altered Sensorimotor and Vestibular Function | Scope and data needs | — | M3 MUST |
| MOD-COG | Attention and cognitive performance | Concept | — (context: *Ongoing HRP Research*, Standard Measures) | Scope and data needs. FUTURE: a voluntary self-check that never yields a verdict and never gates a flow | — | M3 MUST |
| MOD-CREW | Crew dynamics | Concept | Inadequate Teamwork | Scope and data needs | — | M3 MUST |
| MOD-EVA | Spacewalks and pressure transitions | Concept | Decompression Sickness; Hypoxia; Injury and Compromised Performance from Spacewalks | Scope and data needs | — | M3 MUST |
| MOD-MICRO | Microbes and habitat hygiene | Concept | Host-Microorganism Interactions | Scope and data needs | — | M3 MUST |
| MOD-LOADS | Launch and landing loads | Concept | Injury from Dynamic Loads | Scope and data needs | — | M3 MUST |
| MOD-AUTONOMY | Earth-independent operations | Covered by CORE-LINK and CORE-ENGINE + Concept card | Inadequate Systems Operations Support | The onboard core computes and explains changes without real-time Ground support | NASA HRP risk page | M1 (behaviour); M3 MUST (card) |
| MOD-MED | Autonomous medical care: exam guidance, imaging, medications | Concept | — (context: *Ongoing HRP Research*, Tempus Pro) | Scope and data needs; explains why no imaging or treatment guidance is built | — | M3 MUST |

### 5.2.1 MED02 — Medical contribution versus current implementation

The team confirms that the medical report *MODULOS* (15 pages) is based on NASA sources. Receipt and that confirmed basis are acknowledged; an untraced row-level reference is not evidence of a non-NASA origin. The full per-module reconciliation, physical PDF page references, primary-source support by device/measurement versus range versus action, and physician questions are in 04 §12.

The §5.2 tiers describe milestone scope, not proof that every capability is built or that every concept is still wholly empty. Current source inspection confirms private Sleep duration/score, Exercise workflow/history and synthetic telemetry, Laboratory journeys for all three profiles, the plan-only Crew Dynamics view, partial Immune links and separate public evidence. These remain intact. In particular, Tomás has his own blood workflow and Mei her own urine workflow; they are not empty placeholders or copies of Lucía. Compatible optional spoken Laboratory dialogues use those owners' query-time states; this report does not change their scripts, playback or permissions.

The report contributes candidate instruments, variables and clinical-level actions to the existing modules; it does not approve new adapters, numeric clinical payloads, thresholds, automatic alarms, treatments or access rights. Its respiratory, metabolic, endocrine, renal/hematological and acoustic items are recorded as cross-domain candidates, not silently added as new catalogue modules. Broader real medical care remains pending specialist and product decisions. SLEEP03's 480-min reference, 70–95% band and duration-gated 70/30 formula remain original scenario design, never a NASA or Samsung formula. The physician-question register (04 §12.4) is the explicit next step for clinical proposals; neutral functionality is not blocked by those open questions.

### 5.3 Phase coverage

| Phase | What M.A.T.E. does in the prototype | Data |
|---|---|---|
| Pre-flight | Meet and name the companion, set privacy choices, review a simulated preparation plan | Simulated plan; the person's own choices |
| In-flight | M1 journey: agenda changes, explanations, observations, consented sharing | Simulated agenda and link; the person's own entries |
| Post-flight | Simulated reconditioning schedule from Ground; observations continue with the same companion; a link to MOD-LABS shows real post-flight lab changes of *another, real* crew, never presented as this person's | Simulated plan; separate real evidence |

## 6. First functional journey (M1 integration milestone)

1. On Ground, the mission operator advances an ISS task.
2. The update crosses the simulated link and is delivered to the ISS crew. The cislunar mission is unaffected.
3. Onboard, M.A.T.E. computes how much the crew member's planned rest window changed.
4. The companion notifies the crew member without taking over the screen. On request, it opens the agenda, selects the relevant period and highlights the change.
5. Asked how the change will affect them, the companion says it has no comparable sleep records and therefore makes no inference.
6. Asked why it matters, the companion cites the NASA HRP risk page on sleep and irregular schedules.
7. The crew member logs an observation, which is private by default, and decides whether to share a summary.
8. Ground receives only the authorized summary, with the correct delivery state. The medical professional sees its content; the mission operator only sees that a restricted summary arrived.
9. If the link is down, everything waits visibly and is delivered in order when the link returns.

Normative contracts: 02. Acceptance: 05 §2.

### 6.1 Next delivery: M1.1 — Onboard day (MUST)

A connected visual FD30 day on a fictional ISS mission, with provenance-labelled simulated history and blood as the main lab path: sleep-episode end → equipment-driven training → blood and urine sample workflow → result availability. The companion starts with written chat closed and an initial lower-right floating position across Today/Sleep/Exercise/Laboratory; the authorized IMP02 amendment makes it movable with a preference per profile, while essential controls stay reachable (02 §12.5.1). Activating the character opens the independent responsive chat; dragging does not, and closing it preserves that profile's conversation. Automatic events update the correct profile without manual starts or transcription. No usable measurement means an explicit missing-data state, not invented physiology. Contracts: 02 §12; scenario/provenance: 04 §11; experience and wireframes: 03 §8; acceptance: 05 §10.

Demo mode provides View as for the three ISS profiles and next-event/reset controls for the jury. Shared mission time, delivered plans and events survive profile changes; private state stays scoped to its owner. The Commander is Tomás Ibarra, also a normal crew profile; Crew adds only team operational plans and voluntarily addressed requests. Medical sharing with Ground retains the M1 contract.

Product vision: the mother AI receives body-sensor, exercise-equipment, analyzer and spacecraft signals, associates them with confirmed identities, crosses them with planned activity, and updates profiles. An agenda states intention, never proof of completion. The prototype represents this coordinator with deterministic simulated events, not a running AI model. Cameras are optional future context, never required and never a basis for emotional inference. No clinical or psychological conclusions are specified while specialist input is pending.

M1.1 includes an optional-to-complete, qualitative private check-in through Observations: a day comment or leisure preference, with no score, inferred cause, sharing or plan change. A fictional local family capsule is an optional extension only after the main journey (02 §12.8); omitting it does not prevent closing M1.1. No real media transport is included.

The three team draft reports have been received. MED02 records the team-confirmed NASA basis of the medical report; exact row-level references and approval of its clinical ranges/actions remain pending under 04 §12. Other authorship, discipline attribution and specialist endorsement remain pending where not established. Their inventories and clinical proposals do not become verified measurements, integrations or approved medical policy.

M1.1 does not require the M2 evidence datasets, full module catalog, body map, three-phase journey, live ingestion or a deployed service. These retain their later milestones; the integral vision remains intact.

## 7. Out of scope for the prototype (FUTURE)

- Mars profile; real-time deep-space delay modelling; delay-tolerant networking.
- Live sensors, wearables or device ingestion; camera or microphone capture.
- Runtime LLM or any generative model; free-form medical conversation.
- Backend, real authentication, real access control, audit-grade logging.
- PWA or service worker, IndexedDB, cross-window or multi-device synchronization.
- Automatic escalation to Ground based on thresholds, which requires validated thresholds.
- Predictions or risk scores, which require flight datasets with labels (internal evidence register).
- Medical imaging and ultrasound guidance, medication guidance, EVA mode.
- Governed, de-identified research database of past missions.
- Gamification.

## 8. Challenge alignment

| Challenge element (official text) | How M.A.T.E. addresses it | Where |
|---|---|---|
| "build a health monitoring software that gathers health indicators and enables astronauts to evaluate and act on the status of their health" | The crew member records observations, sees context changes and their explanation, and decides what to share. Real flight lab indicators are shown as separate evidence. | M1, M2 |
| Inputs: "keyboard text, mouse clicks, or camera images" | Keyboard and mouse. Camera is FUTURE. | M1 |
| "blood sugar levels in mg/dL" | Real Inspiration4 glucose (mg/dL), pre-flight and post-flight | M2 (MOD-LABS) |
| "provides guidance on treatments and health improvements" | Guidance is limited to explaining context and NASA-documented countermeasures, quoted from NASA. M.A.T.E. never prescribes. | M1, M2 |
| "When might a result warrant attention from the crew or from flight surgeons on the ground?" | The crew member decides to share. Ground medical receives only consented summaries. Automatic escalation is FUTURE until thresholds are validated. | M1 |
| Consideration 1: different environments | ISS (full) and cislunar (Ground), isolated missions | M1 |
| Consideration 2: prompts during the mission routine | Proactive notices when the agenda changes | M1 |
| Consideration 3: gamification, dynamic charts, color coding | Dynamic evidence charts; status coding that never relies on color alone. Gamification is FUTURE. | M1–M2 |
| Consideration 4: simple instructions and explanations | Companion explanations, in-app guide, concept cards | M1, M3 |
| Clickable human figure | Body map navigation | M3 |
| Use of NASA resources | NASA HRP risk pages in M1, the catalog mapped to all 17 HRP risks, OSDR evidence in M2 | M1–M3 |

**Presentation note:** the official demo video (30 seconds or less) is a visual presentation. The public web app is the explorable product, and the video's length does not limit the app.

**Contest rules, pending check:** the video limit, the English-language requirement, the disclosure of AI ("SI") tools and the watermark on generated media come from the Space Apps 2026 *Project Submission Guide*. That guide was consulted through a web-archive copy dated 2026-11-13. It has not yet been cross-checked against the organizers' own documents, and these specs do not claim full compliance until it is.

### 5.2.2 CAT08 — FD30 Catalog: 14 cards and detail dialogs

The FD30 Catalog is one grid of 14 cards: the 13 concept cards above plus **MOD-RAD, ISS ambient radiation** (Evidence tier; HRP risk Radiation-Induced Cancers). The card's «More details» is replaced by a **detail dialog** opened from the card. The dialog explains each module, separates FD30 data, historical evidence and context, cites its registered source and says what is missing and why it matters; it never invents figures or applies thresholds or alerts (MED02 proposals stay pending).

To make the dialogs useful, the Catalog may read, read-only and once when a dialog opens, the data the viewer can already consult: **On board** the active profile through the existing selectors (Exercise, Laboratory, plan, Crew dynamics, Today indicators); **Ground** only the allowlisted operational projection for the active role (`groundView`), which both roles receive, plus the explicit absence of medical summaries for Medicine. No personal record reaches Ground, nothing is written or sent, and the clock, profile and voice are untouched. This supersedes CAT05's «reads no data». The MOD-RAD dialog reuses the TEPC series and its «View full series» opens Sources & evidence directly on the Radiation tab from On board (`#/onboard/personal/evidence/radiation`) and Ground (`#/demo/fd30/ground/evidence/radiation`).
