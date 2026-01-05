# DNS Module

This module manages Route53 hosted zone and ACM SSL/TLS certificates for the System Design Interview Simulator application.

## Resources Created

- **Route53 Hosted Zone** for systemdesigntrainer.com
- **ACM Certificate (us-east-1)** for CloudFront (wildcard: *.systemdesigntrainer.com)
- **ACM Certificate (regional)** for ALB (wildcard: *.systemdesigntrainer.com)
- **DNS Validation Records** for automatic certificate validation
- **A Records** for app.systemdesigntrainer.com and api.systemdesigntrainer.com

## DNS Configuration

### Subdomain Setup
- **app.systemdesigntrainer.com** → CloudFront distribution (frontend)
- **api.systemdesigntrainer.com** → Application Load Balancer (backend)
- **systemdesigntrainer.com** (root) → Not managed by this module (for website)

### Certificate Strategy
- **Wildcard certificates** (*.systemdesigntrainer.com) cover both app and api subdomains
- **Two certificates** are required:
  1. **us-east-1**: For CloudFront (must be in us-east-1)
  2. **Regional**: For ALB in the deployment region
- **DNS validation** is automatic via Route53

## Important: DNS Delegation

After deploying this module, you must delegate your domain to Route53:

1. Get the nameservers from Terraform output:
   ```bash
   terraform output hosted_zone_nameservers
   ```

2. Log in to your domain registrar (where you bought systemdesigntrainer.com)

3. Update the nameservers to the values from step 1:
   ```
   ns-XXXX.awsdns-XX.org
   ns-XXX.awsdns-XX.co.uk
   ns-XXX.awsdns-XX.com
   ns-XXX.awsdns-XX.net
   ```

4. Wait for DNS propagation (5-60 minutes)

5. Verify with:
   ```bash
   dig app.systemdesigntrainer.com
   dig api.systemdesigntrainer.com
   ```

## Usage

```hcl
module "dns" {
  source = "./modules/dns"

  # Required inputs
  project_name = var.project_name
  environment  = var.environment
  domain_name  = var.domain_name

  # Optional: Set after creating ALB and CloudFront
  alb_dns_name           = module.alb.dns_name
  alb_zone_id            = module.alb.zone_id
  cloudfront_domain_name = module.frontend.cloudfront_domain_name
  cloudfront_zone_id     = module.frontend.cloudfront_zone_id

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| project_name | Project name for resource naming | string | - | yes |
| environment | Environment name | string | - | yes |
| domain_name | Root domain name | string | - | yes |
| cloudfront_domain_name | CloudFront domain for app subdomain | string | null | no |
| cloudfront_zone_id | CloudFront hosted zone ID | string | null | no |
| alb_dns_name | ALB DNS name for api subdomain | string | null | no |
| alb_zone_id | ALB hosted zone ID | string | null | no |

## Outputs

| Name | Description |
|------|-------------|
| hosted_zone_id | Route53 hosted zone ID |
| hosted_zone_nameservers | Nameservers for domain delegation |
| acm_certificate_arn_cloudfront | ACM certificate ARN for CloudFront |
| acm_certificate_arn_alb | ACM certificate ARN for ALB |
| app_fqdn | Frontend domain (app.systemdesigntrainer.com) |
| api_fqdn | Backend domain (api.systemdesigntrainer.com) |

## Certificate Validation

ACM certificates are validated automatically via DNS:
- Terraform creates validation records in Route53
- AWS validates domain ownership
- Validation typically completes in 5-10 minutes

## Cost

- **Route53 Hosted Zone**: $0.50/month
- **DNS Queries**: $0.40 per million queries (first billion), $0.20 after
- **ACM Certificates**: Free
- **Estimated**: ~$1-2/month for low traffic

## Notes

- DNS A records are created only if ALB and CloudFront resources exist
- Certificate validation is automatic and handled by Terraform
- Wildcard certificates cover unlimited subdomains
- Root domain (systemdesigntrainer.com) is not managed by this module
