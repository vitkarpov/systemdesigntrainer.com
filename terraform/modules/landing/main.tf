# ==================================
# S3 Bucket for Landing Page
# ==================================

resource "aws_s3_bucket" "landing" {
  bucket = "${var.project_name}-${var.environment}-landing"

  tags = {
    Name = "${var.project_name}-${var.environment}-landing"
  }
}

# Enable versioning
resource "aws_s3_bucket_versioning" "landing" {
  bucket = aws_s3_bucket.landing.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Configure public access block for static website hosting
# Block individual ACLs but allow bucket policies for public access
resource "aws_s3_bucket_public_access_block" "landing" {
  bucket = aws_s3_bucket.landing.id

  block_public_acls       = true
  block_public_policy     = false  # Must be false to allow public bucket policy
  ignore_public_acls      = true
  restrict_public_buckets = false  # Must be false to allow public bucket policy
}

# Configure bucket for static website hosting
resource "aws_s3_bucket_website_configuration" "landing" {
  bucket = aws_s3_bucket.landing.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "404.html"
  }
}

# ==================================
# CloudFront Distribution
# ==================================

locals {
  s3_origin_id = "S3-${aws_s3_bucket.landing.id}"
  # S3 website endpoint (not REST API endpoint) to enable index.html auto-serving
  s3_website_endpoint = aws_s3_bucket_website_configuration.landing.website_endpoint
}

resource "aws_cloudfront_distribution" "landing" {
  depends_on = [var.acm_certificate_validation]

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = var.cloudfront_price_class
  aliases             = [var.domain_name]

  origin {
    # Use S3 website endpoint for automatic index.html serving
    domain_name = local.s3_website_endpoint
    origin_id   = local.s3_origin_id

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only" # S3 website endpoints only support HTTP
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Default cache behavior
  default_cache_behavior {
    target_origin_id       = local.s3_origin_id
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    min_ttl     = 0
    default_ttl = 3600   # 1 hour
    max_ttl     = 86400  # 24 hours

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  # SSL/TLS configuration
  viewer_certificate {
    acm_certificate_arn      = var.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-landing-cloudfront"
  }
}

# ==================================
# S3 Bucket Policy for Static Website
# ==================================

data "aws_iam_policy_document" "landing_public_read" {
  statement {
    sid    = "PublicReadGetObject"
    effect = "Allow"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions = [
      "s3:GetObject"
    ]

    resources = [
      "${aws_s3_bucket.landing.arn}/*"
    ]
  }
}

resource "aws_s3_bucket_policy" "landing_public_read" {
  depends_on = [aws_s3_bucket_public_access_block.landing]

  bucket = aws_s3_bucket.landing.id
  policy = data.aws_iam_policy_document.landing_public_read.json
}
