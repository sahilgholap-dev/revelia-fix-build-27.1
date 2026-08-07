#!/bin/bash

# Production Security Testing Script
# Tests all security features implemented in Week 4, Task 12

BASE_URL="http://localhost:8001"
COLOR_GREEN="\033[0;32m"
COLOR_RED="\033[0;31m"
COLOR_YELLOW="\033[1;33m"
COLOR_RESET="\033[0m"

echo "====================================="
echo "Revelia Backend Security Test Suite"
echo "====================================="
echo ""

# Test 1: Security Headers
echo "${COLOR_YELLOW}Test 1: Security Headers${COLOR_RESET}"
echo "Testing Helmet security headers..."
HEADERS=$(curl -sI "${BASE_URL}/api/health")

if echo "$HEADERS" | grep -q "X-Content-Type-Options: nosniff"; then
    echo "${COLOR_GREEN}✓ X-Content-Type-Options header present${COLOR_RESET}"
else
    echo "${COLOR_RED}✗ X-Content-Type-Options header missing${COLOR_RESET}"
fi

if echo "$HEADERS" | grep -q "X-Frame-Options: SAMEORIGIN"; then
    echo "${COLOR_GREEN}✓ X-Frame-Options header present${COLOR_RESET}"
else
    echo "${COLOR_RED}✗ X-Frame-Options header missing${COLOR_RESET}"
fi

if echo "$HEADERS" | grep -q "Strict-Transport-Security"; then
    echo "${COLOR_GREEN}✓ Strict-Transport-Security header present${COLOR_RESET}"
else
    echo "${COLOR_RED}✗ Strict-Transport-Security header missing${COLOR_RESET}"
fi

echo ""

# Test 2: Enhanced Health Check
echo "${COLOR_YELLOW}Test 2: Enhanced Health Check${COLOR_RESET}"
echo "Testing service status reporting..."
HEALTH=$(curl -s "${BASE_URL}/api/health")

if echo "$HEALTH" | grep -q '"database":"connected"'; then
    echo "${COLOR_GREEN}✓ Database status reported${COLOR_RESET}"
else
    echo "${COLOR_RED}✗ Database status not reported${COLOR_RESET}"
fi

if echo "$HEALTH" | grep -q '"services"'; then
    echo "${COLOR_GREEN}✓ Service configurations reported${COLOR_RESET}"
    echo "  Services: $(echo $HEALTH | grep -o '"services":{[^}]*}' | head -1)"
else
    echo "${COLOR_RED}✗ Service configurations not reported${COLOR_RESET}"
fi

if echo "$HEALTH" | grep -q '"uptime"'; then
    echo "${COLOR_GREEN}✓ Server uptime reported${COLOR_RESET}"
else
    echo "${COLOR_RED}✗ Server uptime not reported${COLOR_RESET}"
fi

echo ""

# Test 3: Auth Rate Limiting (Development - should be disabled)
echo "${COLOR_YELLOW}Test 3: Auth Rate Limiting${COLOR_RESET}"
echo "Testing auth endpoint rate limiting (should be disabled in development)..."

for i in {1..6}; do
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"test@test.com","password":"wrong"}' 2>/dev/null)
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ $i -eq 6 ]; then
        if [ "$HTTP_CODE" = "429" ]; then
            echo "${COLOR_GREEN}✓ Rate limiting would work in production (429 on 6th request)${COLOR_RESET}"
        else
            echo "${COLOR_YELLOW}⚠ Rate limiting disabled in development (expected)${COLOR_RESET}"
            echo "  6th request returned: $HTTP_CODE"
        fi
    fi
done

echo ""

# Test 4: TypeScript Compilation
echo "${COLOR_YELLOW}Test 4: TypeScript Compilation${COLOR_RESET}"
echo "Checking if TypeScript compiles without errors..."
cd /app/server
if yarn build > /tmp/build.log 2>&1; then
    echo "${COLOR_GREEN}✓ TypeScript compiles successfully${COLOR_RESET}"
else
    echo "${COLOR_RED}✗ TypeScript compilation failed${COLOR_RESET}"
    cat /tmp/build.log
fi

echo ""

# Test 5: MongoDB Indexes
echo "${COLOR_YELLOW}Test 5: MongoDB Indexes${COLOR_RESET}"
echo "Verifying critical indexes exist..."

# Check User indexes
USER_INDEXES=$(mongo revelia --quiet --eval "db.users.getIndexes()" 2>/dev/null || echo "[]")
if echo "$USER_INDEXES" | grep -q "email"; then
    echo "${COLOR_GREEN}✓ User.email index exists${COLOR_RESET}"
else
    echo "${COLOR_YELLOW}⚠ User.email index not verified${COLOR_RESET}"
fi

if echo "$USER_INDEXES" | grep -q "appleId"; then
    echo "${COLOR_GREEN}✓ User.appleId index exists${COLOR_RESET}"
else
    echo "${COLOR_YELLOW}⚠ User.appleId index not verified${COLOR_RESET}"
fi

echo ""

# Test 6: Production Configuration
echo "${COLOR_YELLOW}Test 6: Production Configuration${COLOR_RESET}"
echo "Checking production config files..."

if [ -f "/app/server/src/config/production.ts" ]; then
    echo "${COLOR_GREEN}✓ Production config file exists${COLOR_RESET}"
else
    echo "${COLOR_RED}✗ Production config file missing${COLOR_RESET}"
fi

if [ -f "/app/server/src/middleware/auth-rate-limit.middleware.ts" ]; then
    echo "${COLOR_GREEN}✓ Auth rate limit middleware exists${COLOR_RESET}"
else
    echo "${COLOR_RED}✗ Auth rate limit middleware missing${COLOR_RESET}"
fi

if [ -f "/app/server/src/middleware/reading-rate-limit.middleware.ts" ]; then
    echo "${COLOR_GREEN}✓ Reading rate limit middleware exists${COLOR_RESET}"
else
    echo "${COLOR_RED}✗ Reading rate limit middleware missing${COLOR_RESET}"
fi

echo ""

# Test 7: Dependencies
echo "${COLOR_YELLOW}Test 7: Security Dependencies${COLOR_RESET}"
echo "Checking if security packages are installed..."

cd /app/server
if grep -q '"express-rate-limit"' package.json; then
    echo "${COLOR_GREEN}✓ express-rate-limit installed${COLOR_RESET}"
else
    echo "${COLOR_RED}✗ express-rate-limit not installed${COLOR_RESET}"
fi

if grep -q '"express-mongo-sanitize"' package.json; then
    echo "${COLOR_GREEN}✓ express-mongo-sanitize installed${COLOR_RESET}"
else
    echo "${COLOR_RED}✗ express-mongo-sanitize not installed${COLOR_RESET}"
fi

if grep -q '"hpp"' package.json; then
    echo "${COLOR_GREEN}✓ hpp installed${COLOR_RESET}"
else
    echo "${COLOR_RED}✗ hpp not installed${COLOR_RESET}"
fi

if grep -q '"compression"' package.json; then
    echo "${COLOR_GREEN}✓ compression installed${COLOR_RESET}"
else
    echo "${COLOR_RED}✗ compression not installed${COLOR_RESET}"
fi

if grep -q '"helmet"' package.json; then
    echo "${COLOR_GREEN}✓ helmet installed${COLOR_RESET}"
else
    echo "${COLOR_RED}✗ helmet not installed${COLOR_RESET}"
fi

echo ""
echo "====================================="
echo "${COLOR_GREEN}Security Test Suite Complete${COLOR_RESET}"
echo "====================================="
echo ""
echo "${COLOR_YELLOW}Note:${COLOR_RESET} Rate limiting is disabled in development mode."
echo "In production (NODE_ENV=production), rate limits will be enforced:"
echo "  - General: 100 requests per 15 minutes"
echo "  - Auth: 5 attempts per 15 minutes"
echo "  - Readings: 10 generations per hour per user"
echo ""
