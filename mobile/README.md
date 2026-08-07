# Revelia Mobile App

React Native mobile app for Revelia - AI-powered face and palm readings, astrology, and numerology.

## Tech Stack

- **Framework**: React Native + Expo SDK 52+
- **Language**: TypeScript
- **Navigation**: Expo Router (file-based)
- **Styling**: NativeWind (Tailwind CSS)
- **State Management**: Zustand
- **Camera**: expo-camera, expo-image-picker
- **Payments**: RevenueCat (to be integrated)
- **Push Notifications**: OneSignal (to be integrated)

## Project Structure

```
mobile/
├── app/                      # Expo Router (file-based routing)
│   ├── _layout.tsx           # Root layout
│   ├── index.tsx             # Entry/splash screen
│   ├── (auth)/               # Auth screens
│   ├── (onboarding)/         # Onboarding flow
│   ├── (main)/               # Main app (tabs)
│   ├── (capture)/            # Camera capture
│   └── (paywall)/            # Subscription
├── components/
│   └── ui/                   # Reusable UI components
├── lib/
│   ├── api.ts                # API client
│   ├── colors.ts             # Color theme
│   └── constants.ts          # App constants
├── store/
│   ├── authStore.ts          # Auth state
│   └── userStore.ts          # User state
├── hooks/
│   └── useAuth.ts            # Auth hook
└── assets/                   # Images, fonts, etc.
```

## Getting Started

### Prerequisites

- Node.js 18+
- Yarn
- Expo CLI
- iOS Simulator (Mac) or Android Emulator

### Installation

```bash
cd mobile
yarn install
```

### Environment Setup

Create `.env` file:

```bash
cp .env.example .env
```

Update `EXPO_PUBLIC_API_URL` with your backend URL.

### Development

```bash
# Start Metro bundler
yarn start

# Run on iOS
yarn ios

# Run on Android
yarn android

# Run on web
yarn web
```

### Type Checking

```bash
yarn type-check
```

## Features

### Implemented

- ✅ Authentication (login, signup, logout)
- ✅ Dark cosmic theme
- ✅ Tab navigation
- ✅ Camera capture (face & palm)
- ✅ Subscription paywall UI
- ✅ Profile management
- ✅ Zustand state management
- ✅ API client with interceptors

### Coming Soon

- 🔄 Face reading processing
- 🔄 Palm reading processing
- 🔄 Astrology calculations
- 🔄 Numerology calculations
- 🔄 Compatibility analysis
- 🔄 RevenueCat integration
- 🔄 OneSignal push notifications
- 🔄 Onboarding flow
- 🔄 Reading history
- 🔄 Share functionality

## Design System

### Colors

- **Background**: `#0A0A0F` (dark cosmic)
- **Card**: `#1A1A2E`
- **Primary**: `#6B21A8` (deep purple)
- **Gold**: `#F59E0B`
- **Pink**: `#EC4899`

### Components

- **Button**: Primary, secondary, outline, ghost variants
- **Card**: Default and translucent variants
- **Input**: Text input with label, error states
- **LoadingSpinner**: Animated loading indicator

## API Integration

All API calls go through `lib/api.ts`. The API client:

- Automatically adds auth tokens from secure storage
- Handles 401 errors (token expiration)
- Uses axios interceptors
- Returns typed responses

### Expected Response Format

```typescript
{
  success: boolean;
  data?: T;
  error?: string;
}
```

## State Management

### Auth Store (`store/authStore.ts`)

- User authentication state
- Login, signup, logout actions
- Token management with expo-secure-store

### User Store (`store/userStore.ts`)

- User profile data
- Profile updates

## Navigation

Expo Router file-based navigation:

- `(auth)`: Stack navigator for auth screens
- `(main)`: Tab navigator for main app
- `(capture)`: Modal stack for camera
- `(paywall)`: Modal for subscription

## Camera Permissions

The app requests camera permissions before accessing the camera. Users see a consent modal explaining why the permission is needed.

## Subscription Tiers

- **Free**: Limited face readings (3/month)
- **Premium**: Unlimited readings, palm, compatibility
- **Ultimate**: Everything + astrology + numerology

Feature access is controlled via `lib/constants.ts`.

## Testing

Test on both iOS and Android:

```bash
# iOS Simulator
yarn ios

# Android Emulator
yarn android
```

## Deployment

### Build for Production

```bash
# iOS
eas build --platform ios

# Android
eas build --platform android
```

### Submit to Stores

```bash
# iOS App Store
eas submit --platform ios

# Google Play Store
eas submit --platform android
```

## Troubleshooting

### Metro bundler issues

```bash
npx expo start --clear
```

### TypeScript errors

```bash
yarn type-check
```

### Camera not working

- Check permissions in device settings
- Restart the app
- Clear cache: `npx expo start --clear`

## Contributing

1. Create feature branch
2. Make changes
3. Test on iOS and Android
4. Run type check: `yarn type-check`
5. Submit PR

## License

Proprietary - Revelia
