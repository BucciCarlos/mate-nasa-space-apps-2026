# ---------------------------------------------------------------------------
# Variables
# ---------------------------------------------------------------------------

variable "vercel_api_token" {
  description = "API token de Vercel (https://vercel.com/account/tokens)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "vercel_project_name" {
  description = "Nombre del proyecto en Vercel (define la URL: <nombre>.vercel.app)"
  type        = string
  default     = "mate-nasa-space-apps-2026"
}

variable "cors_origins" {
  description = "Orígenes permitidos para CORS (separados por comas). '*' en desarrollo."
  type        = string
  default     = "*"
}
