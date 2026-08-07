# Authentication System Testing Guide

This document provides comprehensive testing instructions for the Revelia authentication system.

## Prerequisites

- Server running on `http://localhost:3000`
- MongoDB connected
- Valid JWT_SECRET in `.env`

## Test Endpoints

### 1. Health Check

```bash
curl http://localhost:3000/api/health
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Revelia API running",
  "data": {
    "timestamp": "2026-01-30T20:39:38.209Z",
    "uptime": 315.463383495,
    "environment": "development",
    "database": "connected"
  }
}
```

---

### 2. Signup (POST /api/auth/signup)

#### Success Case

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@revelia.me",
    "password": "testpassword123"
  }'
```

**Expected Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "697d170f12177c64cc9df188",
      "email": "test@revelia.me",
      "name": "Test User",
      "authProvider": "email",
      "subscription": {
        "tier": "free"
      },
      "preferences": {
        "notifications": true,
        "timezone": "America/New_York"
      },
      "createdAt": "2026-01-30T20:39:43.810Z",
      "updatedAt": "2026-01-30T20:39:43.810Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Error Cases

**Duplicate Email (400):**
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@revelia.me",
    "password": "password123"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "User with this email already exists"
}
```

**Weak Password (400):**
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@revelia.me",
    "password": "weak"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Password must be at least 8 characters"
}
```

**Invalid Email (400):**
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "password": "password123"
  }'
```

---

### 3. Login (POST /api/auth/login)

#### Success Case

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@revelia.me",
    "password": "testpassword123"
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "user": { /* same as signup */ },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Error Cases

**Wrong Password (401):**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@revelia.me",
    "password": "wrongpassword"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

**Non-existent Email (401):**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nonexistent@revelia.me",
    "password": "password123"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

---

### 4. Get Current User (GET /api/auth/me)

#### Success Case

```bash
TOKEN="your-jwt-token-here"
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "697d170f12177c64cc9df188",
      "email": "test@revelia.me",
      "name": "Test User",
      "authProvider": "email",
      "subscription": {
        "tier": "free"
      },
      "preferences": {
        "notifications": true,
        "timezone": "America/New_York"
      },
      "createdAt": "2026-01-30T20:39:43.810Z",
      "updatedAt": "2026-01-30T20:39:43.810Z"
    }
  }
}
```

#### Error Cases

**Missing Token (401):**
```bash
curl -X GET http://localhost:3000/api/auth/me
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Authorization header missing"
}
```

**Invalid Token (401):**
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer invalid-token"
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

**Malformed Authorization Header (401):**
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: invalid-format"
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Invalid authorization format. Use: Bearer <token>"
}
```

---

### 5. Logout (POST /api/auth/logout)

```bash
curl -X POST http://localhost:3000/api/auth/logout
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Note:** Logout is currently client-side only. The client should remove the token from storage.

---

### 6. Refresh Token (POST /api/auth/refresh)

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "some-token"}'
```

**Expected Response (501):**
```json
{
  "success": false,
  "error": "Refresh token functionality not implemented yet"
}
```

---

### 7. Apple Sign In (POST /api/auth/apple)

**Note:** Requires valid Apple identity token from Apple Sign In SDK.

```bash
curl -X POST http://localhost:3000/api/auth/apple \
  -H "Content-Type: application/json" \
  -d '{
    "identityToken": "<apple-identity-token>",
    "user": {
      "name": {
        "firstName": "John",
        "lastName": "Doe"
      },
      "email": "john@privaterelay.appleid.com"
    }
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "...",
      "email": "john@privaterelay.appleid.com",
      "name": "John Doe",
      "authProvider": "apple",
      "appleId": "<apple-user-id>",
      "subscription": { "tier": "free" },
      "preferences": { "notifications": true, "timezone": "America/New_York" },
      "createdAt": "...",
      "updatedAt": "..."
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 8. Google Sign In (POST /api/auth/google)

**Note:** Requires valid Google ID token from Google Sign In SDK.

```bash
curl -X POST http://localhost:3000/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "<google-id-token>"
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "...",
      "email": "user@gmail.com",
      "authProvider": "google",
      "googleId": "<google-user-id>",
      "subscription": { "tier": "free" },
      "preferences": { "notifications": true, "timezone": "America/New_York" },
      "createdAt": "...",
      "updatedAt": "..."
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## Test Script

Run all tests at once:

```bash
#!/bin/bash

BASE_URL="http://localhost:3000/api"

echo "=== 1. Health Check ==="
curl -s $BASE_URL/health | jq .

echo -e "\n=== 2. Signup ==="
RESPONSE=$(curl -s -X POST $BASE_URL/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test'$(date +%s)'@revelia.me",
    "password": "testpassword123"
  }')
echo $RESPONSE | jq .
TOKEN=$(echo $RESPONSE | jq -r '.data.token')
EMAIL=$(echo $RESPONSE | jq -r '.data.user.email')

echo -e "\n=== 3. Login ==="
curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$EMAIL'",
    "password": "testpassword123"
  }' | jq .

echo -e "\n=== 4. Get Current User ==="
curl -s -X GET $BASE_URL/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq .

echo -e "\n=== 5. Invalid Token ==="
curl -s -X GET $BASE_URL/auth/me \
  -H "Authorization: Bearer invalid-token" | jq .

echo -e "\n=== 6. Logout ==="
curl -s -X POST $BASE_URL/auth/logout | jq .

echo -e "\n=== All tests completed ==="
```

---

## Security Notes

1. **Password Hashing:** Passwords are hashed with bcrypt (10 rounds by default)
2. **JWT Expiration:** Tokens expire after 7 days (configurable via JWT_EXPIRES_IN)
3. **Token Format:** `Authorization: Bearer <token>`
4. **Error Messages:** Generic messages for auth failures ("Invalid credentials" instead of "Email not found")
5. **Password Requirements:** Minimum 8 characters, maximum 100 characters
6. **Email Uniqueness:** One account per email across all auth providers

---

## Database Verification

Check users in MongoDB:

```bash
mongosh revelia --eval "db.users.find().pretty()"
```

Verify password is hashed:

```bash
mongosh revelia --eval "db.users.findOne({email: 'test@revelia.me'}, {passwordHash: 1})"
```

---

## Next Steps

1. **Refresh Token:** Implement refresh token logic for long-lived sessions
2. **Token Blacklist:** Add server-side token blacklisting for logout
3. **Rate Limiting:** Add rate limiting to prevent brute force attacks
4. **Email Verification:** Add email verification flow
5. **Password Reset:** Implement forgot password / reset password flow
6. **2FA:** Add two-factor authentication support

---

## Troubleshooting

### Server not starting

```bash
# Check if MongoDB is running
pgrep mongod

# Check server logs
cd /app/server && yarn dev
```

### JWT errors

```bash
# Verify JWT_SECRET is set
grep JWT_SECRET /app/server/.env

# JWT_SECRET must be at least 32 characters
```

### Database connection errors

```bash
# Check MongoDB connection
mongosh --eval "db.adminCommand('ping')"

# Verify MONGODB_URI in .env
grep MONGODB_URI /app/server/.env
```
