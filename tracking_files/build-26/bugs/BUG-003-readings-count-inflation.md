# BUG-003 — `completedReadingsCount` inflates on every screen visit

**Severity**: HIGH
**Area**: Mobile / In-app Review (Phase 5)
**Phase introduced**: build26-phase5 session (2026-06-17)
**Status**: OPEN

---

## Root cause

`hasTriggeredReviewRef` in `face.tsx` and `palm.tsx` is a `React.useRef(false)`. Component refs reset to their initial value every time the component unmounts — i.e., every time the user navigates away from the screen.

So when the user returns to the Face Reading screen after getting their first reading, the ref is `false` again, `incrementCompletedReadings()` fires, and the persisted `revelia_completed_readings_count` in SecureStore is incremented again. This repeats on every subsequent visit.

The count was intended to track "number of distinct reading types completed" to trigger the review at count=2. Instead it tracks "total number of navigations to face/palm screens."

## Impact

1. **Review fires prematurely**: On the user's second *visit* (not second *new reading*), count hits 2 and `requestReviewIfEligible()` is called — potentially after the user has only ever had one reading.
2. **Count corruption**: After the review fires once, count keeps climbing unboundedly. Any future feature that reads `completedReadingsCount` gets meaningless data.
3. **User experience**: The review dialog could appear at odd moments (e.g., re-opening the app and tapping to see an old reading).

## Affected files

| File | Line | Issue |
|------|------|-------|
| `mobile/app/(main)/readings/face.tsx` | ~91–97 | `hasTriggeredReviewRef` resets on unmount |
| `mobile/app/(main)/readings/palm.tsx` | ~118–124 | Same pattern |
| `mobile/store/readingsStore.ts` | — | `incrementCompletedReadings` has no idempotency guard |

## Fix

Add a persistent SecureStore key per reading type to record that it has already been counted. Check this key before calling `incrementCompletedReadings`.

**Constants** (define in `mobile/lib/inAppReview.ts` or a new `mobile/lib/reviewKeys.ts`):
```ts
export const REVIEW_COUNTED_KEYS = {
  face: 'revelia_face_reading_counted',
  palm: 'revelia_palm_reading_counted',
} as const;
```

**In `face.tsx` useEffect** (replace `hasTriggeredReviewRef` approach):
```ts
import * as SecureStore from 'expo-secure-store';
import { REVIEW_COUNTED_KEYS } from '@/lib/reviewKeys';

useEffect(() => {
  if (!faceReading) return;
  (async () => {
    const alreadyCounted = await SecureStore.getItemAsync(REVIEW_COUNTED_KEYS.face);
    if (alreadyCounted) return;
    await SecureStore.setItemAsync(REVIEW_COUNTED_KEYS.face, 'true');
    const newCount = await incrementCompletedReadings();
    if (newCount === 2) requestReviewIfEligible();
  })();
}, [faceReading]);
```

Apply the same pattern in `palm.tsx` using `REVIEW_COUNTED_KEYS.palm`.

**Why not fix `readingsStore` instead?**
The store doesn't know which reading triggered the increment — the idempotency guard belongs at the call site where the reading type is known.

## Verification

- Install the dev client fresh (clear app data).
- Complete a Face Reading — confirm count = 1, no review dialog.
- Navigate away and back to Face Reading — confirm count is still 1, no increment.
- Complete a Palm Reading — confirm count = 2, review dialog fires.
- Navigate away and back to Palm Reading — confirm count is still 2.
