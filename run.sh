#!/usr/bin/env bash
#
# M.A.T.E. — Medical & Astronaut Therapeutic Environment (NASA Space Apps 2026)
# Levanta backend (FastAPI) en :8002 + frontend (Vite) en :5173.
#
# Uso:
#   ./run.sh            # backend :8002 + frontend :5173
#   ./run.sh --no-build # (el build de producción se hace con `pnpm build` en frontend/)
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

# ------------------------------------------------------------------
# 0. Liberar puertos ocupados por procesos anteriores
# ------------------------------------------------------------------
_kill_port() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -ti:"$port" 2>/dev/null | xargs kill -9 2>/dev/null || true
  elif command -v fuser >/dev/null 2>&1; then
    fuser -k "$port"/tcp 2>/dev/null || true
  fi
}
_kill_port 8002
_kill_port 5173

# ------------------------------------------------------------------
# 1. Backend FastAPI (uvicorn) en :8002
# ------------------------------------------------------------------
echo "==> [1/2] Levantando backend FastAPI en http://localhost:8002 ..."
(
  cd "$BACKEND"
  # En Windows (Git Bash) el venv usa Scripts/; en macOS/Linux bin/.
  venv_bin=".venv/bin"
  [[ -d ".venv/Scripts" ]] && venv_bin=".venv/Scripts"
  if [[ ! -d ".venv" ]]; then
    python3 -m venv .venv
  fi
  # shellcheck disable=SC1091
  source "$venv_bin/activate"
  pip install -q -r requirements.txt
  uvicorn app.main:app --reload --host 127.0.0.1 --port 8002
) &
BACKEND_PID=$!

# ------------------------------------------------------------------
# 2. Frontend Vite dev en :5173 (API en http://localhost:8002)
# ------------------------------------------------------------------
echo "==> [2/2] Levantando frontend Vite en http://localhost:5173 ..."
(
  cd "$FRONTEND"
  if [[ ! -d node_modules ]]; then
    pnpm install --silent
  fi
  pnpm dev
) &
FRONTEND_PID=$!

# ------------------------------------------------------------------
# Limpieza al salir (Ctrl+C)
# ------------------------------------------------------------------
cleanup() {
  echo ""
  echo "Deteniendo procesos..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo ""
echo "  Backend:    http://localhost:8002  (API + docs en /docs)"
echo "  Frontend:   http://localhost:5173  (Vite dev)"
echo ""
echo "  Ctrl+C para detener todo."
echo ""

wait
