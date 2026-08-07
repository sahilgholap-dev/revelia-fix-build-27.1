# Build-26 Bug Fix Sequence

> Written: 2026-06-17
> Branch: `feature/build-26`
> Pre-requisite: read [index.md](index.md) and all individual bug files before starting.

---

## Ordering rationale

Fixes are sequenced by:
1. **Isolation** — fixes with no dependencies on other bugs go first.
2. **Risk** — lowest-blast-radius fixes first; anything touching shared state last.
3. **Logical dependency** — BUG-003 and BUG-005 are related (same phase, same store); fix them in one pass (BUG-003 first since it introduces the persistent keys that BUG-005 can optionally reuse).
4. **Decision-gated** — BUG-004 requires a user decision on approach (Option A vs B); fix it last so the decision doesn't block earlier work.

---

## Step 1 — BUG-001: Fix rate limiter key argument (Server)

**Files**: 2 middleware files, 1 line each
**Risk**: Minimal — isolated change in middleware, no shared state
**Commit message**: `fix(server): pass req.ip to ipKeyGenerator in rate limit middleware`

```
server/src/middleware/auth-rate-limit.middleware.ts    line ~43
server/src/middleware/verification-rate-limit.middleware.ts  line ~25
```

Change `ipKeyGenerator(req)` → `ipKeyGenerator(req.ip ?? '')` in both files.

Run `npx tsc --noEmit` in `/server` to confirm zero TS errors.

---

## Step 2 — BUG-005: Add ref guard to career + compatibility review triggers (Mobile)

**Files**: 2 screen files, ~3 lines each
**Risk**: Minimal — adds a guard, never removes functionality
**Commit message**: `fix(phase-5): add hasTriggeredReviewRef guard to career and compatibility review triggers`

```
mobile/app/(main)/readings/career-destiny.tsx   line ~30
mobile/app/(main)/compatibility/[id].tsx         line ~67
```

Add `const hasTriggeredReviewRef = React.useRef(false)` above each useEffect.
Add `if (!career || hasTriggeredReviewRef.current) return; hasTriggeredReviewRef.current = true;` at the top of each effect body.
Mirror the pattern exactly from `face.tsx`.

---

## Step 3 — BUG-003: Fix readings count inflation (Mobile)

**Files**: 2 screen files + 1 new constants file
**Risk**: Medium — touches SecureStore; clear app data to test from clean state
**Commit message**: `fix(phase-5): persist per-reading-type flag to prevent count inflation on revisit`

**Sub-steps:**

3a. Create `mobile/lib/reviewKeys.ts`:
```ts
export const REVIEW_COUNTED_KEYS = {
  face: 'revelia_face_reading_counted',
  palm: 'revelia_palm_reading_counted',
} as const;
```

3b. In `mobile/app/(main)/readings/face.tsx` — replace the `hasTriggeredReviewRef` block with the SecureStore async check (see BUG-003 fix section for exact code).

3c. In `mobile/app/(main)/readings/palm.tsx` — same replacement using `REVIEW_COUNTED_KEYS.palm`.

3d. Remove `hasTriggeredReviewRef` declarations from both files (they are replaced by the persistent key).

Run `npx tsc --noEmit` in `/mobile` to confirm zero TS errors.

---

## Step 4 — BUG-002: Fix Android share image (Mobile)

**Files**: 2 files
**Risk**: Medium — changes the share mechanism; needs device test on both platforms
**Commit message**: `fix(phase-7): use expo-sharing on Android to preserve image in share sheet`

**Sub-steps:**

4a. In `mobile/utils/shareReading.ts`:
- Re-add `import * as Sharing from 'expo-sharing'` (package is still installed).
- Import `Platform` from `react-native`.
- Replace `Share.share({ message: SHARE_FOOTER, url: uri })` with the platform branch:
  ```ts
  if (Platform.OS === 'android') {
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: SHARE_FOOTER });
  } else {
    await Share.share({ message: SHARE_FOOTER, url: uri });
  }
  ```

4b. In `mobile/app/(main)/compatibility/[id].tsx`:
- Same platform branch for the inline share call.

Run `npx tsc --noEmit` in `/mobile` to confirm zero TS errors.

---

## Step 5 — BUG-004: Google Sign-In user name (Mobile + Server)

**Pre-condition**: User must confirm Option A (pass name from mobile SDK) or Option B (server-side userinfo fetch).
**Recommended**: Option A — consistent with Apple Sign-In pattern in this codebase.
**Files (Option A)**: 5 files across mobile and server
**Risk**: Medium — touches auth flow; test with a fresh Google account after EAS Android build
**Commit message**: `fix(phase-1): pass google user name through sign-in flow to set user.name on create`

**Option A sub-steps:**

5a. `mobile/lib/googleSignIn.ts` — return `{ idToken, name }` from `signInWithGoogle()`.

5b. `mobile/lib/api.ts` — add `name: string` param to `loginWithGoogle()`; include in POST body.

5c. `mobile/store/authStore.ts` — destructure `{ idToken, name }` from `signInWithGoogle()`; pass `name` to `authAPI.loginWithGoogle(idToken, name)`.

5d. `server/src/controllers/auth.controller.ts` — add `name: z.string().optional()` to `googleAuthSchema`.

5e. `server/src/services/auth.service.ts` — add `name?: string` param to `loginWithGoogle()`; add `name` to the `User.create({...})` call.

Run `npx tsc --noEmit` in both `/mobile` and `/server` to confirm zero TS errors.

---

## After all fixes

1. Commit each step separately (commit messages above).
2. Run `git log --oneline` to confirm clean history.
3. Restore `package-lock.json`: `git checkout -- package-lock.json`
4. Build EAS dev client for Android: `cd mobile && npx expo run:android`
5. Manual test checklist:
   - [ ] Rate limit: server rejects after threshold per IP (not shared bucket)
   - [ ] Share: image appears in Android share sheet (not just text)
   - [ ] In-app review: fires at correct moment (2nd unique reading type), not on revisit
   - [ ] Google Sign-In: new user has correct display name in profile
   - [ ] Career / compatibility: review dialog does not re-trigger on revisit
6. Update `tracking_files/session_handoff.md` and `claude_progress.md` after testing.
7. Merge PR to `main` once Phase 4 (RTDN) manual cloud config is done.

---

## Remaining post-merge manual steps (Phase 4 — not in this fix sequence)

- Google Cloud Pub/Sub → RevenueCat RTDN wiring
- Optionally: HMAC signature verification on `POST /api/webhooks/revenuecat-rtdn`
- Replace iOS App Store ID placeholder `id000000000` in `profile.tsx` after App Store Connect assigns the ID
