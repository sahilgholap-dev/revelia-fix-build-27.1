# OneSignal Push Notifications & Streak Display - Quick Start

## What Was Implemented

### ✅ OneSignal SDK Integration
- Installed `react-native-onesignal` package
- Created initialization and helper functions in `lib/onesignal.ts`
- Added OneSignal plugin to `app.json`
- Set up deep linking for notification clicks

### ✅ Notification Services
- Created `services/notification.service.ts` for API calls
- Created `services/engagement.service.ts` for streak tracking
- Integrated with backend endpoints:
  - `/api/notifications/register`
  - `/api/notifications/preferences`
  - `/api/engagement/checkin`
  - `/api/engagement/streak`

### ✅ State Management
- Created `store/engagementStore.ts` for streak data
- Created `store/notificationStore.ts` for preferences
- Auto check-in on app open
- Fetch and display streak data

### ✅ UI Components
- **StreakBadge**: Fire emoji 🔥 with gradient background
- **NotificationPrompt**: Custom permission modal (shown after first reading)
- Added streak badge to home screen
- Added notification settings to profile screen

### ✅ App Integration
- Initialize OneSignal in `app/_layout.tsx`
- Register device on authentication
- Auto check-in when app opens
- Display streak on home screen
- Show notification prompt after readings

## Configuration Needed

### 1. OneSignal App ID

Update `/app/mobile/.env`:
```bash
EXPO_PUBLIC_ONESIGNAL_APP_ID=your-actual-onesignal-app-id
```

**How to get OneSignal App ID:**
1. Go to https://onesignal.com
2. Create account and new app
3. Go to Settings → Keys & IDs
4. Copy "OneSignal App ID"

### 2. iOS Push Certificates

1. Generate Apple Push Notification certificate
2. Upload to OneSignal dashboard
3. Update `app.json` with Apple Team ID (if needed)

### 3. Android FCM Credentials

1. Create Firebase project
2. Get FCM Server Key
3. Add to OneSignal dashboard

## Testing Checklist

### Device Registration
- [ ] Open app while authenticated
- [ ] Check backend logs for "Device registered"
- [ ] Verify OneSignal player ID stored

### Notifications
- [ ] Enable notifications in Profile
- [ ] Send test notification from backend
- [ ] Verify notification received on device
- [ ] Tap notification and verify deep link works

### Streaks
- [ ] Open app and verify auto check-in
- [ ] Check home screen for streak badge
- [ ] Open app next day and verify streak increments
- [ ] Verify "Personal record" message shows

### Permission Prompt
- [ ] Complete first face or palm reading
- [ ] Verify custom prompt appears after 2 seconds
- [ ] Tap "Enable Notifications" and verify OS prompt shows
- [ ] Verify prompt doesn't show again after dismissal

## Files Created (9)

1. `/mobile/lib/onesignal.ts`
2. `/mobile/services/notification.service.ts`
3. `/mobile/services/engagement.service.ts`
4. `/mobile/store/engagementStore.ts`
5. `/mobile/store/notificationStore.ts`
6. `/mobile/hooks/useNotificationPermission.ts`
7. `/mobile/components/engagement/StreakBadge.tsx`
8. `/mobile/components/common/NotificationPrompt.tsx`
9. `/mobile/.env`

## Files Modified (7)

1. `/mobile/app/_layout.tsx` - Initialize OneSignal, register device, auto check-in
2. `/mobile/app/(main)/home.tsx` - Display streak badge
3. `/mobile/app/(main)/profile.tsx` - Notification settings UI
4. `/mobile/app/(main)/readings/face.tsx` - Show notification prompt
5. `/mobile/app/(main)/readings/palm.tsx` - Show notification prompt
6. `/mobile/package.json` - Added react-native-onesignal
7. `/mobile/app.json` - Added OneSignal plugin

## Backend Endpoints (Already Implemented)

✅ All backend endpoints are ready:
- `POST /api/notifications/register`
- `GET /api/notifications/preferences`
- `PATCH /api/notifications/preferences`
- `POST /api/notifications/test`
- `POST /api/engagement/checkin`
- `GET /api/engagement/streak`

## Next Steps

1. **Configure OneSignal:**
   - Create OneSignal account
   - Get App ID
   - Update `.env` file

2. **Set Up Push Certificates:**
   - iOS: Apple Push Notification certificate
   - Android: FCM credentials

3. **Test on Real Devices:**
   - Build development app
   - Test notification flow
   - Test streak tracking
   - Test deep linking

4. **Monitor Metrics:**
   - Notification opt-in rate
   - Daily active users (via check-ins)
   - Streak retention
   - Notification engagement

## TypeScript Status

✅ All TypeScript checks pass:
```bash
cd /app/mobile && yarn type-check
# Done in 2.59s
```

## Known Issues

None! Implementation is complete and ready for testing.

## Support

For issues or questions:
1. Check `/mobile/NOTIFICATION_IMPLEMENTATION.md` for detailed documentation
2. Review OneSignal docs: https://documentation.onesignal.com/docs/react-native-sdk-setup
3. Check backend logs for API errors
