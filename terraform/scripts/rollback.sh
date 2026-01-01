#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}   Rollback System${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════════════${NC}"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TERRAFORM_DIR="$(dirname "$SCRIPT_DIR")"

cd "$TERRAFORM_DIR"

# Get Terraform outputs
CLUSTER=$(terraform output -raw ecs_cluster_name 2>/dev/null)
SERVICE=$(terraform output -raw ecs_service_name 2>/dev/null)
REGION=$(terraform output -raw aws_region 2>/dev/null)

if [ -z "$CLUSTER" ] || [ -z "$SERVICE" ]; then
  echo -e "${RED}✗ Failed to get ECS cluster or service from Terraform outputs${NC}"
  exit 1
fi

# List recent task definitions
echo -e "${BLUE}Recent task definitions:${NC}"
aws ecs list-task-definitions \
  --family-prefix $(terraform output -raw project_name 2>/dev/null)-$(terraform output -raw environment 2>/dev/null)-backend \
  --sort DESC \
  --max-items 5 \
  --region ${REGION} \
  --query 'taskDefinitionArns[]' \
  --output table

# Get current revision
CURRENT=$(aws ecs describe-services \
  --cluster ${CLUSTER} \
  --services ${SERVICE} \
  --region ${REGION} \
  --query 'services[0].taskDefinition' \
  --output text)

echo -e ""
echo -e "${BLUE}Current task definition: ${CURRENT}${NC}"
echo -e ""

# Prompt for rollback revision
read -p "Enter task definition to rollback to (e.g., arn:aws:ecs:...  or just the revision number): " REVISION

if [ -z "$REVISION" ]; then
  echo -e "${RED}No revision specified. Exiting.${NC}"
  exit 1
fi

# If user entered just a number, construct full ARN
if [[ "$REVISION" =~ ^[0-9]+$ ]]; then
  FAMILY=$(terraform output -raw project_name 2>/dev/null)-$(terraform output -raw environment 2>/dev/null)-backend
  ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
  REVISION="arn:aws:ecs:${REGION}:${ACCOUNT_ID}:task-definition/${FAMILY}:${REVISION}"
fi

# Confirm rollback
echo -e ""
echo -e "${YELLOW}⚠ You are about to rollback to: ${REVISION}${NC}"
read -p "Are you sure? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo -e "${RED}Rollback cancelled${NC}"
  exit 1
fi

# Execute rollback
echo -e "${BLUE}Rolling back to ${REVISION}...${NC}"
aws ecs update-service \
  --cluster ${CLUSTER} \
  --service ${SERVICE} \
  --task-definition ${REVISION} \
  --force-new-deployment \
  --region ${REGION} \
  > /dev/null || {
  echo -e "${RED}✗ Rollback failed${NC}"
  exit 1
}

echo -e "${GREEN}✓ Rollback initiated${NC}"

# Monitor rollback
echo -e "${BLUE}Monitoring rollback progress...${NC}"
for i in {1..20}; do
  DEPLOYMENT_STATUS=$(aws ecs describe-services \
    --cluster ${CLUSTER} \
    --services ${SERVICE} \
    --region ${REGION} \
    --query 'services[0].deployments[*].{TaskDef:taskDefinition,Desired:desiredCount,Running:runningCount,Status:rolloutState}' \
    --output table)

  echo -e "${DEPLOYMENT_STATUS}"
  echo -e ""

  # Check if rollback is complete
  COMPLETED=$(aws ecs describe-services \
    --cluster ${CLUSTER} \
    --services ${SERVICE} \
    --region ${REGION} \
    --query 'services[0].deployments[?rolloutState==`COMPLETED`].runningCount' \
    --output text)

  if [ ! -z "$COMPLETED" ] && [ "$COMPLETED" -gt 0 ]; then
    echo -e "${GREEN}✓ Rollback complete!${NC}"
    break
  fi

  if [ $i -eq 20 ]; then
    echo -e "${YELLOW}⚠ Rollback still in progress after 5 minutes${NC}"
    echo -e "${YELLOW}  Monitor manually with: aws ecs describe-services --cluster ${CLUSTER} --services ${SERVICE}${NC}"
    break
  fi

  echo -e "${BLUE}Waiting... (${i}/20)${NC}"
  sleep 15
done

# Test health
API_URL=$(terraform output -raw api_url 2>/dev/null)
echo -e "${BLUE}Testing backend health...${NC}"
sleep 10 # Give it a few seconds

if curl -f -s -m 10 "${API_URL}/health" > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Backend health check passed${NC}"
else
  echo -e "${RED}✗ Backend health check failed${NC}"
  echo -e "${YELLOW}  Check logs: aws logs tail /ecs/$(terraform output -raw project_name 2>/dev/null)-$(terraform output -raw environment 2>/dev/null)-backend --follow --region ${REGION}${NC}"
  exit 1
fi

echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   Rollback Complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
