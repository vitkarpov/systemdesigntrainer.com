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

# Check if dist directory exists
if [ ! -d "$LANDING_DIR/dist" ]; then
  echo "❌ Error: dist directory not found at $LANDING_DIR/dist"
  echo "Please build the landing page first (e.g., npm run build)"
  exit 1
fi

# Check if index.html exists in dist
if [ ! -f "$LANDING_DIR/dist/index.html" ]; then
  echo "❌ Error: index.html not found in $LANDING_DIR/dist"
  exit 1
fi

# Get S3 bucket name from Terraform output
cd "$TERRAFORM_DIR"

# First check if terraform state has any outputs
echo "📦 Checking Terraform state..."
OUTPUT_CHECK=$(terraform output -json 2>&1)
if echo "$OUTPUT_CHECK" | grep -q "No outputs found"; then
  echo "❌ Error: No Terraform outputs found"
  echo ""
  echo "It appears Terraform hasn't been applied yet or the state is empty."
  echo "Please run 'terraform apply' first to create the infrastructure."
  exit 1
fi

echo "📦 Getting S3 bucket name..."
BUCKET_NAME=$(terraform output -raw landing_s3_bucket_name 2>&1 | grep -v "^╷\|^│\|^╵")
if [ -z "$BUCKET_NAME" ] || echo "$BUCKET_NAME" | grep -q "Warning:"; then
  echo "❌ Error: Could not get landing_s3_bucket_name from Terraform outputs"
  echo "Make sure you have run 'terraform apply' first"
  exit 1
fi

echo "   Bucket: $BUCKET_NAME"
echo ""

# Get CloudFront distribution ID
echo "🌐 Getting CloudFront distribution ID..."
DISTRIBUTION_ID=$(terraform output -raw landing_cloudfront_distribution_id 2>&1 | grep -v "^╷\|^│\|^╵")
if [ -z "$DISTRIBUTION_ID" ] || echo "$DISTRIBUTION_ID" | grep -q "Warning:"; then
  echo "❌ Error: Could not get landing_cloudfront_distribution_id from Terraform outputs"
  exit 1
fi

echo "   Distribution ID: $DISTRIBUTION_ID"
echo ""

# Get AWS region
AWS_REGION=$(terraform output -raw aws_region 2>&1 | grep -v "^╷\|^│\|^╵")
if [ -z "$AWS_REGION" ] || echo "$AWS_REGION" | grep -q "Warning:"; then
  AWS_REGION="eu-west-1"
  echo "⚠️  Warning: Could not get aws_region from Terraform, using default: $AWS_REGION"
fi

# Sync to S3 with appropriate cache control headers
echo "☁️  Uploading landing page to S3..."
cd "$LANDING_DIR/dist"

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
cd "$TERRAFORM_DIR"
LANDING_URL=$(terraform output -raw landing_url 2>&1 | grep -v "^╷\|^│\|^╵")
if [ -z "$LANDING_URL" ] || echo "$LANDING_URL" | grep -q "Warning:"; then
  LANDING_URL="https://systemdesigntrainer.com"
fi

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
