#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   System Design Interview Simulator - Full Deployment${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Check prerequisites
echo -e "${BLUE}[Step 1] Checking prerequisites...${NC}"
command -v terraform >/dev/null 2>&1 || { echo -e "${RED}✗ Terraform not installed${NC}"; exit 1; }
command -v aws >/dev/null 2>&1 || { echo -e "${RED}✗ AWS CLI not installed${NC}"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo -e "${RED}✗ Docker not installed${NC}"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "${RED}✗ npm not installed${NC}"; exit 1; }

echo -e "${GREEN}✓ All prerequisites installed${NC}"

# Check if infrastructure exists
echo -e "${BLUE}[Step 2] Checking infrastructure status...${NC}"
cd "$(dirname "$SCRIPT_DIR")"

if [ ! -f "terraform.tfstate" ] && [ ! -f ".terraform/terraform.tfstate" ]; then
  echo -e "${YELLOW}⚠ No Terraform state found. Infrastructure may not be provisioned yet.${NC}"
  read -p "Do you want to provision infrastructure first? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    terraform plan -out=tfplan
    read -p "Review the plan above. Continue with apply? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      terraform apply tfplan
    else
      echo -e "${RED}Deployment cancelled${NC}"
      exit 1
    fi
  else
    echo -e "${RED}Cannot deploy without infrastructure. Exiting.${NC}"
    exit 1
  fi
fi

# Deploy backend
echo -e "${BLUE}[Step 3] Deploying backend...${NC}"
${SCRIPT_DIR}/build-and-push.sh || {
  echo -e "${RED}✗ Backend deployment failed${NC}"
  exit 1
}

# Wait for backend to be healthy
echo -e "${BLUE}[Step 4] Waiting for backend to be healthy...${NC}"
CLUSTER=$(terraform output -raw ecs_cluster_name 2>/dev/null)
SERVICE=$(terraform output -raw ecs_service_name 2>/dev/null)
REGION=$(terraform output -raw aws_region 2>/dev/null)

for i in {1..20}; do
  RUNNING=$(aws ecs describe-services \
    --cluster ${CLUSTER} \
    --services ${SERVICE} \
    --region ${REGION} \
    --query 'services[0].runningCount' \
    --output text 2>/dev/null || echo "0")

  if [ "$RUNNING" -gt 0 ]; then
    echo -e "${GREEN}✓ Backend is running${NC}"
    break
  fi

  if [ $i -eq 20 ]; then
    echo -e "${YELLOW}⚠ Backend not running after 5 minutes. Check logs.${NC}"
    break
  fi

  echo -e "${BLUE}Waiting... (${i}/20)${NC}"
  sleep 15
done

# Test backend health
API_URL=$(terraform output -raw api_url 2>/dev/null)
echo -e "${BLUE}[Step 5] Testing backend health: ${API_URL}/health${NC}"
sleep 10 # Give it a few more seconds

if curl -f -s -m 10 "${API_URL}/health" > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Backend health check passed${NC}"
else
  echo -e "${YELLOW}⚠ Backend health check failed (may need more time or check logs)${NC}"
  echo -e "${YELLOW}  Continuing with frontend deployment...${NC}"
fi

# Deploy frontend
echo -e "${BLUE}[Step 6] Deploying frontend...${NC}"
${SCRIPT_DIR}/build-frontend.sh || {
  echo -e "${RED}✗ Frontend deployment failed${NC}"
  exit 1
}

# Summary
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   Deployment Complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e ""
echo -e "${BLUE}Application URLs:${NC}"
echo -e "  Frontend: $(terraform output -raw frontend_url 2>/dev/null)"
echo -e "  Backend:  ${API_URL}"
echo -e "  API Docs: ${API_URL}/api-docs"
echo -e ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "  1. Configure WorkOS redirect URI: ${API_URL}/auth/callback"
echo -e "  2. Configure Stripe webhook: ${API_URL}/payments/webhook"
echo -e "  3. Test the application end-to-end"
echo -e ""
echo -e "${BLUE}Monitoring:${NC}"
echo -e "  Logs: aws logs tail /ecs/$(terraform output -raw project_name 2>/dev/null)-$(terraform output -raw environment 2>/dev/null)-backend --follow --region ${REGION}"
echo -e "  ECS: aws ecs describe-services --cluster ${CLUSTER} --services ${SERVICE} --region ${REGION}"
echo -e ""
