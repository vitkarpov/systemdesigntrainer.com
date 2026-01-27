#!/bin/bash
# ==================================
# WAF Testing Script
# ==================================
# Tests the API WAF whitelist configuration

set -e

# Get API URL from terraform output or use provided argument
API_URL=${1:-$(cd .. && terraform output -raw api_url 2>/dev/null || echo "")}

if [ -z "$API_URL" ]; then
  echo "❌ Error: API URL not provided and couldn't be retrieved from terraform output"
  echo "Usage: $0 <API_URL>"
  echo "Example: $0 https://api.systemdesigntrainer.com"
  exit 1
fi

# Remove trailing slash
API_URL=${API_URL%/}

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║  Testing WAF Configuration for: $API_URL"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_count=0
pass_count=0
fail_count=0

# Function to test an endpoint
test_endpoint() {
  local method=$1
  local path=$2
  local expected_status=$3
  local description=$4

  test_count=$((test_count + 1))

  echo -n "Test $test_count: $description... "

  response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$API_URL$path" 2>/dev/null || echo "000")

  if [ "$response" = "$expected_status" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $response)"
    pass_count=$((pass_count + 1))
  else
    echo -e "${RED}✗ FAIL${NC} (Expected $expected_status, got $response)"
    fail_count=$((fail_count + 1))
  fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Testing ALLOWED endpoints (should return 200, 302, or 400, not 403)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Health endpoint
test_endpoint "GET" "/health" "200" "Health check"

# Auth endpoints (most will return 302 or 400 without proper params, but NOT 403)
test_endpoint "GET" "/auth/status" "200" "Auth status"

# Cases endpoint
test_endpoint "GET" "/cases" "401" "List cases (should fail auth, not WAF)"

# Sessions endpoint
test_endpoint "GET" "/sessions/dashboard" "401" "Sessions dashboard (should fail auth, not WAF)"

# Payments endpoint
test_endpoint "POST" "/payments/webhook" "400" "Payments webhook (should fail validation, not WAF)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Testing BLOCKED endpoints (should return 403 Forbidden)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Random paths that should be blocked
test_endpoint "GET" "/admin" "403" "Random admin path"
test_endpoint "GET" "/api/v1/users" "403" "Non-whitelisted API path"
test_endpoint "GET" "/.env" "403" "Environment file"
test_endpoint "GET" "/wp-admin" "403" "WordPress admin"
test_endpoint "GET" "/phpmyadmin" "403" "PHPMyAdmin"
test_endpoint "POST" "/graphql" "403" "GraphQL endpoint"
test_endpoint "GET" "/swagger" "403" "Swagger UI"
test_endpoint "GET" "/docs" "403" "Docs endpoint"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test Results"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Total tests: $test_count"
echo -e "Passed: ${GREEN}$pass_count${NC}"
echo -e "Failed: ${RED}$fail_count${NC}"
echo ""

if [ $fail_count -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed! WAF is working correctly.${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed. Please review the WAF configuration.${NC}"
  exit 1
fi
