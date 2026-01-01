# Secrets Module

This module creates AWS Secrets Manager secret to store sensitive environment variables for the backend application.

## Resources Created

- **AWS Secrets Manager Secret** containing all sensitive environment variables as JSON
- **Secret Version** with the actual secret values

## Secrets Stored

The module stores all sensitive credentials in a single JSON secret:

```json
{
  "DB_PASSWORD": "...",
  "JWT_SECRET": "...",
  "ANTHROPIC_API_KEY": "...",
  "WORKOS_CLIENT_ID": "...",
  "WORKOS_API_KEY": "...",
  "STRIPE_SECRET_KEY": "...",
  "STRIPE_WEBHOOK_SECRET": "...",
  "STRIPE_PRICE_3_INTERVIEWS": "...",
  "STRIPE_PRICE_5_INTERVIEWS": "...",
  "STRIPE_PRICE_UNLIMITED": "..."
}
```

## ECS Integration

ECS tasks can access secrets directly from Secrets Manager:

```hcl
{
  "secrets": [
    {
      "name": "DB_PASSWORD",
      "valueFrom": "arn:aws:secretsmanager:region:account:secret:name:DB_PASSWORD::"
    },
    {
      "name": "JWT_SECRET",
      "valueFrom": "arn:aws:secretsmanager:region:account:secret:name:JWT_SECRET::"
    }
    // ... other secrets
  ]
}
```

## Cost

- **Secrets Manager**: $0.40/secret/month
- **API Calls**: $0.05 per 10,000 API calls
- **Estimated**: ~$0.45/month (single secret with minimal API calls)

## Security Benefits

1. **Encryption**: Secrets encrypted at rest with AWS KMS
2. **Access Control**: IAM policies control who can access secrets
3. **Audit Trail**: CloudTrail logs all access
4. **Rotation**: Supports automatic secret rotation (not implemented in MVP)
5. **No Git Exposure**: Secrets never in version control or Terraform state (only ARN stored)

## Recovery

- **Production**: 30-day recovery window (can restore deleted secrets)
- **Non-Production**: 0-day recovery (immediate deletion)

## Usage

```hcl
module "secrets" {
  source = "./modules/secrets"

  project_name = var.project_name
  environment  = var.environment

  # From storage module
  rds_password = module.storage.rds_password

  # From variables
  jwt_secret = var.jwt_secret
  secrets    = var.secrets
}
```

## Updating Secrets

To update secret values without redeploying infrastructure:

```bash
# Update via AWS CLI
aws secretsmanager update-secret \
  --secret-id sd-sim-production-backend-secrets \
  --secret-string '{
    "DB_PASSWORD": "new-password",
    ...
  }'

# Restart ECS service to load new secrets
aws ecs update-service \
  --cluster sd-sim-production \
  --service sd-sim-backend \
  --force-new-deployment
```

## Inputs

| Name | Description | Type | Sensitive |
|------|-------------|------|-----------|
| project_name | Project name | string | No |
| environment | Environment name | string | No |
| rds_password | RDS password from storage module | string | Yes |
| jwt_secret | JWT secret (min 32 chars) | string | Yes |
| secrets | Object with all external API credentials | object | Yes |

## Outputs

| Name | Description |
|------|-------------|
| secret_arn | ARN of the secret (use in ECS task definition) |
| secret_name | Name of the secret |
| secret_id | ID of the secret |

## Notes

- Secrets are stored as JSON for easy access by key
- ECS task execution role needs `secretsmanager:GetSecretValue` permission
- Secret values are marked as sensitive in Terraform
- Never log or expose secret values
- Consider implementing secret rotation for production
