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
# URLs
# ==================================

output "frontend_url" {
  description = "Frontend application URL"
  value       = module.frontend.frontend_url
}

output "api_url" {
  description = "Backend API URL"
  value       = "https://${module.dns.api_fqdn}"
}

output "alb_dns_name" {
  description = "ALB DNS name (before Route53 setup)"
  value       = module.alb.alb_dns_name
}

output "cloudfront_domain_name" {
  description = "CloudFront domain name (before Route53 setup)"
  value       = module.frontend.cloudfront_domain_name
}

# ==================================
# Container Outputs
# ==================================

output "ecr_repository_url" {
  description = "ECR repository URL for pushing Docker images"
  value       = module.container.ecr_repository_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.container.ecs_cluster_name
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = module.container.ecs_service_name
}

# ==================================
# Frontend Outputs
# ==================================

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
# Database Outputs
# ==================================

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = module.storage.rds_endpoint
}

output "redis_endpoint" {
  description = "Redis endpoint"
  value       = module.storage.redis_connection_string
}

# ==================================
# Secrets Outputs
# ==================================

output "secrets_arn" {
  description = "ARN of Secrets Manager secret"
  value       = module.secrets.secret_arn
}

# ==================================
# Deployment Instructions
# ==================================

output "deployment_instructions" {
  description = "Quick start deployment instructions"
  value       = <<-EOT

    ╔════════════════════════════════════════════════════════════════════╗
    ║  System Design Interview Simulator - AWS Deployment Complete!     ║
    ╚════════════════════════════════════════════════════════════════════╝

    🎯 Next Steps:

    1. CONFIGURE DNS (CRITICAL):
       Update nameservers in your domain registrar for systemdesigntrainer.com:
       ${join("\n       ", module.dns.hosted_zone_nameservers)}

       Wait 5-60 minutes for DNS propagation.

    2. BUILD & PUSH BACKEND:
       cd api
       docker build -t sd-sim-backend .
       aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${module.container.ecr_repository_url}
       docker tag sd-sim-backend:latest ${module.container.ecr_repository_url}:latest
       docker push ${module.container.ecr_repository_url}:latest

    3. DEPLOY BACKEND:
       aws ecs update-service --cluster ${module.container.ecs_cluster_name} --service ${module.container.ecs_service_name} --force-new-deployment --region ${var.aws_region}

       Monitor: aws logs tail /ecs/${var.project_name}-${var.environment}-backend --follow --region ${var.aws_region}

    4. BUILD & DEPLOY FRONTEND:
       cd app
       VITE_API_URL=${module.dns.api_fqdn} npm run build
       aws s3 sync dist/ s3://${module.frontend.s3_bucket_name}/ --delete
       aws cloudfront create-invalidation --distribution-id ${module.frontend.cloudfront_distribution_id} --paths "/*"

    5. DEPLOY WEBSITE:
       cd website
       aws s3 sync ./ s3://${module.landing.s3_bucket_name}/ --delete
       aws cloudfront create-invalidation --distribution-id ${module.landing.cloudfront_distribution_id} --paths "/*"

    6. CONFIGURE EXTERNAL SERVICES:
       - WorkOS: Add redirect URI: https://${module.dns.api_fqdn}/auth/callback
       - Stripe: Add webhook: https://${module.dns.api_fqdn}/payments/webhook

    7. VERIFY:
       - Backend: https://${module.dns.api_fqdn}/health
       - Frontend: https://${module.dns.app_fqdn}
       - Website: ${module.landing.website_url}

    📚 Documentation:
       - Deployment scripts: terraform/scripts/
       - Module READMEs: terraform/modules/*/README.md
       - Plan: ~/.claude/plans/pure-dazzling-metcalfe.md

  EOT
}

output "aws_region" {
  description = "AWS region"
  value       = var.aws_region
}
