# ==================================
# Project Configuration
# ==================================

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "sd-sim"
}

variable "environment" {
  description = "Environment name (e.g., production, staging)"
  type        = string
  default     = "production"
}

variable "domain_name" {
  description = "Root domain name (e.g., systemdesigntrainer.com)"
  type        = string
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "eu-west-1"
}

# ==================================
# Networking Configuration
# ==================================

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones to use"
  type        = list(string)
  default     = ["eu-west-1a", "eu-west-1b"]
}

variable "use_nat_instance" {
  description = "Use NAT instance instead of NAT Gateway (cost optimization)"
  type        = bool
  default     = true
}

# ==================================
# Database Configuration
# ==================================

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "rds_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "rds_database_name" {
  description = "RDS database name"
  type        = string
  default     = "sdsim_production"
}

variable "rds_username" {
  description = "RDS master username"
  type        = string
  default     = "sdsim"
}

variable "enable_multi_az_rds" {
  description = "Enable Multi-AZ for RDS (doubles cost)"
  type        = bool
  default     = false
}

variable "rds_backup_retention_days" {
  description = "Number of days to retain RDS backups"
  type        = number
  default     = 7
}

# ==================================
# Redis Configuration
# ==================================

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t4g.micro"
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes (cost optimization: 1)"
  type        = number
  default     = 1
}

variable "redis_snapshot_retention_limit" {
  description = "Number of days to retain Redis snapshots"
  type        = number
  default     = 5
}

# ==================================
# ECS Configuration
# ==================================

variable "ecs_task_cpu" {
  description = "ECS task CPU units (256 = 0.25 vCPU)"
  type        = number
  default     = 256
}

variable "ecs_task_memory" {
  description = "ECS task memory in MB"
  type        = number
  default     = 512
}

variable "ecs_desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 1
}

variable "ecs_min_count" {
  description = "Minimum number of ECS tasks for auto-scaling"
  type        = number
  default     = 1
}

variable "ecs_max_count" {
  description = "Maximum number of ECS tasks for auto-scaling"
  type        = number
  default     = 3
}

variable "ecs_target_cpu_utilization" {
  description = "Target CPU utilization for auto-scaling"
  type        = number
  default     = 70
}

variable "backend_container_port" {
  description = "Port the backend container listens on"
  type        = number
  default     = 3000
}

# ==================================
# CloudWatch Configuration
# ==================================

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 7
}

# ==================================
# CloudFront Configuration
# ==================================

variable "cloudfront_price_class" {
  description = "CloudFront price class (PriceClass_100 for US/CA/EU only)"
  type        = string
  default     = "PriceClass_100"
}

# ==================================
# Secrets Configuration
# ==================================

variable "secrets" {
  description = "Sensitive environment variables"
  type = object({
    anthropic_api_key         = string
    workos_client_id          = string
    workos_api_key            = string
    stripe_secret_key         = string
    stripe_webhook_secret     = string
    stripe_price_3_interviews = string
    stripe_price_5_interviews = string
    stripe_price_unlimited    = string
  })
  sensitive = true
}

variable "jwt_secret" {
  description = "JWT secret for authentication (min 32 characters). Generate with: openssl rand -base64 32"
  type        = string
  sensitive   = true
}

# ==================================
# Feature Flags
# ==================================

variable "enable_monitoring" {
  description = "Enable detailed monitoring with CloudWatch dashboards and alarms"
  type        = bool
  default     = false
}
