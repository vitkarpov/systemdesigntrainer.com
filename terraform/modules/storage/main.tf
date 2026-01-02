# ==================================
# RDS PostgreSQL
# ==================================

# Generate random password for RDS
resource "random_password" "rds_password" {
  length  = 32
  special = true
  # Avoid characters that might cause issues in connection strings
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# RDS subnet group
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-rds-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "${var.project_name}-${var.environment}-rds-subnet-group"
  }
}

# RDS PostgreSQL instance
resource "aws_db_instance" "postgresql" {
  identifier     = "${var.project_name}-${var.environment}-postgres"
  engine         = "postgres"
  engine_version = "16.3"

  # Instance configuration
  instance_class        = var.rds_instance_class
  allocated_storage     = var.rds_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  max_allocated_storage = var.rds_allocated_storage * 2 # Allow auto-scaling up to 2x

  # Database configuration
  db_name  = var.rds_database_name
  username = var.rds_username
  password = random_password.rds_password.result
  port     = 5432

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.rds_security_group_id]
  publicly_accessible    = false
  multi_az               = var.enable_multi_az_rds

  # Backup configuration
  backup_retention_period = var.rds_backup_retention_days
  backup_window           = "03:00-04:00" # UTC
  maintenance_window      = "Mon:04:00-Mon:05:00"
  copy_tags_to_snapshot   = true

  # Deletion protection
  deletion_protection = var.environment == "production" ? true : false
  skip_final_snapshot = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "${var.project_name}-${var.environment}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null

  # Performance insights
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  # Parameter group
  parameter_group_name = aws_db_parameter_group.postgresql.name

  tags = {
    Name = "${var.project_name}-${var.environment}-postgres"
  }

  lifecycle {
    ignore_changes = [
      final_snapshot_identifier # Ignore timestamp changes
    ]
  }
}

# RDS parameter group
resource "aws_db_parameter_group" "postgresql" {
  name   = "${var.project_name}-${var.environment}-postgres-params"
  family = "postgres16"

  # Optimize for small instance
  parameter {
    name         = "shared_buffers"
    value        = "32768" # 256MB for t4g.micro (1GB RAM)
    apply_method = "pending-reboot"
  }

  parameter {
    name         = "max_connections"
    value        = "100"
    apply_method = "pending-reboot"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-postgres-params"
  }
}

# ==================================
# ElastiCache Redis
# ==================================

# Redis subnet group
resource "aws_elasticache_subnet_group" "redis" {
  name       = "${var.project_name}-${var.environment}-redis-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-subnet-group"
  }
}

# Redis parameter group
resource "aws_elasticache_parameter_group" "redis" {
  name   = "${var.project_name}-${var.environment}-redis-params"
  family = "redis7"

  # Note: appendonly parameter cannot be modified after creation
  # If you need AOF persistence, you must destroy and recreate this parameter group
  # parameter {
  #   name  = "appendonly"
  #   value = "yes"
  # }
  #
  # parameter {
  #   name  = "appendfsync"
  #   value = "everysec"
  # }

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-params"
  }
}

# Redis cluster
resource "aws_elasticache_cluster" "redis" {
  cluster_id = "${var.project_name}-${var.environment}-redis"
  engine     = "redis"
  engine_version = "7.1"
  node_type      = var.redis_node_type
  num_cache_nodes = var.redis_num_cache_nodes
  port            = 6379

  # Network configuration
  subnet_group_name    = aws_elasticache_subnet_group.redis.name
  security_group_ids   = [var.redis_security_group_id]
  parameter_group_name = aws_elasticache_parameter_group.redis.name

  # Snapshot configuration
  snapshot_retention_limit = var.redis_snapshot_retention_limit
  snapshot_window          = "02:00-03:00" # UTC
  maintenance_window       = "Mon:03:00-Mon:04:00"

  # Logging
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "slow-log"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-redis"
  }
}

# CloudWatch log group for Redis slow queries
resource "aws_cloudwatch_log_group" "redis_slow_log" {
  name              = "/aws/elasticache/${var.project_name}-${var.environment}-redis/slow-log"
  retention_in_days = var.log_retention_days

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-slow-log"
  }
}
