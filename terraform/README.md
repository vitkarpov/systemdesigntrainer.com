# Terraform AWS Infrastructure

This directory contains Terraform configurations to deploy the System Design Interview Simulator to AWS.

## Overview

**Cost**: $53-78/month (with RDS free tier: $53-65/month)

The infrastructure deploys:
- **Landing Page**: Static site on S3 + CloudFront (systemdesigntrainer.com)
- **Frontend**: React SPA on S3 + CloudFront (app.systemdesigntrainer.com)
- **Backend**: NestJS API on ECS Fargate behind ALB (api.systemdesigntrainer.com)
- **Database**: RDS PostgreSQL 16 + ElastiCache Redis 7
- **Domain**: Route53 with SSL/TLS certificates

## Prerequisites

### Required Tools
- **Terraform** >= 1.6.0 ([install](https://www.terraform.io/downloads))
- **AWS CLI** configured with credentials ([install](https://aws.amazon.com/cli/))
- **Docker** for building images ([install](https://www.docker.com/))
- **Node.js** for frontend builds ([install](https://nodejs.org/))

### AWS Account Setup
1. AWS account with billing enabled
2. IAM user with AdministratorAccess or appropriate permissions
3. AWS CLI configured:
   ```bash
   aws configure
   # Enter: Access Key ID, Secret Access Key, Region (eu-west-1)
   ```

### Domain
- **systemdesigntrainer.com** (already owned)
- You'll update nameservers after deployment

### External Service Accounts
1. **Anthropic** ([console.anthropic.com](https://console.anthropic.com)) - AI API
2. **WorkOS** ([dashboard.workos.com](https://dashboard.workos.com)) - Authentication
3. **Stripe** ([dashboard.stripe.com](https://dashboard.stripe.com)) - Payments

## Quick Start

### 1. Configure Variables

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` and fill in:
- Generate JWT secret: `openssl rand -base64 32`
- Add API keys for Anthropic, WorkOS, Stripe

**IMPORTANT**: Never commit `terraform.tfvars` to git!

### 2. Initialize Terraform

```bash
terraform init
```

### 3. Plan Infrastructure

```bash
terraform plan -out=tfplan
```

Review the plan carefully. It will create ~50 resources.

### 4. Apply Infrastructure

```bash
terraform apply tfplan
```

This takes 15-20 minutes. When complete, note the nameservers in the output.

### 5. Delegate DNS

Update nameservers in your domain registrar:
```bash
terraform output nameservers
```

Copy the 4 nameservers and update them at your registrar. Wait 5-60 minutes for propagation.

### 6. Deploy Backend

```bash
./scripts/build-and-push.sh
```

This:
- Builds Docker image from `../backend`
- Pushes to ECR
- Triggers ECS deployment

### 7. Deploy Frontend

```bash
./scripts/build-frontend.sh
```

This:
- Builds React app from `../ui`
- Syncs to S3
- Invalidates CloudFront

### 8. Deploy Landing Page

```bash
./scripts/build-landing.sh
```

This:
- Syncs landing page files from `../landing` to S3
- Invalidates CloudFront

**Note**: Create a `landing/` directory at project root with your landing page (index.html, styles, etc.)

### 9. Configure External Services

#### WorkOS
1. Go to WorkOS dashboard
2. Navigate to: Redirects → Allowed Redirect URIs
3. Add: `https://api.systemdesigntrainer.com/auth/callback`

#### Stripe
1. Go to Stripe dashboard
2. Navigate to: Developers → Webhooks
3. Add endpoint: `https://api.systemdesigntrainer.com/payments/webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy webhook signing secret
6. Update in Secrets Manager:
   ```bash
   aws secretsmanager update-secret \
     --secret-id sd-sim-production-backend-secrets \
     --secret-string "$(cat <<EOF
   {
     "STRIPE_WEBHOOK_SECRET": "whsec_YOUR_NEW_SECRET",
     ...other secrets...
   }
   EOF
   )"
   ```
7. Restart ECS service:
   ```bash
   aws ecs update-service \
     --cluster sd-sim-production \
     --service sd-sim-backend \
     --force-new-deployment
   ```

### 10. Verify Deployment

```bash
# Backend health
curl https://api.systemdesigntrainer.com/health

# Frontend
open https://app.systemdesigntrainer.com

# Landing page
open https://systemdesigntrainer.com
```

## Infrastructure Overview

### Modules

- **`networking/`** - VPC, subnets, NAT instance, security groups
- **`dns/`** - Route53, ACM certificates (wildcard *.systemdesigntrainer.com)
- **`storage/`** - RDS PostgreSQL 16, ElastiCache Redis 7
- **`secrets/`** - AWS Secrets Manager for sensitive env vars
- **`alb/`** - Application Load Balancer with SSL termination
- **`frontend/`** - S3 bucket + CloudFront distribution (app.*)
- **`landing/`** - S3 bucket + CloudFront distribution (root domain)
- **`container/`** - ECR repository, ECS Fargate cluster & service

### Architecture Diagram

```
                            ┌─────────────────┐
                            │   CloudFront    │
                            │  (app.domain)   │
                            └────────┬────────┘
                                     │
                            ┌────────▼────────┐
                            │   S3 Bucket     │
                            │   (Frontend)    │
                            └─────────────────┘

┌─────────────┐
│   Internet  │
└──────┬──────┘
       │
┌──────▼──────────────────────────────────────┐
│           Application Load Balancer         │
│             (api.domain)                     │
└──────┬──────────────────────────────────────┘
       │
┌──────▼──────────┐         ┌─────────────────┐
│  ECS Fargate    │────────▶│  RDS PostgreSQL │
│   (Backend)     │         │                 │
└────────┬────────┘         └─────────────────┘
         │
         │                  ┌─────────────────┐
         └─────────────────▶│  Redis Cluster  │
                            │                 │
                            └─────────────────┘
```

## Cost Breakdown

| Service | Configuration | Monthly Cost |
|---------|---------------|--------------|
| ECS Fargate | 0.25 vCPU, 0.5GB, 1 task | $9 |
| RDS PostgreSQL | db.t4g.micro, 20GB | $13 (free tier: $0) |
| ElastiCache Redis | cache.t4g.micro | $11 |
| NAT Instance | t4g.nano | $3 |
| ALB | Standard + LCUs | $21 |
| S3 + CloudFront | 1GB storage, low traffic | $2-5 |
| Route53 | Hosted zone + queries | $0.51 |
| Secrets Manager | 1 secret | $0.40 |
| CloudWatch Logs | 1GB, 7-day retention | $0.50 |
| ECR + Data Transfer | Images + egress | $6-12 |
| **Total** | | **$66-78/month** |
| **With RDS free tier** | | **$53-65/month** |

## Scripts

### `scripts/deploy.sh`
Full deployment automation (backend + frontend)

```bash
./scripts/deploy.sh
```

### `scripts/build-and-push.sh`
Build backend Docker image and push to ECR

```bash
./scripts/build-and-push.sh
```

### `scripts/build-frontend.sh`
Build frontend and deploy to S3 + CloudFront

```bash
./scripts/build-frontend.sh
```

### `scripts/rollback.sh`
Rollback backend to previous ECS task definition

```bash
./scripts/rollback.sh
```

## Common Operations

### View Logs
```bash
# Tail backend logs
aws logs tail /ecs/sd-sim-production-backend --follow

# Filter for errors
aws logs filter-log-events \
  --log-group-name /ecs/sd-sim-production-backend \
  --filter-pattern "ERROR"
```

### Monitor ECS Service
```bash
aws ecs describe-services \
  --cluster sd-sim-production \
  --service sd-sim-backend \
  --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount,Deployments:deployments}'
```

### Update Secrets
```bash
# Update secrets
aws secretsmanager update-secret \
  --secret-id sd-sim-production-backend-secrets \
  --secret-string '{...}'

# Restart service to load new secrets
aws ecs update-service \
  --cluster sd-sim-production \
  --service sd-sim-backend \
  --force-new-deployment
```

### Scale ECS Service
```bash
# Manual scaling
aws ecs update-service \
  --cluster sd-sim-production \
  --service sd-sim-backend \
  --desired-count 3
```

### Invalidate CloudFront Cache
```bash
aws cloudfront create-invalidation \
  --distribution-id $(terraform output -raw cloudfront_distribution_id) \
  --paths "/*"
```

## Troubleshooting

### Backend not starting
1. Check CloudWatch logs: `aws logs tail /ecs/sd-sim-production-backend --follow`
2. Verify secrets are accessible
3. Check database connectivity
4. Ensure ECR image exists

### Health check failing
1. Verify `/health` endpoint returns 200
2. Check if database migrations are hanging
3. Increase health check grace period in task definition

### DNS not resolving
1. Verify nameservers are updated in registrar
2. Check DNS propagation: `dig app.systemdesigntrainer.com`
3. Wait up to 60 minutes for full propagation

### High costs
1. Check ECS task count (should be 1 at idle)
2. Verify NAT instance is used (not NAT Gateway)
3. Review CloudWatch logs retention (should be 7 days)
4. Check S3/CloudFront data transfer

## Scaling

### When to scale up:

**ECS**:
- CPU > 70%: Auto-scaling enabled (1-3 tasks)
- Memory issues: Increase `ecs_task_memory` in variables

**RDS**:
- CPU > 80%: Upgrade to `db.t4g.small`
- Connections > 80: Increase `max_connections`
- Storage > 80%: Auto-scaling enabled (up to 40GB)

**Redis**:
- Memory > 80%: Upgrade to `cache.t4g.small`
- Evictions: Increase node size

## Security

### Implemented:
- HTTPS everywhere (CloudFront, ALB)
- TLS 1.2+ only
- Secrets in Secrets Manager
- Private subnets for compute/data
- Security groups with least privilege
- IAM roles with minimal permissions
- HTTP-only cookies
- CORS with specific origins
- Database encryption at rest

### Recommended:
- Enable MFA on AWS root account
- Set up AWS Budgets for cost alerts
- Enable GuardDuty for threat detection
- Implement secret rotation
- Regular security audits

## Disaster Recovery

### Backups

**RDS**:
- Automated daily backups (7-day retention)
- Point-in-time recovery enabled
- Manual snapshots before major changes

**Redis**:
- Automated snapshots (5-day retention)
- AOF persistence enabled

**S3**:
- Versioning enabled (easy rollbacks)

### Restore Procedures

**Database**:
```bash
# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier sd-sim-production-postgres-restored \
  --db-snapshot-identifier <snapshot-id>
```

**Frontend**:
```bash
# Rollback to previous version
aws s3api list-object-versions --bucket sd-sim-production-frontend
aws s3api copy-object --copy-source "bucket/key?versionId=VERSION_ID" ...
aws cloudfront create-invalidation --distribution-id <id> --paths "/*"
```

**Backend**:
```bash
# Use rollback script
./scripts/rollback.sh
```

## Maintenance

### Routine Tasks

**Weekly**:
- Review CloudWatch logs for errors
- Check ECS task health
- Monitor costs in AWS Cost Explorer

**Monthly**:
- Review and update dependencies
- Test backup restoration
- Review security group rules
- Check for AWS service updates

**Quarterly**:
- Rotate secrets
- Review and optimize costs
- Test disaster recovery procedures
- Update Terraform modules

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: eu-west-1
      - name: Build and push
        run: cd terraform && ./scripts/build-and-push.sh

  deploy-frontend:
    runs-on: ubuntu-latest
    needs: deploy-backend
    steps:
      - uses: actions/checkout@v3
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: eu-west-1
      - name: Build and deploy
        run: cd terraform && ./scripts/build-frontend.sh
```

## Support

### Documentation
- Module READMEs: `modules/*/README.md`
- AWS Documentation: [docs.aws.amazon.com](https://docs.aws.amazon.com)
- Terraform Documentation: [terraform.io/docs](https://www.terraform.io/docs)

### Monitoring
- CloudWatch Logs: [console.aws.amazon.com/cloudwatch](https://console.aws.amazon.com/cloudwatch)
- ECS Console: [console.aws.amazon.com/ecs](https://console.aws.amazon.com/ecs)
- Cost Explorer: [console.aws.amazon.com/cost-management](https://console.aws.amazon.com/cost-management)

## Clean Up

To destroy all infrastructure:

```bash
# WARNING: This deletes everything!
terraform destroy
```

**Note**: RDS final snapshot will be created (production only).

## License

MIT License - See main project LICENSE file.
