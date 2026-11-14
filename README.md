# M.A.T.E. — Medical & Astronaut Therapeutic Environment

**English** · [Español](#español)

> **Status: draft.** M.A.T.E. is being built by Team Sora for the NASA Space Apps Challenge 2026, challenge *Create Health Monitoring Software for Astronauts on Space Missions*. There is no public build, deployed link or video yet; they will be added here when they exist.

## Repository layout

```
backend/    FastAPI service — single source of truth for scenario/source data
frontend/   React 18 + TypeScript + Vite app (fetches data from the backend)
docs/       specs
```

## Run it locally

Requirements: Node.js 22.12+ and Python 3.11+ (verified 2026-11-14).

```bash
# 1. backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000   # API on :8000, docs on :8000/docs

# 2. frontend (new terminal)
cd frontend
pnpm install
pnpm dev                                     # Vite dev server
```

If the backend is not on `http://localhost:8000`, set `VITE_API_BASE`
in `frontend/.env.local`.

Tests: `cd frontend && pnpm test` · `cd backend && pytest -q`

## What it is

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

### Guided journey (milestone M1)

1. Open the app. You start **Onboard**, as Lucía Ferraro (fictional) on the ISS.
2. Switch to **Ground** › ISS › Agenda as *Mission operator*. Select "Payload hardware swap" and advance it by 90 minutes. The preview shows how the planned rest window changes.
3. Send the update and watch it travel the simulated link: *In transit* → *Delivered*.
4. Go back **Onboard**. The companion tells you that Ground updated your schedule. Choose "Show me what changed" (or type it): it opens your agenda, selects the period and highlights the blocks that moved, before and after.
5. Ask "How will this affect me?". The companion explains that it has no comparable sleep records and therefore makes no inference.
6. Ask "Why does this matter?". It cites NASA's page on the risk from inadequate sleep and irregular schedules.
7. Log an observation. It is private by default; you can choose to share a summary.
8. On **Ground**, as *Medical professional*, read the shared summary. As *Mission operator*, you only see that a restricted summary arrived.
