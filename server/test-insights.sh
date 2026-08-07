#!/bin/bash

# Test script for Insight endpoints
# Usage: ./test-insights.sh

BASE_URL="http://localhost:3000"

echo "====================================="
echo "Revelia Insight System Test Script"
echo "====================================="
echo ""

# Step 1: Login to get token
echo "Step 1: Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "premium_plus@test.com",
    "password": "test123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed. Please ensure test user exists."
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful"
echo "Token: ${TOKEN:0:50}..."
echo ""

# Step 2: Test Daily Insight (Premium Plus only)
echo "====================================="
echo "Test 2: Daily Insight (Premium Plus)"
echo "====================================="
DILY_RESPONSE=$(curl -s -X GET "$BASE_URL/api/insights/daily" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo $DAILY_RESPONSE | jq .
echo ""

# Step 3: Test Daily Teaser (All users)
echo "====================================="
echo "Test 3: Daily Teaser (All users)"
echo "====================================="
TEASER_RESPONSE=$(curl -s -X GET "$BASE_URL/api/insights/daily/teaser" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo $TEASER_RESPONSE | jq .
echo ""

# Step 4: Test Weekly Forecast (Premium Plus only)
echo "====================================="
echo "Test 4: Weekly Forecast (Premium Plus)"
echo "====================================="
WEEKLY_RESPONSE=$(curl -s -X GET "$BASE_URL/api/insights/weekly" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo $WEEKLY_RESPONSE | jq .
echo ""

# Step 5: Test Monthly Reading (All users, tier-based)
echo "====================================="
echo "Test 5: Monthly Reading (Tier-based)"
echo "====================================="
MONTHLY_RESPONSE=$(curl -s -X GET "$BASE_URL/api/insights/monthly" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo $MONTHLY_RESPONSE | jq .
echo ""

# Step 6: Verify caching
echo "====================================="
echo "Test 6: Verify Caching (2nd call)"
echo "====================================="
echo "Calling daily insight again..."
CACHED_RESPONSE=$(curl -s -X GET "$BASE_URL/api/insights/daily" \
  -H "Authorization: Bearer $TOKEN")

IS_CACHED=$(echo $CACHED_RESPONSE | jq -r '.data.cached')

if [ "$IS_CACHED" == "true" ]; then
  echo "✅ Caching is working! Second call returned cached result."
else
  echo "⚠️  Caching may not be working. Second call generated new insight."
fi
echo ""

# Summary
echo "====================================="
echo "Test Summary"
echo "====================================="
echo "Daily Insight: $(echo $DAILY_RESPONSE | jq -r '.success')"
echo "Daily Teaser: $(echo $TEASER_RESPONSE | jq -r '.success')"
echo "Weekly Forecast: $(echo $WEEKLY_RESPONSE | jq -r '.success')"
echo "Monthly Reading: $(echo $MONTHLY_RESPONSE | jq -r '.success')"
echo "Caching: $IS_CACHED"
echo ""
echo "====================================="
echo "Test Complete"
echo "====================================="
