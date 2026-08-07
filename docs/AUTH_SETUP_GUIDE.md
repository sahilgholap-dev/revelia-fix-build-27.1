# Authentication Setup Guide

Complete guide to set up authentication for Revelia, including Apple Sign In and Google Sign In.

## Table of Contents
1. [JWT Configuration](#jwt-configuration)
2. [Apple Sign In Setup](#apple-sign-in-setup)
3. [Google Sign In Setup](#google-sign-in-setup)
4. [Testing Authentication](#testing-authentication)

---

## JWT Configuration

### 1. Generate JWT Secret

Generate a secure random string (minimum 32 characters):

**Option 1: Using Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Option 2: Using OpenSSL**
```bash
openssl rand -base64 32
```

Add to `.env`:
```bash
JWT_SECRET=your_generated_secret_here
JWT_REFRESH_SECRET=your_generated_refresh_secret_here
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
BCRYPT_ROUNDS=10
```

---

## Apple Sign In Setup

### Prerequisites
- Apple Developer Account ($99/year)
- Enrolled in Apple Developer Program

### Step 1: Create App ID

1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers/list)
2. Click "+" to create new Identifier
3. Select "App IDs" → Continue
4. Select "App" → Continue
5. Fill in:
   - Description: Revelia
   - Bundle ID: `com.srcoderz99.revelia`
   - Capabilities: Check "Sign in with Apple"
6. Click "Continue" → "Register"

### Step 2: Create Service ID

1. Go to Identifiers → Click "+" → Select "Services IDs"
2. Fill in:
   - Description: Revelia Sign In
   - Identifier: `com.srcoderz99.revelia.signin`
3. Check "Sign in with Apple" → Click "Configure"
4. Add Domains and Subdomains: `api.revelia.app`
5. Add Return URLs: `https://api.revelia.app/auth/apple/callback`
6. Click "Continue" → "Register"

### Step 3: Create Private Key

1. Go to Keys → Click "+"
2. Fill in:
   - Key Name: Revelia Sign In Key
   - Check "Sign in with Apple"
   - Click "Configure" → Select Primary App ID (com.srcoderz99.revelia)
3. Click "Continue" → "Register"
4. Download the `.p8` file (SAVE THIS - you can only download once)
5. Note the Key ID (10 characters)

### Step 4: Get Team ID

1. Go to [Membership page](https://developer.apple.com/account/#/membership/)
2. Copy your Team ID (10 characters)

### Step 5: Configure Backend

Add to `server/.env`:
```bash
APPLE_CLIENT_ID=com.srcoderz99.revelia.signin
APPLE_TEAM_ID=ABC123DEFG
APPLE_KEY_ID=XYZ789HIJK
APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----
```

**Note:** For the private key, you can either:
- Paste the entire key content with `\n` for newlines
- Or provide the path to the `.p8` file

### Step 6: Configure Mobile

Apple Sign In uses the app's bundle identifier automatically. Ensure `app.json` has:
```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.srcoderz99.revelia",
      "usesAppleSignIn": true
    }
  }
}
```

---

## Google Sign In Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: "Revelia"
3. Enable "Google+ API" or "Google Identity Services"

### Step 2: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" → Create
3. Fill in:
   - App name: Revelia
   - User support email: your-email@example.com
   - Developer contact: your-email@example.com
4. Add scopes: `email`, `profile`
5. Save and Continue

### Step 3: Create OAuth Client ID for iOS

1. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
2. Application type: "iOS"
3. Fill in:
   - Name: Revelia iOS
   - Bundle ID: `com.srcoderz99.revelia`
4. Create
5. Copy the "iOS client ID" (ends with `.apps.googleusercontent.com`)

### Step 4: Create OAuth Client ID for Android

1. Create Credentials → OAuth client ID
2. Application type: "Android"
3. Fill in:
   - Name: Revelia Android
   - Package name: `com.srcoderz99.revelia`
   - SHA-1 certificate fingerprint:
     ```bash
     # For development (debug keystore)
     keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
     ```
4. Create
5. Copy the "Android client ID"

### Step 5: Create OAuth Client ID for Web (Backend)

1. Create Credentials → OAuth client ID
2. Application type: "Web application"
3. Fill in:
   - Name: Revelia Backend
   - Authorized redirect URIs: `https://api.revelia.app/auth/google/callback`
4. Create
5. Copy "Client ID" and "Client Secret"

### Step 6: Configure Backend

Add to `server/.env`:
```bash
GOOGLE_CLIENT_ID=1234567890-abc123def456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
```

### Step 7: Configure Mobile

Add to `mobile/.env`:
```bash
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

---

## Testing Authentication

### Test Email/Password Signup

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"Password123!"}'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "...",
      "email": "test@example.com",
      "name": "Test User",
      ...
    },
    "token": "eyJhbGc..."
  }
}
```

### Test Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!"}'
```

### Test Get Me (Protected Route)

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Test Logout

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Troubleshooting

### Apple Sign In Issues

**"Invalid client"**
- Check APPLE_CLIENT_ID matches Service ID (not App ID)
- Verify Service ID is configured for Sign in with Apple

**"Invalid token"**
- Check APPLE_TEAM_ID is correct (10 characters)
- Verify APPLE_KEY_ID matches downloaded key
- Ensure APPLE_PRIVATE_KEY is formatted correctly (with \n for newlines)

**"Private key error"**
- Verify the `.p8` file is not corrupted
- Check that the private key is properly formatted in the environment variable
- Ensure no extra spaces or line breaks

### Google Sign In Issues

**"Invalid client ID"**
- Check client ID matches the one from Google Cloud Console
- Verify OAuth consent screen is configured
- Ensure redirect URIs are correct

**"Unauthorized"**
- Check GOOGLE_CLIENT_SECRET is correct
- Verify API is enabled in Google Cloud Console

**"SHA-1 fingerprint mismatch"**
- Ensure the SHA-1 fingerprint in Google Console matches your keystore
- For development, use the debug keystore fingerprint
- For production, use the release keystore fingerprint

---

## Security Best Practices

1. **Never commit secrets to Git**
   - Use `.env` files (already in .gitignore)
   - Rotate keys if accidentally exposed

2. **Use strong JWT secrets**
   - Minimum 32 characters
   - Random and unpredictable

3. **Secure token storage on mobile**
   - Use expo-secure-store (NOT AsyncStorage)
   - Clear tokens on logout

4. **HTTPS only in production**
   - Never send tokens over HTTP
   - Use SSL/TLS for API

5. **Token expiration**
   - Keep JWT expiration short (7 days)
   - Implement refresh tokens for longer sessions

6. **Password requirements**
   - Minimum 8 characters
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one number
   - At least one special character

7. **Rate limiting**
   - Implement rate limiting on auth endpoints
   - Prevent brute force attacks

---

## Next Steps

1. ✅ Generate JWT secret
2. ✅ Set up Apple Sign In (iOS only)
3. ✅ Set up Google Sign In (iOS + Android)
4. ✅ Test authentication endpoints
5. ✅ Test mobile app flows
6. 🔄 Deploy to production
7. 🔄 Submit apps to App Store and Play Store

---

## Additional Resources

### Apple Sign In
- [Apple Sign In Documentation](https://developer.apple.com/sign-in-with-apple/)
- [Apple Developer Portal](https://developer.apple.com/account/)

### Google Sign In
- [Google Sign In Documentation](https://developers.google.com/identity/sign-in/ios)
- [Google Cloud Console](https://console.cloud.google.com/)

### Expo Authentication
- [Expo AuthSession](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [Expo Apple Authentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/)
- [Expo Google Sign In](https://docs.expo.dev/guides/google-authentication/)

---

**Need help?** Check the documentation or contact the development team.

**Last Updated:** 2025-01-30  
**Revelia Version:** 1.0.0
