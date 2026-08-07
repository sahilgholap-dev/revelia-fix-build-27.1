#!/bin/bash

# RevenueCat Subscription System Test Script
# Tests subscription endpoints and webhook handling

BASE_URL="http://localhost:8001/api"
TOKEN=""
REVENUECAT_APP_USER_ID="test-rc-user-$(date +%s)"
WEBHOOK_SECRET="test-webhook-secret"

echo "====================================="
echo "RevenueCat Subscription System Tests"
echo "====================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
    fi
}

print_info() {
    echo -e "${YELLOW}ℹ INFO${NC}: $1"
}

# Step 1: Register a test user
echo "Step 1: Registering test user..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "subscription-test-'$(date +%s)'@test.com",
    "password": "TestPass123!",
    "name": "Subscription Test User"
  }')

TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}Failed to register user. Response:${NC}"
    echo $REGISTER_RESPONSE
    exit 1
fi

print_result 0 "User registered successfully"
print_info "Token: ${TOKEN:0:20}..."
echo ""

# Step 2: Get initial subscription status (should be free)
echo "Step 2: Getting initial subscription status..."
STATUS_RESPONSE=$(curl -s -X GET "$BASE_URL/subscription/status" \
  -H "Authorization: Bearer $TOKEN")

echo "Response: $STATUS_RESPONSE"
if echo $STATUS_RESPONSE | grep -q '"tier":"free"'; then
    print_result 0 "Initial tier is 'free'"
else
    print_result 1 "Initial tier should be 'free'"
fi
echo ""

# Step 3: Link RevenueCat user
echo "Step 3: Linking RevenueCat user..."
LINK_RESPONSE=$(curl -s -X POST "$BASE_URL/subscription/link" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "revenueCatAppUserId": "'$REVENUECAT_APP_USER_ID'"
  }')

echo "Response: $LINK_RESPONSE"
if echo $LINK_RESPONSE | grep -q '"success":true'; then
    print_result 0 "RevenueCat user linked"
else
    print_result 1 "Failed to link RevenueCat user"
fi
echo ""

# Step 4: Sync subscription (will fail without real RevenueCat API key)
echo "Step 4: Syncing subscription..."
print_info "This will fail without a valid REVENUECAT_API_KEY in .env"
SYNC_RESPONSE=$(curl -s -X POST "$BASE_URL/subscription/sync" \
  -H "Authorization: Bearer $TOKEN")

echo "Response: $SYNC_RESPONSE"
if echo $SYNC_RESPONSE | grep -q '"success":true'; then
    print_result 0 "Subscription synced"
else
    print_result 1 "Sync failed (expected without real API key)"
fi
echo ""

# Step 5: Test webhook - INITIAL_PURCHASE
echo "Step 5: Testing webhook - INITIAL_PURCHASE..."
WEBHOOK_RESPONSE=$(curl -s -X POST "$BASE_URL/webhooks/revenuecat" \
  -H "Authorization: Bearer $WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "api_version": "1.0",
    "event": {
      "type": "INITIAL_PURCHASE",
      "app_user_id": "'$REVENUECAT_APP_USER_ID'",
      "product_id": "revelia_premium_monthly",
      "period_type": "NORMAL",
      "purchased_at_ms": '$(date +%s000)',
      "expiration_at_ms": '$(date -d '+30 days' +%s000)',
      "environment": "SANDBOX"
    }
  }')

echo "Response: $WEBHOOK_RESPONSE"
if echo $WEBHOOK_RESPONSE | grep -q '"received":true'; then
    print_result 0 "Webhook processed"
else
    print_result 1 "Webhook processing failed"
fi
echo ""

# Step 6: Test webhook - CANCELLATION
echo "Step 6: Testing webhook - CANCELLATION..."
WEBHOOK_RESPONSE=$(curl -s -X POST "$BASE_URL/webhooks/revenuecat" \
  -H "Authorization: Bearer $WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "api_version": "1.0",
    "event": {
      "type": "CANCELLATION",
      "app_user_id": "'$REVENUECAT_APP_USER_ID'",
      "product_id": "revelia_premium_monthly",
      "period_type": "NORMAL",
      "purchased_at_ms": '$(date +%s000)',
      "expiration_at_ms": '$(date -d '+30 days' +%s000)',
      "environment": "SANDBOX"
    }
  }')

echo "Response: $WEBHOOK_RESPONSE"
if echo $WEBHOOK_RESPONSE | grep -q '"received":true'; then
    print_result 0 "Cancellation webhook processed"
else
    print_result 1 "Cancellation webhook failed"
fi
echo ""

# Step 7: Test webhook - EXPIRATION
echo "Step 7: Testing webhook - EXPIRATION..."
WEBHOOK_RESPONSE=$(curl -s -X POST "$BASE_URL/webhooks/revenuecat" \
  -H "Authorization: Bearer $WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "api_version": "1.0",
    "event": {
      "type": "EXPIRATION",
      "app_user_id": "'$REVENUECAT_APP_USER_ID'",
      "product_id": "revelia_premium_monthly",
      "period_type": "NORMAL",
      "purchased_at_ms": '$(date -d '-30 days' +%s000)',
      "expiration_at_ms": '$(date +%s000)',
      "environment": "SANDBOX"
    }
  }')

echo "Response: $WEBHOOK_RESPONSE"
if echo $WEBHOOK_RESPONSE | grep -q '"received":true'; then
    print_result 0 "Expiration webhook processed"
else
    print_result 1 "Expiration webhook failed"
fi
echo ""

# Step 8: Test webhook with wrong auth (should fail)
echo "Step 8: Testing webhook with wrong authorization..."
WEBHOOK_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE_URL/webhooks/revenuecat" \
  -H "Authorization: Bearer wrong-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "api_version": "1.0",
    "event": {
      "type": "INITIAL_PURCHASE",
      "app_user_id": "test-user",
      "product_id": "revelia_premium_monthly",
      "period_type": "NORMAL",
      "purchased_at_ms": '$(date +%s000)',
      "expiration_at_ms": '$(date -d '+30 days' +%s000)',
      "environment": "SANDBOX"
    }
  }')

HTTP_CODE=$(echo "$WEBHOOK_RESPONSE" | grep -o 'HTTP_CODE:[0-9]*' | cut -d':' -f2)
if [ "$HTTP_CODE" = "401" ]; then
    print_result 0 "Webhook correctly rejected unauthorized request"
else
    print_result 1 "Webhook should reject unauthorized requests (got HTTP $HTTP_CODE)"
fi
echo ""

# Step 9: Get final subscription status
echo "Step 9: Getting final subscription status..."
STATUS_RESPONSE=$(curl -s -X GET "$BASE_URL/subscription/status" \
  -H "Authorization: Bearer $TOKEN")

echo "Response: $STATUS_RESPONSE"
if echo $STATUS_RESPONSE | grep -q '"success":true'; then
    print_result 0 "Final status retrieved"
else
    print_result 1 "Failed to get final status"
fi
echo ""

echo "====================================="
echo "Test Summary"
echo "====================================="
print_info "All basic endpoint tests completed"
print_info "Note: Full RevenueCat integration requires valid API keys"
print_info "Set REVENUECAT_API_KEY and REVENUECAT_WEBHOOK_SECRET in .env"
echo ""
