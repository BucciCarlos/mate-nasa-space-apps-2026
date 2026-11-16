# ---------------------------------------------------------------------------
# Deploy unificado — Vercel (FastAPI + React estático)
# El frontend se builda con `pnpm build` (emite en backend/app/static/)
# y Terraform sube todo backend/ a Vercel.
# ---------------------------------------------------------------------------

resource "vercel_project" "api" {
  name = var.vercel_project_name

  root_directory = "backend"
}

# El directorio se lee de backend/ directamente. El build del frontend
# (pnpm build) emite en backend/app/static/ automáticamente (ver vite.config.ts).
# Asegúrate de haber ejecutado `pnpm build` (o `./run.ps1`) antes de `terraform apply`.
data "vercel_project_directory" "app" {
  path = "${path.module}/../backend"
}

resource "vercel_deployment" "api" {
  project_id = vercel_project.api.id
  files      = data.vercel_project_directory.app.files
  production = true

  depends_on = [
    vercel_project_environment_variable.cors_origins,
    vercel_project_environment_variable.llm_base_url,
    vercel_project_environment_variable.llm_model,
    vercel_project_environment_variable.llm_api_key,
    vercel_project_environment_variable.llm_timeout_s
  ]
}

# --- Variables de entorno (se inyectan en la app FastAPI) ---
# MATE_CORS_ORIGINS se deriva automáticamente de la URL del proyecto Vercel
# (https://<nombre>.vercel.app) para que la guarda de hostname en /api/chat
# siempre permita el dominio de producción. Si var.cors_origins no está vacío,
# se usa ese valor en su lugar.
resource "vercel_project_environment_variable" "cors_origins" {
  project_id = vercel_project.api.id
  key        = "MATE_CORS_ORIGINS"
  value      = var.cors_origins != "" ? var.cors_origins : "https://${var.vercel_project_name}.vercel.app"
  target     = ["production", "preview"]
  sensitive  = false
}

resource "vercel_project_environment_variable" "llm_base_url" {
  project_id = vercel_project.api.id
  key        = "MATE_LLM_BASE_URL"
  value      = var.llm_base_url
  target     = ["production", "preview"]
  sensitive  = false
}

resource "vercel_project_environment_variable" "llm_model" {
  project_id = vercel_project.api.id
  key        = "MATE_LLM_MODEL"
  value      = var.llm_model
  target     = ["production", "preview"]
  sensitive  = false
}

resource "vercel_project_environment_variable" "llm_api_key" {
  project_id = vercel_project.api.id
  key        = "MATE_LLM_API_KEY"
  value      = var.llm_api_key
  target     = ["production", "preview"]
  sensitive  = true
}

resource "vercel_project_environment_variable" "llm_timeout_s" {
  project_id = vercel_project.api.id
  key        = "MATE_LLM_TIMEOUT_S"
  value      = tostring(var.llm_timeout_s)
  target     = ["production", "preview"]
  sensitive  = false
}
