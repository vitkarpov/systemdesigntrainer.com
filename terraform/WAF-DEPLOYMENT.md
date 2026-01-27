# WAF Deployment Guide

This guide covers deploying and managing the AWS WAF for the API ALB.

## Overview

The WAF uses a **whitelist approach** - only specific API endpoints are allowed, all others are blocked. This provides maximum security by blocking common attack vectors, path traversal attempts, and unauthorized access attempts.

## Deployment Steps

### 1. Review the WAF Configuration

Before deploying, review the whitelisted endpoints in `modules/waf/main.tf`:

```bash
cat terraform/modules/waf/main.tf
```

All current API endpoints are already whitelisted:
- `/health` - Health check
- `/auth/*` - Authentication endpoints
- `/cases*` - Interview cases
- `/sessions*` - Interview sessions
- `/payments*` - Payment endpoints

### 2. Deploy the WAF

The WAF will be automatically deployed when you run:

```bash
cd terraform
terraform plan
terraform apply
```

The WAF module is integrated into the main infrastructure and will:
1. Create the WAF Web ACL with whitelist rules
2. Associate the WAF with the API ALB
3. Set up CloudWatch logging for monitoring

### 3. Verify Deployment

After deployment, get the WAF details:

```bash
# Get WAF Web ACL ID
terraform output waf_web_acl_id

# Get WAF Web ACL ARN
terraform output waf_web_acl_arn

# Get CloudWatch Log Group
terraform output waf_log_group
```

### 4. Test the WAF

Run the automated test script:

```bash
cd terraform/scripts
./test-waf.sh https://api.systemdesigntrainer.com
```

Or test manually:

```bash
# Should succeed (200 OK)
curl https://api.systemdesigntrainer.com/health

# Should be blocked (403 Forbidden)
curl https://api.systemdesigntrainer.com/admin
curl https://api.systemdesigntrainer.com/.env
curl https://api.systemdesigntrainer.com/wp-admin
```

## Monitoring

### CloudWatch Metrics

View WAF metrics in CloudWatch:

```bash
# AWS Console
https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#metricsV2:graph=~()

# Or via CLI
aws cloudwatch get-metric-statistics \
  --namespace AWS/WAFV2 \
  --metric-name AllowedRequests \
  --dimensions Name=WebACL,Value=sd-sim-production-api-waf \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

### CloudWatch Logs

View blocked requests:

```bash
# Get log group name
LOG_GROUP=$(cd terraform && terraform output -raw waf_log_group)

# View all logs
aws logs tail $LOG_GROUP --follow

# Filter for blocked requests only
aws logs filter-log-events \
  --log-group-name $LOG_GROUP \
  --filter-pattern '{ $.action = "BLOCK" }' \
  --start-time $(date -u -d '1 hour ago' +%s)000

# Count blocked requests in the last hour
aws logs filter-log-events \
  --log-group-name $LOG_GROUP \
  --filter-pattern '{ $.action = "BLOCK" }' \
  --start-time $(date -u -d '1 hour ago' +%s)000 \
  | jq '.events | length'
```

### Common Blocked Patterns to Monitor

Watch for these common attack patterns in blocked requests:
- Path traversal: `../`, `..%2F`
- Admin panels: `/admin`, `/wp-admin`, `/phpmyadmin`
- Config files: `/.env`, `/config.json`, `/.git`
- SQL injection attempts in paths
- Directory scanning attempts

## Adding New Endpoints

When you add new API endpoints, update the WAF whitelist:

1. **Edit the WAF module:**

   ```bash
   vim terraform/modules/waf/main.tf
   ```

2. **Add a new statement** inside the `or_statement` block:

   ```hcl
   # New feature endpoint
   statement {
     byte_match_statement {
       positional_constraint = "STARTS_WITH"
       search_string         = "/new-feature"
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

3. **Apply the changes:**

   ```bash
   terraform plan
   terraform apply
   ```

4. **Test the new endpoint:**

   ```bash
   curl https://api.systemdesigntrainer.com/new-feature
   # Should NOT return 403
   ```

## Troubleshooting

### Endpoint Returning 403 (Blocked by WAF)

If a legitimate endpoint is blocked:

1. **Check the WAF logs** to confirm it's the WAF blocking:
   ```bash
   aws logs filter-log-events \
     --log-group-name $(cd terraform && terraform output -raw waf_log_group) \
     --filter-pattern '{ $.action = "BLOCK" }' \
     --start-time $(date -u -d '5 minutes ago' +%s)000
   ```

2. **Add the endpoint to the whitelist** (see "Adding New Endpoints" above)

3. **Verify the path pattern** matches your rule:
   - Use `STARTS_WITH` for path prefixes: `/api/v1`
   - Use `EXACTLY` for exact paths: `/health`

### Too Many Requests Blocked

If you're seeing legitimate traffic blocked:

1. **Review the blocked request logs** to identify patterns
2. **Add necessary endpoints** to the whitelist
3. **Consider the pattern specificity** - be as specific as possible

### WAF Not Blocking

If the WAF isn't blocking unwanted traffic:

1. **Verify the WAF association:**
   ```bash
   aws wafv2 list-web-acls --scope REGIONAL --region us-east-1
   aws wafv2 get-web-acl-for-resource \
     --resource-arn $(cd terraform && terraform output -json | jq -r '.alb_arn.value')
   ```

2. **Check the default action** is set to `block`

3. **Review CloudWatch metrics** to see if requests are being evaluated

## Removing the WAF

If you need to remove the WAF:

```bash
cd terraform

# Comment out the WAF module in main.tf
# Then apply
terraform apply
```

**Warning:** This will leave your API unprotected at the WAF level. Application-level security (authentication, rate limiting) will still be active.

## Cost Estimation

- **WAF Web ACL:** ~$5.00/month
- **WAF Rule:** ~$1.00/month (1 rule)
- **WAF Requests:** ~$0.60 per 1 million requests
- **CloudWatch Logs:** Variable based on request volume

**Estimated total:** $10-20/month for moderate traffic

## Security Best Practices

1. ✅ **Regularly review blocked requests** to identify attack patterns
2. ✅ **Keep the whitelist minimal** - only add endpoints that are actually used
3. ✅ **Use CloudWatch alarms** to alert on spike in blocked requests
4. ✅ **Review WAF logs weekly** for security insights
5. ✅ **Test new endpoints** after adding to the whitelist
6. ✅ **Document all changes** to the whitelist in git commits

## Additional Resources

- [AWS WAF Documentation](https://docs.aws.amazon.com/waf/)
- [WAF Best Practices](https://docs.aws.amazon.com/waf/latest/developerguide/waf-chapter.html)
- Module README: `terraform/modules/waf/README.md`
