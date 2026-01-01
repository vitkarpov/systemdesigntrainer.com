# Container Module

This module creates ECS Fargate infrastructure for running the backend NestJS application.

## Resources Created

- **ECR Repository** for Docker images with lifecycle policy
- **ECS Cluster** with Fargate capacity provider
- **ECS Task Definition** with environment variables and secrets
- **ECS Service** with auto-scaling and load balancer integration
- **IAM Roles** (task execution and task roles)
- **CloudWatch Log Group** for application logs
- **Auto Scaling** based on CPU utilization

## Configuration

### ECR
- **Image Scanning**: Enabled on push
- **Encryption**: AES256
- **Lifecycle**: Keep last 10 tagged images, delete untagged after 7 days

### ECS Task
- **Launch Type**: Fargate (serverless)
- **CPU**: 256 units (0.25 vCPU)
- **Memory**: 512 MB
- **Network Mode**: awsvpc (required for Fargate)

### Container
- **Image**: From ECR repository (latest tag)
- **Port**: 3000
- **Health Check**: `GET /health` every 30s
- **Logs**: CloudWatch Logs with 7-day retention

### Environment Variables
Non-sensitive variables injected directly:
- NODE_ENV, PORT, DB_HOST, DB_PORT, DB_USER, DB_NAME
- REDIS_HOST, REDIS_PORT
- FRONTEND_URL, WORKOS_REDIRECT_URI, ANTHROPIC_MODEL

### Secrets
Sensitive variables from Secrets Manager:
- DB_PASSWORD, JWT_SECRET
- ANTHROPIC_API_KEY
- WORKOS_CLIENT_ID, WORKOS_API_KEY
- STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
- STRIPE_PRICE_3_INTERVIEWS, STRIPE_PRICE_5_INTERVIEWS, STRIPE_PRICE_UNLIMITED

### Auto Scaling
- **Min**: 1 task
- **Max**: 3 tasks
- **Metric**: CPU utilization > 70%
- **Scale Out**: 60s cooldown
- **Scale In**: 300s cooldown

## Cost

**Single Task (steady state)**:
- 0.25 vCPU: $0.04048/hour × 730 hours = $29.55/month
- 0.5 GB RAM: $0.004445/hour × 730 hours = $3.24/month
- **Subtotal**: ~$9/month (actual calculation)

**With Auto-Scaling (peak)**:
- 3 tasks: ~$27/month

**Additional**:
- ECR storage: ~$1/month (10GB)
- CloudWatch Logs: ~$0.50/month (1GB)

**Total**: $10-28/month depending on traffic

## Deployment Workflow

### Initial Setup
```bash
# 1. Push initial image to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <ECR_URL>

docker build -t sd-sim-backend ../backend
docker tag sd-sim-backend:latest <ECR_URL>:latest
docker push <ECR_URL>:latest
```

### Update Deployment
```bash
# Build and push new image
docker build -t sd-sim-backend ../backend
docker tag sd-sim-backend:latest <ECR_URL>:latest
docker tag sd-sim-backend:latest <ECR_URL>:$(git rev-parse --short HEAD)
docker push <ECR_URL>:latest
docker push <ECR_URL>:$(git rev-parse --short HEAD)

# Force new deployment
aws ecs update-service \
  --cluster sd-sim-production \
  --service sd-sim-backend \
  --force-new-deployment
```

### Monitor Deployment
```bash
# Watch service status
aws ecs describe-services \
  --cluster sd-sim-production \
  --services sd-sim-backend \
  --query 'services[0].deployments'

# View logs
aws logs tail /ecs/sd-sim-production-backend --follow
```

## IAM Roles

### Task Execution Role
Used by ECS to:
- Pull image from ECR
- Write logs to CloudWatch
- Read secrets from Secrets Manager

Policies:
- AmazonECSTaskExecutionRolePolicy (AWS managed)
- Custom policy for Secrets Manager access

### Task Role
Used by application to:
- Access AWS services (if needed in future)
- Currently minimal permissions

## Health Checks

### Container Health Check
- **Command**: `curl -f http://localhost:3000/health || exit 1`
- **Interval**: 30 seconds
- **Timeout**: 5 seconds
- **Retries**: 3
- **Start Period**: 60 seconds (grace period for startup)

### ALB Health Check
- Configured in ALB module
- **Path**: `/health`
- **Expected**: HTTP 200

## Monitoring

### Key Metrics
- **CPUUtilization**: Task CPU usage
- **MemoryUtilization**: Task memory usage
- **RunningTaskCount**: Number of running tasks
- **DesiredTaskCount**: Desired number of tasks

### Logs
```bash
# Tail logs
aws logs tail /ecs/sd-sim-production-backend --follow

# Filter errors
aws logs filter-log-events \
  --log-group-name /ecs/sd-sim-production-backend \
  --filter-pattern "ERROR"

# Get logs for specific task
aws logs tail /ecs/sd-sim-production-backend --follow \
  --filter-pattern "task/<task-id>"
```

## Debugging

### ECS Exec (SSH into container)
```bash
# Enable execute command (already enabled in module)
# Connect to running task
aws ecs execute-command \
  --cluster sd-sim-production \
  --task <task-id> \
  --container backend \
  --interactive \
  --command "/bin/sh"
```

### Common Issues

**Task fails to start**:
- Check CloudWatch logs for errors
- Verify secrets are accessible
- Check ECR image exists

**Health checks failing**:
- Verify /health endpoint returns 200
- Check if migrations are hanging
- Increase `startPeriod` if needed

**Out of Memory**:
- Increase `ecs_task_memory`
- Check for memory leaks

**High CPU**:
- Increase `ecs_task_cpu`
- Check for infinite loops or heavy processing

## Usage

```hcl
module "container" {
  source = "./modules/container"

  project_name          = var.project_name
  environment           = var.environment
  aws_region            = var.aws_region
  domain_name           = var.domain_name

  # Networking
  private_subnet_ids    = module.networking.private_subnet_ids
  ecs_security_group_id = module.networking.ecs_security_group_id
  target_group_arn      = module.alb.target_group_arn

  # Storage
  secrets_arn        = module.secrets.secret_arn
  rds_endpoint       = module.storage.rds_address
  rds_port           = module.storage.rds_port
  rds_username       = module.storage.rds_username
  rds_database_name  = module.storage.rds_database_name
  redis_endpoint     = module.storage.redis_endpoint
  redis_port         = module.storage.redis_port

  # ECS Configuration
  ecs_task_cpu                = var.ecs_task_cpu
  ecs_task_memory             = var.ecs_task_memory
  ecs_desired_count           = var.ecs_desired_count
  ecs_min_count               = var.ecs_min_count
  ecs_max_count               = var.ecs_max_count
  ecs_target_cpu_utilization  = var.ecs_target_cpu_utilization
  backend_container_port      = var.backend_container_port
  log_retention_days          = var.log_retention_days
}
```

## Notes

- First deployment requires pushing an image to ECR
- Task definition updates trigger automatic deployments
- Deployment circuit breaker automatically rolls back failed deployments
- Auto-scaling reacts to traffic changes automatically
- ECS Exec requires AWS Session Manager plugin
