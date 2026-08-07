# BUG-002 — Share image silently dropped on Android

**Severity**: HIGH
**Area**: Mobile / Share (Phase 6 + Phase 7)
**Phase introduced**: build26-phase7 session (2026-06-16)
**Status**: FIXED (build26-preview3-revenueCat-ShareImageCapturedLinkSharing-Fix) 2026-06-18 — react-native-share single intent (image + text together); committed: fix(phase-7): use react-native-share for combined image+text share

> **⚠️ SUPERSEDED (cancel handling only) by build26-internal-test2-BugFix1-Android-Share-Dialog-Cascade, 2026-06-26.** The combined image+text intent below is still correct and current. BUT the `RNShare → Sharing.shareAsync → Share.share` fallback chain introduced here was a regression: `RNShare.open()` defaults to `failOnCancel:true`, so a user *dismissal rejects* the promise and the catch blocks ran the fallback chain → a second ("share image") then third ("sharing text") sheet on cancel. The cancel cascade was fixed by adding `failOnCancel:false` + an `isShareDismissal()` guard and making `shareReadingCard` return a boolean. **Do not read this file as the current share behavior** — see that session in `tracking_files/claude_progress.md` and the "Reading share" gotcha in `CLAUDE.md`.

---

## Root cause

`Share.share({ message: SHARE_FOOTER, url: uri })` is a React Native cross-platform API. On Android, the `url` field is silently ignored — this is documented React Native behavior. The `ViewShot` screenshot captured by `react-native-view-shot` is discarded; only the plain text footer is passed to the share sheet.

Phase 7 removed `expo-sharing` in favor of `Share.share()` to attach the Play Store footer text. This worked on iOS (which supports `url` in the share sheet) but broke the image on Android — the primary target platform for build-26.

## Impact

- On Android, every ShareCard share (Face Reading, Cosmic Blueprint, Career Destiny, Name Destiny, Compatibility) sends only text — no image.
- The screenshot is still captured (ViewShot runs), consuming memory, but the result is thrown away.
- Users on Android cannot share the visual card at all.

## Affected files

| File | Change needed |
|------|--------------|
| `mobile/utils/shareReading.ts` | Branch on `Platform.OS` — use `expo-sharing` on Android |
| `mobile/app/(main)/compatibility/[id].tsx` | Same branch — inline share also needs the fix |

## Fix

**Option A (recommended):** Branch on platform in both share call sites.

```ts
import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';

// In the share function:
if (Platform.OS === 'android') {
  await Sharing.shareAsync(uri, {
    mimeType: 'image/png',
    dialogTitle: SHARE_FOOTER,
  });
} else {
  await Share.share({ message: SHARE_FOOTER, url: uri });
}
```

Note: `expo-sharing` was removed in Phase 7 — it must be re-added to the import (it is still installed in `package.json` as a dependency, so no npm install needed).

**Why not just use `expo-sharing` everywhere?**
On iOS, `expo-sharing` presents a file-only share sheet without the text footer. The platform branch preserves the footer on iOS via `Share.share` while correctly sharing the image on Android via `expo-sharing`.

## Verification

- Build a dev client APK (`npx expo run:android`).
- Complete a Face Reading or Compatibility Reading.
- Tap the share button — confirm the image appears in the Android share sheet.
- On iOS simulator / device — confirm both the image and footer text appear.
