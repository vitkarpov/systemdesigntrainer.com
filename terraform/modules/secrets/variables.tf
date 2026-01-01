variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "rds_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT secret for authentication"
  type        = string
  sensitive   = true
}

variable "secrets" {
  description = "Sensitive environment variables"
  type = object({
    anthropic_api_key         = string
    workos_client_id          = string
    workos_api_key            = string
    stripe_secret_key         = string
    stripe_webhook_secret     = string
    stripe_price_3_interviews = string
    stripe_price_5_interviews = string
    stripe_price_unlimited    = string
  })
  sensitive = true
}
