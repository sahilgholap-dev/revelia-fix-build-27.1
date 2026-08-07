# OneSignal Push Notifications & Streak Display Implementation

## Overview

This document describes the implementation of OneSignal push notifications and engagement streak tracking for the Revelia mobile app.

## Features Implemented

### 1. OneSignal SDK Integration

**Files Created:**
- `/mobile/lib/onesignal.ts` - OneSignal initialization and helper functions

**Key Functions:**
- `initializeOneSignal()` - Initialize OneSignal with app ID
- `getOneSignalPlayerId()` - Get device player ID for backend registration
- `setupNotificationHandlers()` - Handle notification clicks and deep linking
- `areNotificationsEnabled()` - Check notification permission status
- `requestNotificationPermission()` - Request OS notification permission

**Configuration:**
- Added `react-native-onesignal` to `package.json`
- Updated `app.json` with OneSignal plugin configuration
- Created `.env` file with `EXPO_PUBLIC_ONESIGNAL_APP_ID` placeholder

### 2. Notification Services

**Files Created:**
- `/mobile/services/notification.service.ts` - API service for notification endpoints
- `/mobile/services/engagement.service.ts` - API service for streak tracking

**API Endpoints Used:**
- `POST /api/notifications/register` - Register device for push notifications
- `GET /api/notifications/preferences` - Get user notification preferences
- `PATCH /api/notifications/preferences` - Update notification preferences
- `POST /api/notifications/test` - Send test notification
- `POST /api/engagement/checkin` - Daily check-in
- `GET /api/engagement/streak` - Get streak data

### 3. State Management

**Files Created:**
- `/mobile/store/engagementStore.ts` - Zustand store for streak data
- `/mobile/store/notificationStore.ts` - Zustand store for notification preferences

**Engagement Store:**
- `streakData` - Current streak information
- `hasCheckedInToday` - Check-in status
- `checkIn()` - Perform daily check-in
- `fetchStreak()` - Fetch current streak data

**Notification Store:**
- `preferences` - User notification preferences
- `fetchPreferences()` - Load preferences from backend
- `updatePreferences()` - Update preferences

### 4. UI Components

**Files Created:**
- `/mobile/components/engagement/StreakBadge.tsx` - Fire emoji streak badge
- `/mobile/components/common/NotificationPrompt.tsx` - Custom permission prompt modal

**StreakBadge Component:**
- Displays fire emoji (🔥) with streak count
- Gradient background (orange to red)
- Three sizes: small, medium, large
- Optional label "day streak"
- Hides when streak is 0

**NotificationPrompt Component:**
- Custom modal shown after first reading
- Mock notification preview
- "Enable Notifications" and "Maybe Later" buttons
- Better UX than system prompt (higher acceptance rate)

### 5. Hooks

**Files Created:**
- `/mobile/hooks/useNotificationPermission.ts` - Hook for managing notification permission flow

**Features:**
- Checks if permission prompt has been shown before
- Shows custom prompt after 2-second delay
- Handles accept/decline actions
- Stores prompt status in SecureStore

### 6. App Integration

**Files Modified:**
- `/mobile/app/_layout.tsx` - Initialize OneSignal, register device, auto check-in
- `/mobile/app/(main)/home.tsx` - Display streak badge
- `/mobile/app/(main)/profile.tsx` - Notification settings UI
- `/mobile/app/(main)/readings/face.tsx` - Show notification prompt
- `/mobile/app/(main)/readings/palm.tsx` - Show notification prompt

**App Layout Changes:**
- Initialize OneSignal on app start
- Set up deep link handlers for notifications
- Register device when user is authenticated
- Auto check-in when app opens

**Home Screen Changes:**
- Display streak badge below welcome message
- Show "🎉 Personal record!" when user hits new record
- Fetch streak data on mount

**Profile Screen Changes:**
- Added "Notifications" section with:
  - Master toggle for notifications
  - Time picker for daily insight time
  - Timezone display (auto-detected)
- Settings only visible when notifications enabled

**Reading Screens Changes:**
- Added notification permission prompt
- Shown after first reading (better timing)
- Uses custom prompt for higher acceptance

### 7. Deep Linking

Notification clicks navigate to:
- `daily-insight` → `/(main)/astrology/daily`
- `monthly-reading` → `/(main)/astrology/monthly`
- `compatibility` → `/(main)/compatibility`
- `home` → `/(main)/home`

### 8. Auto Check-in Flow

1. User opens app
2. App checks if authenticated
3. If authenticated and not checked in today:
   - Call `checkIn()` from engagement store
   - Backend updates streak
   - Fetch updated streak data
   - Display streak badge on home screen
4. If new personal record:
   - Log celebration message
   - Could show toast/modal (future enhancement)

## Configuration Required

### OneSignal Setup

1. Create OneSignal account at https://onesignal.com
2. Create new app in OneSignal dashboard
3. Get App ID from Settings → Keys & IDs
4. Update `/mobile/.env`:
   ```
   EXPO_PUBLIC_ONESIGNAL_APP_ID=your-actual-app-id
   ```

### iOS Configuration

1. Add Apple Push Notification certificate to OneSignal
2. Enable Push Notifications capability in Xcode
3. Update `app.json` with Apple Team ID (if needed):
   ```json
   {
     "expo": {
       "plugins": [
         [
           "react-native-onesignal",
           {
             "mode": "development",
             "devTeam": "YOUR_APPLE_TEAM_ID"
           }
         ]
       ]
     }
   }
   ```

### Android Configuration

1. Add Firebase Cloud Messaging (FCM) credentials to OneSignal
2. OneSignal plugin handles Android permissions automatically

## Testing

### Test Notification Flow

1. **Device Registration:**
   ```bash
   # Check backend logs for device registration
   # Should see: "Device registered: {playerId}"
   ```

2. **Send Test Notification:**
   - Go to Profile → Notifications
   - Enable notifications
   - Backend should send test notification
   - Check device receives notification

3. **Deep Linking:**
   - Send notification with `screen` data
   - Tap notification
   - Verify correct screen opens

### Test Streak Flow

1. **First Check-in:**
   - Open app
   - Check home screen for streak badge
   - Should show "🔥 1 day streak"

2. **Consecutive Days:**
   - Open app next day
   - Streak should increment
   - Check for "🎉 Personal record!" message

3. **Missed Day:**
   - Skip a day
   - Open app
   - Streak should reset to 1

## Design System

### Colors
- Streak gradient: `#F97316` (orange) to `#DC2626` (red)
- Primary: `#6B21A8` (purple)
- Gold: `#F59E0B`
- Background: `#0F0A1A`
- Card: `#1A1425`

### Typography
- Streak number: Bold, white
- Streak label: Small, white
- Fire emoji: 🔥

### Spacing
- Streak badge: Rounded pill shape
- Padding: Small (8px), Medium (12px), Large (16px)

## Known Limitations

1. **OneSignal App ID Required:**
   - App won't send notifications without valid OneSignal App ID
   - Currently using placeholder in `.env`

2. **Platform-Specific Setup:**
   - iOS requires Apple Push Notification certificate
   - Android requires FCM credentials
   - Both must be configured in OneSignal dashboard

3. **Notification Permission:**
   - iOS: User must explicitly grant permission
   - Android: Granted by default (Android 12 and below)
   - Android 13+: Requires explicit permission

4. **Streak Calculation:**
   - Based on server time, not user's local time
   - Timezone handling done on backend

## Future Enhancements

1. **Streak Celebrations:**
   - Show modal/toast for new records
   - Confetti animation for milestones (7, 30, 100 days)
   - Share streak on social media

2. **Notification Customization:**
   - Choose notification sound
   - Customize notification frequency
   - Snooze notifications

3. **Streak Recovery:**
   - Allow one "freeze" per month
   - Premium feature: streak insurance

4. **Rich Notifications:**
   - Include reading preview in notification
   - Action buttons ("Read Now", "Remind Later")

5. **Notification History:**
   - View past notifications
   - Re-read missed insights

## Dependencies Added

```json
{
  "react-native-onesignal": "^5.2.0"
}
```

## Files Created/Modified

### Created (8 files):
1. `/mobile/lib/onesignal.ts`
2. `/mobile/services/notification.service.ts`
3. `/mobile/services/engagement.service.ts`
4. `/mobile/store/engagementStore.ts`
5. `/mobile/store/notificationStore.ts`
6. `/mobile/hooks/useNotificationPermission.ts`
7. `/mobile/components/engagement/StreakBadge.tsx`
8. `/mobile/components/common/NotificationPrompt.tsx`
9. `/mobile/.env`

### Modified (5 files):
1. `/mobile/app/_layout.tsx`
2. `/mobile/app/(main)/home.tsx`
3. `/mobile/app/(main)/profile.tsx`
4. `/mobile/app/(main)/readings/face.tsx`
5. `/mobile/app/(main)/readings/palm.tsx`
6. `/mobile/package.json`
7. `/mobile/app.json`

## Success Metrics

1. **Notification Opt-in Rate:**
   - Target: >60% (custom prompt timing)
   - Baseline: ~40% (system prompt)

2. **Daily Active Users:**
   - Track via check-in rate
   - Target: >30% DAU/MAU ratio

3. **Streak Retention:**
   - Users with 7+ day streak
   - Users with 30+ day streak
   - Average streak length

4. **Notification Engagement:**
   - Open rate from notifications
   - Deep link click-through rate

## Conclusion

OneSignal push notifications and streak tracking are now fully integrated into the Revelia mobile app. The implementation follows best practices for user engagement and retention, with a focus on non-intrusive permission requests and gamification through streaks.

The backend endpoints are ready and tested. The mobile app is ready for testing once OneSignal credentials are configured.
