# WAF Module

This module creates an AWS WAFv2 Web ACL with a **whitelist approach** for the API Application Load Balancer.

## Overview

The WAF is configured to:
- **Block all requests by default**
- **Allow only whitelisted API endpoints**
- Log all requests to CloudWatch for monitoring
- Redact sensitive headers (Authorization, Cookie) from logs

## Whitelisted Endpoints

The following API endpoints are allowed through the WAF:

### Health Check
- `GET /health` - Application health check

### Authentication (`/auth/*`)
- `GET /auth/login` - OAuth login
- `GET /auth/callback` - OAuth callback
- `GET /auth/user` - Get current user
- `GET /auth/logout` - User logout
- `GET /auth/verify-email` - Email verification
- `GET /auth/status` - Auth service status
- `POST /auth/dev/test-token` - Dev test token (dev only)

### Interview Cases (`/cases/*`)
- `GET /cases` - List all cases
- `GET /cases/:id` - Get specific case

### Sessions (`/sessions/*`)
- `GET /sessions/dashboard` - User dashboard
- `POST /sessions` - Create session
- `GET /sessions/:id` - Get session
- `POST /sessions/:id/start` - Start session
- `GET /sessions/:id/transcript` - Get transcript
- `GET /sessions/:id/phases` - Get phases
- `GET /sessions/:id/diagram` - Get diagram
- `POST /sessions/:id/diagram` - Save diagram
- `SSE /sessions/:id/conversation` - Streaming conversation
- `POST /sessions/:id/conversation/retry` - Retry failed conversation
- `GET /sessions/:id/conversation/failed` - Get failed messages
- `GET /sessions/:id/signals` - Get detected signals
- `GET /sessions/:id/red-flags` - Get red flags
- `POST /sessions/:id/feedback` - Generate feedback
- `GET /sessions/:id/feedback` - Get feedback
- `GET /sessions/:id/feedback/status` - Get feedback status

### Payments (`/payments/*`)
- `POST /payments/checkout` - Create checkout session
- `POST /payments/webhook` - Stripe webhook

## Security Features

1. **Default Block**: All requests not matching the whitelist are blocked
2. **No Rate Limiting**: Rate limiting is handled at the application level (NestJS Throttler)
3. **CloudWatch Logging**: All requests are logged for audit and monitoring
4. **Sensitive Data Redaction**: Authorization headers and cookies are redacted from logs
5. **Metrics**: CloudWatch metrics are enabled for monitoring blocked/allowed requests

## Monitoring

### CloudWatch Metrics
- `{project}-{env}-api-waf` - Overall WAF metrics
- `{project}-{env}-allowed-endpoints` - Metrics for allowed endpoints

### CloudWatch Logs
- Log Group: `aws-waf-logs-{project}-{env}-api`
- Retention: Configurable (default 7 days)

### View Blocked Requests
```bash
aws logs filter-log-events \
  --log-group-name "aws-waf-logs-{project}-{env}-api" \
  --filter-pattern '{ $.action = "BLOCK" }'
```

## Usage

```hcl
module "waf" {
  source = "./modules/waf"

  project_name       = var.project_name
  environment        = var.environment
  alb_arn           = module.alb.alb_arn
  log_retention_days = 30
}
```

## Adding New Endpoints

To add a new endpoint to the whitelist:

1. Add a new `statement` block inside the `or_statement` in `main.tf`
2. Use `STARTS_WITH` for path prefixes (e.g., `/api/new-feature`)
3. Use `EXACTLY` for exact matches (e.g., `/specific-endpoint`)
4. Update this README to document the new endpoint

Example:
```hcl
statement {
  byte_match_statement {
    positional_constraint = "STARTS_WITH"
    search_string         = "/api/new-feature"
    field_to_match {
      uri_path {}
    }
    text_transformation {
      priority = 0
      type     = "NONE"
    }
  }
}
```

## Testing

After deployment, test the WAF:

### Test Allowed Endpoint
```bash
curl https://api.yourdomain.com/health
# Should return 200 OK
```

### Test Blocked Endpoint
```bash
curl https://api.yourdomain.com/not-whitelisted
# Should return 403 Forbidden
```

## Cost Considerations

- Web ACL: $5.00/month
- Rules: $1.00/month per rule
- Requests: $0.60 per 1 million requests
- Logs: CloudWatch Logs pricing applies
