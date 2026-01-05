#!/bin/bash

# Build and push Lambda Docker image to ECR
# Usage: ./build-lambda.sh

set -e  # Exit on error

# Configuration
AWS_REGION="eu-west-1"
AWS_ACCOUNT_ID="987988470565"
ECR_REPOSITORY="sd-sim-production-lambda-admin"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE_NAME="${ECR_REGISTRY}/${ECR_REPOSITORY}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Building Lambda Admin Function${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo -e "${YELLOW}Error: Docker is not running${NC}"
  exit 1
fi

# Login to ECR
echo -e "${GREEN}[1/3] Logging in to Amazon ECR...${NC}"
aws ecr get-login-password --region ${AWS_REGION} | \
  docker login --username AWS --password-stdin ${ECR_REGISTRY}

# Build the image
echo -e "${GREEN}[2/3] Building Docker image for ARM64...${NC}"
docker buildx build \
  --platform linux/arm64 \
  -f Dockerfile.lambda \
  -t ${IMAGE_NAME}:latest \
  -t ${IMAGE_NAME}:${TIMESTAMP} \
  --push \
  .

echo -e "${GREEN}✓ Pushed tags: latest, ${TIMESTAMP}${NC}"

# Update Lambda function (optional)
echo -e "${GREEN}[3/3] Updating Lambda function...${NC}"
if aws lambda get-function --function-name sd-sim-production-admin --region ${AWS_REGION} > /dev/null 2>&1; then
  aws lambda update-function-code \
    --function-name sd-sim-production-admin \
    --image-uri ${IMAGE_NAME}:latest \
    --region ${AWS_REGION} \
    --output json > /dev/null
  echo -e "${GREEN}✓ Lambda function updated${NC}"
else
  echo -e "${YELLOW}⚠ Lambda function not found (will be created by Terraform)${NC}"
fi

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Build complete!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo "Image: ${IMAGE_NAME}:latest"
echo ""
echo "To deploy with Terraform:"
echo "  cd ../terraform"
echo "  terraform apply"
