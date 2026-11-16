# M.A.T.E. — Medical & Astronaut Therapeutic Environment (NASA Space Apps 2026)
# Compila el frontend y levanta backend (FastAPI) en :8002 + frontend (Vite) en :5173.
#
# Uso:
#   .\run.ps1            # build del frontend + backend :8002 + frontend :5173
#   .\run.ps1 -NoBuild   # salta el build del frontend
#
param(
    [switch]$NoBuild
)

$ErrorActionPreference = "Stop"

$ROOT = $PSScriptRoot
$BACKEND = Join-Path $ROOT "backend"
$FRONTEND = Join-Path $ROOT "frontend"

# ------------------------------------------------------------------
# 0. Liberar puertos ocupados por procesos anteriores
# ------------------------------------------------------------------
foreach ($port in @(8002, 5173)) {
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conns) {
        $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($procId in $pids) {
            Write-Host "   Matando proceso $procId en puerto $port..." -ForegroundColor Yellow
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds 1
    }
}

# ------------------------------------------------------------------
# 1. Build del frontend (emite en backend/app/static)
# ------------------------------------------------------------------
if (-not $NoBuild) {
    Write-Host "==> [1/3] Compilando frontend (Vite + Tailwind)..."
    Push-Location $FRONTEND
    try {
        if (-not (Test-Path "node_modules")) {
            pnpm install --silent
        }
        pnpm build
    } finally {
        Pop-Location
    }
} else {
    Write-Host "==> [1/3] Build del frontend omitido (-NoBuild)"
}

# ------------------------------------------------------------------
# 2. Backend FastAPI (uvicorn) en :8002
# ------------------------------------------------------------------
Write-Host "==> [2/3] Levantando backend FastAPI en http://localhost:8002 ..."

$VENV_ACTIVATE = Join-Path $BACKEND ".venv\Scripts\Activate.ps1"

$backendScript = @"
Set-Location '$BACKEND'
if (-not (Test-Path '$VENV_ACTIVATE')) {
    python -m venv .venv
}
. '$VENV_ACTIVATE'
pip install -q -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8002
"@

$BACKEND_JOB = Start-Job -ScriptBlock ([scriptblock]::Create($backendScript))

# ------------------------------------------------------------------
# 3. Frontend Vite dev en :5173 (API en http://localhost:8002)
# ------------------------------------------------------------------
Write-Host "==> [3/3] Levantando frontend Vite en http://localhost:5173 ..."
$FRONTEND_JOB = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    if (-not (Test-Path "node_modules")) {
        pnpm install --silent
    }
    pnpm dev
} -ArgumentList $FRONTEND

# ------------------------------------------------------------------
# Limpieza al salir (Ctrl+C)
# ------------------------------------------------------------------
Write-Host ""
Write-Host "  Backend:    http://localhost:8002  (API + docs en /docs)"
Write-Host "  Frontend:   http://localhost:5173  (Vite dev)"
Write-Host ""
Write-Host "  Ctrl+C para detener todo."
Write-Host ""

try {
    while (-not $BACKEND_JOB.HasExited -and -not $FRONTEND_JOB.HasExited) {
        Start-Sleep -Seconds 2
        Receive-Job -Job $BACKEND_JOB -Keep 2 -ErrorAction SilentlyContinue | Write-Host
        Receive-Job -Job $FRONTEND_JOB -Keep 2 -ErrorAction SilentlyContinue | Write-Host
    }
} finally {
    Write-Host ""
    Write-Host "Deteniendo procesos..."
    Stop-Job -Job $BACKEND_JOB -ErrorAction SilentlyContinue
    Stop-Job -Job $FRONTEND_JOB -ErrorAction SilentlyContinue
    Remove-Job -Job $BACKEND_JOB, $FRONTEND_JOB -Force -ErrorAction SilentlyContinue
}
