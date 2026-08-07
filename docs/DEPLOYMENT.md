# Revelia Deployment Guide

## Backend Deployment

### Option 1: Railway

1. Connect GitHub repo to Railway
2. Configure environment variables
3. Deploy automatically on push to main

### Option 2: Render

1. Connect GitHub repo to Render
2. Configure environment variables
3. Deploy automatically on push to main

---

## Mobile App Deployment

### Development Builds

```bash
cd mobile
eas build --profile development --platform ios
eas build --profile development --platform android
```

### Preview Builds (Internal Testing)

```bash
eas build --profile preview --platform all
```

### Production Builds

```bash
eas build --profile production --platform all
```

### App Store Submission

```bash
# iOS
eas submit --platform ios

# Android
eas submit --platform android
```

---

## Environment Variables

See `.env.example` for required environment variables.

---

*This document will be updated with detailed deployment steps.*
