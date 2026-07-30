variable "deploy_application" {
  description = "Deploy Lambda and API Gateway after the first immutable ECR image exists."
  type        = bool
  default     = false
}

variable "image_uri" {
  description = "Immutable ECR image URI including sha256 digest; required when deploy_application is true."
  type        = string
  default     = null
  nullable    = true

  validation {
    condition     = !var.deploy_application || can(regex("@sha256:[0-9a-f]{64}$", coalesce(var.image_uri, "")))
    error_message = "image_uri must be an immutable ECR URI ending in @sha256:<64 hex characters> when deploy_application is true."
  }
}

variable "lambda_memory_mb" {
  type    = number
  default = 512
}

variable "lambda_timeout_seconds" {
  type    = number
  default = 20
}

variable "lambda_reserved_concurrency" {
  type    = number
  default = 2
}

variable "api_throttling_rate_limit" {
  type    = number
  default = 2
}

variable "api_throttling_burst_limit" {
  type    = number
  default = 5
}

variable "log_retention_days" {
  type    = number
  default = 7
}
