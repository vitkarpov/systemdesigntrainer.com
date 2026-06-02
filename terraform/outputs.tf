# ==================================
# DNS Outputs
# ==================================

output "nameservers" {
  description = "Route53 nameservers - Configure these in your domain registrar"
  value       = module.dns.hosted_zone_nameservers
}

output "hosted_zone_id" {
  description = "Route53 hosted zone ID"
  value       = module.dns.hosted_zone_id
}

# ==================================
# Frontend (App) Outputs
# ==================================

output "frontend_url" {
  description = "Frontend application URL"
  value       = module.frontend.frontend_url
}

output "cloudfront_domain_name" {
  description = "CloudFront domain name for the app"
  value       = module.frontend.cloudfront_domain_name
}

output "s3_bucket_name" {
  description = "S3 bucket name for frontend assets"
  value       = module.frontend.s3_bucket_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID for cache invalidations"
  value       = module.frontend.cloudfront_distribution_id
}

# ==================================
# Website Outputs
# ==================================

output "website_url" {
  description = "Website URL (root domain)"
  value       = module.landing.website_url
}

output "website_s3_bucket_name" {
  description = "S3 bucket name for website assets"
  value       = module.landing.s3_bucket_name
}

output "website_cloudfront_distribution_id" {
  description = "CloudFront distribution ID for website cache invalidations"
  value       = module.landing.cloudfront_distribution_id
}

# ==================================
# Deployment Instructions (static sites only)
# ==================================

output "deployment_instructions" {
  description = "Quick start deployment instructions"
  value       = <<-EOT

    ╔════════════════════════════════════════════════════════════════════╗
    ║  System Design Trainer — static hosting (app + website)            ║
    ╚════════════════════════════════════════════════════════════════════╝

    The API, Lambda, and all backend infrastructure have been retired.
    Only the static app and website remain.

    DNS nameservers (configure at your registrar for ${var.domain_name}):
       ${join("\n       ", module.dns.hosted_zone_nameservers)}

    DEPLOY APP:
       cd app
       npm run build
       aws s3 sync dist/ s3://${module.frontend.s3_bucket_name}/ --delete
       aws cloudfront create-invalidation --distribution-id ${module.frontend.cloudfront_distribution_id} --paths "/*"

    DEPLOY WEBSITE:
       cd website
       aws s3 sync ./ s3://${module.landing.s3_bucket_name}/ --delete
       aws cloudfront create-invalidation --distribution-id ${module.landing.cloudfront_distribution_id} --paths "/*"

    VERIFY:
       - App:     https://${module.dns.app_fqdn}
       - Website: ${module.landing.website_url}

  EOT
}

output "aws_region" {
  description = "AWS region"
  value       = var.aws_region
}
