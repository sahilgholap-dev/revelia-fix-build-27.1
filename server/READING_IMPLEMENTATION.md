# Reading Generation System Implementation

## Overview

This document describes the Claude API integration and reading generation system for Revelia. The system generates personalized face and palm readings using Claude Sonnet 4.5 Vision API.

## Implementation Status

✅ **COMPLETED**

### Files Created

1. **Services**
   - `/app/server/src/services/claude.service.ts` - Claude API integration with retry logic
   - `/app/server/src/services/reading.service.ts` - Reading generation and caching logic

2. **Models**
   - `/app/server/src/models/Reading.ts` - Reading history model

3. **Controllers**
   - `/app/server/src/controllers/reading.controller.ts` - Reading endpoints

4. **Routes**
   - `/app/server/src/routes/readings.routes.ts` - Reading routes

5. **Updates**
   - `/app/server/src/routes/index.ts` - Mounted reading routes
   - `/app/server/src/routes/test.routes.ts` - Added Claude test endpoint
   - `/app/server/src/models/UserProfile.ts` - Added `palmReadingNonDominant` field
   - `/app/packages/shared/types.ts` - Cleaned up duplicate type definitions

## Architecture

### Claude Service (`claude.service.ts`)

**Purpose**: Direct integration with Claude Sonnet 4.5 Vision API

**Key Features**:
- Image fetching and base64 conversion (Claude requires base64, not URLs)
- Retry logic for API failures (3 retries with exponential backoff)
- JSON parsing with markdown code block handling
- Separate functions for face and palm readings
- Test connectivity function

**Functions**:
```typescript
// Generate face reading
generateFaceReading(imageUrl, tier, userContext?): Promise<FaceReadingOutput>

// Generate palm reading
generatePalmReading(imageUrl, tier, isDominant, handedness, userContext?): Promise<PalmReadingOutput>

// Test Claude connection
testClaudeConnection(): Promise<string>

// With retry wrappers
generateFaceReadingWithRetry(...)
generatePalmReadingWithRetry(...)
```

**Error Handling**:
- Retries on network errors (ECONNRESET, ETIMEDOUT)
- Retries on rate limits (429)
- Retries on server errors (500, 503)
- Exponential backoff: 1s → 2s → 4s

### Reading Service (`reading.service.ts`)

**Purpose**: Business logic for reading generation and caching

**Key Features**:
- Cache-first approach (returns cached reading if exists)
- Premium tier validation
- User context enrichment (name, sun sign, life path number)
- Automatic caching in UserProfile
- Reading history tracking

**Functions**:
```typescript
// Get or generate face reading
getFaceReading(userId, forceRegenerate): Promise<ReadingResult>

// Get or generate palm reading
getPalmReading(userId, hand, forceRegenerate): Promise<ReadingResult>

// Get reading history
getReadingHistory(userId, type?, limit?): Promise<Reading[]>
```

**Caching Strategy**:
1. Check if reading exists in UserProfile
2. If exists and not forcing regenerate → return cached
3. If not exists or forcing regenerate → generate new
4. Save to UserProfile (cache)
5. Save to Reading collection (history)

**Premium Gates**:
- Non-dominant palm reading: Premium only
- Regenerate readings: Premium only
- Free tier: Limited fields in output
- Premium tier: Full fields in output

### Reading Model (`Reading.ts`)

**Purpose**: Store reading history for analytics and retrieval

**Schema**:
```typescript
{
  userId: ObjectId,
  type: 'face' | 'palm-dominant' | 'palm-non-dominant' | 'combined' | 'daily' | 'weekly' | 'monthly',
  tier: 'free' | 'premium' | 'premium_plus',
  content: FaceReadingOutput | PalmReadingOutput,
  imageUrl?: string,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `{ userId: 1, type: 1, createdAt: -1 }` - Efficient history queries

### UserProfile Updates

**New Fields**:
```typescript
faceReading?: FaceReadingOutput
palmReading?: PalmReadingOutput
palmReadingNonDominant?: PalmReadingOutput
combinedProfile?: any  // For future combined readings
```

## API Endpoints

### 1. Generate Face Reading

**POST** `/api/readings/face`

**Authentication**: Required (JWT)

**Request Body**:
```json
{
  "regenerate": false  // Optional, default: false
}
```

**Response**:
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

**Premium Fields** (tier: premium):
- `categories.emotional`
- `categories.communication`
- `categories.perception`
- `categories.creativity`
- `growthOpportunity`
- `affirmation`

**Errors**:
- `400`: No face image uploaded
- `403`: Premium required for regeneration (free tier)
- `404`: User or profile not found
- `500`: AI generation failed

### 2. Generate Palm Reading

**POST** `/api/readings/palm`

**Authentication**: Required (JWT)

**Request Body**:
```json
{
  "hand": "dominant",  // "dominant" or "non-dominant"
  "regenerate": false  // Optional, default: false
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "reading": {
      "palmType": {
        "name": "Air Hand",
        "description": "Your square palm with long fingers reveals..."
      },
      "lines": {
        "heart": {
          "strength": "strong",
          "interpretation": "Your deep, curved heart line shows..."
        },
        "head": {
          "strength": "moderate",
          "interpretation": "The gentle curve of your head line reveals..."
        }
      },
      "destiny": {
        "lifeTheme": "A life of creative expression and meaningful connection",
        "naturalTalents": [
          "Communication and storytelling",
          "Analytical thinking"
        ]
      },
      "shareableQuote": "Your palm reveals hands destined to create bridges between ideas and reality."
    },
    "cached": false,
    "tier": "free",
    "generatedAt": "2025-01-31T01:30:00.000Z"
  }
}
```

**Premium Fields** (tier: premium):
- `lines.life`
- `lines.fate`
- `mounts.jupiter`
- `mounts.saturn`
- `mounts.apollo`
- `mounts.mercury`
- `destiny.challenges`
- `destiny.advice`

**Errors**:
- `400`: Invalid hand parameter or no palm image uploaded
- `403`: Premium required for non-dominant hand or regeneration
- `404`: User or profile not found
- `500`: AI generation failed

### 3. Get Cached Face Reading

**GET** `/api/readings/face`

**Authentication**: Required (JWT)

**Response**: Same as POST endpoint, but always returns cached reading

**Errors**:
- `404`: No cached face reading found

### 4. Get Cached Palm Reading

**GET** `/api/readings/palm?hand=dominant`

**Authentication**: Required (JWT)

**Query Parameters**:
- `hand`: "dominant" or "non-dominant" (default: "dominant")

**Response**: Same as POST endpoint, but always returns cached reading

**Errors**:
- `400`: Invalid hand parameter
- `404`: No cached palm reading found

### 5. Get Reading History

**GET** `/api/readings/history?type=face&limit=10`

**Authentication**: Required (JWT)

**Query Parameters**:
- `type`: Optional filter by reading type
- `limit`: Number of readings to return (default: 10)

**Response**:
```json
{
  "success": true,
  "data": {
    "readings": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "userId": "507f191e810c19729de860ea",
        "type": "face",
        "tier": "free",
        "content": { /* FaceReadingOutput */ },
        "imageUrl": "https://r2.example.com/face.jpg",
        "createdAt": "2025-01-31T01:30:00.000Z",
        "updatedAt": "2025-01-31T01:30:00.000Z"
      }
    ]
  }
}
```

### 6. Test Claude Connection

**GET** `/api/test/claude`

**Authentication**: Not required

**Response**:
```json
{
  "success": true,
  "message": "Revelia AI connected successfully",
  "timestamp": "2025-01-31T01:30:00.000Z"
}
```

**Errors**:
- `500`: Claude API connection failed (check API key)

## Configuration

### Environment Variables

Add to `/app/server/.env`:

```bash
# Claude API (AI Reading Generation)
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Get API Key**: https://console.anthropic.com/

**Model Used**: `claude-sonnet-4-6`

**Cost**: ~$0.01-0.03 per reading (depends on image size and output length)

### Token Limits

- **Free Tier**: 1000 max tokens (~200-300 words)
- **Premium Tier**: 2500 max tokens (~500-700 words)

## Testing

### Prerequisites

1. **Set API Key**:
   ```bash
   cd /app/server
   echo "ANTHROPIC_API_KEY=sk-ant-api03-your-key-here" >> .env
   ```

2. **Restart Server**:
   ```bash
   # Server auto-restarts via ts-node-dev
   # Or manually: cd /app/server && yarn dev
   ```

3. **Create Test User**:
   ```bash
   # Register a test user
   curl -X POST http://localhost:8001/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "Test123!",
       "name": "Test User"
     }'
   
   # Login to get token
   curl -X POST http://localhost:8001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "Test123!"
     }'
   
   # Save the token from response
   export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   ```

4. **Create Profile and Upload Images**:
   ```bash
   # Create profile
   curl -X POST http://localhost:8001/api/profile \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test User",
       "birthDate": "1990-01-15",
       "handedness": "right"
     }'
   
   # Upload face image
   curl -X POST http://localhost:8001/api/upload/face \
     -H "Authorization: Bearer $TOKEN" \
     -F "image=@/path/to/face.jpg"
   
   # Upload palm image
   curl -X POST http://localhost:8001/api/upload/palm-dominant \
     -H "Authorization: Bearer $TOKEN" \
     -F "image=@/path/to/palm.jpg"
   ```

### Test Cases

#### 1. Test Claude Connectivity

```bash
curl http://localhost:8001/api/test/claude
```

**Expected**:
```json
{
  "success": true,
  "message": "Revelia AI connected successfully",
  "timestamp": "2025-01-31T01:30:00.000Z"
}
```

#### 2. Generate Face Reading

```bash
curl -X POST http://localhost:8001/api/readings/face \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Expected**:
- Returns FaceReadingOutput with all required fields
- `cached: false` on first call
- `tier: "free"` or `"premium"` based on subscription
- Reading references specific facial features
- Scores vary (not all 75-85)

#### 3. Get Cached Face Reading

```bash
curl http://localhost:8001/api/readings/face \
  -H "Authorization: Bearer $TOKEN"
```

**Expected**:
- Returns same reading as previous call
- `cached: true`
- Faster response time

#### 4. Generate Palm Reading

```bash
curl -X POST http://localhost:8001/api/readings/palm \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"hand":"dominant"}'
```

**Expected**:
- Returns PalmReadingOutput with all required fields
- Palm type identified (Earth/Air/Fire/Water)
- Lines analyzed (heart, head, life, fate)
- Mounts analyzed (premium only)

#### 5. Regenerate Reading (Premium Only)

```bash
curl -X POST http://localhost:8001/api/readings/face \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"regenerate":true}'
```

**Expected**:
- Free tier: `403 Forbidden` error
- Premium tier: New reading generated

#### 6. Non-Dominant Palm (Premium Only)

```bash
curl -X POST http://localhost:8001/api/readings/palm \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"hand":"non-dominant"}'
```

**Expected**:
- Free tier: `403 Forbidden` error
- Premium tier: Non-dominant palm reading generated

#### 7. Reading History

```bash
curl http://localhost:8001/api/readings/history \
  -H "Authorization: Bearer $TOKEN"
```

**Expected**:
- Array of all readings for user
- Sorted by most recent first
- Includes type, tier, content, timestamps

## Quality Validation

When testing readings, verify:

### Face Reading Quality

✅ **Specificity**:
- References actual facial features ("Your prominent brow ridge...")
- Not generic ("You're a natural leader" ❌)
- Specific strengths ("Ability to synthesize complex information" ✅)

✅ **Tone**:
- Confident and declarative ("You are" not "You might be")
- Warm and empowering
- Second person ("You" and "Your")

✅ **Scores**:
- Varied (not all 75-85)
- Some areas 60-69, others 80-95
- Reflects actual features observed

✅ **Structure**:
- Valid JSON (no markdown, no explanations)
- All required fields present
- Premium fields only in premium tier

### Palm Reading Quality

✅ **Palm Type**:
- Correctly identified (Earth/Air/Fire/Water)
- Description matches palm characteristics

✅ **Lines**:
- Strength assessed (strong/moderate/faint)
- Interpretation references actual line features
- Life line NEVER mentions lifespan (only vitality)

✅ **Mounts** (Premium):
- Prominence assessed (high/moderate/low)
- Meaning explained clearly

✅ **Destiny**:
- Life theme is powerful and specific
- Natural talents reference palm features
- Challenges framed positively (premium)

## Cost Monitoring

### Per Reading Cost

**Face Reading**:
- Free tier: ~$0.008-0.012 (1000 tokens)
- Premium tier: ~$0.020-0.030 (2500 tokens)

**Palm Reading**:
- Free tier: ~$0.008-0.012 (1000 tokens)
- Premium tier: ~$0.020-0.030 (2500 tokens)

**Image Processing**:
- ~$0.005 per image (base64 encoding + API transfer)

### Monthly Estimates

**1000 users, 2 readings each**:
- 2000 readings × $0.015 avg = **$30/month**

**10,000 users, 3 readings each**:
- 30,000 readings × $0.015 avg = **$450/month**

**Optimization**:
- ✅ Caching reduces repeat costs to $0
- ✅ Free tier uses fewer tokens (lower cost)
- ✅ Retry logic prevents wasted failed calls

## Error Handling

### Common Errors

**1. No API Key**:
```json
{
  "success": false,
  "error": "Could not resolve authentication method"
}
```
**Fix**: Set `ANTHROPIC_API_KEY` in `.env`

**2. No Image Uploaded**:
```json
{
  "success": false,
  "error": "No face image uploaded. Please capture your face photo first."
}
```
**Fix**: Upload image via `/api/upload/face` first

**3. Invalid JSON Response**:
```json
{
  "success": false,
  "error": "Invalid response format from AI"
}
```
**Fix**: Check Claude API status, retry automatically handled

**4. Rate Limit**:
```json
{
  "success": false,
  "error": "Rate limit exceeded"
}
```
**Fix**: Retry logic handles automatically (3 retries with backoff)

**5. Image Fetch Failed**:
```json
{
  "success": false,
  "error": "Failed to fetch image: ECONNREFUSED"
}
```
**Fix**: Ensure R2 URLs are publicly accessible

## Security Considerations

### API Key Protection

✅ **Never log API keys**:
```typescript
// ❌ DON'T
logger.info('API Key:', process.env.ANTHROPIC_API_KEY);

// ✅ DO
logger.info('API Key configured:', !!process.env.ANTHROPIC_API_KEY);
```

✅ **Never expose in responses**:
```typescript
// API key is never included in any response
```

✅ **Environment variables only**:
```typescript
// Never hardcode
const apiKey = process.env.ANTHROPIC_API_KEY;
```

### User Data Protection

✅ **Never log user images**:
```typescript
// ❌ DON'T
logger.info('Image data:', imageData);

// ✅ DO
logger.info('Image fetched', { size: imageData.length });
```

✅ **Authentication required**:
```typescript
// All reading endpoints require JWT authentication
router.use(authenticateToken);
```

✅ **User isolation**:
```typescript
// Users can only access their own readings
const userId = req.user!._id.toString();
```

## Future Enhancements

### Planned Features

1. **Combined Readings**:
   - Merge face + palm readings
   - Holistic personality profile
   - Cross-reference insights

2. **Daily/Weekly/Monthly Readings**:
   - Time-based insights
   - Astrological transits
   - Numerology cycles

3. **Compatibility Readings**:
   - Compare two profiles
   - Relationship insights
   - Friendship compatibility

4. **Reading Regeneration Cooldown**:
   - Prevent excessive API usage
   - 24-hour cooldown for free tier
   - Unlimited for premium

5. **Reading Analytics**:
   - Track most popular reading types
   - Average generation time
   - User satisfaction ratings

6. **Webhook Notifications**:
   - Notify when reading is ready
   - Background processing for slow generations

## Troubleshooting

### Server Not Starting

```bash
# Check logs
tail -f /var/log/supervisor/backend.*.log

# Check if port is in use
netstat -tlnp | grep 8001

# Restart manually
cd /app/server && yarn dev
```

### TypeScript Compilation Errors

```bash
# Rebuild
cd /app/server && yarn build

# Check for type errors
cd /app/server && yarn tsc --noEmit
```

### Database Connection Issues

```bash
# Check MongoDB status
sudo systemctl status mongod

# Check connection string
grep MONGODB_URI /app/server/.env
```

### Claude API Issues

```bash
# Test connectivity
curl http://localhost:8001/api/test/claude

# Check API key
grep ANTHROPIC_API_KEY /app/server/.env

# Check Claude status
curl https://status.anthropic.com/
```

## Support

For issues or questions:

1. Check this documentation
2. Review error logs: `tail -f /var/log/supervisor/backend.*.log`
3. Test endpoints with curl
4. Verify environment variables
5. Check Claude API status

## Summary

✅ **Implemented**:
- Claude API integration with retry logic
- Face reading generation (free + premium tiers)
- Palm reading generation (dominant + non-dominant)
- Reading caching in UserProfile
- Reading history tracking
- Premium tier validation
- Test endpoints
- Comprehensive error handling

✅ **Ready for**:
- Mobile app integration
- Production deployment (with API key)
- User testing
- Analytics tracking

✅ **Next Steps**:
1. Set ANTHROPIC_API_KEY in production
2. Test with real user images
3. Monitor API costs
4. Implement combined readings
5. Add daily/weekly/monthly readings
