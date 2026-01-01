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
}

variable "cloudfront_zone_id" {
  description = "CloudFront distribution hosted zone ID"
  type        = string
}

variable "alb_dns_name" {
  description = "ALB DNS name for api subdomain"
  type        = string
}

variable "alb_zone_id" {
  description = "ALB hosted zone ID"
  type        = string
}

variable "landing_cloudfront_domain_name" {
  description = "CloudFront distribution domain name for root domain landing page (optional - can be same as app)"
  type        = string
}

variable "landing_cloudfront_zone_id" {
  description = "CloudFront distribution hosted zone ID for landing page (optional - can be same as app)"
  type        = string
}
