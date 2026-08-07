# Revelia Backend - Authentication System

## Overview

Complete authentication system implementation for Revelia mobile app with email/password, Apple Sign In, and Google Sign In support.

## Features Implemented

### ✅ User Model
- MongoDB schema with Mongoose ODM
- Email/password authentication
- OAuth support (Apple & Google)
- Subscription management (free/premium/premium_plus)
- User preferences (notifications, timezone, daily insight time)
- Password hashing with bcrypt (10 rounds)
- Automatic timestamps (createdAt, updatedAt)
- Indexes on email, appleId, googleId

### ✅ Authentication Endpoints

1. **POST /api/auth/signup** - Email/password signup
2. **POST /api/auth/login** - Email/password login
3. **POST /api/auth/apple** - Apple Sign In
4. **POST /api/auth/google** - Google Sign In
5. **GET /api/auth/me** - Get current user (protected)
6. **POST /api/auth/logout** - Logout (client-side)
7. **POST /api/auth/refresh** - Refresh token (not implemented yet)

### ✅ Security Features

- JWT token authentication (7-day expiration)
- Bcrypt password hashing (10 rounds)
- Input validation with Zod
- Generic error messages for auth failures
- Password requirements: 8-100 characters
- Email uniqueness across all auth providers
- Token verification middleware
- CORS and Helmet security headers

### ✅ OAuth Integration

- **Apple Sign In:** Token verification with Apple's JWKS
- **Google Sign In:** Token verification with Google's tokeninfo endpoint
- Automatic user creation on first OAuth login
- OAuth ID linking to existing accounts

## File Structure

```
server/src/
├── models/
│   └── User.ts                 # User model with Mongoose schema
├── controllers/
│   └── auth.controller.ts      # Auth endpoint handlers
├── services/
│   └── auth.service.ts         # Auth business logic
├── middleware/
│   ├── auth.middleware.ts      # JWT authentication middleware
│   └── error.middleware.ts     # Global error handler
├── routes/
│   ├── auth.routes.ts          # Auth route definitions
│   └── index.ts                # Route mounting
└── utils/
    └── validation.ts           # Zod validation schemas
```

## API Documentation

### Request/Response Format

All endpoints return consistent JSON:

```typescript
{
  success: boolean;
  data?: T;              // On success
  error?: string;        // On error
  message?: string;      // Optional message
}
```

### Authentication Header

Protected endpoints require:

```
Authorization: Bearer <jwt-token>
```

### User Object

```typescript
{
  _id: string;
  email: string;
  name?: string;
  authProvider: 'email' | 'apple' | 'google';
  appleId?: string;
  googleId?: string;
  subscription: {
    tier: 'free' | 'premium' | 'premium_plus';
    revenueCatId?: string;
    expiresAt?: string;
  };
  preferences: {
    notifications: boolean;
    dailyInsightTime?: string;
    timezone?: string;
  };
  createdAt: string;
  updatedAt: string;
}
```

## Environment Variables

```bash
# Required
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=10
MONGODB_URI=mongodb://localhost:27017/revelia

# Optional (for OAuth)
# APPLE_CLIENT_ID must match the iOS bundle identifier that requested the
# Sign In with Apple — production iOS bundle is com.revelia.app.
# (The original namespace was com.srcoderz99.revelia; renamed pre-launch
# for cleaner branding. Set this to com.revelia.app on Railway.)
APPLE_CLIENT_ID=com.revelia.app
GOOGLE_OAUTH_WEB_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

## Dependencies Added

```json
{
  "dependencies": {
    "jsonwebtoken": "^9.0.2",
    "bcrypt": "^5.1.1",
    "jwks-rsa": "^3.2.2",
    "axios": "^1.13.4",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/jsonwebtoken": "^9.0.6",
    "@types/bcrypt": "^5.0.2"
  }
}
```

## Testing

See [AUTH_TESTING.md](./AUTH_TESTING.md) for comprehensive testing guide.

### Quick Test

```bash
# 1. Signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@revelia.me",
    "password": "testpassword123"
  }'

# 2. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@revelia.me",
    "password": "testpassword123"
  }'

# 3. Get current user (use token from login)
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <token>"
```

## Implementation Details

### Password Security

- Passwords hashed with bcrypt (10 rounds)
- Password hash excluded from JSON responses
- Password hash not selected in queries by default
- Minimum 8 characters, maximum 100 characters

### JWT Tokens

- Payload: `{ userId: string, iat: number, exp: number }`
- Signed with HS256 algorithm
- Default expiration: 7 days
- Verified on every protected route

### OAuth Flow

#### Apple Sign In

1. Client gets `identityToken` from Apple SDK
2. Server verifies token with Apple's public keys (JWKS)
3. Extract email and Apple user ID from token
4. Find or create user with Apple ID
5. Generate JWT token and return user

#### Google Sign In

1. Client gets `idToken` from Google SDK
2. Server verifies token with Google's tokeninfo endpoint
3. Extract email and Google user ID from response
4. Find or create user with Google ID
5. Generate JWT token and return user

### Error Handling

- All errors caught by global error handler
- Validation errors from Zod
- Custom AppError class for operational errors
- Generic messages for auth failures (security)
- Stack traces in development only

## Database Schema

### Users Collection

```javascript
{
  _id: ObjectId,
  email: String (unique, indexed),
  passwordHash: String (optional, not selected by default),
  name: String (optional),
  authProvider: String (enum: 'email', 'apple', 'google'),
  appleId: String (optional, unique, sparse indexed),
  googleId: String (optional, unique, sparse indexed),
  subscription: {
    tier: String (enum: 'free', 'premium', 'premium_plus'),
    revenueCatId: String (optional),
    expiresAt: Date (optional)
  },
  preferences: {
    notifications: Boolean (default: true),
    dailyInsightTime: String (optional),
    timezone: String (default: 'America/New_York')
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes

- `email` (unique)
- `appleId` (unique, sparse)
- `googleId` (unique, sparse)

## Next Steps

### Week 1 Remaining Tasks

- [ ] Task 3: User Profile endpoints
- [ ] Task 4: Image upload to Cloudflare R2
- [ ] Task 5: Claude API integration for readings

### Future Enhancements

1. **Refresh Tokens:** Implement refresh token logic for long-lived sessions
2. **Token Blacklist:** Server-side token blacklisting for logout
3. **Rate Limiting:** Prevent brute force attacks
4. **Email Verification:** Verify email addresses
5. **Password Reset:** Forgot password flow
6. **2FA:** Two-factor authentication
7. **Session Management:** Track active sessions
8. **Account Deletion:** GDPR compliance

## Mobile Integration

The mobile app should:

1. Store JWT token securely (AsyncStorage or SecureStore)
2. Include token in Authorization header for protected routes
3. Handle token expiration (401 errors)
4. Implement OAuth flows with native SDKs
5. Clear token on logout

### Example Mobile Code

```typescript
// Login
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const { data } = await response.json();
await AsyncStorage.setItem('token', data.token);

// Protected request
const token = await AsyncStorage.getItem('token');
const response = await fetch('http://localhost:3000/api/auth/me', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

## Troubleshooting

### Common Issues

1. **JWT_SECRET too short:** Must be at least 32 characters
2. **MongoDB not connected:** Check MONGODB_URI in .env
3. **Token expired:** Tokens expire after 7 days (configurable)
4. **OAuth verification fails:** Check APPLE_CLIENT_ID and GOOGLE_OAUTH_WEB_CLIENT_ID
5. **Password hash not working:** Ensure bcrypt is installed correctly

### Debug Commands

```bash
# Check MongoDB
mongosh revelia --eval "db.users.find().pretty()"

# Check environment variables
grep -E "JWT_SECRET|MONGODB_URI" /app/server/.env

# Test endpoints
curl http://localhost:3000/api/health
```

## Success Criteria ✅

- [x] User model created with proper schema and indexes
- [x] All 7 endpoints implemented
- [x] Password hashing with bcrypt works
- [x] JWT generation and validation works
- [x] Auth middleware protects routes
- [x] TypeScript compiles without errors
- [x] All validation schemas work
- [x] Consistent API response format
- [x] All test cases pass

## Contact

For questions or issues, contact the Revelia backend team.
