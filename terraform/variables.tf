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
  default     = "mate-nasa"
}

variable "cors_origins" {
  description = "Orígenes permitidos para CORS (separados por comas). Si se deja vacío, se deriva automáticamente de la URL de Vercel (https://<nombre>.vercel.app)."
  type        = string
  default     = ""
}

# --- LLM (llama.cpp, OpenAI-compatible) — backend/app/config.py ---
variable "llm_base_url" {
  description = "URL base del servidor llama.cpp (MATE_LLM_BASE_URL). Vacío = demo mode (stub)."
  type        = string
  default     = ""
}

variable "llm_model" {
  description = "Nombre del modelo servido (MATE_LLM_MODEL). Vacío = demo mode (stub)."
  type        = string
  default     = ""
}

variable "llm_api_key" {
  description = "API key del servidor LLM (MATE_LLM_API_KEY). Vacío si no requiere autenticación."
  type        = string
  sensitive   = true
  default     = ""
}

variable "llm_timeout_s" {
  description = "Timeout en segundos para la llamada al LLM (MATE_LLM_TIMEOUT_S)."
  type        = number
  default     = 120
}
