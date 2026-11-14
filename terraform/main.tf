# ---------------------------------------------------------------------------
# Deploy unificado — Vercel (FastAPI + React estático)
# El frontend se builda localmente (pnpm build) y se emite en
# backend/app/static/. Terraform sube todo backend/ a Vercel.
# ---------------------------------------------------------------------------

resource "vercel_project" "api" {
  name = var.vercel_project_name

  root_directory = "backend"
}

data "vercel_project_directory" "app" {
  path = "${path.module}/../backend"
}

resource "vercel_deployment" "api" {
  project_id  = vercel_project.api.id
  files       = data.vercel_project_directory.app.files
  production  = true

  depends_on = [
    vercel_project_environment_variable.cors_origins
  ]
}

# --- Variables de entorno (se inyectan en la app FastAPI) ---
resource "vercel_project_environment_variable" "cors_origins" {
  project_id = vercel_project.api.id
  key        = "MATE_CORS_ORIGINS"
  value      = var.cors_origins
  target     = ["production", "preview"]
  sensitive  = false
}
