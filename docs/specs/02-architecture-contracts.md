# 02 — Architecture and contracts

Status: draft for team review · 2026-11-14. This document is normative for implementation. Anything not specified here should be built the simplest way that satisfies 05.

## 1. Stack and constraints (MUST)

- React 18, TypeScript in strict mode, Vite. **Plain CSS** with custom properties: no CSS-in-JS, no utility framework, no UI kit.
- Runtime dependencies: `react` and `react-dom` only.
- Dev dependencies: `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`, `@types/react-dom`, `vitest`.
- Adding any other dependency requires a recorded decision before use.
- No backend, no real authentication, no live sensors, no runtime LLM, and **no network requests at runtime**. All data ships inside the bundle under `src/data`.
- Not required: PWA or service worker, IndexedDB, cross-window synchronization (FUTURE).
- System font stack and inline SVG icons; nothing loaded from a CDN.
- `vite.config.ts` sets `base: './'`. Serve `dist/` with `vite preview` or any static host. Opening `dist/index.html` through `file://` is not supported.
- Node.js 20 or later.

## 2. Folder structure

```
mate/                         ← future public repository root (the only folder to publish)
  README.md
  LICENSE                     ← Apache-2.0, original M.A.T.E. material (04 §9)
  docs/specs/                 ← these specs
  index.html  package.json  tsconfig.json  vite.config.ts
  scripts/
    check-literals.mjs        ← M1: flags user-visible literal text in .tsx (05 §6)
    data/                     ← M2: data pipeline scripts (04 §10)
  data-raw/                   ← M2: raw downloads; not committed (add to .gitignore)
  src/
    main.tsx
    app/        App, Shell, ErrorBoundary, routes.ts (parse/serialize), useRoute.ts
    state/      types.ts, actions.ts, reducer.ts, selectors.ts, initialState.ts,
                AppProvider.tsx, persistence.ts, useTicker.ts
    domain/     agenda.ts, link.ts, sharing.ts, ids.ts,
                companion/intents.ts, companion/respond.ts, companion/suggestions.ts
    i18n/       en.ts, es.ts, types.ts, I18nProvider.tsx, format.ts
    data/       scenario/iss.json, scenario/cislunar.json, sources.json,
                modules.json (M3), evidence/*.json (M2)
    views/      ground/, onboard/, shared/
    styles/     tokens.css, base.css, ground.css, onboard.css
```

Code in `src/state`, `src/domain` and `src/i18n/format.ts` is pure TypeScript: no React, no DOM, no `Date.now()` inside reducers. It is unit-tested (05 §5).

## 3. State, routes, persistence, clock

### 3.1 State

- One `useReducer(reduce, …)` in `AppProvider`, exposed through Context as `{ state, dispatch }`. No state library.
- Selectors are plain functions `(state, …args) => value` in `selectors.ts`.
- When an action changes nothing, `reduce` returns the same state object. This matters for the ticker in §3.4.

### 3.2 Routes: hand-written hash routing (M1 internal regression baseline)

| View | Hash | Milestone |
|---|---|---|
| Onboard › Today (default) | `#/onboard/today` | M1 |
| Onboard › Agenda | `#/onboard/agenda` | M1 |
| Onboard › Observations | `#/onboard/observations` | M1 |
| Onboard › Module catalog / module | `#/onboard/modules`, `#/onboard/modules/:moduleId` | M2 (evidence), M3 (catalog) |
| Onboard › Journey | `#/onboard/journey` | M3 |
| Ground › Agenda / Link / Crew / Log | `#/ground/:missionId/agenda` · `/link` · `/crew` · `/log` | M1 |
| Ground › Module | `#/ground/:missionId/modules/:moduleId` | M2 |
| Sources | `#/sources` | M2 |
| Settings | `#/settings` | M1 (language, restart); M3 (companion) |

- `parseRoute(hash): Route | null`, `toHash(route): string`, `navigate(route)` (sets `location.hash`), and `useRoute()` (listens to `hashchange`). An unknown hash renders the Not-found view.
- The selected period, highlight and open source live in state (`state.ui`), not in the URL. In M1.1 these Onboard fields are profile-scoped (§12.1).
- The perspective switch goes to `state.ui.lastRoute.ground` or `.onboard`. Defaults are `#/ground/iss/agenda` and `#/onboard/today`, so switching sides keeps each side's context.

#### 3.2.1 Public FD30 entry and perspective boundary (MATE-FD30-01)

FD30 is the sole public experience. `/` resolves synchronously to FD30 Today (`#/demo/fd30`). `publicRoute`/`useRoute` map all legacy or unknown public hashes to this route family before rendering; `parseRoute` and the M1 code/tests above remain internal contracts. Canonicalization uses `history.replaceState`, not a second push, so aliases never paint the M1 shell or form Back loops.

- Ground opens `#/demo/fd30/ground`; schedule, catalog and evidence use `/agenda`, `/catalog`, `/evidence` under that hash. Onboard operational pages retain `#/onboard/personal/<page>`.
- Onboard › Ground always opens the overview. Ground › Onboard returns to the last operational page; Catalog/Evidence do not replace it. First use defaults to Today. The optional session key `mate:fd30:last-operational:v1` holds only a validated page name, no mission data or clock.
- Both perspectives mount the same `Fd30Preview` instance and existing reducer/cursor. Keep active profile, language, chat openness/conversation/draft, Exercise view and Mate position. Ground never renders personal chat or records.
- Legacy Onboard Today/Agenda/Observations map to FD30 Today/personal Agenda/Wellbeing. Modules map to Catalog; Sources maps to Evidence. Legacy Ground Agenda/Catalog/Evidence map to their FD30 equivalents (including cislunar aliases, now the same fictional ISS FD30 mission); Crew/Link/Log or absent sections map to Ground overview. Settings/unknown Onboard hashes map to Today. No public M1 escape hatch is added.
- Ground schedule reuses `GroundTimeline` and `GroundCards`, via their optional presentation props and the existing FD30 operational-plan whitelist. Three lanes, sticky names, mission-clock marker and card alternative; scrolling, centering and selection are view state only. No plan edit, uplink/downlink queue or M1 medical channel is mounted. Personal Agenda is retained.

### 3.3 Persistence: one sessionStorage snapshot

- Key `mate:v1:state`. Write the whole `AppState` after changes, debounced to at most once every 500 ms. Read it once at startup.
- Discard the snapshot if parsing fails or `schemaVersion` differs. Wrap every storage call in try/catch; without storage the app runs in memory.
- Effects:
  - Reload keeps the journey.
  - An **independent** new tab or window starts a fresh scenario. Independent means opened by entering or pasting the app URL: not duplicated, not restored, and not opened from the app with an `opener`. Browsers may copy `sessionStorage` into a duplicated tab or into one opened by the page, so any in-app link that opens a new tab uses `rel="noopener noreferrer"`.
  - **Restart scenario** (Settings and Ground menu) rebuilds the state from the scenario files and keeps the current language.

### 3.4 Clock

- Real time `nowMs = Date.now()` is read only in components and hooks, and passed into actions.
- `useTicker` dispatches `clock/tick { nowMs }` every 1000 ms.
- M1 mission time = `mission.clockStart + (nowMs − state.sessionStartMs)`, displayed in UTC with a Flight Day label (`FD n`, where `mission.flightDayOne` is FD 1). Display-only clocks use a local `useNow(30_000)` hook, not state. M1.1 adds the common mission offset and replay rules in §12.2; no component may use an independent clock for the day.

## 4. Mission isolation contract (MUST)

1. Mission IDs are `'iss' | 'cislunar'`. Entity IDs are prefixed `iss:` or `cis:` and generated deterministically from a per-mission counter (`mission.seq`) as `<prefix>:<kind>-<n>`. No random IDs.
2. All mission data lives under `state.missions[missionId]`. No collection holds entities from more than one mission.
3. Every action that touches mission data carries `missionId`. The reducer reads and writes only `state.missions[action.missionId]`. If a referenced entity ID has the wrong prefix or does not exist in that mission, the action is ignored (the same state is returned) and a warning is logged in development only.
4. Onboard is bound to `ONBOARD_MISSION_ID = 'iss'`. M1 uses `missions.iss.onboardUserId`; M1.1 selects one profile of this mission in Demo mode (§12.1). No Onboard view or selector reads another mission.
5. Ground views read `missionId` from the route, and every Ground selector requires it.
6. The cislunar mission has `onboardUserId = null`: its Onboard state (plan copy) exists so deliveries can complete, but it has no UI and creates no notices.

## 5. Data model (TypeScript contract)

This is the M1 baseline. For M1.1 the profile partition, event union and clock additions in §12 are normative replacements for the single-user Onboard fields; this is not a second competing implementation model.

```ts
export type MissionId = 'iss' | 'cislunar';
export type Locale = 'en' | 'es';
export type GroundRole = 'mission_operator' | 'medical_professional';
export type Viewer = GroundRole | 'astronaut';
export type IsoUtc = string;                          // '2027-03-10T06:00:00Z'
export interface Bilingual { en: string; es: string }
export interface Interval { start: IsoUtc; end: IsoUtc }   // end > start

export interface CrewMember {
  id: string;                    // 'iss:crew-lf'
  missionId: MissionId;
  name: string;                  // fictional proper name; never translated
  roleTitle: Bilingual;
}

export type BlockKind = 'sleep' | 'pre_sleep' | 'post_sleep' | 'task' | 'exercise' | 'meal' | 'personal' | 'conference';
export interface ScheduleBlock extends Interval {
  id: string;                    // 'iss:blk-20'
  missionId: MissionId;
  kind: BlockKind;
  crewIds: string[];             // sleep / pre_sleep / post_sleep: exactly one crew member
  title: Bilingual;
  movable: boolean;              // only 'task' | 'exercise' | 'conference' may be movable
}
export interface PlanVersion { missionId: MissionId; version: number; blocks: ScheduleBlock[]; changeId: string | null }

export type AdvanceMinutes = 30 | 60 | 90 | 120;
export interface BlockMove { blockId: string; kind: BlockKind; title: Bilingual; before: Interval; after: Interval }
export interface RestWindowChange { sleepBlockId: string; before: Interval; after: Interval; deltaMinutes: number } // after − before

export interface ScheduleChange {                    // Ground-side record
  id: string; missionId: MissionId; createdAtMs: number;
  taskId: string; advanceMinutes: AdvanceMinutes;
  fromVersion: number; toVersion: number;
  perCrew: { crewId: string; moves: BlockMove[]; rest: RestWindowChange | null }[]; // one entry per task crew member
}

export type MessageStatus = 'queued' | 'in_transit' | 'delivered';
interface MessageBase {
  id: string; missionId: MissionId; status: MessageStatus;
  seq: number;                   // per-mission position in the link queue = creation order; never reassigned (§7.1)
  createdAtMs: number;
  deliverAtMs: number | null;    // timing helper; its use is up to the implementation, within §7.1
  deliveredAtMs: number | null;
}
export interface PlanUpdateMessage extends MessageBase { direction: 'uplink'; kind: 'plan_update'; changeId: string; plan: PlanVersion }
export interface CrewSummaryMessage extends MessageBase { direction: 'downlink'; kind: 'crew_summary'; summary: SharedSummary }
export type LinkMessage = PlanUpdateMessage | CrewSummaryMessage;
export interface LinkState { status: 'up' | 'down'; transitMs: number; downSinceMs: number | null }

export type ObservationTopic = 'schedule' | 'rest' | 'workload' | 'wellbeing' | 'other';
export interface UserText { text: string; lang: Locale }     // lang = UI language when typed
export interface Observation {
  id: string; missionId: MissionId; crewId: string; createdAtMs: number;
  topics: ObservationTopic[];
  privateNote: UserText | null;                    // never leaves Onboard
  relatedChangeId: string | null;
  sharedSummaryId: string | null;                  // null = not shared
}
export interface SharedSummary {
  id: string; missionId: MissionId; crewId: string; createdAtMs: number;
  topics: ObservationTopic[];
  relatedChangeId: string | null;
  comment: UserText | null;                        // typed in the share step only
  audience: 'medical_professional';
}

export interface RuleTrace { ruleId: 'agenda.rest_window_delta'; fromVersion: number; toVersion: number; taskId: string; advanceMinutes: number }
export interface Notice {                          // Onboard-side, computed on delivery
  id: string; missionId: MissionId; crewId: string; createdAtMs: number; seen: boolean;
  kind: 'plan_change'; changeId: string; taskId: string;
  moves: BlockMove[];                              // blocks of this crew member that moved, task first
  rest: RestWindowChange | null;                   // null if no sleep block precedes the task
  trace: RuleTrace;
}

export type IntentId = 'schedule.what_changed' | 'schedule.show_change' | 'rest.how_much' | 'rest.effect_on_me'
  | 'why.it_matters' | 'observation.start' | 'privacy.who_sees' | 'link.status' | 'help' | 'unknown';
export type HighlightTarget = { kind: 'change'; changeId: string } | { kind: 'block'; blockId: string };
export type UiAction =
  | { type: 'navigate'; route: Route }
  | { type: 'select_range'; range: Interval }
  | { type: 'highlight'; target: HighlightTarget }
  | { type: 'clear_highlight' }
  | { type: 'open_source'; sourceId: string }
  | { type: 'open_observation_form'; prefill: { relatedChangeId: string | null; topics: ObservationTopic[] } };
export interface CompanionTurn {
  id: string; atMs: number; speaker: 'user' | 'companion';
  input?: { mode: 'text' | 'chip' | 'simulated_voice'; text: UserText | null; intent: IntentId };
  reply?: {
    templateId: string;                            // key in the i18n 'companion' namespace
    params: Record<string, string | number>;       // raw values and IDs only, never formatted text
    status: 'ok' | 'no_evidence' | 'not_understood' | 'unavailable';
    sourceIds: string[]; actions: UiAction[]; executed: boolean;
  };
}

export interface LogEntry {
  id: string; missionId: MissionId; atMs: number;
  kind: 'change_sent' | 'plan_delivered' | 'link_down' | 'link_up' | 'summary_queued' | 'summary_received'
      | 'notice_created' | 'observation_saved';
  visibleTo: Viewer[];
  refs: { changeId?: string; messageId?: string; summaryId?: string; observationId?: string };
}

export interface MissionState {
  id: MissionId; seq: number;
  clockStart: IsoUtc; flightDayOne: IsoUtc;
  crew: CrewMember[];
  onboardUserId: string | null;
  link: LinkState;
  ground: { plan: PlanVersion; changes: ScheduleChange[]; inbox: { messageId: string; summary: SharedSummary; receivedAtMs: number }[] };
  onboard: { plan: PlanVersion; notices: Notice[]; observations: Observation[]; conversation: CompanionTurn[] };
  messages: LinkMessage[];
  log: LogEntry[];
}

export interface AppState {
  schemaVersion: 1;
  locale: Locale;
  groundRole: GroundRole;
  sessionStartMs: number;
  missions: Record<MissionId, MissionState>;
  companion: { name: string; color: 'teal' | 'blue' | 'violet' | 'amber' | 'rose' | 'green' }; // M3 customization
  ui: {
    agendaRange: Interval | null;                  // null = default range (03 §3)
    highlight: HighlightTarget | null;
    companionOpen: boolean;
    openSourceId: string | null;
    observationPrefill: { relatedChangeId: string | null; topics: ObservationTopic[] } | null;
    lastRoute: { onboard: Route; ground: Route };
  };
}
```

## 6. Event engine (the "coordinator")

`reduce(state: AppState, action: Action): AppState` is pure and deterministic. It is the only place where rules run. There is no generative AI. Every derived item (notice, rest change) carries its inputs or a `RuleTrace`, so the UI can answer "Why am I seeing this?".

### 6.1 Actions and the state they change

| Action | Precondition (else: return same state) | State changes |
|---|---|---|
| `locale/set {locale}` | — | `state.locale`. Nothing else. |
| `ground/role_set {role}` | — | `state.groundRole`. |
| `plan/change_sent {missionId, taskId, advanceMinutes, nowMs}` | `advanceTask(ground.plan, …)` returns ok (§6.3) | `ground.plan` ← new version (v+1, `changeId` set). `ground.changes` += change. `messages` += `PlanUpdateMessage` with the next `seq` of the mission: `in_transit` if the link is up, else `queued`. Delivery order and timing follow §7.1. `log` += `change_sent` (visible to both Ground roles). |
| `link/status_set {missionId, status, nowMs}` | status differs | **down:** `link.downSinceMs = nowMs`; every `in_transit` message of this mission → `queued`, keeping its `seq`; log `link_down` (all viewers). **up:** `downSinceMs = null`; `queued` messages → `in_transit`, with order and timing per §7.1; log `link_up` (all viewers). Other missions are not touched. |
| `clock/tick {nowMs}` | some message is deliverable under §7.1 | Deliverable messages → `delivered` (`deliveredAtMs = nowMs`) in increasing `seq` per mission, each with the delivery effects of §6.2. One tick may deliver several consecutive messages of the same mission. |
| `notice/seen {missionId, noticeId}` | the notice exists in the mission | `seen = true`. Onboard only; never transmitted. |
| `companion/asked {missionId, input, nowMs}` | `missionId = 'iss'` | `conversation` += user turn, then += companion turn from `respond(state, missionId, input.intent)` (§8.3). |
| `companion/actions_executed {missionId, turnId}` | the turn exists | `reply.executed = true`. |
| `observation/saved {missionId, crewId, topics, privateNote, relatedChangeId, share, nowMs}` | the crew member belongs to the mission; `topics` is not empty | `onboard.observations` += observation; log `observation_saved` (astronaut only). If `share` ≠ null: create a `SharedSummary` (topics, relatedChangeId, `share.comment`; **never** `privateNote`), set `sharedSummaryId`, add a `CrewSummaryMessage` with the next `seq` (`in_transit` or `queued` per link), log `summary_queued` (astronaut only). |
| `ui/range_set`, `ui/highlight_set`, `ui/companion_toggle`, `ui/source_open`, `ui/observation_prefill`, `ui/last_route` | — | Fields of `state.ui`. |
| `companion/customized {name, color}` (M3) | name 1–24 characters | `state.companion`. |
| `scenario/reset {nowMs}` | — | `createInitialState(nowMs, state.locale)`. |

### 6.2 Delivery effects

- **`plan_update` delivered:**
  1. If `message.plan.version > onboard.plan.version`, compute `diffForCrew(onboard.plan, message.plan, crewId)` for the Onboard user (§6.3) and set `onboard.plan ← message.plan`.
  2. If the Onboard user is in the task crew, add a `Notice` with `moves`, `rest` and `trace`, and log `notice_created` (astronaut only).
  3. Log `plan_delivered`, visible to all viewers.
  4. Ground shows the message as delivered from `deliveredAtMs`. This is a simplification: the return-path latency of the confirmation is not modelled, and the link tooltip says so.
- **`crew_summary` delivered:** `ground.inbox` += `{ messageId, summary, receivedAtMs }`; log `summary_received`, visible to all viewers (rendered per role, §9).
- §7.1 guarantees FIFO per mission, so Onboard receives every plan version in order and each one creates its own notice. The rule "ignore a version that is not newer" is only a defensive guard; it must never fire in the acceptance scripts or in U-LINK-03.

### 6.3 Agenda rule: advancing a task (CORE-AGENDA)

`advanceTask(plan, taskId, minutes)` returns `{ ok: true, plan, perCrew }` or `{ ok: false, reason: 'not_movable' | 'invalid_amount' | 'conflict' | 'rest_window_eliminated', blockIds }`. Intervals are half-open `[start, end)`: blocks that only touch do not overlap.

1. `minutes ∈ {30, 60, 90, 120}`; the block exists, is `movable` and belongs to the plan's mission.
2. New task interval `[start − m, end − m]`.
3. For each crew member *c* of the task:
   - Let `P` = *c*'s latest `post_sleep` ending at or before the original task start.
   - Let `S` = *c*'s latest `sleep` ending at or before `P.start` (or the original task start if there is no `P`).
   - Let `O` = *c*'s other blocks overlapping the new task interval.
   - If `O` is empty, nothing else moves for *c*.
   - If `O ⊄ {P, S}`, fail with `conflict` and return the IDs of the blocks in `O` that are neither `P` nor `S`.
   - Otherwise:
     - Move `P` so that it ends at the new task start, keeping its duration.
     - If the moved `P` overlaps any block of *c* other than `S`, fail with `conflict`.
     - Set `S.end = min(S.end, new wake time)`, where the new wake time is the new start of `P`, or the new task start if there is no `P`.
     - If `S.end ≤ S.start`, fail with `rest_window_eliminated`.
4. The start of `S` and all other blocks never move.
5. Planned rest window of *c* = `S` (duration = end − start). `rest.deltaMinutes = after − before`; `rest = null` if `S` does not exist.
6. `diffForCrew(prev, next, crewId)` returns the moved blocks of that crew member (task first) and the rest window change. Ground preview, `ScheduleChange.perCrew` and the Onboard `Notice` all use the same functions and must agree (unit test).

This is a **simulated planning rule** of the prototype, not an ISS operations rule. The UI labels it "Planning rule (simulated)".

### 6.4 Comparable sleep records

`findComparableSleepRecords(state, missionId, crewId)` returns usable, confirmed same-person sleep records for comparable prior contexts; neither a plan nor a workflow event is such a record. M1 has no source of sleep entries, so it returns `[]`. M1.1 also returns `[]`: a simulated episode-ended event with no usable measurement (§12.3) is not a comparable sleep record.

When the result is `[]`, every answer about how a change may affect the person uses status `no_evidence` (template `noComparableRecords`): no estimate, no percentage, no "you may feel…".

FUTURE: verified automatically received, same-person sleep records may support descriptive comparisons with explicit provenance. Manual notes remain voluntary context, not required measurement entry. No inference or threshold is added by M1.1.

## 7. Simulated link (CORE-LINK)

- Each mission has its own link:
  - `status`: `up` or `down`.
  - `transitMs`: simulated demo pacing from the scenario files (ISS 4000 ms, cislunar 6000 ms). It is not a physical latency, and the UI says so.
  - `downSinceMs`.
- Message lifecycle: `queued → in_transit → delivered`. Setting the link down returns `in_transit` messages to `queued`.
- Onboard knows only about delivered uplink messages and its own outgoing summaries. It never shows Ground drafts or queued uplink messages, and it says that updates "may be waiting" while the link is down.
- Ground sees both directions for the selected mission. A downlink message shows only status metadata until it is delivered; after delivery its content is filtered by role (§9.3–§9.4).

### 7.1 Delivery order: stable FIFO per mission (MUST)

Each mission has one link queue for all of its messages, uplink and downlink together. The queue order is `seq`, assigned once at creation and never changed. Fable chooses the mechanism, as long as these invariants hold:

| ID | Invariant |
|---|---|
| L1 — Order | Within a mission, messages are delivered in strictly increasing `seq`. A message is never delivered while an earlier message of the same mission is undelivered. This holds for messages created while the queue is draining, after any number of link-down/link-up cycles, and across both directions. |
| L2 — Pacing | A message is delivered no sooner than `transitMs` after it last entered `in_transit`, which happens when it is created with the link up or when the link comes back. It may be delivered later than that if it is waiting for its predecessor. |
| L3 — Link down | Nothing is delivered while the link is down. In-transit messages return to `queued` with their `seq` unchanged and re-enter transit when the link is up again (L2 applies again). |
| L4 — Independence | Each mission has its own queue, link state and pacing. Nothing in one mission delays, reorders or delivers messages of another. |
| L5 — Plan versions | Consequence of L1: Onboard receives `plan_update` messages in increasing version order, and each delivery creates its own notice when it affects the Onboard user (§6.2). |

Non-normative example of a mechanism that satisfies L1–L4: on each tick, deliver the oldest undelivered message of each mission while it is `in_transit` and its own transit time has elapsed, then repeat for the next one. A newer message whose transit time has already elapsed is delivered right after its predecessor, never before it.

The scenario values `transitMs` = 4000 ms (ISS) and 6000 ms (cislunar) remain the simulated pacing.

## 8. Companion contract (CORE-COMPANION)

### 8.1 Inputs

- **Chips:** guided intents, always shown under the input.
- **Free text:** `matchIntent(text): IntentId` in `domain/companion/intents.ts`:
  - Normalize the text: lowercase, NFD with diacritics removed, punctuation removed, spaces collapsed.
  - Score each intent against its English **and** Spanish phrase lists. Score = sum of the word counts of matched phrases.
  - The highest score wins. Ties are resolved by the priority order of the table below. A score of 0 gives `unknown`.
  - Replies use the current UI language, whatever the input language.
- **Simulated voice:** see §8.5.

### 8.2 M1 intents (priority order)

| Intent | Example EN / ES | Built from | Status | Actions |
|---|---|---|---|---|
| `schedule.show_change` | "Show me" / "Mostrame" | latest Onboard notice | ok, or `changeNone` | navigate `#/onboard/agenda`; select_range from 1 h before the earliest start to 1 h after the latest end among the before and after intervals of the moved blocks and the rest window; highlight `{change}` |
| `rest.effect_on_me` | "How will this affect me?" / "¿Cómo me va a afectar?" | `findComparableSleepRecords` | `no_evidence` | none; offers the chip "Log an observation" |
| `rest.how_much` | "How much rest do I lose?" / "¿Cuánto descanso pierdo?" | `notice.rest` | ok (`restDelta` or `restUnchanged`), or `changeNone` | highlight `{block: rest.sleepBlockId}` |
| `why.it_matters` | "Why does this matter?" / "¿Por qué importa?" | sources `nasa-hrp-risk-sleep`, `nasa-hrp-risk-ops-support` (04 §3) | ok | open_source `nasa-hrp-risk-sleep` |
| `schedule.what_changed` | "What changed?" / "¿Qué cambió?" | latest Onboard notice + link state | ok (`changeSummary`), or `changeNone` / `changeNoneLinkDown` | none |
| `observation.start` | "I want to log something" / "Quiero registrar algo" | latest notice | ok | open_observation_form (prefill: latest change, topics `['schedule']`) |
| `privacy.who_sees` | "Who can see my notes?" / "¿Quién ve mis notas?" | visibility matrix §9.3 | ok | none |
| `link.status` | "Is there a link?" / "¿Hay enlace?" | `link` | ok (`linkUp` / `linkDown`) | none |
| `help` | "Help" / "Ayuda" | — | ok | none |
| `unknown` | — | — | `not_understood` | none (chips shown) |

Initial phrase lists, normalized. Extending them is allowed, provided the samples in 05 §5 keep passing.

- show_change — EN: show me, show the change, show, open my agenda, open agenda · ES: mostrame, muestrame, mostrar, abri la agenda, abrir agenda, ver el cambio
- effect_on_me — EN: affect me, how will this affect, will i sleep, how did i sleep, impact on me · ES: me va a afectar, como me afecta, voy a dormir, como dormi, me afecta
- how_much — EN: how much rest, how much sleep, rest window, lose · ES: cuanto descanso, cuanto sueno, ventana de descanso, pierdo
- why — EN: why does this matter, why does it matter, why, matter · ES: por que importa, por que, importa
- what_changed — EN: what changed, whats new, schedule change, changed · ES: que cambio, que hay de nuevo, cambio de agenda, novedades, cambio
- observation — EN: log, note, record, observation, how i feel · ES: registrar, anotar, observacion, nota, como me siento
- privacy — EN: who can see, who sees, privacy, private · ES: quien ve, quien puede ver, privacidad, privado
- link — EN: link, connection, signal, contact with ground · ES: enlace, conexion, senal, contacto con tierra
- help — EN: help, what can you do, options · ES: ayuda, que podes hacer, opciones

**Proactive notice:** when a delivered `plan_update` creates a notice, the companion panel and Onboard › Today show a notice card with the chips What changed? · Show me · How much rest do I lose? · Log an observation. **A proactive notice never navigates, highlights or opens anything by itself.**

### 8.3 Building replies

- `respond(state, missionId, intent)` returns `reply` with `templateId`, `params`, `status`, `sourceIds` and `actions`.
- `params` contain only raw values and references: numbers, ISO times, notice IDs, change IDs, `linkDownSinceMs`.
- Text is rendered at display time in the current locale. **Past companion turns therefore re-render when the language changes.** User text is shown verbatim with its `lang`.
- A template may only state facts available in state or in the source registry. If a needed fact is missing, use `no_evidence` or `unavailable` instead.
- `changeSummary` takes `{ noticeId, linkDownSinceMs }`. When the link is down (`linkDownSinceMs > 0`), it appends that newer updates may be waiting.

### 8.4 Actions the companion may execute

- `navigate`, `select_range`, `highlight`, `clear_highlight`, `open_source`, `open_observation_form` (`UiAction`, §5).
- They run only on an explicit user request: a turn or a character/card action button. The action executor runs them once, in order, then records execution; reloading or translating does not re-run them. In M1.1 actions carry owner crew ID and event/change reference (§12.5).
- After running them:
  - the panel lists them under the reply ("I opened your agenda and highlighted the change");
  - it announces them through the polite live region;
  - focus moves to the heading of the opened view.
- The companion **may not**: send anything to Ground, save or share observations, edit the agenda, change the link, role, language or mission, or dismiss notices. These require the user's own click.

### 8.5 Simulated voice

- The microphone button opens a sheet titled "Simulated voice query — no audio is recorded".
- The sheet shows up to 4 suggested phrases in the current language (`suggestions.ts`):
  - With an unseen or latest notice: the four notice chips.
  - Otherwise: link status, privacy, help.
- Choosing a phrase adds a user turn with `mode: 'simulated_voice'`, shown with the tag "Simulated voice", and is processed like text.
- No `getUserMedia`, no speech-recognition API, no microphone permission.
- M4 SHOULD: spoken replies through `speechSynthesis`, only if a voice for the current language exists; off by default.

## 9. Observations, sharing and role filters (CORE-OBS, CORE-ROLES)

### 9.1 Observation form (Onboard)

- Topics: multi-select, at least one of schedule, rest, workload, wellbeing, other.
- Private note: optional free text, labelled "Private: stays on board and is never sent".
- Related change: preselected when opened from a notice or the companion; can be cleared.
- **Share** toggle, OFF by default. When ON, a preview shows exactly what will be sent: topics, the related change reference and an optional separate "Comment to share" field. The private note is never copied into it.
- Saving dispatches `observation/saved`. The list shows each observation with its sharing state: Not shared · Waiting for link · Sending · Delivered to Ground.

### 9.2 What Ground receives

Only `SharedSummary` content, through `CrewSummaryMessage`, and only **once that message is `delivered`** (§9.4). It never receives an `Observation`, a private note, a `CompanionTurn`, a notice, or the fact that a notice was seen.

### 9.3 Visibility matrix (enforced in selectors)

| Data | Astronaut (own) | Mission operator | Medical professional |
|---|---|---|---|
| Agenda, changes, rest window changes | own mission (delivered versions) | edit and view, both missions | view, both missions |
| Link status, message status | own mission | ✔ | ✔ |
| Companion conversation, private notes, notices | ✔ | ✖ | ✖ |
| Downlink message **before** `delivered` (queued or in transit) | own copy with its status | status metadata only (§9.4) | status metadata only (§9.4) |
| Shared summary **after** `delivered` | sent copy | ✖ restricted placeholder: crew member, time received | ✔ topics, related change, comment |
| Mission log | astronaut-visible entries | entries with `mission_operator` | entries with `medical_professional` |
| Evidence and concept modules | ✔ | ✔ | ✔ |

- Ground components get data only through selectors that take `(state, missionId, groundRole)`. Ground selector outputs never contain `privateNote`, `Observation`, `CompanionTurn` or `Notice` (unit tests U-ROLE-01, U-ROLE-03).
- The mission operator sees each received summary as "Crew summary received — content visible to the medical role only", with crew member and time.
- The role switch is labelled as a demonstration filter, not access control.

### 9.4 Downlink content before delivery (MUST)

A queued or in-transit `CrewSummaryMessage` still exists on board and has not reached Ground. Until its status is `delivered`:

- **No Ground selector returns any field of its `SharedSummary`**, for either role. This covers `topics`, `comment`, `relatedChangeId`, `crewId` and any other content of the summary.
- The rule covers every Ground surface: Link, Crew, Log, the "Why?" disclosures, popovers, and any future view or export.
- Ground may show only these **status metadata** for a pending downlink message:
  - its `id`;
  - its direction (from crew);
  - its status (queued or in transit);
  - the time it entered that status.
- The row reads "Message from crew — content available on arrival" (03 §7.9).
- Implementation contract: Ground views never receive a `CrewSummaryMessage` object. They receive projected rows built by one function, `toGroundDownlinkRow(message, role)`. Summary content reaches Ground views only through `ground.inbox`, which is filled on delivery (§6.2).
- After delivery, the medical professional sees the authorized content (topics rendered in the current UI language, related change, comment verbatim with its language tag). The mission operator sees only the restricted placeholder with crew member and time received.
- Switching language never reveals content. A pending row stays content-free in both languages, and a delivered summary re-renders its topics in the new language.

## 10. Missing data, stale data and link-down behaviour (MUST)

| Situation | Onboard | Ground |
|---|---|---|
| Link down | Banner: "No link with Ground since {time}…" (03 §7.9). Companion: no new updates since {time}; anything sent may be waiting. Outgoing summaries: "Waiting for link". | Link status "No link". New updates "Queued — waiting for link". Crew card shows the time the link was lost. Pending messages from crew show status only (§9.4). |
| No sleep records | Agenda shows the "No sleep records" empty state; the companion uses `no_evidence`. | — |
| No schedule change received yet | `changeNone` reply; Today shows no notice. | — |
| Evidence source pending or data not loaded | "Pending verification" or "No data loaded" state, listing what is missing, with the text-only alternative content (04 §5–§6) | same |
| Missing value in a dataset (`NA`) | Gap in the chart and "No value in source" in the table. Never zero, never interpolated, never carried forward. | same |
| Agenda conflict | — | The preview lists the conflicting blocks; Send is disabled. |
| Unknown route | Not-found view with a link home | same |
| Storage unavailable | The app runs in memory; nothing is shown | same |
| Render error | Error boundary with a translated message and "Restart scenario" | same |

## 11. Scenario files

- `src/data/scenario/iss.json` and `cislunar.json` contain the crew, the initial plan (version 1, identical on Ground and Onboard at start), the link configuration, `clockStart`, `flightDayOne` and `onboardUserId`. Content: 04 §8.
- There is no runtime schema validator. Unit tests validate the files:
  - prefixes and unique IDs;
  - bilingual fields not empty;
  - `end > start`;
  - per-crew sleep / pre_sleep / post_sleep blocks;
  - no overlapping blocks for the same crew member;
  - `movable` only on allowed kinds.

## 12. M1.1 — Profiles and automatic Onboard day (normative extension)

### 12.1 Profile partition and visibility

- Keep one mission-level Ground plan, delivered Onboard plan, link queue (L1–L5), clock and event journal. Replace single-user `onboard.notices/observations/conversation` with `onboard.profiles[crewId]`. Each profile owns its companion identity/state, notices, received results, session/sample histories, chat turns, observation list, unsent drafts (private and sharing drafts), last route, range, highlight and open panels. Its agenda is the delivered plan filtered by that crew ID, not an independent mutable copy.
- `activeCrewId` is presentation state. `profile/select {missionId, crewId}` is accepted only in Demo mode and only for an existing ISS crew member. It never changes clock, plans, processed event IDs, link messages or another profile. Disable View as outside Demo mode; changing Ground role does not select an Onboard person. Exiting Demo mode keeps the selected identity, hides jury controls and does not erase the day. The demo filter is explicitly not authentication.
- Switch atomically: save the old owner's drafts, close chat/popovers/sharing preview, cancel old-owner pending UI actions/announcements and render the new owner's state. Restore their route/range except Commander-only Crew, which is inaccessible to other profiles (direct hashes included). Show no old message, result, note, autocomplete or draft even for one frame. Return to an old profile restores its own drafts, unread markers and history; chat stays closed until requested. Written chat also starts closed on initial load/reload of M1.1, regardless of the saved open-panel flag; conversations and unsent chat text remain owner-scoped and preserved. Explicit close never clears them. Same-profile navigation may retain an explicitly opened chat, but never opens a closed one.
- Every private read/write and asynchronous UI action requires `(missionId, crewId)` and validates membership/ownership. Labels are not permissions. A stale action for a previously active person is discarded, never retargeted. Shared logs contain references only; selectors project according to identity and recipient, never serialize a whole profile. Existing Ground selectors must not gain profile histories or results.
- Plan delivery computes a notice for **each affected ISS profile**, including inactive ones; render only that profile's notice. An unaffected person gets none. No global initial companion replaces profile identities. Cislunar still has no Onboard profiles/UI.
- Persist as schema version 2, key `mate:v2:state`, with all profile partitions and event cursor. Do not cast a v1 snapshot to v2: start a fresh scenario with a bilingual explanation when upgrading, preserving locale if valid. Ordinary reload, language switch and profile switch preserve the v2 journey. No cross-tab sync is added.

### 12.2 Common clock and deterministic event ingestion

- The M1.1 day starts on FD30 with the separate fixture and preloaded history in 04 §11; M1 regression retains its published FD41 fixture.
- M1.1 mission time = `clockStart + elapsedWallMs + demoOffsetMs`. It is common to all profiles of a mission; the offset starts at zero. The ticker still advances at 1×. Jury controls exist only in Demo mode: seek within 05:55–12:00 UTC, previous/next event, ±15 minutes, play/pause, mode selection and Restart scenario (IMP05, §12.9). No wake/start-training/sample-entry button is added to the astronaut flow.
- Next event advances the mission offset to the earliest unprocessed scripted event, processes **all** events due at or before that instant in `(occurredAt, scenarioSequence)` order, then resumes 1× time. If none remain, show End of scripted day; do not wrap or synthesize events. Processing occurs on ticks too, including for inactive profiles; due time derives from the event, not from when its card is viewed. Hidden-tab catch-up uses the same ordering.
- Next event changes mission time only. Link transit remains based on monotonic elapsed wall time passed to the M1 link engine; it is never fast-forwarded by a mission-time skip. Display each time with its basis (mission UTC for events; demo transit status for messages). Profile/language/side changes never alter either clock.
- Restart scenario is a confirmed, deliberate jury action: reset this demo session's missions, profiles, drafts, events, queues, receipts and clocks to the scenario start, keeping language and Demo mode. This is the only reset control; do not silently reset when entering View as. The regression M1 fixture and day fixture are selected in Demo setup; changing fixtures requires the same reset confirmation. Leaving Demo mode does not change fixture.
- Event envelope: `id`, `missionId`, stable `scenarioSequence`, `kind`, `sourceId`, `occurredAt` (mission UTC), `receivedAt` (mission UTC), `origin: simulated`, `association` (confirmed crew ID / unconfirmed / environment), correlation ID (`episodeId`, `sessionId`, `sampleId`, or `capsuleId` only for the optional extension in §12.8), and typed payload. Only events whose time is due are ingested. Keep processed IDs (including preloaded history); duplicate ID is a no-op, including after reload. History is never replayed as unread news. Reject wrong-mission IDs, unknown source, malformed or backwards state transitions; retain a content-free rejected/unassigned status in Demo diagnostics. Future adapters must preserve original acquisition and receipt times separately.
- Unconfirmed association never guesses from the current profile, schedule, name similarity, camera or last user. Hold it outside personal histories with no private payload in shared logs; Demo diagnostics shows only event ID, source and unresolved association. Confirmed events for inactive profiles still update their own history. Correlation IDs cannot move between people. `plan_update` uses the existing link path; equipment events are local Onboard and still arrive with the Ground link down.

### 12.3 Event contracts and state transitions

| Kind / source class | Attribution and update | Visible effect and limits |
|---|---|---|
| `sleep.episode_ended` / simulated body-sensor adapter | Confirmed crew + episode; add received episode status and optional usable measurement reference | Greeting and Today summary/observations for owner. Planned rest window stays separate. Without a usable measurement show No record; completion time does not become a measured sleep duration or quality score. |
| `exercise.started`, `exercise.finished` / simulated exercise equipment | Confirmed crew + session; planned → in progress → completed (actual start/finish are source event times) | Owner Today timeline/session summary. Only source-provided usable metrics are displayed with units/provenance; otherwise No metrics available. A late start may update a planned card, not rewrite the agenda. A finish without its start is incomplete history, not inferred attendance/duration; retain missing-start status. |
| `lab.sample_taken`, `lab.analysis_started`, `lab.result_available` / simulated collection device/analyzer | Confirmed crew + sample, sample type blood or urine; planned collection → sample taken → analyzing → result available | Owner sample timeline and result summary. Result availability is a workflow state independent of usable values and review state. Missing predecessors are marked incomplete, never manufactured; received result can still be shown with that caveat. |
| `environment.updated` / simulated spacecraft sensor | Environment association, location + interval + measurement reference | Shared environmental context only; no attribution as personal dose, no crew health flag. Optional for M1.1; no unverified numeric radiation fixture is required. |

Numeric clinical payloads are never synthesized. IMP05 permits explicitly synthetic mechanical equipment power (W) and cadence (rpm), under 04 §11.6. IMP06 extends only Lucía’s synthetic Exercise fixture with pulse (bpm / lpm) under 04 §11.7, always labelled Simulated telemetry / Telemetría simulada, never a real measurement, clinical interpretation or Ground feed. No other physiological values are authorized. Measurement references must pass 04 §11 before display; a value's absence is explicit. Training metrics are optional source payloads, never required manual entries. A sample may also carry a separately sourced `handlingStatus` (stored awaiting return/analysis, or not reported); storage is not a completed assay. A personal result object separates `workflowStatus`, `dataAvailability` (usable / no usable data), and `sourceReview` (flagged / not flagged / not reported), with source reference and reason as supplied. Missing review status is not “normal”. Only repeat a flag explicitly received from the source, labelled as source status (and simulated when applicable); no derived flag, diagnosis, all-clear, readiness verdict, stress estimate or camera-based emotional assessment. The default day has no usable numeric results and review not reported.

Descriptive comparison is allowed only if two verified, confirmed same-person records have the same analyte/metric, compatible units, protocol and phase, valid time order, usable values and recorded transformations. State which records and difference are shown; do not infer cause or health significance. Otherwise say No comparable record and why. M1.1 ships no invented comparable history; real other-crew evidence never passes this personal-record gate. Source-flag handling is specified for an eventual input; absent specialist advice does not authorize thresholds or advice.

### 12.4 Commander Crew and voluntary operational requests

Route `#/onboard/crew` is available only to the ISS commander (`iss:crew-ti`) in addition to their normal Today, agenda, results and companion. Crew selectors take `(state, missionId, viewerCrewId)` and return only: delivered operational agenda lanes, activity overlaps (half-open intervals and shared crew IDs), planned rest windows, and operational requests explicitly addressed to that commander. Display scheduling overlaps even when intentional, with no clinical severity or inference. Only Ground's mission operator still edits/sends plans; commander Crew is read-only planning context.

A request has owner, named commander recipient in the same mission, type support/replanning, selected task/interval, and a separate operational message. Draft → preview → explicitly shared → received; local Onboard delivery is immediate and independent of the Ground link. Before Send, preview the exact immutable message, sender, recipient name/role, task/interval and visibility, in the current locale. No note, chat, result, actual sleep, individual stress, sample status or clinical payload is auto-attached. Keep user-entered text verbatim; instruct the sender to put only what they choose to share in this separate message. An unsent draft is owner-only. Snapshot the authorized text/recipients at Send: later language/profile changes do not modify it. Repeat clicks do not duplicate delivery.

Only sender and addressed commander see the shared request; ordinary crew and both Ground roles receive none (no log copy). An explicit message's content is voluntary, not a new default right to inspect the sender's profile. The commander may read but cannot expand to underlying private evidence. Retraction, onward forwarding and commander's reply are FUTURE; no promise of recall is made in the preview. Replanning requests do not edit plans automatically. This channel never calls `observation/saved` with sharing or creates a `CrewSummaryMessage`. Medical sharing remains exactly §9: separate consent, FIFO Ground transit, no content before delivery, medical content after delivery and restricted operator marker. No automatic medical transmission follows an equipment event or a source review flag.

### 12.5 Visual companion actions

Each profile has `characterId`, name, visual state and owner-scoped unread event references (03 §8). Add `summary.show` (View my summary / Ver mi resumen): choose an explicit event card or the latest received personal day event, navigate to Today, select its day/section and highlight its summary, announce and focus the heading. If none exists, show the no-summary state, never borrow another profile's. `schedule.show_change` retains M1 behavior and accepts its existing EN/ES phrases, including Show me what changed / Mostrame qué cambió.

Character and card buttons use the same scoped, once-only UI-action executor as chat. Neither requires opening chat or submitting text. Ordinary new events update cards/unread state and a polite announcement without navigation, focus stealing, sharing, or opening chat. Visual interaction acknowledges only the event explicitly viewed, not every unread event; source flags remain source flags after reading. The character floats above Onboard views, including Today and the personal modules. Lower-right is its initial position, not a fixed constraint (IMP02 amendment, replacing SPEC03). The per-profile position and movement contract is §12.5.1; essential controls remain reachable. Activating its keyboard/touch button opens written chat: a lateral panel that reallocates desktop content space, or an adapted bottom panel on mobile (03 §8.1–8.4). Closing restores focus to that character button without deleting conversation. Those actions live in an **on-demand info card** (PET01 authorized amendment): a discreet info button (ⓘ), a sibling of the character and never nested in it, opens and closes the card without opening chat, and chat and card open and close independently. The card starts closed, and a new event, navigation or profile switch never opens it. It holds the status, the brief message, View my summary (when an event exists), the three module accesses (also when there is no news) and the keyboard hint. Activating a card action closes the card; activating the character itself never opens an action menu. Escape closes the card and returns focus to the info button; it yields to movement mode and to focus inside the chat, so one Escape never closes two things. The character is present in idle, news and interaction states even with reduced motion; a new item changes pose/expression and marks the info button with a cue that is not color alone plus an accessible name that includes the news, while its brief text is in the card and in a polite announcement; it never opens chat or the card, or navigates. Its state signals UI novelty, never a diagnosis or emotion of the astronaut.

### 12.5.1 Floating position per profile (IMP02 authorized amendment)

Each `(missionId, crewId)` owns a nullable normalized preferred position `{x, y}` in `[0, 1]²`; null means initial lower-right. Persist it with that profile's conversation/draft/unread state. Compute a separate effective viewport position: clamp to the usable visual viewport/safe margin and avoid protected header, jury controls, chat and essential actions. Resizing, rotation, keyboard appearance, language, navigation and scroll never overwrite the saved preference. Restoring the previous width restores that preference when feasible. Scroll and Today/Sleep navigation keep the character at the same viewport coordinates; content controls have priority in paint/hit testing if they scroll underneath. A fresh deliberate move or Reset position changes only the active profile's preference; it does not reset the day, mark data received or affect another profile. A demo-session restart remains the separate confirmed operation in §12.2.

Use Pointer Events/capture for mouse and touch. Under an 8 CSS-pixel movement threshold, release is a tap/click and opens chat; once the threshold is crossed, the entire gesture, including release/cancel and synthesized click, never opens chat. A valid drop is clamped/projected to the nearest available place outside essential controls; a cancelled drag restores the saved location. Never guess another owner from the current name: position/chat writes carry the owner ID and stale writes after a profile change are discarded.

The final approved IMP02 cut removes the visible Position button and its menu, with no replacement position control; the only floating control beside the character is the info button above, which never moves, resets or reveals the position. With keyboard focus on the character, M enters movement mode: arrows by 8 CSS px, Shift+arrow by 32, Enter confirms and Escape cancels. Home restores only that owner's initial lower-right preference, including from movement mode. Provide translated keyboard hints in the info card and an accessible description of the character; no permanent visible keyboard control. While movement mode is active the card shows its instructions even if it was closed, and returns to its previous state afterwards. Neither movement, confirmation/cancellation nor Home opens chat; Enter/Space outside movement mode still opens chat. Profile switch closes chat/movement controls and clears transient announcements; the mission clock, event cursor and all profile histories continue. Return restores only that profile's preferred position, chat and draft; chat starts closed. Reload retains positions and conversations, also with chat closed. The narrow IMP02 cut may migrate its existing single-profile snapshot into this partition without changing its clock/receipt/history; do not migrate or modify the published M1 snapshot.

The chat has an independent desktop side column/mobile bottom region, irrespective of character coordinates. If that region reduces usable space, project the effective character location temporarily, retaining its preference. New events change pose/expression/text at the current location, never move the character, open chat or navigate. Fit the info card and the movement instructions inside the visual viewport, choosing another side of the character near edges and avoiding essential controls; reduced motion retains all static cues. The IMP02 implementation slice exposes only the existing Today/Sleep routes, the three fictional profiles and their original characters; it adds no Exercise, Laboratory or Commander screen or clinical data. Acceptance: 05 §10.7.

### 12.6 Always-available personal modules (M1.1 MUST)

Onboard navigation always exposes Sleep / Sueño, Exercise / Ejercicio and Laboratory / Laboratorio at `#/onboard/personal/sleep`, `#/onboard/personal/exercise` and `#/onboard/personal/laboratory`. These are the active profile's personal details, separate from the scientific Evidence routes `#/onboard/modules/:moduleId`. Access requires neither an open chat, an unread notification nor a new event or clock advance; it is available outside Demo mode too.

Navigation, each corresponding Today card (including empty-state cards), and Mate's always-available module actions all execute the same `personal.open {module}` action: resolve the active `(missionId, crewId)`, open the canonical personal route and read the same owner-scoped detail/history selector. An explicit record action may additionally highlight that owner's record; it does not create a separate detail or change attribution. Mate offers the three module actions with chat closed even when no latest event exists. The generic `summary.show` behavior in §12.5 remains available; it is not the only entry to personal modules.

Available preloaded history is readable from the start of FD30 (04 §11.2), without replaying it or marking it as new. Planned rest is distinct from recorded sleep; stored samples are distinct from usable results. Missing records or metrics render the appropriate explicit empty/unavailable state, never a fabricated value or another person's record. Confirmed device events automatically update these same module selectors and Today cards, whether the detail is open or closed, with no mandatory manual entry. Opening a module never changes the mission offset, event cursor or link delivery state. Profile switching retains the ownership and privacy rules of §12.1. Acceptance: 05 §10.4.

### 12.7 Qualitative wellbeing check-in (M1.1 MUST offer; voluntary use)

Reuse `#/onboard/observations`, not a new wellness chat or score screen. Offer Optional check-in / Check-in opcional from Today and Observations, with a voluntary qualitative day comment or leisure preference. The form has a private text field and Save privately / Guardar en privado, Cancel / Cancelar and Skip / Omitir. It shows no rating scale, mandatory questionnaire or suggested diagnosis. Check-in mode is explicitly separate from the ordinary shareable observation form: a previously enabled sharing toggle/draft must not carry into it, and returning to the ordinary form never auto-fills a check-in into a summary. Reuse the owner-scoped draft and observation storage, marking `entryKind = wellbeing_checkin` in the M1.1 extension and `topics = ['wellbeing']`; save only non-empty submitted text as `privateNote`, with the original `UserText.lang`. Blank submission creates nothing.

This entry path always saves with `share = null`: no sharing toggle, share preview, automatic copy into a summary/request, derived event, stress/cause inference, dissemination or agenda change. It is private also in the observation list; it has no share action. The ordinary M1 observation/medical-summary path in §9 remains separate and unchanged. A check-in is voluntary user context, never a sensor report or a clinical measure. Source is Your entry, not Simulated device report. Reopening or translating leaves the original text verbatim; switching profiles restores only that owner's draft/entries. Events and both clocks continue whether the form is open, skipped, cancelled or saved. Skipping is not stored as noncompliance, poor mood or a negative wellness signal. Commander and Ground selectors never receive check-in text, drafts or their private log entry.

### 12.8 Optional fictional local family capsule (after the main journey)

This is a separately enabled optional M1.1 extension, disabled in the core acceptance fixture. It specifies a **local fictional text capsule**, not a media transport system. No upload, family account, camera/microphone recording, network transport, delivery acknowledgement to a real sender or external media is part of this delivery. Do not reuse the medical link queue or operational request channel.

When enabled, extend the day with a 12:05 UTC `family.capsule_available` event after the main blood-result journey (and the secondary urine event, if present). Envelope uses §12.2 plus an immutable local `capsuleId`, explicit recipient `iss:crew-lf`, fictional sender label and bilingual fixture text. `sourceId = demo-family`, `origin = simulated`; validate ID/mission/recipient before accepting. Store capsule and available/read state only under that recipient's profile. Duplicate events/reload do not duplicate capsules or repeat acknowledged news. Reset restores the optional fixture; no preloaded capsule notification occurs in the core fixture.

Arrival updates the recipient's available list and the character's brief Family capsule available / Cápsula familiar disponible notice with chat closed; it never opens chat, navigates, displays the message body or marks it read automatically. Inactive recipients receive their state silently. A separate Open capsule / Abrir cápsula action in that notice opens the owner's local capsule detail (an owner-scoped panel, no new public route required) only on their click; mark read on successful opening. Closing retains the capsule and returns focus to its opener; reopening is voluntary. Source disclosure says Fictional local capsule / Cápsula ficticia local. It makes no therapeutic-effect claim and is not generated from a mood score or private check-in.

Only the addressed profile can select/open the capsule, including attempts with another profile's capsule ID. Commander Crew and all Ground selectors/logs, notices and counters exclude its payload and existence. A Commander may see a capsule only as its own recipient, never through their team role; this fixture addresses only Lucía. Profile switching closes the detail and cancels old-owner actions/announcements. A different profile's capsule is unavailable without leaking sender, text or unread count. This remains demo identity filtering, not authentication or production privacy. Optional absence is not an error and does not block the core day. Acceptance: 05 §10.6, separately from the mandatory core.


### 12.9 IMP05 — Bounded mission clock, local projection and mechanical telemetry

Authorized scope: FD30 only, on 2027-03-10 from 05:55 through 12:00 UTC, inclusive. M1 Ground agenda, engine, link transit and storage are unchanged. The implementation deliberately retains the isolated `mate:fd30:imp02:v1` key with snapshot version 5; §12.1's full v2 integration remains later work. Old v1–v4 snapshots migrate their private profile data and clock; the visible domain is rebuilt from the immutable FD30 fixture, so stored future results cannot bypass the cursor.

`seek {now,target}` clamps to the window and rebases the 1× clock to a nonnegative mission offset. Pausing freezes mission time; seeking preserves running/paused mode. A pure `project(t)` reconstructs wake, exercise, laboratory, processed IDs and diagnostics from initial FD29 preload plus all events with occurrence **and receipt** at or before t in stable source order. Tick/next and projection must agree. Rewind is not reset: preserve active profile, locale, route, open chat, conversation/drafts, positions, read markers, announced IDs and guided-handled IDs. Selectors ignore highlights whose record is not yet visible. Replay must not duplicate histories, read notices or live-region announcements. Next event chooses the next due workflow event; telemetry samples do not flood that queue. Stop at noon, never wrap.

Exploration is the default and never navigates on seek/tick/next. Guided playback is opt-in, with play/pause at 1× and next-event available. Only a newly processed `exercise.started` from tick/next for the active owner may request Exercise navigation once per event ID. Seek, reload, switching profile/mode or replaying a previously handled start never triggers that navigation. If the chat input contains a draft and has focus, consume the attempt without navigation and leave the explicit link available. Never open or close chat for a clock action. Announcements are owner-scoped and grouped; inactive owners do not announce private events.

Plan reservations are independent of receipt states. Lucía reserves a fictional ergometer 10:30–11:30, Tomás a different fictional treadmill at the same time, Mei the ergometer 13:00–14:00 (future plan outside playback window). Half-open intervals and capacity one forbid double reservation of the same equipment; validate both crew and equipment conflicts. Generic fixture devices are not verified flight hardware. No reservation creates a start event. No telemetry is created for Tomás/Mei.

Only the owner's Exercise detail receives synthetic telemetry (04 §11.6). The chart and accessible table use the same receipt-filtered series, preserve null gaps and remain usable in EN/ES on mobile. No Ground selector, transmission or medical permission is extended.

### 12.10 OPS01 — FD30 operational perspectives and voluntary journal

Mount Ground FD30 at `#/demo/fd30/ground` in the **same `view: fd30` session/container** as Onboard. This extends the route page union only; `PreviewState`, its reducer/clock and M1 remain unchanged. Switching perspective preserves cursor, running/paused state, active Onboard identity, private drafts, character preference and table state. Ground card selection and Ground role selection do not select an Onboard profile. Ground does not render the personal companion/chat, diagnostics, private event labels/counters or announcements, and cannot mark personal events read/announced. Guided requests processed there are consumed without personal navigation or acknowledgement.

The separate version-1 `mate:fd30:ops01:v1` session journal stores only voluntary private check-in drafts/entries and operational request drafts/previews/sent snapshots. It receives the authoritative current owner/cursor for each mutation; it stores no clock, agenda, active profile, device events or measurements. Stale-owner writes are discarded. Private entries and sent requests after the cursor are hidden on rewind; drafts and immutable messages remain, without redelivery. An explicit FD30 restart clears both FD30 state and this journal. No M1 observation, inbox or queue is imported or modified.

`#/onboard/personal/crew` is this FD30 cut's commander-only entry (`iss:crew-ti`); direct access from another profile shows no crew/request payload. It exposes only operational plan lanes, equipment reservations and operational requests explicitly addressed to that commander under §12.4. Collection slots are generalized as planned personal activity on shared operational surfaces. There is no per-person actual sleep, exercise/lab workflow, pulse, check-in, draft or chat disclosure. The request UI at `#/onboard/personal/requests` uses a separate message, selected own plan block, exact-message/sender/recipient/interval preview and explicit send. Local simulated delivery is immediate; send is idempotent, with no Ground copy, automatic plan edit, forwarding or retraction. Voluntary wellbeing at `#/onboard/personal/wellbeing` implements §12.7's qualitative private path, with no sharing control or medical inference.

Both Ground roles receive an allowlisted projection of the same FD30 operational plan. Current activity/reservation are **planned**, never inferred attendance from private equipment/sample events. The only progress is elapsed time divided by planned block duration; no current block means no progress bar. Medical role selection is not consent: this cut has no authorized delivered FD30 medical summaries and explicitly shows that absence. Do not expose record existence, borrow M1 summaries or historical Evidence, or add a scientific role.
