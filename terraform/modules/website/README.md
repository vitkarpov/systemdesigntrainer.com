# Website Module

This module creates the infrastructure for hosting a static website on the root domain (systemdesigntrainer.com) using S3 and CloudFront.

## Features

- **S3 Bucket**: Private bucket for hosting static assets
- **CloudFront CDN**: Fast global content delivery with custom domain
- **SSL/TLS**: HTTPS with ACM certificate
- **Cost Optimized**: Price Class 100 (US, Canada, Europe only)
- **SPA Support**: Custom error responses (403/404 → index.html)

## Architecture

```
systemdesigntrainer.com
    ↓
Route53 A Record
    ↓
CloudFront Distribution
    ↓
S3 Bucket (Private)
    ↓
Website Assets (index.html, CSS, JS, images)
```

## Requirements

- ACM certificate in us-east-1 (for CloudFront)
- Route53 hosted zone for domain

## Usage

```hcl
module "website" {
  source = "./modules/website"

  project_name           = "sd-sim"
  environment            = "production"
  domain_name            = "systemdesigntrainer.com"
  acm_certificate_arn    = "arn:aws:acm:us-east-1:..."
  cloudfront_price_class = "PriceClass_100"
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| project_name | Project name for resource naming | string | - | yes |
| environment | Environment name (e.g., production, staging) | string | - | yes |
| domain_name | Root domain name (e.g., systemdesigntrainer.com) | string | - | yes |
| acm_certificate_arn | ACM certificate ARN (must be in us-east-1) | string | - | yes |
| cloudfront_price_class | CloudFront price class | string | PriceClass_100 | no |

## Outputs

| Name | Description |
|------|-------------|
| s3_bucket_name | Name of the S3 bucket |
| s3_bucket_arn | ARN of the S3 bucket |
| cloudfront_distribution_id | CloudFront distribution ID (for cache invalidations) |
| cloudfront_distribution_arn | CloudFront distribution ARN |
| cloudfront_domain_name | CloudFront domain name (for Route53 alias) |
| cloudfront_zone_id | CloudFront hosted zone ID (for Route53 alias) |
| website_url | Full URL of the website |

## Deployment

### 1. Build Your Website

Create your static website in a `website/` directory at the project root:

```bash
website/
├── index.html
├── styles.css
├── script.js
└── images/
    └── logo.png
```

### 2. Deploy to S3

```bash
# Sync files to S3
aws s3 sync website/ s3://$(terraform output -raw website_s3_bucket_name)/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id $(terraform output -raw website_cloudfront_distribution_id) \
  --paths "/*"
```

### 3. Verify

Visit your website:
```bash
open $(terraform output -raw website_url)
```

## Cache Configuration

- **HTML files**: No cache (always fresh)
- **Static assets** (/assets/*): 1 year cache
- **Default TTL**: 1 hour
- **Max TTL**: 24 hours

## Cost Estimate

- **S3 Storage**: $0.023/GB/month (~$0.10/month for 4GB website)
- **CloudFront**: ~$0.50-2/month (depends on traffic)
- **Total**: ~$0.60-2.10/month

## Security

- S3 bucket is private (no public access)
- CloudFront uses Origin Access Control (OAC)
- HTTPS only with TLS 1.2+ minimum
- Bucket policy allows only CloudFront access

## Notes

- The website is separate from the main app (app.systemdesigntrainer.com)
- This module only creates infrastructure, not the website content
- You need to create and deploy your own HTML/CSS/JS files
- For SPA routing, 403/404 errors redirect to index.html
