# ==================================
# AWS Secrets Manager
# ==================================

# Create secret for backend environment variables
resource "aws_secretsmanager_secret" "backend" {
  name        = "${var.project_name}-${var.environment}-backend-secrets"
  description = "Sensitive environment variables for ${var.project_name} backend"

  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = {
    Name = "${var.project_name}-${var.environment}-backend-secrets"
  }
}

# Store secret values
resource "aws_secretsmanager_secret_version" "backend" {
  secret_id = aws_secretsmanager_secret.backend.id

  secret_string = jsonencode({
    # Database credentials
    DB_PASSWORD = var.rds_password
    JWT_SECRET  = var.jwt_secret

    # External API credentials
    ANTHROPIC_API_KEY = var.secrets.anthropic_api_key
    WORKOS_CLIENT_ID  = var.secrets.workos_client_id
    WORKOS_API_KEY    = var.secrets.workos_api_key

    # Stripe credentials
    STRIPE_SECRET_KEY         = var.secrets.stripe_secret_key
    STRIPE_WEBHOOK_SECRET     = var.secrets.stripe_webhook_secret
    STRIPE_PRICE_3_INTERVIEWS = var.secrets.stripe_price_3_interviews
    STRIPE_PRICE_5_INTERVIEWS = var.secrets.stripe_price_5_interviews
    STRIPE_PRICE_UNLIMITED    = var.secrets.stripe_price_unlimited
  })
}
