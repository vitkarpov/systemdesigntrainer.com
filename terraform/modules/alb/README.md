# Application Load Balancer Module

This module creates an Application Load Balancer for the backend API with SSL/TLS termination and health checks.

## Resources Created

- **Application Load Balancer** (internet-facing)
- **Target Group** (IP-based for Fargate)
- **HTTPS Listener** (port 443) with SSL/TLS termination
- **HTTP Listener** (port 80) with redirect to HTTPS

## Configuration

### Load Balancer
- **Type**: Application Load Balancer
- **Scheme**: Internet-facing
- **Subnets**: Public subnets (multi-AZ)
- **Security Group**: Allows HTTP (80) and HTTPS (443) from anywhere
- **HTTP/2**: Enabled
- **Deletion Protection**: Enabled for production
- **Invalid Headers**: Dropped for security

### Target Group
- **Protocol**: HTTP
- **Port**: 3000 (backend container port)
- **Target Type**: IP (required for Fargate)
- **Deregistration Delay**: 30 seconds (for faster deployments)
- **Health Check**:
  - **Path**: `/health`
  - **Interval**: 30 seconds
  - **Timeout**: 5 seconds
  - **Healthy Threshold**: 2 consecutive successes
  - **Unhealthy Threshold**: 3 consecutive failures
  - **Matcher**: HTTP 200

### HTTPS Listener (Port 443)
- **Protocol**: HTTPS
- **SSL Policy**: `ELBSecurityPolicy-TLS13-1-2-2021-06` (TLS 1.2+)
- **Certificate**: ACM certificate (wildcard *.systemdesigntrainer.com)
- **Action**: Forward to target group

### HTTP Listener (Port 80)
- **Protocol**: HTTP
- **Action**: Redirect to HTTPS (301 permanent redirect)

## Health Checks

The ALB health check queries the backend `/health` endpoint:

```typescript
// Expected response from backend
GET /health
→ { "status": "ok", "timestamp": "2025-01-01T..." }
```

**Health Check Flow**:
1. ALB sends HTTP GET to `/health` every 30 seconds
2. Backend must respond with HTTP 200 within 5 seconds
3. After 2 consecutive successes, target marked healthy
4. After 3 consecutive failures, target marked unhealthy
5. Unhealthy targets removed from load balancing rotation

## SSL/TLS Configuration

- **TLS 1.3** and **TLS 1.2** supported
- **TLS 1.1** and **TLS 1.0** disabled (insecure)
- **Cipher Suites**: Modern, secure ciphers only
- **Certificate**: Wildcard certificate from ACM (*.systemdesigntrainer.com)
- **SNI**: Server Name Indication enabled

## Traffic Flow

```
User → HTTPS (443) → ALB → HTTP (3000) → ECS Task
User → HTTP (80)   → ALB → 301 Redirect to HTTPS
```

## Cost

- **ALB**: $0.0225/hour = ~$16.20/month
- **LCU** (Load Balancer Capacity Units): ~$0.008/hour per LCU
  - New connections, active connections, bandwidth, rule evaluations
  - Estimated: ~$5/month for low traffic
- **Total**: ~$21/month

## Monitoring

### Key Metrics
- **TargetResponseTime**: Average response time from targets
- **HealthyHostCount**: Number of healthy targets
- **UnHealthyHostCount**: Number of unhealthy targets
- **HTTPCode_Target_5XX_Count**: Backend errors
- **HTTPCode_Target_4XX_Count**: Client errors
- **HTTPCode_ELB_5XX_Count**: Load balancer errors
- **RequestCount**: Total requests

### Alarms (Recommended)
```hcl
# ALB 5xx errors
alarm_name = "alb-5xx-errors"
metric_name = "HTTPCode_Target_5XX_Count"
threshold = 10

# Unhealthy targets
alarm_name = "unhealthy-targets"
metric_name = "UnHealthyHostCount"
threshold = 1
```

## Usage

```hcl
module "alb" {
  source = "./modules/alb"

  project_name          = var.project_name
  environment           = var.environment
  vpc_id                = module.networking.vpc_id
  public_subnet_ids     = module.networking.public_subnet_ids
  alb_security_group_id = module.networking.alb_security_group_id
  acm_certificate_arn   = module.dns.acm_certificate_arn_alb
  backend_container_port = var.backend_container_port
}
```

## Inputs

| Name | Description | Type | Default |
|------|-------------|------|---------|
| project_name | Project name | string | - |
| environment | Environment name | string | - |
| vpc_id | VPC ID | string | - |
| public_subnet_ids | Public subnet IDs | list(string) | - |
| alb_security_group_id | ALB security group ID | string | - |
| acm_certificate_arn | ACM certificate ARN | string | - |
| backend_container_port | Backend port | number | 3000 |

## Outputs

| Name | Description |
|------|-------------|
| alb_arn | ALB ARN |
| alb_dns_name | ALB DNS name (for Route53 alias) |
| alb_zone_id | ALB hosted zone ID |
| target_group_arn | Target group ARN (for ECS service) |
| target_group_name | Target group name |
| https_listener_arn | HTTPS listener ARN |
| http_listener_arn | HTTP listener ARN |

## Security

- **HTTPS Enforced**: All HTTP traffic redirected to HTTPS
- **TLS 1.2+**: Insecure TLS versions disabled
- **Security Group**: Only ports 80 and 443 exposed
- **Invalid Headers**: Dropped to prevent header injection attacks
- **Health Checks**: Only healthy targets receive traffic

## Notes

- ALB DNS name should be aliased in Route53 for api.systemdesigntrainer.com
- Target group ARN used by ECS service for automatic registration
- Deregistration delay set to 30s for faster deployments
- Deletion protection enabled for production to prevent accidental deletion
