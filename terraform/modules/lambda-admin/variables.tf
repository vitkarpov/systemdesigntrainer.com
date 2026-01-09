variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., production, staging)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

# Networking
variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for Lambda"
  type        = list(string)
}

variable "rds_security_group_id" {
  description = "ID of the RDS security group"
  type        = string
}

variable "redis_security_group_id" {
  description = "ID of the Redis security group"
  type        = string
}

# Database
variable "rds_endpoint" {
  description = "RDS instance endpoint (host:port or just host)"
  type        = string
}

variable "rds_port" {
  description = "RDS instance port"
  type        = number
  default     = 5432
}

variable "rds_username" {
  description = "RDS master username"
  type        = string
  sensitive   = true
}

variable "rds_database_name" {
  description = "RDS database name"
  type        = string
}

variable "secrets_arn" {
  description = "ARN of the Secrets Manager secret containing database password"
  type        = string
}

# Redis
variable "redis_endpoint" {
  description = "Redis cluster endpoint (configuration endpoint for cluster mode, or primary endpoint)"
  type        = string
}

variable "redis_port" {
  description = "Redis port"
  type        = number
  default     = 6379
}

# Lambda
variable "lambda_image_uri" {
  description = "URI of the Lambda container image in ECR"
  type        = string
}

variable "log_retention_days" {
  description = "CloudWatch Logs retention in days"
  type        = number
  default     = 7
}
