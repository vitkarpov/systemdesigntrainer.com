#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Building and Deploying Frontend${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TERRAFORM_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$TERRAFORM_DIR")"

cd "$TERRAFORM_DIR"

# Get values from Terraform outputs
echo -e "${BLUE}[1/5] Getting Terraform outputs...${NC}"
S3_BUCKET=$(terraform output -raw s3_bucket_name 2>/dev/null)
CF_DIST_ID=$(terraform output -raw cloudfront_distribution_id 2>/dev/null)
API_URL=$(terraform output -raw api_url 2>/dev/null)
FRONTEND_URL=$(terraform output -raw frontend_url 2>/dev/null || echo 'https://app.systemdesigntrainer.com')

if [ -z "$S3_BUCKET" ] || [ -z "$CF_DIST_ID" ]; then
  echo -e "${RED}✗ Failed to get S3 bucket or CloudFront distribution from Terraform outputs${NC}"
  echo -e "${YELLOW}  Make sure you've run 'terraform apply' first${NC}"
  exit 1
fi

echo -e "${GREEN}✓ S3 Bucket: ${S3_BUCKET}${NC}"
echo -e "${GREEN}✓ CloudFront Distribution: ${CF_DIST_ID}${NC}"
echo -e "${GREEN}✓ API URL: ${API_URL}${NC}"
echo -e "${GREEN}✓ Frontend URL: ${FRONTEND_URL}${NC}"

# Build frontend
echo -e "${BLUE}[2/5] Building frontend...${NC}"
cd "$PROJECT_ROOT/app"

if [ ! -f "package.json" ]; then
  echo -e "${RED}✗ package.json not found in app directory${NC}"
  exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo -e "${BLUE}Installing dependencies...${NC}"
  npm install || {
    echo -e "${RED}✗ npm install failed${NC}"
    exit 1
  }
fi

# Build with API URL
VITE_API_URL=${API_URL} npm run build || {
  echo -e "${RED}✗ Frontend build failed${NC}"
  exit 1
}

# Verify build output
if [ ! -d "dist" ]; then
  echo -e "${RED}✗ Build failed! dist/ directory not found${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Frontend built successfully${NC}"
echo -e "${BLUE}Build size: $(du -sh dist 2>/dev/null | awk '{print $1}')${NC}"

# Sync assets to S3 (with long cache)
echo -e "${BLUE}[3/5] Syncing assets to S3...${NC}"
aws s3 sync dist/ s3://${S3_BUCKET}/ \
  --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "index.html" \
  --exclude "*.html" || {
  echo -e "${RED}✗ Failed to sync assets to S3${NC}"
  exit 1
}

# Sync HTML files separately (no cache)
echo -e "${BLUE}Syncing HTML files (no cache)...${NC}"
aws s3 sync dist/ s3://${S3_BUCKET}/ \
  --exclude "*" \
  --include "*.html" \
  --cache-control "public,max-age=0,must-revalidate" || {
  echo -e "${RED}✗ Failed to sync HTML files to S3${NC}"
  exit 1
}

echo -e "${GREEN}✓ Files synced to S3${NC}"

# List uploaded files
echo -e "${BLUE}[4/5] Verifying uploaded files...${NC}"
FILE_COUNT=$(aws s3 ls s3://${S3_BUCKET}/ --recursive | wc -l | tr -d ' ')
echo -e "${GREEN}✓ ${FILE_COUNT} files uploaded${NC}"

# Invalidate CloudFront cache
echo -e "${BLUE}[5/5] Invalidating CloudFront cache...${NC}"
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id ${CF_DIST_ID} \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text) || {
  echo -e "${YELLOW}⚠ Failed to create CloudFront invalidation (manual invalidation may be needed)${NC}"
  INVALIDATION_ID="N/A"
}

if [ "$INVALIDATION_ID" != "N/A" ]; then
  echo -e "${GREEN}✓ CloudFront invalidation created: ${INVALIDATION_ID}${NC}"
fi

echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   Frontend deployment complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e ""
echo -e "${BLUE}Frontend URL:${NC} ${FRONTEND_URL}"
echo -e ""
if [ "$INVALIDATION_ID" != "N/A" ]; then
  echo -e "${BLUE}Monitor invalidation:${NC}"
  echo -e "  aws cloudfront get-invalidation --distribution-id ${CF_DIST_ID} --id ${INVALIDATION_ID}"
  echo -e ""
  echo -e "${YELLOW}Note: CloudFront invalidation takes 5-10 minutes to complete${NC}"
fi
