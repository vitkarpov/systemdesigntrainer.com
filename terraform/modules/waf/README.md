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
- `{project}-{env}-api-waf` - Overall WAF metrics (e.g., `sd-sim-production-api-waf`)
- `{project}-{env}-allowed-endpoints` - Metrics for allowed endpoints (e.g., `sd-sim-production-allowed-endpoints`)

### CloudWatch Logs
- Log Group: `aws-waf-logs-{project}-{env}-api` (e.g., `aws-waf-logs-sd-sim-production-api`)
- Retention: Configurable (default 7 days)
- Sampling: By default, only blocked requests are logged to reduce costs

### View Blocked Requests
```bash
# Get log group name from terraform
LOG_GROUP=$(cd terraform && terraform output -raw waf_log_group)

# View blocked requests (if logging is enabled)
aws logs filter-log-events \
  --log-group-name "$LOG_GROUP" \
  --filter-pattern '{ $.action = "BLOCK" }'

# Or use the full log group name directly
# Example: aws-waf-logs-sd-sim-production-api

# Note: With log sampling enabled (default), only blocked requests are logged
# Set enable_log_sampling = false to log all requests
```

## Usage

### Basic Usage
```hcl
module "waf" {
  source = "./modules/waf"

  project_name = var.project_name
  environment  = var.environment
  alb_arn      = module.alb.alb_arn
}
```

### With Cost Optimization Options
```hcl
module "waf" {
  source = "./modules/waf"

  project_name = var.project_name
  environment  = var.environment
  alb_arn      = module.alb.alb_arn

  # Cost optimization options
  enable_log_sampling = true  # Only log blocked requests (default: true)
  log_retention_days  = 7     # Days to retain logs (default: 7)
  enable_logging      = true  # Disable entirely to save costs (default: true)
}
```

### Maximum Cost Savings
```hcl
module "waf" {
  source = "./modules/waf"

  project_name = var.project_name
  environment  = var.environment
  alb_arn      = module.alb.alb_arn

  enable_logging = false  # Disable all logging for maximum savings
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
# Get your API URL from terraform
API_URL=$(cd terraform && terraform output -raw api_url)

# Test allowed endpoint
curl $API_URL/health
# Should return 200 OK
```

### Test Blocked Endpoint
```bash
# Test blocked endpoint
curl $API_URL/not-whitelisted
# Should return 403 Forbidden
```

## Cost Considerations

### Base AWS WAF Costs
- Web ACL: $5.00/month
- Rules: $1.00/month per rule (1 rule = $1.00/month)
- Requests: $0.60 per 1 million requests
- **Estimated Base Cost: ~$6/month + usage**

### CloudWatch Logs Costs
Logging can be expensive at scale. This module includes cost optimization features:

1. **Log Sampling** (enabled by default)
   - Only logs blocked requests (not allowed requests)
   - Reduces log volume by ~50-90% depending on traffic
   - Set `enable_log_sampling = false` to log all requests

2. **Disable Logging** (for maximum savings)
   - Set `enable_logging = false` to completely disable CloudWatch logs
   - Saves all CloudWatch Logs ingestion and storage costs
   - CloudWatch metrics will still be available

3. **Sampled Requests** (disabled by default)
   - Disabled to reduce storage costs
   - Re-enable during debugging if needed

### Cost Optimization Tips

Based on [AWS WAF Cost Optimization Best Practices](https://docs.aws.amazon.com/prescriptive-guidance/latest/bot-control/optimizing-costs.html):

- ✅ **Simple custom rules** - This module uses only basic path matching (cheapest option)
- ✅ **No managed rule groups** - Avoiding Bot Control ($10+/month) and ATP ($15+/month)
- ✅ **Whitelist approach** - Blocks unwanted traffic early
- ✅ **Log sampling** - Reduces CloudWatch costs by 50-90%
- ✅ **Short retention** - 7 days default (configurable)

**Comparison with Managed Rules:**
| Configuration | Monthly Cost |
|---------------|--------------|
| Current setup (custom rules) | $6 + $0.60/M requests |
| With Bot Control | $16 + $1.60/M requests |
| With Bot Control + ATP | $26 + $5.60/M requests |
