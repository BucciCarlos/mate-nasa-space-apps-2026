# M.A.T.E. — Terraform (Vercel)

Deploy del monorepo a **Vercel** (framework `fastapi`):

- **Backend** (FastAPI, `backend/`) → Vercel, framework `fastapi`.
- **Frontend** (Vite/React, `frontend/`) → se builda localmente
  (`pnpm build`) y se emite en `backend/app/static/`. Vercel sirve
  el build estático como fallback SPA (el backend tiene un catch-all
  `GET /{ruta:path}` que devuelve `index.html`).

> No hay conexión a GitHub: el deploy se hace con `vercel_deployment`
> subiendo los archivos locales (regenerados por `sync.sh`).

## Estructura

```
terraform/
├── main.tf                    # vercel_project + vercel_deployment + env vars
├── providers.tf               # required_providers + provider vercel
├── variables.tf               # Variables de entrada
├── outputs.tf                 # Outputs (app_url, deployment_url, deployment_id)
├── sync.sh                    # Copia limpia de backend → deploy/backend
├── terraform.tfvars.example   # Plantilla de variables (no commitear .tfvars)
└── deploy/backend/            # Generado por sync.sh (no commitear)
```

## Requisitos

- Terraform >= 1.5
- API token de Vercel: <https://vercel.com/account/tokens>
- `rsync` instalado (lo usa `sync.sh`).
- `pnpm` en el PATH (lo usa `sync.sh` para buildar el frontend).

## Variables

| Variable              | Sensitive | Descripción                                              | Default                       |
|-----------------------|-----------|----------------------------------------------------------|-------------------------------|
| `vercel_api_token`    | sí        | API token de Vercel                                      | —                             |
| `vercel_project_name` | no        | Nombre del proyecto en Vercel (define la URL)            | `mate-nasa-space-apps-2026`   |
| `cors_origins`        | no        | Orígenes permitidos para CORS (separados por comas)      | `*`                           |

## Flujo de deploy

```bash
cd terraform

# 1) Build del frontend (emite en backend/app/static) + copia limpia
./sync.sh

# 2) Init (solo la primera vez) + apply
terraform init
terraform apply
```

`sync.sh` builda el frontend (`pnpm build` emitiendo en
`backend/app/static/`) y luego copia `backend/` → `deploy/backend/`
excluyendo `.venv`, `__pycache__`, `.pytest_cache`, `tests/` y `.git`.
El resource `vercel_deployment.api` sube ese directorio a Vercel.

## Variables de entorno inyectadas en Vercel

| Key                | Source                  | Sensitive |
|--------------------|-------------------------|-----------|
| `MATE_CORS_ORIGINS`| `var.cors_origins`      | no        |

Se inyectan para los targets `production` y `preview`.

## Outputs

- `app_url` — URL del backend en Vercel (`https://<vercel_project_name>.vercel.app`)
- `deployment_url` — URL del deployment de producción actual (cambia en cada apply)
- `deployment_id` — ID del deployment de producción actual

## Notas

- El frontend no se despliega por separado: `pnpm build` emite en
  `backend/app/static/` y el backend lo sirve como SPA.
- Health check del backend: `GET /api/health`.
- Límites de Vercel con FastAPI (función serverless): sin tareas de fondo
  largas ni WebSockets; cold starts; límite de tamaño de bundle.
- State: no commitear `terraform.tfstate` ni `*.tfvars`. Para uso en equipo,
  usar un backend remoto (Terraform Cloud, S3).
