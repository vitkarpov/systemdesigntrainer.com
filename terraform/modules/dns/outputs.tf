output "hosted_zone_id" {
  description = "Route53 hosted zone ID"
  value       = aws_route53_zone.main.zone_id
}

output "hosted_zone_nameservers" {
  description = "Route53 hosted zone nameservers (delegate these in your domain registrar)"
  value       = aws_route53_zone.main.name_servers
}

output "acm_certificate_arn_cloudfront" {
  description = "ACM certificate ARN for CloudFront (us-east-1)"
  value       = aws_acm_certificate.cloudfront.arn
}

output "acm_certificate_validation_cloudfront" {
  description = "CloudFront certificate validation resource for dependency management"
  value       = aws_acm_certificate_validation.cloudfront
}

output "app_fqdn" {
  description = "Fully qualified domain name for frontend app"
  value       = "app.${var.domain_name}"
}
