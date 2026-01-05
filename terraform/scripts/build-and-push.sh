#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Building and Pushing Backend to ECR${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TERRAFORM_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$TERRAFORM_DIR")"

cd "$TERRAFORM_DIR"

# Get values from Terraform outputs
echo -e "${BLUE}[1/6] Getting Terraform outputs...${NC}"
ECR_URL=$(terraform output -raw ecr_repository_url 2>/dev/null)
REGION=$(terraform output -raw aws_region 2>/dev/null)
CLUSTER=$(terraform output -raw ecs_cluster_name 2>/dev/null)
SERVICE=$(terraform output -raw ecs_service_name 2>/dev/null)
PROJECT_NAME=$(terraform output -raw project_name 2>/dev/null || echo 'sd-sim')
ENVIRONMENT=$(terraform output -raw environment 2>/dev/null || echo 'production')

if [ -z "$ECR_URL" ]; then
  echo -e "${RED}✗ Failed to get ECR URL from Terraform outputs${NC}"
  echo -e "${YELLOW}  Make sure you've run 'terraform apply' first${NC}"
  exit 1
fi

echo -e "${GREEN}✓ ECR URL: ${ECR_URL}${NC}"
echo -e "${GREEN}✓ Region: ${REGION}${NC}"

# Build Docker image
echo -e "${BLUE}[2/6] Building Docker image...${NC}"
cd "$PROJECT_ROOT/api"

if [ ! -f "Dockerfile" ]; then
  echo -e "${RED}✗ Dockerfile not found in api directory${NC}"
  exit 1
fi

docker build -t sd-sim-backend:latest -f Dockerfile . || {
  echo -e "${RED}✗ Docker build failed${NC}"
  exit 1
}

echo -e "${GREEN}✓ Docker image built successfully${NC}"

# Tag images
echo -e "${BLUE}[3/6] Tagging images...${NC}"
GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "latest")
docker tag sd-sim-backend:latest ${ECR_URL}:latest
docker tag sd-sim-backend:latest ${ECR_URL}:${GIT_SHA}

echo -e "${GREEN}✓ Tagged: ${ECR_URL}:latest${NC}"
echo -e "${GREEN}✓ Tagged: ${ECR_URL}:${GIT_SHA}${NC}"

# Login to ECR
echo -e "${BLUE}[4/6] Logging in to ECR...${NC}"
aws ecr get-login-password --region ${REGION} | \
  docker login --username AWS --password-stdin ${ECR_URL} || {
  echo -e "${RED}✗ ECR login failed${NC}"
  exit 1
}

echo -e "${GREEN}✓ Logged in to ECR${NC}"

# Push images
echo -e "${BLUE}[5/6] Pushing images to ECR...${NC}"
docker push ${ECR_URL}:latest || {
  echo -e "${RED}✗ Failed to push latest tag${NC}"
  exit 1
}

docker push ${ECR_URL}:${GIT_SHA} || {
  echo -e "${RED}✗ Failed to push ${GIT_SHA} tag${NC}"
  exit 1
}

echo -e "${GREEN}✓ Images pushed successfully${NC}"

# Trigger ECS deployment
echo -e "${BLUE}[6/6] Triggering ECS service update...${NC}"
aws ecs update-service \
  --cluster ${CLUSTER} \
  --service ${SERVICE} \
  --force-new-deployment \
  --region ${REGION} \
  > /dev/null || {
  echo -e "${YELLOW}⚠ Failed to trigger ECS deployment (you may need to do it manually)${NC}"
}

echo -e "${GREEN}✓ ECS deployment triggered${NC}"

echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   Backend deployment complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e ""
echo -e "${BLUE}Images pushed:${NC}"
echo -e "  - ${ECR_URL}:latest"
echo -e "  - ${ECR_URL}:${GIT_SHA}"
echo -e ""
echo -e "${BLUE}Monitor deployment:${NC}"
echo -e "  aws ecs describe-services --cluster ${CLUSTER} --services ${SERVICE} --region ${REGION}"
echo -e ""
echo -e "${BLUE}View logs:${NC}"
echo -e "  aws logs tail /ecs/${PROJECT_NAME}-${ENVIRONMENT}-backend --follow --region ${REGION}"
echo -e ""
