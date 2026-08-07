# Push Notifications (OneSignal + FCM)

**FCM delivers Android push; OneSignal is only the orchestration layer.** This distinction caused the longest-running silent failure in the project (root-caused 2026-06-24) — full gotcha list in CLAUDE.md.

## Mobile

- `react-native-onesignal` v5 (TurboModule → requires `newArchEnabled: true`), configured via the **`onesignal-expo-plugin`** wrapper in `app.json` (the raw package has no CJS-compatible plugin entry).
- `mobile/lib/onesignal.ts` exports `loginOneSignalUser` / `logoutOneSignalUser`; called from every auth path (see `auth.md`).
- FCM requirements (both mandatory): Firebase service-account JSON uploaded to OneSignal (FCM v1, GCP project `revelia-497203`), and `google-services.json` **committed to git** (EAS only uploads tracked files — re-ignoring it silently kills push in the next build).

## Server

- `server/src/jobs/pushScheduler.ts` — node-cron, timezone-aware (date-fns-tz): daily-insight push (deep-links into the app) + re-engagement pushes. Targets users by OneSignal `external_id` = MongoDB `_id`.
- REST send via `onesignal.service.ts`: `https://api.onesignal.com/notifications`, header `Authorization: Key <ONESIGNAL_REST_API_KEY>` (not `Basic`).
- Composition in `notification-templates`; user prefs on the User model, toggled from the Profile screen (`notificationStore`).

Symptom of broken FCM: device shows "Unsubscribed / no push token" while OneSignal sends still report success.
