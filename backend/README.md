# M.A.T.E. backend — FastAPI

Single source of truth for the M.A.T.E. scenario/source data. The frontend
(`frontend/`) fetches it from this API at startup.

## Layout

```
backend/
  app/
    main.py          # app factory, CORS, router wiring
    config.py        # paths
    routers/data.py  # scenario/source endpoints
  data/              # the data (moved out of frontend/src/data)
    iss.json
    cislunar.json
    sources.json
  tests/test_api.py
  requirements.txt
```

## Run

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8002
```

- API docs: http://localhost:8002/docs
- Health: `GET /api/health`
- Scenarios: `GET /api/scenarios` · `GET /api/scenarios/{iss|cislunar}`
- Sources: `GET /api/sources`

## Tests

```bash
cd backend
pytest -q
```

## Frontend connection

The frontend reads the API base from `VITE_API_BASE`
(default `http://localhost:8002`). Set it in
`frontend/.env.local` when the backend is not on port 8002:

```
VITE_API_BASE=http://localhost:9000
```
