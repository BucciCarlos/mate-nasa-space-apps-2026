# 01 — Product and scope

Status: draft for team review · 2026-11-14 · Labels MUST / SHOULD / FUTURE as defined in [00-index](00-index.md).

## 1. Purpose

The challenge states that on long missions "astronauts carry much of the responsibility for spotting these changes in themselves". M.A.T.E. (Medical & Astronaut Therapeutic Environment) is a health, wellbeing and mission-context platform built around that responsibility:

- **Onboard**, each crew member has one personal companion that stays the same before, during and after flight. It explains what changed in their context, helps them record observations and lets them decide what to share.
- **Ground** is a professional console where mission operators and medical professionals follow each mission with role-appropriate visibility.
- Both ends share one coherent state through a **simulated Ground–space link**, so delays, pending deliveries and loss of signal are visible rather than hidden.

The prototype is a static web application and a decision-support demonstration. It is not a medical device: it does not diagnose, prescribe, or decide whether anyone may perform a task.

## 2. Principles (MUST in every milestone)

| ID | Principle |
|---|---|
| P1 | **One companion across phases.** The same companion (name, appearance, memory of the person's own records) accompanies pre-flight, in-flight and post-flight. |
| P2 | **Context before interpretation.** M.A.T.E. explains what changed in the crew member's context (agenda, link, environment). It never infers a health outcome it has no evidence for, and says so explicitly. |
| P3 | **No invented science.** No fabricated physiological values, personal histories, thresholds, probabilities, risk scores or predictions. People, agendas, plans, link behaviour and conversation may be simulated and are always labelled as simulated. |
| P4 | **Provenance at the point of use.** Every data-bearing element shows where it comes from (03 §5, 04 §2). |
| P5 | **Private by default.** Private notes and companion conversations never leave Onboard. Ground only receives summaries the crew member explicitly chooses to share. |
| P6 | **No readiness verdicts.** Never "fit/unfit", "apto/no apto" or equivalents. No flow depends on a cognitive test. |
| P7 | **Bilingual.** Everything visible exists in English and Spanish; switching language never resets the journey or the state. |
| P8 | **Offline-capable.** Once served locally, every feature works without internet. No runtime network requests. |
| P9 | **Own identity.** No NASA insignia, logotype or seal, no mission patches or agency flags, no likeness of real astronauts. |

## 3. Users and roles in the prototype

| Surface | Role | Sees | Can do |
|---|---|---|---|
| Onboard | Astronaut: one fictional ISS crew member | Own agenda and notices, link status as known on board, own observations and conversation, evidence and concept modules | Ask the companion, log observations, choose to share a summary |
| Ground | Mission operator | Agendas of both missions, link and message status, mission log, *that* a crew summary arrived (not its content), evidence and concept modules | Advance tasks and send updates, set the simulated link up or down |
| Ground | Medical professional | Agendas (read-only), link status, content of shared summaries, mission log, evidence and concept modules | Read shared summaries |

Role switching on Ground is a **demonstration filter, not security**, and the UI says so (03 §1).
FUTURE: crew medical officer, behavioral health, researcher and commander roles; real authentication.

## 4. Mission profiles

| Profile | Status | Contents | Visible from |
|---|---|---|---|
| ISS / EEI — primary | M1 MUST | Fictional crew of 3, agenda, link, mission log and events; complete Ground ↔ Onboard journey | Ground and Onboard |
| Cislunar — secondary, limited | M1 MUST | Fictional crew of 4, its own mission clock, agenda, link, mission log and events; no Onboard interface | Ground only |
| Mars | FUTURE | — | — |

- **Isolation:** a change, message, notice or log entry belongs to exactly one mission and never appears in another (contract: 02 §4).
- **Onboard has no destination selector.** It is bound to the ISS crew member defined in the scenario (04 §8).
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
| CORE-COMPANION | Companion: guided intents, free text, simulated voice, UI actions | The conversational experience | M1 MUST (M1 intents); M3 MUST (module intents) |
| CORE-OBS | Observations and consented sharing | Self-report, privacy, the crew member's decision | M1 MUST |
| CORE-ROLES | Role filters (M1 MUST); audit view of who received what (M4 SHOULD) | Professional console realism | M1 / M4 |
| CORE-PROV | Provenance badges (M1 MUST); Sources page (M2 MUST) | Validity and NASA traceability | M1 / M2 |
| CORE-I18N | English and Spanish everywhere | Non-negotiable requirement | M1 MUST |
| CORE-CATALOG | Module catalog and body map navigation | Breadth of the platform; the challenge's clickable human figure | M3 MUST |
| CORE-JOURNEY | Pre-flight / in-flight / post-flight journey with the same companion | The continuity that defines M.A.T.E. | M3 MUST |
| CORE-GUIDE | In-app guided-journey panel with step completion | The public app explains itself without a presenter | M3 MUST |

### 5.2 Health and environment modules

Every one of the 17 risks listed in the challenge resource *Risks of Human Spaceflight* (NASA HRP) is mapped to a module, and the catalog links to the NASA page of each risk (source IDs in 04 §3).

| ID | Module | Tier | NASA HRP risk(s) | What it contributes | Data basis | Milestone |
|---|---|---|---|---|---|---|
| MOD-SLEEP | Sleep and schedules | Evidence | Inadequate Sleep and Irregular Schedules | Explains why a reduced planned rest window is surfaced (used by M1); states honestly that there are no sleep records for the crew member | NASA HRP risk page; SHOULD: published aggregate (04 §7) | Citation in M1; view M2 MUST |
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
