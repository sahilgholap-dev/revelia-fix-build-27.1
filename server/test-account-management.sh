#!/bin/bash

# Test Account Management Endpoints
# Tests: Change Password, Export Data, Delete Account

BASE_URL="http://localhost:8001/api"

echo "========================================"
echo "Account Management Endpoints Test"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TEST_COUNT=0
PASS_COUNT=0
FAIL_COUNT=0

# Function to print test result
print_result() {
    TEST_COUNT=$((TEST_COUNT + 1))
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
}

# Function to print section header
print_section() {
    echo ""
    echo -e "${YELLOW}=== $1 ===${NC}"
    echo ""
}

# Create test user for account management tests
print_section "Setup: Create Test User"

TEST_EMAIL="account-test-$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!"
TEST_NAME="Account Test User"

echo "Creating test user: $TEST_EMAIL"
SIGNUP_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"$TEST_NAME\",
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")

echo "Signup response: $SIGNUP_RESPONSE"

TOKEN=$(echo $SIGNUP_RESPONSE | jq -r '.data.token')
USER_ID=$(echo $SIGNUP_RESPONSE | jq -r '.data.user._id')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    print_result 0 "Test user created successfully"
    echo "Token: ${TOKEN:0:20}..."
    echo "User ID: $USER_ID"
else
    print_result 1 "Failed to create test user"
    echo "Response: $SIGNUP_RESPONSE"
    exit 1
fi

# Test 1: Change Password - Success
print_section "Test 1: Change Password (Success)"

NEW_PASSWORD="NewPassword123!"

CHANGE_PW_RESPONSE=$(curl -s -X PATCH "$BASE_URL/auth/change-password" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"currentPassword\": \"$TEST_PASSWORD\",
    \"newPassword\": \"$NEW_PASSWORD\"
  }")

echo "Response: $CHANGE_PW_RESPONSE"

SUCCESS=$(echo $CHANGE_PW_RESPONSE | jq -r '.success')
if [ "$SUCCESS" = "true" ]; then
    print_result 0 "Password changed successfully"
else
    print_result 1 "Failed to change password"
fi

# Test 2: Login with New Password
print_section "Test 2: Login with New Password"

LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$NEW_PASSWORD\"
  }")

echo "Response: $LOGIN_RESPONSE"

NEW_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token')
if [ "$NEW_TOKEN" != "null" ] && [ -n "$NEW_TOKEN" ]; then
    print_result 0 "Login with new password successful"
    TOKEN=$NEW_TOKEN
else
    print_result 1 "Failed to login with new password"
fi

# Test 3: Change Password - Wrong Current Password
print_section "Test 3: Change Password (Wrong Current Password)"

STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE_URL/auth/change-password" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"currentPassword\": \"WrongPassword123!\",
    \"newPassword\": \"AnotherPassword123!\"
  }")

echo "Status Code: $STATUS_CODE"

if [ "$STATUS_CODE" = "401" ]; then
    print_result 0 "Correctly rejected wrong current password (401)"
else
    print_result 1 "Should have returned 401 for wrong password, got $STATUS_CODE"
fi

# Test 4: Change Password - Weak New Password
print_section "Test 4: Change Password (Weak New Password)"

STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE_URL/auth/change-password" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"currentPassword\": \"$NEW_PASSWORD\",
    \"newPassword\": \"weak\"
  }")

echo "Status Code: $STATUS_CODE"

if [ "$STATUS_CODE" = "400" ]; then
    print_result 0 "Correctly rejected weak password (400)"
else
    print_result 1 "Should have returned 400 for weak password, got $STATUS_CODE"
fi

# Test 5: Export Data
print_section "Test 5: Export Data"

EXPORT_RESPONSE=$(curl -s -X POST "$BASE_URL/account/export" \
  -H "Authorization: Bearer $TOKEN")

echo "Response: $EXPORT_RESPONSE"

SUCCESS=$(echo $EXPORT_RESPONSE | jq -r '.success')
MESSAGE=$(echo $EXPORT_RESPONSE | jq -r '.data.message')

if [ "$SUCCESS" = "true" ] && [[ "$MESSAGE" == *"email"* ]]; then
    print_result 0 "Data export request successful"
else
    print_result 1 "Failed to request data export"
fi

# Test 6: Create Profile for Deletion Test
print_section "Test 6: Setup - Create Profile for Deletion Test"

PROFILE_RESPONSE=$(curl -s -X POST "$BASE_URL/profile" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"$TEST_NAME\",
    \"birthDate\": \"1990-01-15\",
    \"handedness\": \"right\"
  }")

echo "Response: $PROFILE_RESPONSE"

SUCCESS=$(echo $PROFILE_RESPONSE | jq -r '.success')
if [ "$SUCCESS" = "true" ]; then
    print_result 0 "Profile created for deletion test"
else
    print_result 1 "Failed to create profile"
fi

# Test 7: Delete Account
print_section "Test 7: Delete Account"

DELETE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/account" \
  -H "Authorization: Bearer $TOKEN")

echo "Response: $DELETE_RESPONSE"

SUCCESS=$(echo $DELETE_RESPONSE | jq -r '.success')
MESSAGE=$(echo $DELETE_RESPONSE | jq -r '.message')

if [ "$SUCCESS" = "true" ] && [[ "$MESSAGE" == *"deleted"* ]]; then
    print_result 0 "Account deleted successfully"
else
    print_result 1 "Failed to delete account"
fi

# Test 8: Verify Account Deletion - Login Should Fail
print_section "Test 8: Verify Account Deletion (Login Should Fail)"

STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$NEW_PASSWORD\"
  }")

echo "Status Code: $STATUS_CODE"

if [ "$STATUS_CODE" = "401" ]; then
    print_result 0 "Deleted user cannot login (401)"
else
    print_result 1 "Deleted user should not be able to login, got $STATUS_CODE"
fi

# Test 9: Verify Profile Deletion
print_section "Test 9: Verify Profile Deletion"

STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/profile" \
  -H "Authorization: Bearer $TOKEN")

echo "Status Code: $STATUS_CODE"

if [ "$STATUS_CODE" = "401" ] || [ "$STATUS_CODE" = "404" ]; then
    print_result 0 "Profile not accessible after deletion ($STATUS_CODE)"
else
    print_result 1 "Profile should not be accessible, got $STATUS_CODE"
fi

# Summary
print_section "Test Summary"

echo "Total Tests: $TEST_COUNT"
echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
echo -e "${RED}Failed: $FAIL_COUNT${NC}"

if [ $FAIL_COUNT -eq 0 ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}All tests passed! ✓${NC}"
    echo -e "${GREEN}========================================${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}Some tests failed! ✗${NC}"
    echo -e "${RED}========================================${NC}"
    exit 1
fi
