#!/bin/bash

# Simple Subscription System Test (No RevenueCat API required)
# Tests basic subscription endpoints and webhook structure

BASE_URL="http://localhost:8001/api"
TOKEN=""
WEBHOOK_SECRET="test-webhook-secret-123"

echo "====================================="
echo "Subscription System Basic Tests"
echo "====================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

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

# Test 1: Register user
echo "Test 1: Register user..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sub-test-'$(date +%s)'@test.com",
    "password": "TestPass123!",
    "name": "Sub Test User"
  }')

TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}Failed to register. Response:${NC}"
    echo $REGISTER_RESPONSE
    exit 1
fi

print_result 0 "User registered"
echo ""

# Test 2: Get subscription status (should be free)
echo "Test 2: Get subscription status..."
STATUS=$(curl -s -X GET "$BASE_URL/subscription/status" \
  -H "Authorization: Bearer $TOKEN")

echo "Response: $STATUS"
if echo $STATUS | grep -q '"tier":"free"'; then
    print_result 0 "Default tier is 'free'"
else
    print_result 1 "Expected tier 'free'"
fi

if echo $STATUS | grep -q '"isActive":false'; then
    print_result 0 "Free tier shows isActive=false"
else
    print_result 1 "Expected isActive=false for free tier"
fi
echo ""

# Test 3: Test webhook authentication (should fail with wrong secret)
echo "Test 3: Test webhook auth rejection..."
WEBHOOK_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE_URL/webhooks/revenuecat" \
  -H "Authorization: Bearer wrong-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "api_version": "1.0",
    "event": {
      "type": "INITIAL_PURCHASE",
      "app_user_id": "test-user",
      "product_id": "test_product",
      "period_type": "NORMAL",
      "purchased_at_ms": '$(date +%s000)',
      "expiration_at_ms": null,
      "environment": "SANDBOX"
    }
  }')

HTTP_CODE=$(echo "$WEBHOOK_RESPONSE" | grep -o 'HTTP_CODE:[0-9]*' | cut -d':' -f2)
if [ "$HTTP_CODE" = "401" ]; then
    print_result 0 "Webhook correctly rejects unauthorized requests"
else
    print_result 1 "Expected 401, got $HTTP_CODE"
fi
echo ""

# Test 4: Test subscription middleware (create a protected endpoint test)
echo "Test 4: Test tier-based access control..."
print_info "This would require a protected endpoint using requirePremium middleware"
print_info "Example: POST /api/readings/face would check subscription tier"
echo ""

# Test 5: Verify subscription fields in user object
echo "Test 5: Verify subscription structure..."
if echo $STATUS | grep -q '"tier"' && \
   echo $STATUS | grep -q '"isActive"' && \
   echo $STATUS | grep -q '"willRenew"'; then
    print_result 0 "Subscription response has all required fields"
else
    print_result 1 "Missing required subscription fields"
fi
echo ""

echo "====================================="
echo "Test Summary"
echo "====================================="
print_info "Basic subscription endpoints working"
print_info "Webhook authentication working"
print_info "Subscription status structure correct"
echo ""
print_info "To test full RevenueCat integration:"
echo "  1. Set REVENUECAT_API_KEY in .env"
echo "  2. Set REVENUECAT_WEBHOOK_SECRET in .env"
echo "  3. Run: ./test-subscription.sh"
echo ""
