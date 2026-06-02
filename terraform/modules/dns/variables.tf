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

variable "website_cloudfront_domain_name" {
  description = "CloudFront distribution domain name for root domain website (optional - can be same as app)"
  type        = string
}

variable "website_cloudfront_zone_id" {
  description = "CloudFront distribution hosted zone ID for website (optional - can be same as app)"
  type        = string
}
