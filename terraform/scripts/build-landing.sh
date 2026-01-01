#!/bin/bash
set -e

# ==================================
# Deploy Landing Page to S3 + CloudFront
# ==================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TERRAFORM_DIR="$PROJECT_ROOT/terraform"
LANDING_DIR="$PROJECT_ROOT/landing"

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║  Landing Page Deployment                                          ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Check if landing directory exists
if [ ! -d "$LANDING_DIR" ]; then
  echo "❌ Error: Landing directory not found at $LANDING_DIR"
  echo ""
  echo "Please create a landing/ directory with your landing page files:"
  echo "  landing/"
  echo "  ├── index.html"
  echo "  ├── styles.css"
  echo "  ├── script.js"
  echo "  └── images/"
  exit 1
fi

# Check if index.html exists
if [ ! -f "$LANDING_DIR/index.html" ]; then
  echo "❌ Error: index.html not found in $LANDING_DIR"
  exit 1
fi

# Get S3 bucket name from Terraform output
cd "$TERRAFORM_DIR"
echo "📦 Getting S3 bucket name..."
BUCKET_NAME=$(terraform output -raw landing_s3_bucket_name 2>/dev/null)
if [ -z "$BUCKET_NAME" ]; then
  echo "❌ Error: Could not get landing_s3_bucket_name from Terraform outputs"
  echo "Make sure you have run 'terraform apply' first"
  exit 1
fi

echo "   Bucket: $BUCKET_NAME"
echo ""

# Get CloudFront distribution ID
echo "🌐 Getting CloudFront distribution ID..."
DISTRIBUTION_ID=$(terraform output -raw landing_cloudfront_distribution_id 2>/dev/null)
if [ -z "$DISTRIBUTION_ID" ]; then
  echo "❌ Error: Could not get landing_cloudfront_distribution_id from Terraform outputs"
  exit 1
fi

echo "   Distribution ID: $DISTRIBUTION_ID"
echo ""

# Get AWS region
AWS_REGION=$(terraform output -raw aws_region 2>/dev/null || echo "eu-west-1")

# Sync to S3 with appropriate cache control headers
echo "☁️  Uploading landing page to S3..."
cd "$LANDING_DIR"

# Upload HTML files with no-cache
aws s3 sync . s3://"$BUCKET_NAME"/ \
  --exclude "*" \
  --include "*.html" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --metadata-directive REPLACE \
  --region "$AWS_REGION"

# Upload CSS/JS with 1-year cache
aws s3 sync . s3://"$BUCKET_NAME"/ \
  --exclude "*" \
  --include "*.css" \
  --include "*.js" \
  --cache-control "public, max-age=31536000, immutable" \
  --metadata-directive REPLACE \
  --region "$AWS_REGION"

# Upload images with 1-year cache
aws s3 sync . s3://"$BUCKET_NAME"/ \
  --exclude "*" \
  --include "*.png" \
  --include "*.jpg" \
  --include "*.jpeg" \
  --include "*.gif" \
  --include "*.svg" \
  --include "*.ico" \
  --cache-control "public, max-age=31536000, immutable" \
  --metadata-directive REPLACE \
  --region "$AWS_REGION"

# Upload any remaining files
aws s3 sync . s3://"$BUCKET_NAME"/ \
  --exclude "*.html" \
  --exclude "*.css" \
  --exclude "*.js" \
  --exclude "*.png" \
  --exclude "*.jpg" \
  --exclude "*.jpeg" \
  --exclude "*.gif" \
  --exclude "*.svg" \
  --exclude "*.ico" \
  --delete \
  --region "$AWS_REGION"

echo "✅ Landing page uploaded successfully"
echo ""

# Invalidate CloudFront cache
echo "🔄 Invalidating CloudFront cache..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text)

echo "   Invalidation ID: $INVALIDATION_ID"
echo ""

# Get landing URL
LANDING_URL=$(terraform output -raw landing_url 2>/dev/null || echo "https://systemdesigntrainer.com")

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║  Landing Page Deployment Complete!                                ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""
echo "🎯 Landing Page URL: $LANDING_URL"
echo ""
echo "⏳ Note: CloudFront invalidation may take 1-5 minutes to complete."
echo "   You can check status with:"
echo "   aws cloudfront get-invalidation --distribution-id $DISTRIBUTION_ID --id $INVALIDATION_ID"
echo ""
