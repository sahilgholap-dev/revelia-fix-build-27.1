# BUG-005 — Career + compatibility review triggers fire every app session

**Severity**: MEDIUM
**Area**: Mobile / In-app Review (Phase 5)
**Phase introduced**: build26-phase5 session (2026-06-17)
**Status**: OPEN

---

## Root cause

`face.tsx` and `palm.tsx` use a `hasTriggeredReviewRef` (component ref) to prevent multiple calls within one component mount. `career-destiny.tsx` and `compatibility/[id].tsx` have no equivalent guard at all.

In both screens, the trigger `useEffect` fires whenever the data state becomes non-null:

```ts
// career-destiny.tsx
useEffect(() => {
  if (!career) return;
  requestReviewIfEligible();
}, [career]);
```

On every new app session where the user navigates to either screen with existing data loaded (from cache/store), `career` or `reading` will be non-null, and `requestReviewIfEligible()` will be called again.

The module-level `hasPromptedThisSession` flag in `inAppReview.ts` prevents the Google Play dialog from showing more than once per app session, but `requestReviewIfEligible()` is still being called unnecessarily every session on these screens — which contradicts the documented design intention of "session-deduped" triggers.

Note: this is a lesser form of the same issue as BUG-003, but without the count inflation consequence. The session guard in `inAppReview.ts` provides a safety net here.

## Impact

- Review prompt is triggered on every app session that opens career or compatibility screens when the user already has data.
- If `hasPromptedThisSession` is ever refactored or removed, the dialog would show every session on every open.
- Redundant async calls to `isAvailableAsync()` on every navigation to these screens.

## Affected files

| File | Line | Missing guard |
|------|------|--------------|
| `mobile/app/(main)/readings/career-destiny.tsx` | ~30–33 | No `hasTriggeredReviewRef` before `requestReviewIfEligible()` |
| `mobile/app/(main)/compatibility/[id].tsx` | ~67–70 | Same |

## Fix

Add the same `hasTriggeredReviewRef` guard used in `face.tsx` and `palm.tsx`:

```ts
const hasTriggeredReviewRef = React.useRef(false);

useEffect(() => {
  if (!career || hasTriggeredReviewRef.current) return;
  hasTriggeredReviewRef.current = true;
  requestReviewIfEligible();
}, [career]);
```

Apply identically in `compatibility/[id].tsx` watching `reading`.

This is a one-ref, two-line addition per file — no new dependencies.

## Note on relationship to BUG-003

BUG-003 is the more severe version: it corrupts persisted state. BUG-005 is the same logical gap in a less consequential location (no SecureStore write, only a redundant function call). They should be fixed in the same pass: fix BUG-003 first (persistent guard), then BUG-005 (session-lifetime guard).

## Verification

- Install dev client with existing career/compatibility data in store.
- Kill and reopen the app.
- Navigate to Career Destiny screen — review should NOT be triggered (it was already triggered in a previous session).
- Confirm `requestReviewIfEligible` is not called (add a `console.log` temporarily if needed).
