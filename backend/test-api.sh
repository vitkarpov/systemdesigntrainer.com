#!/bin/bash

echo "Testing Interview State Machine API (with Authentication + AI Integration)"
echo ""

# Step 0: Get test authentication token
echo "0. Getting test authentication token..."
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/dev/test-token)
echo "$TOKEN_RESPONSE"
echo ""

# Extract access token from response
ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Failed to get access token. Make sure the backend is running and NODE_ENV is set to 'development'"
  exit 1
fi

echo "✓ Got access token: ${ACCESS_TOKEN:0:20}..."
echo ""

# Get available cases and extract first case ID
echo "0.1 Fetching available cases..."
CASES_RESPONSE=$(curl -s -X GET http://localhost:3000/api/cases \
  -H "Authorization: Bearer $ACCESS_TOKEN")

CASE_ID=$(echo "$CASES_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

if [ -z "$CASE_ID" ]; then
  echo "❌ No cases found. Make sure the database is seeded (npm run db:seed)"
  exit 1
fi

echo "✓ Using case ID: $CASE_ID"
echo ""

# Test 1: Create a new session (with authentication)
echo "1. Creating new session..."
SESSION_RESPONSE=$(curl -s -X POST http://localhost:3000/api/sessions \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{\"caseId\":$CASE_ID,\"companyStyle\":\"faang\",\"level\":\"mid\"}")

echo "$SESSION_RESPONSE"

# Extract session ID from response
SESSION_ID=$(echo "$SESSION_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*' | head -1)

if [ -z "$SESSION_ID" ]; then
  echo "Failed to create session or extract session ID"
  exit 1
fi

echo ""
echo "Using session ID: $SESSION_ID"
echo ""

# Test 2: Start the session
echo "2. Starting session..."
curl -s -X POST "http://localhost:3000/api/sessions/$SESSION_ID/start" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ACCESS_TOKEN"

echo ""
echo ""

# Test 3: Get transcript (initially empty)
echo "3. Getting transcript..."
curl -s -X GET "http://localhost:3000/api/sessions/$SESSION_ID/transcript" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

echo ""
echo ""

# Test 4: Get session state
echo "4. Getting session state..."
curl -s -X GET "http://localhost:3000/api/sessions/$SESSION_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

echo ""
echo ""

# Test 5: Advance phase
echo "5. Advancing to next phase..."
curl -s -X PATCH "http://localhost:3000/api/sessions/$SESSION_ID/phase" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

echo ""
echo ""

# Test 6: Get updated session state
echo "6. Getting updated session state..."
curl -s -X GET "http://localhost:3000/api/sessions/$SESSION_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

echo ""

# Test 7: Send candidate message and get AI response
echo "7. Testing conversation - Candidate asks about requirements..."
curl -s -X POST "http://localhost:3000/api/sessions/$SESSION_ID/conversation" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"text":"What are the key functional and non-functional requirements I should focus on?"}'

echo ""
echo ""

# Test 8: Another conversation turn
echo "8. Candidate discusses scale..."
curl -s -X POST "http://localhost:3000/api/sessions/$SESSION_ID/conversation" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"text":"I am thinking we need to handle around 1 million URLs and maybe 10000 requests per second. Does that sound reasonable?"}'

echo ""
echo ""

# Test 9: Get detected signals
echo "9. Getting detected signals..."
curl -s -X GET "http://localhost:3000/api/sessions/$SESSION_ID/signals" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

echo ""
echo ""

# Test 10: Get detected red flags
echo "10. Getting detected red flags..."
curl -s -X GET "http://localhost:3000/api/sessions/$SESSION_ID/red-flags" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

echo ""
echo ""

# Test 11: Send message with implementation details (should trigger red flag)
echo "11. Testing red flag detection - Implementation details in early phase..."
curl -s -X POST "http://localhost:3000/api/sessions/$SESSION_ID/conversation" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"text":"I would implement this with a class URLShortener that has a function generateShortUrl() which uses a for loop to iterate through characters..."}'

echo ""
echo ""

# Test 12: Check red flags again
echo "12. Getting red flags after implementation details..."
curl -s -X GET "http://localhost:3000/api/sessions/$SESSION_ID/red-flags" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

echo ""
echo ""

# Test 13: Generate feedback report
echo "13. Generating feedback report..."
curl -s -X POST "http://localhost:3000/api/sessions/$SESSION_ID/feedback" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ACCESS_TOKEN"

echo ""
echo ""

# Test 14: Get feedback report
echo "14. Getting feedback report..."
curl -s -X GET "http://localhost:3000/api/sessions/$SESSION_ID/feedback" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

echo ""
echo ""

echo "✓ All tests complete (including authentication, conversation handling, signal tracking, red flag detection, and feedback generation)!"
echo ""
