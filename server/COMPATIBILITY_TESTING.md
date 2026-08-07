# Compatibility Reading System Testing Guide

## Prerequisites

1. Server running on port 8001
2. MongoDB running
3. Valid JWT token for authentication
4. User with complete profile (face reading, palm reading, birth data)
5. Test partner images

## Test Setup

### 1. Get Authentication Token

```bash
# Login as test user
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@revelia.me",
    "password": "password123"
  }'

# Save the token from response
export TOKEN="your-jwt-token-here"
```

### 2. Ensure User Has Profile

The user must have:
- Face reading with archetype and strengths
- Palm reading with palm type
- Birth data (sun sign, life path number)

If not, create profile first:

```bash
# Create profile
curl -X POST http://localhost:8001/api/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "birthData": {
      "date": "1990-05-15",
      "time": "14:30"
    },
    "handedness": "right"
  }'

# Upload face and palm images, then generate readings
# (See READING_TESTING.md for details)
```

## Test Cases

### Test 1: Upload Partner Image

**Objective:** Verify partner image upload works

```bash
curl -X POST http://localhost:8001/api/upload/partner \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@/path/to/partner-photo.jpg"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://images.revelia.me/{userId}/partners/{timestamp}.jpg",
    "type": "partner",
    "uploadedAt": "2026-01-31T05:00:00.000Z"
  }
}
```

**Validation:**
- ✅ Status code 200
- ✅ Returns valid image URL
- ✅ Image accessible at URL
- ✅ Image stored in R2 under `{userId}/partners/`

---

### Test 2: Generate Compatibility (Free User, No Birth Data)

**Objective:** Verify free tier compatibility generation without partner birth data

```bash
# Save partner image URL from Test 1
export PARTNER_URL="https://images.revelia.me/..."

curl -X POST http://localhost:8001/api/compatibility \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "partnerName": "Alex",
    "partnerImageUrl": "'$PARTNER_URL'"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "userId": "...",
    "partnerName": "Alex",
    "partnerImageUrl": "...",
    "reading": {
      "overallScore": 75,
      "headline": "A Dynamic Connection",
      "summary": "...",
      "categoryScores": {
        "emotional": {
          "score": 80,
          "title": "Emotional Harmony",
          "description": "..."
        },
        "communication": {
          "score": 70,
          "title": "Communication Flow",
          "description": "..."
        }
      },
      "strengths": [
        "Strength 1",
        "Strength 2"
      ],
      "shareableQuote": "..."
    },
    "tier": "free",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Validation:**
- ✅ Status code 200
- ✅ Overall score between 40-100
- ✅ Headline is catchy (3-5 words)
- ✅ Summary is 2-3 sentences
- ✅ Exactly 2 category scores (emotional, communication)
- ✅ Exactly 2 strengths
- ✅ No challenges, advice, cosmicConnection, or affirmation (free tier)
- ✅ Shareable quote is personalized and quotable
- ✅ Tier is "free"
- ✅ No partnerBirthData field

---

### Test 3: Generate Compatibility (Free User, Second Attempt)

**Objective:** Verify free tier limit enforcement

```bash
curl -X POST http://localhost:8001/api/compatibility \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "partnerName": "Jordan",
    "partnerImageUrl": "'$PARTNER_URL'"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Free users get 1 compatibility reading. Upgrade for unlimited."
}
```

**Validation:**
- ✅ Status code 403
- ✅ Error message about upgrade
- ✅ No reading generated

---

### Test 4: Generate Compatibility (Premium User, With Birth Data)

**Objective:** Verify premium tier full compatibility generation with birth data

**Setup:** Upgrade user to premium first:
```bash
mongosh revelia --eval '
  db.users.updateOne(
    { email: "test@revelia.me" },
    { $set: { "subscription.tier": "premium" } }
  )
'
```

**Test:**
```bash
curl -X POST http://localhost:8001/api/compatibility \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "partnerName": "Jordan",
    "partnerImageUrl": "'$PARTNER_URL'",
    "partnerBirthDate": "1992-08-15"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "userId": "...",
    "partnerName": "Jordan",
    "partnerImageUrl": "...",
    "partnerBirthData": {
      "date": "1992-08-15",
      "sunSign": "Leo",
      "lifePathNumber": 7
    },
    "reading": {
      "overallScore": 82,
      "headline": "A Dynamic Power Duo",
      "summary": "...",
      "categoryScores": {
        "emotional": { ... },
        "intellectual": { ... },
        "communication": { ... },
        "values": { ... },
        "passion": { ... }
      },
      "strengths": [
        "Strength 1",
        "Strength 2",
        "Strength 3",
        "Strength 4"
      ],
      "challenges": [
        "Challenge 1 (positively framed)",
        "Challenge 2 (positively framed)"
      ],
      "advice": "2-3 paragraphs of relationship guidance...",
      "cosmicConnection": {
        "sunSignCompatibility": "Full paragraph on Taurus-Leo dynamic...",
        "numerologyAlignment": "Full paragraph on Life Path compatibility...",
        "archetypeSynergy": "Full paragraph on archetype interaction..."
      },
      "affirmation": "We honor both our differences...",
      "shareableQuote": "The universe knew what it was doing..."
    },
    "tier": "premium",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Validation:**
- ✅ Status code 200
- ✅ Overall score between 40-100
- ✅ All 5 category scores present
- ✅ Exactly 4 strengths
- ✅ Exactly 2 challenges (positively framed)
- ✅ Advice is 2-3 paragraphs
- ✅ cosmicConnection has all 3 fields
- ✅ Affirmation present
- ✅ Shareable quote is personalized
- ✅ Tier is "premium"
- ✅ partnerBirthData includes sun sign and life path number

---

### Test 5: Generate Multiple Compatibility Readings (Premium User)

**Objective:** Verify premium users can generate unlimited readings

```bash
# Generate 3rd reading
curl -X POST http://localhost:8001/api/compatibility \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "partnerName": "Sam",
    "partnerImageUrl": "'$PARTNER_URL'"
  }'

# Generate 4th reading
curl -X POST http://localhost:8001/api/compatibility \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "partnerName": "Taylor",
    "partnerImageUrl": "'$PARTNER_URL'",
    "partnerBirthDate": "1995-03-20"
  }'
```

**Validation:**
- ✅ Both requests succeed (status 200)
- ✅ No limit errors
- ✅ Each reading is unique and personalized

---

### Test 6: Get All Compatibility Readings

**Objective:** Verify retrieval of all compatibility readings

```bash
curl -X GET http://localhost:8001/api/compatibility \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "readings": [
      {
        "_id": "...",
        "userId": "...",
        "partnerName": "Taylor",
        "partnerImageUrl": "...",
        "reading": { ... },
        "tier": "premium",
        "createdAt": "2026-01-31T05:30:00.000Z",
        "updatedAt": "2026-01-31T05:30:00.000Z"
      },
      {
        "_id": "...",
        "partnerName": "Sam",
        ...
      },
      {
        "_id": "...",
        "partnerName": "Jordan",
        ...
      },
      {
        "_id": "...",
        "partnerName": "Alex",
        ...
      }
    ]
  }
}
```

**Validation:**
- ✅ Status code 200
- ✅ Returns array of all readings
- ✅ Readings sorted by createdAt (newest first)
- ✅ Each reading has all required fields

---

### Test 7: Get Specific Compatibility Reading

**Objective:** Verify retrieval of specific reading by ID

```bash
# Save a reading ID from Test 6
export READING_ID="..."

curl -X GET http://localhost:8001/api/compatibility/$READING_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "userId": "...",
    "partnerName": "Jordan",
    "reading": { ... },
    ...
  }
}
```

**Validation:**
- ✅ Status code 200
- ✅ Returns correct reading
- ✅ All fields present

---

### Test 8: Get Non-Existent Reading

**Objective:** Verify error handling for invalid reading ID

```bash
curl -X GET http://localhost:8001/api/compatibility/000000000000000000000000 \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Compatibility reading not found"
}
```

**Validation:**
- ✅ Status code 404
- ✅ Error message about not found

---

### Test 9: Delete Compatibility Reading

**Objective:** Verify deletion of compatibility reading

```bash
curl -X DELETE http://localhost:8001/api/compatibility/$READING_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Compatibility reading deleted"
}
```

**Validation:**
- ✅ Status code 200
- ✅ Success message
- ✅ Reading no longer in database
- ✅ GET request for same ID returns 404

---

### Test 10: Missing Required Fields

**Objective:** Verify validation of required fields

```bash
# Missing partnerName
curl -X POST http://localhost:8001/api/compatibility \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "partnerImageUrl": "'$PARTNER_URL'"
  }'

# Missing partnerImageUrl
curl -X POST http://localhost:8001/api/compatibility \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "partnerName": "Alex"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Partner name and image URL are required"
}
```

**Validation:**
- ✅ Status code 400
- ✅ Error message about missing fields

---

### Test 11: User Without Profile

**Objective:** Verify error handling when user has no profile

**Setup:** Create new user without profile

```bash
# Register new user
curl -X POST http://localhost:8001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "noprofile@revelia.me",
    "password": "password123",
    "name": "No Profile User"
  }'

# Login and get token
export TOKEN2="..."

# Try to generate compatibility
curl -X POST http://localhost:8001/api/compatibility \
  -H "Authorization: Bearer $TOKEN2" \
  -H "Content-Type: application/json" \
  -d '{
    "partnerName": "Alex",
    "partnerImageUrl": "'$PARTNER_URL'"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Profile not found"
}
```

**Validation:**
- ✅ Status code 404
- ✅ Error message about profile not found

---

## Automated Test Script

Create `/app/server/test-compatibility.sh`:

```bash
#!/bin/bash

# Compatibility Testing Script
# Run from /app/server directory

BASE_URL="http://localhost:8001/api"
TEST_EMAIL="test@revelia.me"
TEST_PASSWORD="password123"

echo "🧪 Revelia Compatibility Testing"
echo "================================"
echo ""

# 1. Login
echo "1️⃣  Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$TEST_EMAIL'",
    "password": "'$TEST_PASSWORD'"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  echo $LOGIN_RESPONSE | jq .
  exit 1
fi

echo "✅ Login successful"
echo ""

# 2. Upload partner image (mock - would need actual image)
echo "2️⃣  Upload partner image (skipped - needs actual image file)"
PARTNER_URL="https://example.com/partner.jpg"  # Mock URL
echo ""

# 3. Generate compatibility (free user)
echo "3️⃣  Generating compatibility reading (free tier)..."
COMPAT_RESPONSE=$(curl -s -X POST $BASE_URL/compatibility \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "partnerName": "Alex",
    "partnerImageUrl": "'$PARTNER_URL'"
  }')

if echo $COMPAT_RESPONSE | jq -e '.success' > /dev/null; then
  echo "✅ Compatibility reading generated"
  READING_ID=$(echo $COMPAT_RESPONSE | jq -r '.data._id')
  echo "   Reading ID: $READING_ID"
  echo "   Overall Score: $(echo $COMPAT_RESPONSE | jq -r '.data.reading.overallScore')"
  echo "   Headline: $(echo $COMPAT_RESPONSE | jq -r '.data.reading.headline')"
else
  echo "❌ Failed to generate compatibility"
  echo $COMPAT_RESPONSE | jq .
fi
echo ""

# 4. Try second reading (should fail for free user)
echo "4️⃣  Attempting second reading (should fail for free tier)..."
SECOND_RESPONSE=$(curl -s -X POST $BASE_URL/compatibility \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "partnerName": "Jordan",
    "partnerImageUrl": "'$PARTNER_URL'"
  }')

if echo $SECOND_RESPONSE | jq -e '.success == false' > /dev/null; then
  echo "✅ Free tier limit enforced correctly"
  echo "   Error: $(echo $SECOND_RESPONSE | jq -r '.error')"
else
  echo "❌ Free tier limit not enforced"
fi
echo ""

# 5. Get all readings
echo "5️⃣  Getting all compatibility readings..."
ALL_READINGS=$(curl -s -X GET $BASE_URL/compatibility \
  -H "Authorization: Bearer $TOKEN")

READING_COUNT=$(echo $ALL_READINGS | jq '.data.readings | length')
echo "✅ Retrieved $READING_COUNT reading(s)"
echo ""

# 6. Get specific reading
if [ ! -z "$READING_ID" ] && [ "$READING_ID" != "null" ]; then
  echo "6️⃣  Getting specific reading..."
  SPECIFIC_READING=$(curl -s -X GET $BASE_URL/compatibility/$READING_ID \
    -H "Authorization: Bearer $TOKEN")
  
  if echo $SPECIFIC_READING | jq -e '.success' > /dev/null; then
    echo "✅ Retrieved specific reading"
  else
    echo "❌ Failed to retrieve specific reading"
  fi
  echo ""
fi

echo "================================"
echo "✅ Compatibility testing complete"
```

## Success Criteria

All tests must pass:

- ✅ Partner image upload works
- ✅ Free tier generates 1 reading
- ✅ Free tier blocks 2nd reading
- ✅ Premium tier generates unlimited readings
- ✅ Readings with birth data include cosmic connection
- ✅ Readings without birth data work correctly
- ✅ Get all readings works
- ✅ Get specific reading works
- ✅ Delete reading works
- ✅ Validation catches missing fields
- ✅ Error handling for missing profile

## Notes

- **Claude API Key:** Tests require valid ANTHROPIC_API_KEY in .env
- **R2 Storage:** Tests require R2 configured for image uploads
- **Cost:** Each test generates real Claude API calls (~$0.015-0.03 each)
- **Test Images:** Use appropriate test images (faces, not random images)
- **Cleanup:** Delete test readings after testing to avoid clutter

## Troubleshooting

### "Profile not found" error
- Ensure user has complete profile with face/palm readings
- Check UserProfile collection in MongoDB

### "Access denied" error
- Check JWT token is valid
- Verify user is authenticated

### Claude API errors
- Verify ANTHROPIC_API_KEY is set
- Check API key has sufficient credits
- Verify image URL is accessible

### R2 upload errors
- Verify R2 credentials are set
- Check R2 bucket exists
- Verify image format is supported (JPEG, PNG, WebP)
