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

### 3.2 Routes: hand-written hash routing

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
- The selected period, highlight and open source live in state (`state.ui`), not in the URL.
- The perspective switch goes to `state.ui.lastRoute.ground` or `.onboard`. Defaults are `#/ground/iss/agenda` and `#/onboard/today`, so switching sides keeps each side's context.

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
- Mission time = `mission.clockStart + (nowMs − state.sessionStartMs)`, displayed in UTC with a Flight Day label (`FD n`, where `mission.flightDayOne` is FD 1). Display-only clocks use a local `useNow(30_000)` hook, not state.

## 4. Mission isolation contract (MUST)

1. Mission IDs are `'iss' | 'cislunar'`. Entity IDs are prefixed `iss:` or `cis:` and generated deterministically from a per-mission counter (`mission.seq`) as `<prefix>:<kind>-<n>`. No random IDs.
2. All mission data lives under `state.missions[missionId]`. No collection holds entities from more than one mission.
3. Every action that touches mission data carries `missionId`. The reducer reads and writes only `state.missions[action.missionId]`. If a referenced entity ID has the wrong prefix or does not exist in that mission, the action is ignored (the same state is returned) and a warning is logged in development only.
4. Onboard is bound to `ONBOARD_MISSION_ID = 'iss'` and `missions.iss.onboardUserId`. No Onboard view or selector reads another mission.
5. Ground views read `missionId` from the route, and every Ground selector requires it.
6. The cislunar mission has `onboardUserId = null`: its Onboard state (plan copy) exists so deliveries can complete, but it has no UI and creates no notices.

## 5. Data model (TypeScript contract)

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

`findComparableSleepRecords(state, missionId, crewId)` returns the crew member's own self-reported sleep entries for nights after earlier plan changes that reduced their planned rest window. M1–M3 have no source of sleep entries, so it returns `[]`.

When the result is `[]`, every answer about how a change may affect the person uses status `no_evidence` (template `noComparableRecords`): no estimate, no percentage, no "you may feel…".

M4 SHOULD: a self-reported sleep diary feeds this function. Answers then list the entries without inference and without thresholds.

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
- They run only in reply to an explicit user turn. The companion panel runs a reply's actions once, in order, then dispatches `companion/actions_executed`; reloading does not re-run them.
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
