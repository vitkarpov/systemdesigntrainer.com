# Storage Module

This module creates RDS PostgreSQL and ElastiCache Redis for the System Design Interview Simulator application.

## Resources Created

### RDS PostgreSQL 16
- **DB Instance** with encryption at rest
- **DB Subnet Group** in private subnets
- **DB Parameter Group** optimized for t4g.micro
- **Random Password** (32 characters, stored in Terraform state and Secrets Manager)
- **Automated Backups** with 7-day retention
- **CloudWatch Logs** for PostgreSQL and upgrade logs

### ElastiCache Redis 7
- **Redis Cluster** with single node (cost-optimized)
- **Subnet Group** in private subnets
- **Parameter Group** with AOF persistence enabled
- **Snapshot Backups** with 5-day retention
- **CloudWatch Logs** for slow query logging

## Database Configuration

### PostgreSQL
- **Engine**: PostgreSQL 16.4
- **Instance**: db.t4g.micro (2 vCPU, 1GB RAM)
- **Storage**: 20GB GP3 (free tier eligible)
- **Storage Encryption**: Enabled (AWS-managed keys)
- **Multi-AZ**: Disabled by default (can enable for HA)
- **Max Connections**: 100
- **Shared Buffers**: 256MB

### Redis
- **Engine**: Redis 7.1
- **Instance**: cache.t4g.micro (2 vCPU, 0.5GB RAM)
- **Nodes**: 1 (single node for cost optimization)
- **Persistence**: AOF enabled (appendfsync: everysec)
- **Snapshots**: Daily, 5-day retention

## Backup Strategy

### RDS Backups
- **Automated backups**: Daily during backup window (3:00-4:00 UTC)
- **Retention**: 7 days
- **Final snapshot**: Created on deletion (production only)
- **Point-in-time recovery**: Enabled

### Redis Snapshots
- **Automated snapshots**: Daily during snapshot window (2:00-3:00 UTC)
- **Retention**: 5 days
- **Restore**: Manual via AWS Console or CLI

## Cost Optimization

### RDS
- **Single-AZ** (not Multi-AZ): Saves ~$13/month
- **t4g.micro instance**: Free tier eligible (750 hours/month first 12 months)
- **20GB storage**: Free tier eligible (20GB/month first 12 months)
- **After free tier**: ~$13/month

### Redis
- **Single node** (not cluster mode): Saves ~$11/month vs 2+ nodes
- **t4g.micro**: Smallest instance, ~$11/month
- **No cluster mode**: Simpler, cheaper, adequate for MVP traffic

**Total Cost**: ~$24/month (or ~$11/month with RDS free tier)

## Scaling Path

### When to Scale RDS
- **CPU > 80%**: Upgrade to db.t4g.small (2 vCPU, 2GB RAM) ~$26/month
- **Connections > 80**: Increase max_connections parameter
- **Storage > 80%**: Auto-scaling enabled (up to 40GB)
- **High Availability**: Enable Multi-AZ (doubles cost)

### When to Scale Redis
- **Memory > 80%**: Upgrade to cache.t4g.small (2 vCPU, 1.37GB RAM) ~$22/month
- **Evictions**: Increase node size or add nodes
- **High Availability**: Enable cluster mode with replicas

## Security

- **Network Isolation**: Both RDS and Redis in private subnets
- **Security Groups**: Only allow access from ECS tasks
- **Encryption**: RDS storage encrypted at rest
- **Password**: 32-character random password stored in Secrets Manager
- **No Public Access**: Databases not accessible from internet

## Monitoring

### RDS Metrics
- CPU Utilization
- Database Connections
- Free Storage Space
- Read/Write IOPS
- Replication Lag (if Multi-AZ)

### Redis Metrics
- CPU Utilization
- Memory Usage (Evictions)
- Cache Hits/Misses
- Network Bytes In/Out

## Usage

```hcl
module "storage" {
  source = "./modules/storage"

  project_name           = var.project_name
  environment            = var.environment
  private_subnet_ids     = module.networking.private_subnet_ids
  rds_security_group_id  = module.networking.rds_security_group_id
  redis_security_group_id = module.networking.redis_security_group_id

  # RDS configuration
  rds_instance_class          = var.rds_instance_class
  rds_allocated_storage       = var.rds_allocated_storage
  rds_database_name           = var.rds_database_name
  rds_username                = var.rds_username
  enable_multi_az_rds         = var.enable_multi_az_rds
  rds_backup_retention_days   = var.rds_backup_retention_days

  # Redis configuration
  redis_node_type               = var.redis_node_type
  redis_num_cache_nodes         = var.redis_num_cache_nodes
  redis_snapshot_retention_limit = var.redis_snapshot_retention_limit

  log_retention_days = var.log_retention_days
}
```

## Outputs

| Name | Description | Sensitive |
|------|-------------|-----------|
| rds_endpoint | RDS endpoint with port | No |
| rds_address | RDS address without port | No |
| rds_port | RDS port (5432) | No |
| rds_database_name | Database name | No |
| rds_username | Master username | Yes |
| rds_password | Master password | Yes |
| rds_connection_string | Full PostgreSQL connection string | Yes |
| redis_endpoint | Redis endpoint address | No |
| redis_port | Redis port (6379) | No |
| redis_connection_string | Redis connection string | No |

## Maintenance Windows

- **RDS Maintenance**: Monday 4:00-5:00 UTC
- **RDS Backup**: Daily 3:00-4:00 UTC
- **Redis Maintenance**: Monday 3:00-4:00 UTC
- **Redis Snapshot**: Daily 2:00-3:00 UTC

## Connection Strings

### PostgreSQL (NestJS)
```typescript
DATABASE_URL=postgresql://<username>:<password>@<endpoint>/<database>
```

### Redis (NestJS)
```typescript
REDIS_HOST=<redis-endpoint>
REDIS_PORT=6379
```

## Notes

- RDS password is auto-generated and stored in Terraform state (also stored in Secrets Manager)
- Final snapshot is created on RDS deletion (production only)
- Redis data persists with AOF (survives restarts)
- CloudWatch logs enabled for troubleshooting
- Multi-AZ can be enabled later with zero downtime
