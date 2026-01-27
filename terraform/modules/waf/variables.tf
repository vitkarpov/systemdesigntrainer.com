variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, production)"
  type        = string
}

variable "alb_arn" {
  description = "ARN of the Application Load Balancer to protect"
  type        = string
}

variable "log_retention_days" {
  description = "Number of days to retain WAF logs in CloudWatch"
  type        = number
  default     = 7
}

variable "enable_log_sampling" {
  description = "Enable log sampling to only log blocked requests (reduces CloudWatch costs)"
  type        = bool
  default     = true
}

variable "enable_logging" {
  description = "Enable WAF logging to CloudWatch (disable to save costs)"
  type        = bool
  default     = true
}
