# Revelia

**AI-Powered Face & Palm Reading Mobile App**

> "Your face. Your palm. Your future."

## Overview

Revelia is a premium AI-powered mobile application that analyzes facial features and palm lines to deliver personalized personality readings, life insights, and destiny predictions. Built with React Native (Expo) and powered by Claude AI.

## Repository Structure

```
revelia/
├── mobile/          # React Native + Expo app (iOS & Android)
├── server/          # Node.js + Express API
├── packages/
│   └── shared/      # Shared TypeScript types
├── docs/            # Documentation
├── scripts/         # Utility scripts
└── README.md
```

## Tech Stack

### Mobile App
- **Framework:** React Native + Expo SDK 52+
- **Language:** TypeScript
- **Navigation:** Expo Router (file-based routing)
- **Styling:** NativeWind (Tailwind CSS for React Native)
- **State Management:** Zustand
- **Camera:** expo-camera, expo-image-picker
- **Builds:** Expo EAS (cloud builds)

### Backend API
- **Runtime:** Node.js 20 LTS
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB with Mongoose
- **AI:** Claude Sonnet 4.5 (Anthropic)
- **Storage:** Cloudflare R2
- **Authentication:** JWT

### Infrastructure
- **API Hosting:** Railway or Render
- **Database:** MongoDB Atlas
- **Image Storage:** Cloudflare R2
- **Mobile Builds:** Expo EAS
- **Monitoring:** Sentry
- **Analytics:** Mixpanel

## Quick Start

### Prerequisites
- Node.js 20+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)

### Backend Setup

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

### Mobile Setup

```bash
cd mobile
npm install
cp .env.example .env
# Edit .env with your API URL
npx expo start
```

### Development Workflow

**For quick testing:**
```bash
cd mobile
npx expo start
# Scan QR code with Expo Go app
```

**For production builds:**
```bash
# Development build
eas build --profile development --platform ios

# Preview build (internal testing)
eas build --profile preview --platform all

# Production build (app stores)
eas build --profile production --platform all

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

## Project Status

**Current Phase:** Week 1 - Project Initialization

- [x] Repository structure created
- [ ] Backend scaffold complete
- [ ] Mobile scaffold complete
- [ ] Shared types implemented
- [ ] Environment configuration complete

## Documentation

- [API Documentation](./docs/API.md)
- [Prompt Engineering Guide](./docs/PROMPTS.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)

## Development

This project uses a multi-agent development approach with specialized sub-agents:
- **Backend Agent:** API routes, services, models, Claude integration
- **Mobile Agent:** Expo screens, components, navigation, camera
- **AI/Prompt Agent:** Claude prompts for readings
- **Infra Agent:** Deployment, configuration, app store prep

## License

Private - All Rights Reserved

## Contact

**Owner:** Sid (srcoderz99)
**Repository:** github.com/srcoderz99/revelia
