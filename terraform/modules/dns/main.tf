# ==================================
# Route53 Hosted Zone
# ==================================

resource "aws_route53_zone" "main" {
  name = var.domain_name

  tags = {
    Name = "${var.project_name}-${var.environment}-hosted-zone"
  }
}

# ==================================
# ACM Certificate for CloudFront (us-east-1)
# ==================================

resource "aws_acm_certificate" "cloudfront" {
  provider = aws.us_east_1

  domain_name               = "*.${var.domain_name}"
  subject_alternative_names = [var.domain_name]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-cloudfront-cert"
  }
}

# DNS validation records for CloudFront certificate
resource "aws_route53_record" "cloudfront_validation" {
  for_each = {
    for dvo in aws_acm_certificate.cloudfront.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  }

  zone_id = aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60

  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "cloudfront" {
  provider = aws.us_east_1

  certificate_arn         = aws_acm_certificate.cloudfront.arn
  validation_record_fqdns = [for record in aws_route53_record.cloudfront_validation : record.fqdn]
}

# ==================================
# DNS Records
# ==================================

# A record for app.systemdesigntrainer.com → CloudFront
resource "aws_route53_record" "app" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "app.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_zone_id
    evaluate_target_health = false
  }
}

# CNAME record for kohigo.systemdesigntrainer.com → PostHog reverse proxy
resource "aws_route53_record" "kohigo" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "kohigo.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = ["c3ad9ff72cbcd446a7c7.cf-prod-eu-proxy.europehog.com"]
}

# A record for systemdesigntrainer.com (root/apex) → CloudFront (website)
resource "aws_route53_record" "root" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = var.website_cloudfront_domain_name
    zone_id                = var.website_cloudfront_zone_id
    evaluate_target_health = false
  }
}
