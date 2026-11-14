#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# sync.sh — regenera deploy/backend: una copia limpia de backend/ para
# desplegar en Vercel SIN conexión a GitHub.
#
# 1) Build del frontend (pnpm build) emitiendo en backend/app/static.
# 2) Copia backend/ → deploy/backend/ excluyendo .venv, __pycache__,
#    .pytest_cache, tests y .git. Vercel instala las dependencias por sí
#    mismo a partir de requirements.txt.
#
# Uso:  ./sync.sh   (desde la carpeta terraform/)
# ---------------------------------------------------------------------------
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$HERE/.."
SRC="$ROOT/backend"
FRONTEND="$ROOT/frontend"
DEST="$ROOT/deploy/backend"

# 1) Build del frontend → backend/app/static
echo ">> Build del frontend (pnpm build) → backend/app/static"
(
  cd "$FRONTEND"
  pnpm install --frozen-lockfile
  MATE_BUILD_OUT="$SRC/app/static" pnpm build
)

# 2) Copia limpia para Vercel
echo ">> Copiando $SRC -> $DEST (excluyendo .venv, __pycache__, .pytest_cache, tests)"

rm -rf "$DEST"
mkdir -p "$DEST"

# rsync es la forma más fiable de copiar con exclusiones.
rsync -a \
  --exclude '.venv' \
  --exclude '__pycache__' \
  --exclude '.pytest_cache' \
  --exclude 'tests' \
  --exclude '.git' \
  "$SRC"/ "$DEST"/

# Resumen
COUNT="$(find "$DEST" -type f | wc -l | tr -d ' ')"
SIZE="$(du -sh "$DEST" | cut -f1)"
echo ">> Listo: $COUNT archivos, $SIZE"
echo ">> Ahora ejecuta: terraform apply"
