# ==================================
# DNS Module (Route53 + ACM for the static sites)
# ==================================

module "dns" {
  source = "./modules/dns"

  project_name = var.project_name
  environment  = var.environment
  domain_name  = var.domain_name

  # CloudFront distributions for the app and website
  cloudfront_domain_name         = module.frontend.cloudfront_domain_name
  cloudfront_zone_id             = module.frontend.cloudfront_zone_id
  website_cloudfront_domain_name = module.landing.cloudfront_domain_name
  website_cloudfront_zone_id     = module.landing.cloudfront_zone_id

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }
}

# ==================================
# Frontend Module (S3 + CloudFront) — the app
# ==================================

module "frontend" {
  source = "./modules/frontend"

  project_name               = var.project_name
  environment                = var.environment
  domain_name                = var.domain_name
  acm_certificate_arn        = module.dns.acm_certificate_arn_cloudfront
  acm_certificate_validation = module.dns.acm_certificate_validation_cloudfront
  cloudfront_price_class     = var.cloudfront_price_class
}

# ==================================
# Website Module (S3 + CloudFront) — the landing site
# ==================================

module "landing" {
  source = "./modules/website"

  project_name               = var.project_name
  environment                = var.environment
  domain_name                = var.domain_name
  acm_certificate_arn        = module.dns.acm_certificate_arn_cloudfront
  acm_certificate_validation = module.dns.acm_certificate_validation_cloudfront
  cloudfront_price_class     = var.cloudfront_price_class
}
