# Frontend Module

This module creates S3 + CloudFront infrastructure for hosting the React SPA frontend.

## Resources Created

- **S3 Bucket** (private) for static assets
- **S3 Versioning** enabled for easy rollbacks
- **S3 Public Access Block** (bucket is private)
- **CloudFront Origin Access Control (OAC)** for secure S3 access
- **CloudFront Distribution** with custom caching and SSL
- **S3 Bucket Policy** allowing CloudFront access only

## Architecture

```
User → app.systemdesigntrainer.com (HTTPS)
  ↓
CloudFront Distribution (Edge Locations)
  ↓
S3 Bucket (Private, via OAC)
```

## CloudFront Configuration

### Origins
- **S3 Bucket**: Via Origin Access Control (OAC) for secure access
- **Domain**: app.systemdesigntrainer.com
- **Protocol**: HTTPS only (redirects HTTP to HTTPS)

### Cache Behaviors

#### Default Behavior (HTML files)
- **Pattern**: `/*` (all files not matching specific patterns)
- **Caching**: None (TTL = 0)
- **Reason**: Allow instant deployments without waiting for cache expiration
- **Compression**: Enabled (gzip, brotli)

#### Assets Behavior (JS, CSS, images)
- **Pattern**: `/assets/*`
- **Caching**: 1 year (TTL = 31536000 seconds)
- **Reason**: Assets are hashed (immutable), safe to cache forever
- **Compression**: Enabled

### Custom Error Responses (SPA Routing)
- **403 → 200** with `/index.html`
- **404 → 200** with `/index.html`
- **Reason**: React Router handles client-side routing, all routes should serve index.html

### SSL/TLS
- **Certificate**: ACM wildcard (*.systemdesigntrainer.com) from us-east-1
- **Protocol**: TLS 1.2 minimum
- **SNI**: Enabled (no dedicated IP, saves ~$600/month)

### Price Class
- **Default**: `PriceClass_100` (US, Canada, Europe)
- **Saves**: ~$5-10/month vs global
- **Upgrade**: Set to `PriceClass_All` for global edge locations

## S3 Configuration

- **Access**: Private (no public access)
- **Versioning**: Enabled (allows rollback to previous versions)
- **Policy**: CloudFront OAC only (no other access allowed)
- **Encryption**: Default SSE-S3 encryption

## Deployment Workflow

### Initial Setup (via Terraform)
```bash
cd terraform
terraform apply
```

### Deploy Frontend
```bash
# 1. Build frontend with API URL
cd ui
VITE_API_URL=https://api.systemdesigntrainer.com npm run build

# 2. Sync to S3
aws s3 sync dist/ s3://sd-sim-production-frontend/ --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "index.html" --exclude "*.html"

# Sync HTML separately (no cache)
aws s3 sync dist/ s3://sd-sim-production-frontend/ \
  --exclude "*" --include "*.html" \
  --cache-control "public,max-age=0,must-revalidate"

# 3. Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id <DISTRIBUTION_ID> \
  --paths "/*"
```

### Rollback to Previous Version
```bash
# List versions
aws s3api list-object-versions \
  --bucket sd-sim-production-frontend \
  --prefix index.html

# Restore specific version
aws s3api copy-object \
  --bucket sd-sim-production-frontend \
  --copy-source sd-sim-production-frontend/index.html?versionId=VERSION_ID \
  --key index.html

# Invalidate cache
aws cloudfront create-invalidation \
  --distribution-id <DISTRIBUTION_ID> \
  --paths "/*"
```

## Cost

- **S3 Storage**: $0.023/GB/month (~$0.02 for 1GB)
- **S3 Requests**: $0.005/1000 PUT, $0.0004/1000 GET (minimal)
- **CloudFront**:
  - **Price Class 100**: $0.085/GB (first 10TB)
  - **Requests**: $0.0075/10,000 HTTP, $0.0100/10,000 HTTPS
- **Estimated**: ~$2-6/month for low traffic

### Cost Breakdown Example (1,000 users/month)
- 1GB storage: $0.02
- 10GB data transfer: $0.85
- 100,000 requests: $1.00
- **Total**: ~$2/month

## Monitoring

### CloudFront Metrics
- **Requests**: Total requests per minute
- **BytesDownloaded**: Data transfer to users
- **ErrorRate**: 4xx and 5xx error rate
- **CacheHitRate**: % of requests served from cache

### S3 Metrics
- **BucketSizeBytes**: Storage used
- **NumberOfObjects**: File count

## Usage

```hcl
module "frontend" {
  source = "./modules/frontend"

  project_name          = var.project_name
  environment           = var.environment
  domain_name           = var.domain_name
  acm_certificate_arn   = module.dns.acm_certificate_arn_cloudfront
  cloudfront_price_class = var.cloudfront_price_class
}
```

## Inputs

| Name | Description | Type | Default |
|------|-------------|------|---------|
| project_name | Project name | string | - |
| environment | Environment name | string | - |
| domain_name | Root domain name | string | - |
| acm_certificate_arn | ACM certificate ARN (us-east-1) | string | - |
| cloudfront_price_class | CloudFront price class | string | PriceClass_100 |

## Outputs

| Name | Description |
|------|-------------|
| s3_bucket_name | S3 bucket name |
| s3_bucket_arn | S3 bucket ARN |
| cloudfront_distribution_id | Distribution ID (for invalidations) |
| cloudfront_domain_name | CloudFront domain (for Route53) |
| cloudfront_zone_id | CloudFront zone ID (for Route53 alias) |
| frontend_url | Full URL (https://app.systemdesigntrainer.com) |

## Security

- **Private S3 Bucket**: No public access, CloudFront only
- **HTTPS Only**: All HTTP traffic redirected to HTTPS
- **TLS 1.2+**: Insecure TLS versions disabled
- **Origin Access Control**: Modern secure S3 access (replaces OAI)
- **No Bucket Website Hosting**: Direct S3 access blocked

## Performance

- **Global CDN**: Content served from edge locations near users
- **Compression**: gzip and brotli for smaller transfer sizes
- **Long Cache**: Assets cached for 1 year (immutable)
- **No HTML Cache**: Instant deployments, no waiting

## Notes

- CloudFront propagation takes 5-15 minutes after creation
- Invalidations take 5-10 minutes to complete
- Cache invalidations are free for first 1,000 paths/month
- S3 versioning allows easy rollbacks
- Route53 A record should alias CloudFront distribution
- OAC is more secure than legacy OAI (Origin Access Identity)
