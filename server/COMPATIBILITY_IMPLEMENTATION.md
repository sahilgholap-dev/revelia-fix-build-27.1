# Compatibility Reading System Implementation

## Overview

The compatibility reading system is now fully implemented. This is the **VIRAL ENGINE** that drives organic growth for Revelia. Users can upload a partner's photo, get a compatibility reading, and share it.

## Implementation Summary

### 1. Database Model

**File:** `/app/server/src/models/Compatibility.ts`

- Stores compatibility readings with partner info
- Links to user via `userId`
- Stores partner name, image URL, and optional birth data
- Caches the full compatibility reading
- Tracks subscription tier used for generation

### 2. Services

**File:** `/app/server/src/services/compatibility.service.ts`

Key functions:
- `buildUserCompatibilityProfile()` - Extracts user data from profile and readings
- `buildPartnerProfile()` - Creates partner profile from input data
- `checkCompatibilityAccess()` - Enforces tier limits (free: 1 reading, premium: unlimited)
- `generateCompatibility()` - Main function to generate compatibility reading
- `getCompatibilityReadings()` - Retrieve all readings for a user
- `getCompatibilityById()` - Get specific reading
- `deleteCompatibility()` - Delete a reading

**File:** `/app/server/src/services/claude.service.ts`

Added:
- `generateCompatibilityReading()` - Calls Claude API with partner image and prompt
- `generateCompatibilityReadingWithRetry()` - Wrapper with retry logic

### 3. Controllers

**File:** `/app/server/src/controllers/compatibility.controller.ts`

Endpoints:
- `POST /api/compatibility` - Generate new compatibility reading
- `GET /api/compatibility` - Get all compatibility readings
- `GET /api/compatibility/:id` - Get specific reading
- `DELETE /api/compatibility/:id` - Delete reading

### 4. Upload Support

**File:** `/app/server/src/controllers/upload.controller.ts`

Added:
- `uploadPartner()` - Upload partner image for compatibility

**File:** `/app/server/src/services/upload.service.ts`

Added:
- `uploadPartnerImage()` - Process and upload partner image to R2

**File:** `/app/server/src/services/r2.service.ts`

Updated:
- `uploadImage()` - Now supports 'partner' type
- Partner images stored at: `{userId}/partners/{timestamp}.jpg`

### 5. Routes

**File:** `/app/server/src/routes/compatibility.routes.ts`

All routes require authentication.

**File:** `/app/server/src/routes/upload.routes.ts`

Added:
- `POST /api/upload/partner` - Upload partner image

**File:** `/app/server/src/routes/index.ts`

Mounted compatibility routes at `/api/compatibility`

## Subscription Tier Logic

### Free Tier
- **Limit:** 1 compatibility reading (trial)
- **Content:** Basic reading with:
  - Overall score
  - Headline and summary
  - 2 category scores (emotional, communication)
  - 2 strengths
  - Shareable quote

### Premium/Premium Plus Tier
- **Limit:** Unlimited compatibility readings
- **Content:** Full reading with:
  - Overall score
  - Headline and summary
  - 5 category scores (emotional, intellectual, communication, values, passion)
  - 4 strengths
  - 2 challenges (positively framed)
  - Relationship advice
  - Cosmic connection (sun sign, numerology, archetype synergy)
  - Affirmation
  - Shareable quote

## API Endpoints

### 1. Upload Partner Image

```bash
POST /api/upload/partner
Authorization: Bearer {token}
Content-Type: multipart/form-data

Body:
  image: [file]

Response:
{
  "success": true,
  "data": {
    "url": "https://images.revelia.me/{userId}/partners/{timestamp}.jpg",
    "type": "partner",
    "uploadedAt": "2026-01-31T05:00:00.000Z"
  }
}
```

### 2. Generate Compatibility Reading

```bash
POST /api/compatibility
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "partnerName": "Alex",
  "partnerImageUrl": "https://images.revelia.me/...",
  "partnerBirthDate": "1992-08-15"  // Optional
}

Response:
{
  "success": true,
  "data": {
    "_id": "...",
    "userId": "...",
    "partnerName": "Alex",
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
      "categoryScores": { ... },
      "strengths": [ ... ],
      "challenges": [ ... ],  // Premium only
      "advice": "...",        // Premium only
      "cosmicConnection": { ... },  // Premium only
      "affirmation": "...",   // Premium only
      "shareableQuote": "..."
    },
    "tier": "premium",
    "createdAt": "2026-01-31T05:00:00.000Z",
    "updatedAt": "2026-01-31T05:00:00.000Z"
  }
}

Error (Free user, second reading):
{
  "success": false,
  "error": "Free users get 1 compatibility reading. Upgrade for unlimited."
}
```

### 3. Get All Compatibility Readings

```bash
GET /api/compatibility
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "readings": [
      {
        "_id": "...",
        "userId": "...",
        "partnerName": "Alex",
        "partnerImageUrl": "...",
        "reading": { ... },
        "tier": "premium",
        "createdAt": "...",
        "updatedAt": "..."
      }
    ]
  }
}
```

### 4. Get Specific Compatibility Reading

```bash
GET /api/compatibility/:id
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "_id": "...",
    "userId": "...",
    "partnerName": "Alex",
    "reading": { ... },
    ...
  }
}
```

### 5. Delete Compatibility Reading

```bash
DELETE /api/compatibility/:id
Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "Compatibility reading deleted"
}
```

## How It Works

### User Flow

1. **User uploads partner photo** → `POST /api/upload/partner`
2. **User requests compatibility** → `POST /api/compatibility` with partner name, image URL, and optional birth date
3. **System checks access:**
   - Free users: 1 reading allowed
   - Premium users: Unlimited
4. **System builds profiles:**
   - User profile: Extracted from stored face/palm readings
   - Partner profile: Built from input data + birth calculations if provided
5. **Claude generates reading:**
   - Analyzes partner's face photo
   - Compares with user's profile
   - Generates personalized compatibility analysis
   - Tier determines content depth
6. **Reading saved to database**
7. **User can view, share, or delete readings**

### Data Extraction

The system extracts the following from user's stored readings:

**From Face Reading:**
- Archetype name and tagline
- Strengths
- Communication style (from communication category)
- Emotional nature (from emotional category)

**From Palm Reading:**
- Palm type (Earth/Air/Fire/Water Hand)
- Emotional nature (from heart line if face reading doesn't have it)

**From Profile:**
- Name
- Sun sign
- Life path number

### Partner Analysis

**With Birth Data:**
- Claude analyzes face for personality traits
- System calculates sun sign and life path number
- Reading includes astrological and numerological compatibility

**Without Birth Data:**
- Claude analyzes face for personality traits
- Reading focuses on personality compatibility from face analysis
- No cosmic connection section

## Cost Estimation

- **Free tier reading:** ~$0.015 per reading (1000 tokens)
- **Premium tier reading:** ~$0.025-0.03 per reading (2500 tokens)
- **Image processing:** Included in Claude API call

## Viral Mechanism

The **shareable quote** is designed to drive organic growth:

1. User generates compatibility reading
2. Reading includes personalized, quotable line
3. User shares quote + compatibility card on social media
4. Friends see the share and want their own reading
5. Organic growth loop

Example quotes:
- "Your Visionary mind and their grounded wisdom create the rare alchemy where dreams meet reality."
- "Two Fire Hands together—a relationship that transforms obstacles into adventures."
- "The universe knew what it was doing when it brought a Taurus and Leo together—depth meets devotion."

## Testing

See `COMPATIBILITY_TESTING.md` for comprehensive testing instructions.

## Next Steps

1. **Mobile Integration:** Mobile team needs to implement:
   - Partner photo upload UI
   - Compatibility request form
   - Compatibility reading display
   - Share functionality for quotes

2. **Testing:** Run full test suite to verify:
   - Free tier limits
   - Premium tier unlimited access
   - Birth data handling
   - Reading quality

3. **Monitoring:** Track:
   - Compatibility reading generation rate
   - Share rate of quotes
   - Conversion from free to premium

## Files Modified/Created

### Created:
- `/app/server/src/models/Compatibility.ts`
- `/app/server/src/services/compatibility.service.ts`
- `/app/server/src/controllers/compatibility.controller.ts`
- `/app/server/src/routes/compatibility.routes.ts`
- `/app/server/COMPATIBILITY_IMPLEMENTATION.md`

### Modified:
- `/app/server/src/services/claude.service.ts` - Added compatibility generation
- `/app/server/src/services/upload.service.ts` - Added partner upload
- `/app/server/src/services/r2.service.ts` - Added partner type support
- `/app/server/src/controllers/upload.controller.ts` - Added partner endpoint
- `/app/server/src/routes/upload.routes.ts` - Added partner route
- `/app/server/src/routes/index.ts` - Mounted compatibility routes
- `/app/server/src/index.ts` - Fixed env loading order

## Status

✅ **COMPLETE** - All compatibility endpoints implemented and server running on port 8001.
