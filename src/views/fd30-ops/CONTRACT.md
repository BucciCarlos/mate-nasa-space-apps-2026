# OPS01 — FD30 operational and voluntary context

Integration boundary (before touching shared files): keep Ground FD30 in the existing `view: fd30` route family and mount it inside the existing `Fd30Preview` instance. Only the route's page/perspective changes. Do not lift/copy `PreviewState`, introduce a clock, consume M1 state, or change the FD30 reducer. The existing mission cursor, event projection, active identity, chat and character preferences remain authoritative.

The supplementary OPS01 journal stores only new voluntary drafts, private qualitative check-ins and explicitly sent operational requests. It stores no clock, active identity, telemetry, lab/sleep records or copies of the agenda. Its mutations receive the current FD30 owner and mission time; stale-owner mutations are discarded. Entries/messages after the selected cursor are hidden on rewind, while drafts remain. Explicit FD30 restart clears this journal too. Session-local storage has its own schema/key and no transmission backend.

Commander: `iss:crew-ti` only; read-only operational plan and equipment reservations plus exact messages explicitly sent to that recipient. Personal collection appointments are generalized as planned personal activity. No event-based personal attendance, actual sleep/exercise/lab state, telemetry, check-in, private draft or chat is included. Requests use a separate operational draft, exact recipient/message/interval preview and explicit send; no automatic attachment, plan edit, Ground copy or forwarding. Delivery is local, simulated and immediate. Repeated send of the same preview is a no-op.

Ground: whitelist projections of the existing FD30 operational plan, independent of Onboard selection. Cards describe **planned** current activity and reservation. The only progress bar is elapsed time divided by planned block duration, neutral in color, explicitly not confirmed work/effort. No current block means no bar, never a fabricated zero. Neither Ground role receives private equipment/sample events under the current contracts (02 §12.3–§12.4). Medical has no authorized FD30 summaries in this cut; render that absence, never borrow M1 inboxes or historical Evidence. Role selection is presentation, not medical consent. There is no scientific role.

Required integration tests: alternate Onboard ↔ Ground FD30 without remounting the shared session; assert the same mission cursor and active identity, including pause, rewind, reload and profile/position/draft retention. Ground navigation must not announce/mark personal events, render private companion actions, or trigger guided personal navigation. Privacy tests inject distinguishable private sentinels and verify both role projections and rendered markup.

The browser continuity regression is `perspective.browser.mjs` (EN/ES, 1440/390 px). It needs an already available Playwright module/browser and a running local Vite server, not a new app dependency:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs BROWSER_BIN=/absolute/path/to/chrome node src/views/fd30-ops/perspective.browser.mjs
```

`FD30_BASE_URL` optionally overrides `http://127.0.0.1:5173/`. The test uses fresh isolated browser contexts and synthetic/local entries only. Pure journal/projection/privacy/rendering regressions run under the existing `npm test`.

## GND02 correction / medical projection for the three operational crew

The corrected Ground overview restores the three clickable portrait cards from `e41c5e3`. Each card/image opens one local person detail in the existing route; returning preserves role and the shared mission cursor. Medicine shows the health dashboard before operational activity, reservations and agenda. Operations remains plan-only.

The user explicitly authorized `groundMedicalView` for all three operational crew: existing illustrative heart/SpO2 patterns (labelled as clock-generated, not received telemetry), confirmed exercise-session telemetry where present, FD24–FD30 sleep, received lab workflow without clinical values, and latest received exercise records. Explicit allowlists filter owner, occurrence, receipt and linked event gates. No impersonated Onboard viewer, active-identity change, new measurements, persisted medical store, hydration, clinical score, private notes or chat is included. GND03's Lucía chart and the 06:00 wake receipt gate are preserved; other profiles use only their own existing records, with missing FD30 nights explicit.

Orbit is a separate predefined-query panel. It still receives only projected operational crew, role, local person selection and mission cursor. It never receives any medical projection. Query answers cite plan blocks and do not confirm attendance or equipment use. The FD30 authorized-summary inbox remains empty; the medical dashboard is a new explicit projection, not an M1 summary or transmission channel. Reproduction, source inventory and validation commands: `GND02.md`.
