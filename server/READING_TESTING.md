# Reading Generation System - Testing Guide

## Quick Start Testing

### 1. Set Up API Key

```bash
cd /app/server
echo "ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here" >> .env
```

**Get API Key**: https://console.anthropic.com/

### 2. Test Claude Connection

```bash
curl http://localhost:8001/api/test/claude
```

**Expected Success**:
```json
{
  "success": true,
  "message": "Revelia AI connected successfully",
  "timestamp": "2025-01-31T01:30:00.000Z"
}
```

**Expected Failure (No API Key)**:
```json
{
  "success": false,
  "error": "Could not resolve authentication method"
}
```

### 3. Create Test User

```bash
# Register
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@revelia.me",
    "password": "Test123!",
    "name": "Test User"
  }'

# Login
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@revelia.me",
    "password": "Test123!"
  }'

# Save token from response
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 4. Create Profile

```bash
curl -X POST http://localhost:8001/api/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "birthDate": "1990-01-15",
    "handedness": "right"
  }'
```

### 5. Upload Test Images

**Face Image**:
```bash
curl -X POST http://localhost:8001/api/upload/face \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@/path/to/face.jpg"
```

**Palm Image**:
```bash
curl -X POST http://localhost:8001/api/upload/palm-dominant \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@/path/to/palm.jpg"
```

### 6. Generate Face Reading

```bash
curl -X POST http://localhost:8001/api/readings/face \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq .
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "reading": {
      "archetype": {
        "name": "The Visionary",
        "tagline": "A mind that sees beyond the horizon"
      },
      "categories": {
        "intellect": {
          "score": 85,
          "title": "Strategic Thinker",
          "description": "Your prominent forehead and deep-set eyes reveal..."
        },
        "determination": {
          "score": 78,
          "title": "Resilient Spirit",
          "description": "The strong definition of your jaw..."
        }
      },
      "strengths": [
        "Analytical problem-solving",
        "Strategic planning",
        "Resilience under pressure"
      ],
      "shareableQuote": "Your face reveals the mind of someone who transforms obstacles into opportunities."
    },
    "cached": false,
    "tier": "free",
    "generatedAt": "2025-01-31T01:30:00.000Z"
  }
}
```

### 7. Get Cached Reading

```bash
curl http://localhost:8001/api/readings/face \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected**: Same reading, but `"cached": true`

### 8. Generate Palm Reading

```bash
curl -X POST http://localhost:8001/api/readings/palm \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"hand":"dominant"}' | jq .
```

### 9. View Reading History

```bash
curl http://localhost:8001/api/readings/history \
  -H "Authorization: Bearer $TOKEN" | jq .
```

## Detailed Test Cases

### Test Case 1: Claude Connectivity

**Endpoint**: `GET /api/test/claude`

**Purpose**: Verify Claude API is accessible

**Steps**:
1. Ensure ANTHROPIC_API_KEY is set
2. Call endpoint
3. Verify success response

**Success Criteria**:
- ✅ Returns 200 status
- ✅ `success: true`
- ✅ Message contains "Revelia AI connected successfully"

**Failure Scenarios**:
- ❌ No API key → "Could not resolve authentication method"
- ❌ Invalid API key → "Invalid API key"
- ❌ Network error → "Failed to connect"

### Test Case 2: Face Reading Generation (Free Tier)

**Endpoint**: `POST /api/readings/face`

**Purpose**: Generate face reading for free tier user

**Prerequisites**:
- User registered and logged in
- Profile created
- Face image uploaded

**Steps**:
1. Call endpoint with auth token
2. Wait for response (may take 5-10 seconds)
3. Verify reading structure

**Success Criteria**:
- ✅ Returns 200 status
- ✅ `success: true`
- ✅ `cached: false` (first call)
- ✅ `tier: "free"`
- ✅ Reading has archetype
- ✅ Reading has intellect category
- ✅ Reading has determination category
- ✅ Reading has strengths array (3 items)
- ✅ Reading has shareableQuote
- ✅ NO emotional, communication, perception, creativity categories
- ✅ NO growthOpportunity or affirmation

**Quality Checks**:
- ✅ Descriptions reference specific facial features
- ✅ Scores vary (not all 75-85)
- ✅ Strengths are specific, not generic
- ✅ Quote is quotable and empowering

### Test Case 3: Face Reading Caching

**Endpoint**: `GET /api/readings/face`

**Purpose**: Verify reading is cached and returned quickly

**Prerequisites**:
- Face reading already generated (Test Case 2)

**Steps**:
1. Call GET endpoint
2. Measure response time
3. Compare with previous reading

**Success Criteria**:
- ✅ Returns 200 status
- ✅ `cached: true`
- ✅ Same reading as previous call
- ✅ Response time < 100ms (no AI call)

### Test Case 4: Palm Reading Generation (Free Tier)

**Endpoint**: `POST /api/readings/palm`

**Purpose**: Generate palm reading for dominant hand

**Prerequisites**:
- User registered and logged in
- Profile created
- Palm image uploaded

**Request Body**:
```json
{
  "hand": "dominant"
}
```

**Success Criteria**:
- ✅ Returns 200 status
- ✅ `success: true`
- ✅ `cached: false` (first call)
- ✅ `tier: "free"`
- ✅ Reading has palmType (Earth/Air/Fire/Water)
- ✅ Reading has lines.heart
- ✅ Reading has lines.head
- ✅ Reading has destiny.lifeTheme
- ✅ Reading has destiny.naturalTalents (2 items)
- ✅ Reading has shareableQuote
- ✅ NO lines.life or lines.fate
- ✅ NO mounts
- ✅ NO destiny.challenges or destiny.advice

**Quality Checks**:
- ✅ Palm type description matches characteristics
- ✅ Line interpretations reference actual features
- ✅ Life theme is specific and powerful
- ✅ Natural talents reference palm features

### Test Case 5: Premium Tier Validation

**Endpoint**: `POST /api/readings/face`

**Purpose**: Verify premium fields are included for premium users

**Prerequisites**:
- User has premium subscription
- Face image uploaded

**Success Criteria**:
- ✅ `tier: "premium"`
- ✅ Reading has emotional category
- ✅ Reading has communication category
- ✅ Reading has perception category
- ✅ Reading has creativity category
- ✅ Reading has growthOpportunity
- ✅ Reading has affirmation
- ✅ Strengths array has 5 items (vs 3 for free)

### Test Case 6: Regenerate Reading (Free Tier)

**Endpoint**: `POST /api/readings/face`

**Purpose**: Verify free tier cannot regenerate readings

**Request Body**:
```json
{
  "regenerate": true
}
```

**Success Criteria**:
- ✅ Returns 403 status
- ✅ `success: false`
- ✅ Error: "Premium subscription required to regenerate readings"

### Test Case 7: Regenerate Reading (Premium Tier)

**Endpoint**: `POST /api/readings/face`

**Purpose**: Verify premium tier can regenerate readings

**Prerequisites**:
- User has premium subscription
- Face reading already exists

**Request Body**:
```json
{
  "regenerate": true
}
```

**Success Criteria**:
- ✅ Returns 200 status
- ✅ `cached: false`
- ✅ New reading generated (different from previous)
- ✅ Old reading still in history

### Test Case 8: Non-Dominant Palm (Free Tier)

**Endpoint**: `POST /api/readings/palm`

**Purpose**: Verify free tier cannot access non-dominant palm

**Request Body**:
```json
{
  "hand": "non-dominant"
}
```

**Success Criteria**:
- ✅ Returns 403 status
- ✅ `success: false`
- ✅ Error: "Premium subscription required for non-dominant palm reading"

### Test Case 9: Non-Dominant Palm (Premium Tier)

**Endpoint**: `POST /api/readings/palm`

**Purpose**: Generate non-dominant palm reading for premium user

**Prerequisites**:
- User has premium subscription
- Non-dominant palm image uploaded

**Request Body**:
```json
{
  "hand": "non-dominant"
}
```

**Success Criteria**:
- ✅ Returns 200 status
- ✅ Reading generated successfully
- ✅ Interpretation mentions "non-dominant hand"
- ✅ Focuses on inherited traits and potential

### Test Case 10: Reading History

**Endpoint**: `GET /api/readings/history`

**Purpose**: Retrieve all readings for user

**Prerequisites**:
- Multiple readings generated

**Success Criteria**:
- ✅ Returns 200 status
- ✅ Array of readings
- ✅ Sorted by most recent first
- ✅ Each reading has _id, userId, type, tier, content, timestamps
- ✅ Content is full reading object

### Test Case 11: Reading History Filtering

**Endpoint**: `GET /api/readings/history?type=face&limit=5`

**Purpose**: Filter reading history by type

**Success Criteria**:
- ✅ Only face readings returned
- ✅ Maximum 5 readings
- ✅ Sorted by most recent first

### Test Case 12: No Image Uploaded

**Endpoint**: `POST /api/readings/face`

**Purpose**: Verify error when no image uploaded

**Prerequisites**:
- User has profile but no face image

**Success Criteria**:
- ✅ Returns 400 status
- ✅ `success: false`
- ✅ Error: "No face image uploaded. Please capture your face photo first."

### Test Case 13: Invalid Hand Parameter

**Endpoint**: `POST /api/readings/palm`

**Purpose**: Verify validation of hand parameter

**Request Body**:
```json
{
  "hand": "left"
}
```

**Success Criteria**:
- ✅ Returns 400 status
- ✅ `success: false`
- ✅ Error: "Invalid hand parameter. Must be 'dominant' or 'non-dominant'"

### Test Case 14: Retry Logic

**Endpoint**: `POST /api/readings/face`

**Purpose**: Verify retry logic handles transient failures

**Simulation**:
1. Temporarily block Claude API
2. Call endpoint
3. Unblock after 2 seconds

**Success Criteria**:
- ✅ First attempt fails
- ✅ Retry after 1 second
- ✅ Retry after 2 seconds
- ✅ Eventually succeeds
- ✅ Total time < 10 seconds

### Test Case 15: Concurrent Requests

**Endpoint**: `POST /api/readings/face`

**Purpose**: Verify system handles concurrent reading requests

**Steps**:
1. Generate 5 face readings simultaneously
2. Verify all succeed
3. Check response times

**Success Criteria**:
- ✅ All 5 requests succeed
- ✅ No race conditions
- ✅ Each reading is unique
- ✅ Average response time < 15 seconds

## Performance Testing

### Response Time Benchmarks

**Face Reading (First Generation)**:
- Target: < 10 seconds
- Acceptable: < 15 seconds
- Slow: > 20 seconds

**Face Reading (Cached)**:
- Target: < 100ms
- Acceptable: < 500ms
- Slow: > 1 second

**Palm Reading (First Generation)**:
- Target: < 10 seconds
- Acceptable: < 15 seconds
- Slow: > 20 seconds

**Reading History**:
- Target: < 200ms
- Acceptable: < 500ms
- Slow: > 1 second

### Load Testing

**Scenario 1: 10 Concurrent Users**
```bash
# Using Apache Bench
ab -n 10 -c 10 -H "Authorization: Bearer $TOKEN" \
  -p face_request.json -T application/json \
  http://localhost:8001/api/readings/face
```

**Expected**:
- All requests succeed
- Average response time < 15 seconds
- No errors

**Scenario 2: 100 Cached Reads**
```bash
ab -n 100 -c 10 -H "Authorization: Bearer $TOKEN" \
  http://localhost:8001/api/readings/face
```

**Expected**:
- All requests succeed
- Average response time < 200ms
- No errors

## Quality Assurance Checklist

### Face Reading Quality

- [ ] Archetype name is creative and fitting
- [ ] Tagline is powerful and specific
- [ ] Intellect description references forehead, eyes, or brow
- [ ] Determination description references jaw, chin, or nose
- [ ] Scores vary (not all 75-85)
- [ ] At least one score > 85 or < 70
- [ ] Strengths are specific, not generic
- [ ] Shareable quote is quotable and empowering
- [ ] No hedging language ("might", "could", "possibly")
- [ ] No age, weight, or attractiveness mentions
- [ ] No medical or health claims
- [ ] No specific life event predictions

### Palm Reading Quality

- [ ] Palm type correctly identified
- [ ] Palm type description matches characteristics
- [ ] Heart line interpretation references curve, depth, length
- [ ] Head line interpretation references curve, depth, length
- [ ] Life line interpretation focuses on vitality (NOT lifespan)
- [ ] Fate line interpretation handles absence gracefully
- [ ] Mount interpretations are specific
- [ ] Life theme is powerful and specific
- [ ] Natural talents reference palm features
- [ ] Challenges framed positively (premium)
- [ ] Advice is practical and empowering (premium)
- [ ] Shareable quote is quotable
- [ ] No lifespan predictions
- [ ] No medical or health claims
- [ ] No specific life event predictions

### JSON Structure

- [ ] Valid JSON (no markdown, no code blocks)
- [ ] All required fields present
- [ ] No extra fields
- [ ] Correct data types
- [ ] Premium fields only in premium tier
- [ ] Free tier fields always present

## Troubleshooting

### Issue: "Could not resolve authentication method"

**Cause**: ANTHROPIC_API_KEY not set

**Fix**:
```bash
cd /app/server
echo "ANTHROPIC_API_KEY=sk-ant-api03-your-key" >> .env
# Restart server (auto-restarts with ts-node-dev)
```

### Issue: "No face image uploaded"

**Cause**: User hasn't uploaded face image

**Fix**:
```bash
curl -X POST http://localhost:8001/api/upload/face \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@/path/to/face.jpg"
```

### Issue: "Invalid response format from AI"

**Cause**: Claude returned invalid JSON

**Fix**:
- Check Claude API status
- Retry request (automatic)
- Check logs for actual response

### Issue: Slow response times

**Cause**: Large images or network latency

**Fix**:
- Optimize image sizes (< 1MB)
- Check network connection
- Monitor Claude API status

### Issue: "Premium subscription required"

**Cause**: Free tier user trying premium feature

**Fix**:
- Upgrade user to premium
- Or use free tier features only

## Test Data

### Sample Test Images

For testing, use:
- **Face**: Clear, well-lit frontal face photo
- **Palm**: Clear, well-lit palm photo with fingers spread
- **Format**: JPEG or PNG
- **Size**: 500KB - 2MB
- **Resolution**: 1000x1000 or higher

### Sample Test Users

**Free Tier User**:
```json
{
  "email": "free@test.com",
  "password": "Test123!",
  "name": "Free User",
  "subscription": { "tier": "free" }
}
```

**Premium User**:
```json
{
  "email": "premium@test.com",
  "password": "Test123!",
  "name": "Premium User",
  "subscription": { "tier": "premium" }
}
```

## Automated Testing

### Jest Test Suite (Future)

```typescript
// tests/readings.test.ts
describe('Reading Generation', () => {
  it('should generate face reading', async () => {
    const response = await request(app)
      .post('/api/readings/face')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.reading).toHaveProperty('archetype');
  });
  
  it('should cache face reading', async () => {
    const response = await request(app)
      .get('/api/readings/face')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.body.data.cached).toBe(true);
  });
});
```

## Summary

✅ **Test Coverage**:
- Claude connectivity
- Face reading generation (free + premium)
- Palm reading generation (dominant + non-dominant)
- Reading caching
- Reading history
- Premium tier validation
- Error handling
- Quality validation

✅ **Ready for**:
- Manual testing
- Automated testing
- Load testing
- Production deployment

✅ **Next Steps**:
1. Set ANTHROPIC_API_KEY
2. Run all test cases
3. Verify reading quality
4. Monitor performance
5. Deploy to production
