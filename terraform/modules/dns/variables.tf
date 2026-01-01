variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "domain_name" {
  description = "Root domain name (e.g., systemdesigntrainer.com)"
  type        = string
}

variable "cloudfront_domain_name" {
  description = "CloudFront distribution domain name for app subdomain"
  type        = string
  default     = null
}

variable "cloudfront_zone_id" {
  description = "CloudFront distribution hosted zone ID"
  type        = string
  default     = null
}

variable "alb_dns_name" {
  description = "ALB DNS name for api subdomain"
  type        = string
  default     = null
}

variable "alb_zone_id" {
  description = "ALB hosted zone ID"
  type        = string
  default     = null
}
