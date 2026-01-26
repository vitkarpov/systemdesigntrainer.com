output "s3_bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.frontend.bucket
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.frontend.arn
}

output "s3_bucket_regional_domain_name" {
  description = "Regional domain name of the S3 bucket"
  value       = aws_s3_bucket.frontend.bucket_regional_domain_name
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.frontend.id
}

output "cloudfront_distribution_arn" {
  description = "ARN of the CloudFront distribution"
  value       = aws_cloudfront_distribution.frontend.arn
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "cloudfront_zone_id" {
  description = "Zone ID of the CloudFront distribution (for Route53 alias)"
  value       = aws_cloudfront_distribution.frontend.hosted_zone_id
}

output "frontend_url" {
  description = "Full URL of the frontend application"
  value       = "https://app.${var.domain_name}"
}

output "response_headers_policy_id" {
  description = "ID of the CloudFront response headers policy"
  value       = aws_cloudfront_response_headers_policy.security_headers.id
}
