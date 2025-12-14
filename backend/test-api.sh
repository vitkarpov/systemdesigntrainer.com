#!/bin/bash

echo "Testing Interview State Machine API"
echo ""

# Test 0: Create a new session
echo "0. Creating new session..."
SESSION_RESPONSE=$(curl -s -X POST http://localhost:3000/api/sessions \
  -H 'Content-Type: application/json' \
  -d '{"userId":1,"caseId":1,"companyStyle":"faang","level":"mid"}')

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

# Test 1: Start the session
echo "1. Starting session..."
curl -s -X POST "http://localhost:3000/api/sessions/$SESSION_ID/start" \
  -H 'Content-Type: application/json'

echo ""
echo ""

# Test 2: Add a message
echo "2. Adding interviewer message..."
curl -s -X POST "http://localhost:3000/api/sessions/$SESSION_ID/messages" \
  -H 'Content-Type: application/json' \
  -d '{"role":"interviewer","text":"Hello"}'

echo ""
echo ""

# Test 3: Add candidate message
echo "3. Adding candidate message..."
curl -s -X POST "http://localhost:3000/api/sessions/$SESSION_ID/messages" \
  -H 'Content-Type: application/json' \
  -d '{"role":"candidate","text":"Hi there"}'

echo ""
echo ""

# Test 4: Get transcript
echo "4. Getting transcript..."
curl -s -X GET "http://localhost:3000/api/sessions/$SESSION_ID/transcript"

echo ""
echo ""

# Test 5: Get session state
echo "5. Getting session state..."
curl -s -X GET "http://localhost:3000/api/sessions/$SESSION_ID"

echo ""
echo ""

# Test 6: Advance phase
echo "6. Advancing to next phase..."
curl -s -X PATCH "http://localhost:3000/api/sessions/$SESSION_ID/phase"

echo ""
echo ""

# Test 7: Get updated session state
echo "7. Getting updated session state..."
curl -s -X GET "http://localhost:3000/api/sessions/$SESSION_ID"

echo ""
