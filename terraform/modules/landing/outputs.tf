output "s3_bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.landing.bucket
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.landing.arn
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.landing.id
}

output "cloudfront_distribution_arn" {
  description = "ARN of the CloudFront distribution"
  value       = aws_cloudfront_distribution.landing.arn
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.landing.domain_name
}

output "cloudfront_zone_id" {
  description = "Zone ID of the CloudFront distribution (for Route53 alias)"
  value       = aws_cloudfront_distribution.landing.hosted_zone_id
}

output "landing_url" {
  description = "Full URL of the landing page"
  value       = "https://${var.domain_name}"
}
