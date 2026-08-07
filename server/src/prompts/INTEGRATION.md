# Revelia AI Reading Prompts - Integration Guide

## Overview

This guide shows how to integrate the AI reading prompts with your backend services to generate personalized readings using Claude Sonnet 4.5 Vision API.

## Quick Start

```typescript
import { buildFaceReadingPrompt, FaceReadingOutput } from '../prompts';

// Generate a face reading
const prompt = buildFaceReadingPrompt('premium', {
  name: user.name,
  sunSign: userProfile.sunSign,
  lifePathNumber: userProfile.lifePathNumber
});

// Send to Claude Vision API (implementation depends on your Claude client)
const response = await claudeVisionAPI({
  model: 'claude-sonnet-4-6',
  prompt: prompt,
  image: imageBase64OrUrl,
  maxTokens: 2000
});

// Parse response
const reading: FaceReadingOutput = JSON.parse(response);
```

## Service Integration Pattern

### 1. Create Reading Service

```typescript
// src/services/reading.service.ts

import Anthropic from '@anthropic-ai/sdk';
import {
  buildFaceReadingPrompt,
  buildPalmReadingPrompt,
  FaceReadingOutput,
  PalmReadingOutput,
} from '../prompts';
import { IUserProfile } from '../models/UserProfile';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Generate face reading using Claude Vision API
 */
export async function generateFaceReading(
  imageUrl: string,
  tier: 'free' | 'premium',
  userProfile: IUserProfile
): Promise<FaceReadingOutput> {
  // Build prompt with user context
  const prompt = buildFaceReadingPrompt(tier, {
    name: userProfile.name,
    sunSign: userProfile.sunSign,
    lifePathNumber: userProfile.lifePathNumber,
  });

  // Fetch image and convert to base64
  const imageBase64 = await fetchImageAsBase64(imageUrl);

  // Call Claude Vision API
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: tier === 'premium' ? 2000 : 600,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ],
  });

  // Extract text response
  const responseText = message.content[0].type === 'text' 
    ? message.content[0].text 
    : '';

  // Parse JSON response
  try {
    const reading: FaceReadingOutput = JSON.parse(responseText);
    return reading;
  } catch (error) {
    console.error('Failed to parse face reading response:', responseText);
    throw new Error('Invalid reading format from AI');
  }
}

/**
 * Generate palm reading using Claude Vision API
 */
export async function generatePalmReading(
  imageUrl: string,
  tier: 'free' | 'premium',
  userProfile: IUserProfile,
  isDominant: boolean
): Promise<PalmReadingOutput> {
  // Build prompt with user context
  const prompt = buildPalmReadingPrompt(
    tier,
    isDominant,
    userProfile.handedness,
    {
      name: userProfile.name,
      sunSign: userProfile.sunSign,
      lifePathNumber: userProfile.lifePathNumber,
    }
  );

  // Fetch image and convert to base64
  const imageBase64 = await fetchImageAsBase64(imageUrl);

  // Call Claude Vision API
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: tier === 'premium' ? 2000 : 600,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ],
  });

  // Extract text response
  const responseText = message.content[0].type === 'text' 
    ? message.content[0].text 
    : '';

  // Parse JSON response
  try {
    const reading: PalmReadingOutput = JSON.parse(responseText);
    return reading;
  } catch (error) {
    console.error('Failed to parse palm reading response:', responseText);
    throw new Error('Invalid reading format from AI');
  }
}

/**
 * Helper: Fetch image from URL and convert to base64
 */
async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}
```

### 2. Create Controller Endpoints

```typescript
// src/controllers/reading.controller.ts

import { Request, Response } from 'express';
import { UserProfile } from '../models/UserProfile';
import { generateFaceReading, generatePalmReading } from '../services/reading.service';

/**
 * POST /api/readings/face
 * Generate face reading from uploaded image
 */
export async function createFaceReading(req: Request, res: Response) {
  try {
    const userId = req.user.id; // From auth middleware
    const tier = req.user.subscriptionTier || 'free';

    // Get user profile
    const userProfile = await UserProfile.findOne({ userId });
    if (!userProfile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Check if face image exists
    if (!userProfile.images.face?.url) {
      return res.status(400).json({ error: 'No face image uploaded' });
    }

    // Generate reading
    const reading = await generateFaceReading(
      userProfile.images.face.url,
      tier,
      userProfile
    );

    // Cache reading in profile
    userProfile.faceReading = reading;
    await userProfile.save();

    res.json({
      success: true,
      reading,
    });
  } catch (error) {
    console.error('Face reading error:', error);
    res.status(500).json({ error: 'Failed to generate face reading' });
  }
}

/**
 * POST /api/readings/palm
 * Generate palm reading from uploaded image
 */
export async function createPalmReading(req: Request, res: Response) {
  try {
    const userId = req.user.id;
    const tier = req.user.subscriptionTier || 'free';
    const { isDominant } = req.body; // true for dominant hand

    // Get user profile
    const userProfile = await UserProfile.findOne({ userId });
    if (!userProfile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Check if palm image exists
    const palmImage = isDominant
      ? userProfile.images.palmDominant
      : userProfile.images.palmNonDominant;

    if (!palmImage?.url) {
      return res.status(400).json({ error: 'No palm image uploaded' });
    }

    // Generate reading
    const reading = await generatePalmReading(
      palmImage.url,
      tier,
      userProfile,
      isDominant
    );

    // Cache reading in profile
    userProfile.palmReading = reading;
    await userProfile.save();

    res.json({
      success: true,
      reading,
    });
  } catch (error) {
    console.error('Palm reading error:', error);
    res.status(500).json({ error: 'Failed to generate palm reading' });
  }
}

/**
 * GET /api/readings/face
 * Get cached face reading
 */
export async function getFaceReading(req: Request, res: Response) {
  try {
    const userId = req.user.id;

    const userProfile = await UserProfile.findOne({ userId });
    if (!userProfile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    if (!userProfile.faceReading) {
      return res.status(404).json({ error: 'No face reading available' });
    }

    res.json({
      success: true,
      reading: userProfile.faceReading,
    });
  } catch (error) {
    console.error('Get face reading error:', error);
    res.status(500).json({ error: 'Failed to retrieve face reading' });
  }
}

/**
 * GET /api/readings/palm
 * Get cached palm reading
 */
export async function getPalmReading(req: Request, res: Response) {
  try {
    const userId = req.user.id;

    const userProfile = await UserProfile.findOne({ userId });
    if (!userProfile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    if (!userProfile.palmReading) {
      return res.status(404).json({ error: 'No palm reading available' });
    }

    res.json({
      success: true,
      reading: userProfile.palmReading,
    });
  } catch (error) {
    console.error('Get palm reading error:', error);
    res.status(500).json({ error: 'Failed to retrieve palm reading' });
  }
}
```

### 3. Add Routes

```typescript
// src/routes/reading.routes.ts

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createFaceReading,
  createPalmReading,
  getFaceReading,
  getPalmReading,
} from '../controllers/reading.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Face reading
router.post('/face', createFaceReading);
router.get('/face', getFaceReading);

// Palm reading
router.post('/palm', createPalmReading);
router.get('/palm', getPalmReading);

export default router;
```

### 4. Register Routes in App

```typescript
// src/app.ts

import readingRoutes from './routes/reading.routes';

app.use('/api/readings', readingRoutes);
```

## Error Handling

### Common Issues

1. **Invalid JSON Response**
   - Claude sometimes adds markdown formatting
   - Solution: Strip markdown code blocks before parsing

```typescript
function cleanJsonResponse(text: string): string {
  // Remove markdown code blocks
  text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  // Trim whitespace
  text = text.trim();
  return text;
}

const reading = JSON.parse(cleanJsonResponse(responseText));
```

2. **Image Format Issues**
   - Ensure images are JPEG or PNG
   - Resize large images to reduce token usage

3. **Rate Limiting**
   - Implement request queuing
   - Cache readings to avoid regeneration

## Cost Optimization

### Token Usage

- **Free tier**: ~300 input + ~300 output = ~600 tokens (~$0.01)
- **Premium tier**: ~500 input + ~1500 output = ~2000 tokens (~$0.03)

### Caching Strategy

```typescript
// Check cache before generating
if (userProfile.faceReading && !forceRegenerate) {
  return userProfile.faceReading;
}

// Generate and cache
const reading = await generateFaceReading(...);
userProfile.faceReading = reading;
await userProfile.save();
```

### Image Optimization

```typescript
import sharp from 'sharp';

async function optimizeImage(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(800, 800, { fit: 'inside' })
    .jpeg({ quality: 80 })
    .toBuffer();
}
```

## Testing

### Unit Tests

```typescript
import { buildFaceReadingPrompt } from '../prompts';

describe('Face Reading Prompts', () => {
  it('should build free tier prompt', () => {
    const prompt = buildFaceReadingPrompt('free');
    expect(prompt).toContain('intellect');
    expect(prompt).toContain('determination');
    expect(prompt).not.toContain('emotional');
  });

  it('should build premium tier prompt', () => {
    const prompt = buildFaceReadingPrompt('premium');
    expect(prompt).toContain('intellect');
    expect(prompt).toContain('emotional');
    expect(prompt).toContain('creativity');
  });

  it('should include user context', () => {
    const prompt = buildFaceReadingPrompt('premium', {
      name: 'Sarah',
      sunSign: 'Leo',
      lifePathNumber: 7,
    });
    expect(prompt).toContain('Sarah');
    expect(prompt).toContain('Leo');
    expect(prompt).toContain('7');
  });
});
```

### Integration Tests

```typescript
import { generateFaceReading } from '../services/reading.service';

describe('Reading Service', () => {
  it('should generate valid face reading', async () => {
    const reading = await generateFaceReading(
      testImageUrl,
      'premium',
      testUserProfile
    );

    expect(reading.archetype).toBeDefined();
    expect(reading.archetype.name).toBeTruthy();
    expect(reading.categories.intellect).toBeDefined();
    expect(reading.shareableQuote).toBeTruthy();
  });
});
```

## Monitoring

### Key Metrics

1. **Response Time**: Track Claude API latency
2. **Success Rate**: Monitor JSON parsing failures
3. **Cost**: Track token usage per reading
4. **Quality**: User feedback on reading accuracy

### Logging

```typescript
import { logger } from '../utils/logger';

logger.info('Generating face reading', {
  userId: userProfile.userId,
  tier,
  imageUrl: userProfile.images.face.url,
});

const startTime = Date.now();
const reading = await generateFaceReading(...);
const duration = Date.now() - startTime;

logger.info('Face reading generated', {
  userId: userProfile.userId,
  duration,
  tokenUsage: message.usage,
});
```

## Next Steps

1. **Implement reading service** with Claude API integration
2. **Add controller endpoints** for face and palm readings
3. **Test with sample images** to verify output quality
4. **Monitor costs** and optimize as needed
5. **Collect user feedback** to refine prompts

---

*For prompt updates and maintenance, see [README.md](./README.md)*
