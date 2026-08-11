# Web Google Sign-In: chooser reliability + account confirmation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On the web PWA, make Google's account chooser reopen reliably after a dismissal, and require an explicit confirmation of the chosen account before any Revelia account is created.

**Architecture:** Replace One Tap (`google.accounts.id.prompt()`) with Google's rendered button, which is button mode and therefore exempt from the dismissal cooldown. A new `GoogleSignInButton` component gains a `.web.tsx` fork that hosts Google's button; on credential it decodes the payload for display, shows a confirm dialog through the existing `showAlert`, and only then calls a newly extracted store action. All GSI knowledge stays in `lib/googleSignIn.web.ts`; the component holds only React.

**Tech Stack:** Expo SDK 53 · React Native 0.79.6 · react-native-web 0.20 · Expo Router · Zustand · NativeWind/Tailwind · Google Identity Services (GSI)

**Spec:** `docs/superpowers/specs/2026-08-11-google-signin-account-reselection-design.md`

## Global Constraints

- **There is no test runner in this repo.** No jest, no vitest, no CI. Verification is `npx tsc --noEmit`, `npm run gate`, `node scripts/resolve-utilities.js --diff`, `npm run web:export`, and a driven browser pass. **Do not add a test framework** — that is out of scope and was not approved.
- **`npm run gate` must exit 0.** It runs `token-gate.sh` plus the node checks including `web-fork-check.js`. Escape hatch is `GATE_LENIENT=1 git push`, never `--no-verify`.
- 🔴 **Run `resolve-utilities.js --diff` on every batch that touches a file under `mobile/app/**` or `mobile/components/**`** — the Tailwind content globs (`tailwind.config.js:111-112`). It is the only instrument that can see a rule appear from nowhere. Baseline **before** the change.
- 🔴 **A comment is source.** Do not write class-like, token-like, or hex-literal strings inside comments in any file under a content glob — Tailwind's scanner has no parser and will emit a live rule from prose. Name a token lookup (`t.color.surface`) or describe it in words instead.
- **`fontWeight` and `fontStyle` are banned.** Emphasis is a family (`font-body-semi`), italic is a family (`font-quote`).
- **`on-accent` is the only legal foreground on an accent / warning / success / danger fill.** Never `fg`, never white.
- **No raw hex.** Use `theme.js` tokens; translucency goes through `t.alpha(token, pct)` on the 5-step opacity scale.
- **Web fork export parity:** `scripts/web-fork-check.js` asserts a `.web` fork exports every name its native sibling exports. Extra exports are permitted; missing ones fail.
- **Every login path must call `loginOneSignalUser(user._id)` and `identifyUser(user._id)`.** Both live inside the code moved in Task 3 — do not drop them.
- **Client ID** (public, already in `mobile/.env` and `google-services.json`):
  `530984023588-uq36tvq7gbbmrjobh4dc5m995rmpl75o.apps.googleusercontent.com`
- **Scratchpad for temp files:**
  `C:\Users\User\AppData\Local\Temp\claude\D--SAHIL-GHOLAP-Revilia-revelia-fix-build-27-1--1--revelia-fix-build-27-1\01fcf92f-ff9f-4004-ad1c-91774ebc1429\scratchpad`
  Referred to below as `$SCRATCH`. Never write temp files into the repo.

---

## File Structure

| file | responsibility |
|---|---|
| `mobile/components/auth/GoogleSignInButton.tsx` | **new.** Native entry point. Wraps the `Button` primitive. Knows nothing about Google |
| `mobile/components/auth/GoogleSignInButton.web.tsx` | **new.** Web fork. Owns the host `<div>`, the React lifecycle, and the decode → confirm → complete orchestration. Never touches `window.google` |
| `mobile/lib/googleSignIn.web.ts` | **rewritten.** All GSI knowledge. Exports `mountGoogleButton`, `profileFromIdToken`, `confirmGoogleAccount` on top of the parity set |
| `mobile/lib/googleSignIn.ts` | **untouched.** Native fork |
| `mobile/store/authStore.ts` | **modified.** `loginWithGoogle` splits into acquire + `completeGoogleLogin(idToken, name)` |
| `mobile/app/(auth)/login.tsx` | **modified.** Hand-rolled Google `TouchableOpacity` → `<GoogleSignInButton />` |
| `mobile/app/(auth)/signup.tsx` | **modified.** Google `Button` → `<GoogleSignInButton />` |
| `mobile/app/(auth)/welcome.tsx` | **modified.** Google `Button` → `<GoogleSignInButton />` |

---

## Task 1: Verify the premise — button mode ignores the cooldown

🔴 **This task gates every other task.** The whole design rests on Google's rendered button being exempt from the One Tap dismissal cooldown (spec D2, §8). If it is not, stop and revisit the spec — do not build on an unverified premise.

⚠️ **This task requires a human with a Google account signed into the browser.** An agent cannot complete it alone. Prepare the probe, then hand it over and wait for the result.

**Files:**
- Create: `$SCRATCH/gsi-probe.html` (temporary, never committed)

**Interfaces:**
- Consumes: nothing
- Produces: a go / no-go decision for Tasks 2-5

- [ ] **Step 1: Write the probe page**

Create `$SCRATCH/gsi-probe.html`:

```html
<!doctype html>
<meta charset="utf-8">
<title>GSI button-mode probe</title>
<body style="font:16px system-ui;background:#111;color:#eee;padding:24px">
<h1 style="font-size:18px">Button-mode cooldown probe</h1>
<ol>
  <li>Click the button. The account chooser should open.</li>
  <li>Dismiss it (back / Escape / tap outside).</li>
  <li>Click the button again. <b>The chooser must open a second time.</b></li>
</ol>
<div id="host"></div>
<pre id="log" style="white-space:pre-wrap;margin-top:16px;color:#8f8"></pre>
<script src="https://accounts.google.com/gsi/client" async defer></script>
<script>
  const log = (m) => document.getElementById('log').textContent += m + '\n';
  window.onload = () => {
    google.accounts.id.initialize({
      client_id: '530984023588-uq36tvq7gbbmrjobh4dc5m995rmpl75o.apps.googleusercontent.com',
      callback: (r) => log('CREDENTIAL received, length ' + (r.credential || '').length),
    });
    google.accounts.id.renderButton(document.getElementById('host'), {
      type: 'standard', theme: 'filled_black', size: 'large', shape: 'pill',
    });
    log('button rendered');
  };
</script>
</body>
```

- [ ] **Step 2: Serve it from an authorised origin**

The origin must already be on the OAuth client's Authorized JavaScript origins. `http://localhost:8093` is authorised. Copy the probe into the served root and start the server:

```bash
cd mobile
cp "$SCRATCH/gsi-probe.html" dist/gsi-probe.html    # dist/ is gitignored
node scripts/serve-web.js 8093
```

- [ ] **Step 3: Human runs the probe**

Open `http://localhost:8093/gsi-probe.html` in a browser signed into a Google account. Perform the three steps printed on the page.

Record the outcome:

| observation | meaning |
|---|---|
| chooser opens the **second** time | 🟢 **PASS** — premise holds, continue to Task 2 |
| chooser does not open the second time | 🔴 **FAIL** — stop. D2 is wrong; the spec needs revisiting before any code is written |

- [ ] **Step 4: Clean up**

```bash
rm mobile/dist/gsi-probe.html
```

Nothing to commit — the probe never enters the repo.

---

## Task 2: Extract `GoogleSignInButton` and adopt it on all three auth screens

Behaviour-preserving on web (the old One Tap flow still runs behind it). On Android, `login.tsx`'s Google button gains the `Button` primitive's fixed `lg` height — the intended convergence from spec D6.

**Files:**
- Create: `mobile/components/auth/GoogleSignInButton.tsx`
- Modify: `mobile/app/(auth)/login.tsx:222-232`
- Modify: `mobile/app/(auth)/signup.tsx:401-410`
- Modify: `mobile/app/(auth)/welcome.tsx:248-256`

**Interfaces:**
- Consumes: `Button` from `@/components/ui/Button` — props `{ title: string; onPress: () => void; variant?: 'primary'|'secondary'|'outline'|'ghost'|'danger'; loading?: boolean; disabled?: boolean; fullWidth?: boolean; size?: 'sm'|'md'|'lg' }`
- Produces: `GoogleSignInButton` — a named export taking `{ onPress: () => void; disabled?: boolean }`. Task 4 adds a `.web.tsx` fork with the identical prop shape.

- [ ] **Step 1: Capture the utility-rule baseline**

Do this **before** touching any file under a content glob.

```bash
cd mobile
node scripts/resolve-utilities.js > "$SCRATCH/before.json"
```

- [ ] **Step 2: Create the component**

Create `mobile/components/auth/GoogleSignInButton.tsx`:

```tsx
import React from 'react';
import { Button } from '@/components/ui/Button';

interface GoogleSignInButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

/**
 * The Google entry point on native.
 *
 * Web has a fork (GoogleSignInButton.web.tsx) that renders Google's own button
 * instead, because only Google's button flow reopens the account chooser after
 * a dismissal. This file must therefore stay free of any Google SDK reference —
 * the platform difference is the whole reason the fork exists.
 *
 * Wrapping the Button primitive rather than hand-rolling a touchable is what
 * keeps the fixed per-size height, the pill shape, the foreground pairing and
 * the a11y contract. Two of the three auth screens already did this; login did
 * not, and this component is what converges them.
 */
export function GoogleSignInButton({ onPress, disabled }: GoogleSignInButtonProps) {
  return (
    <Button
      title="Sign in with Google"
      onPress={onPress}
      disabled={disabled}
      variant="secondary"
      fullWidth
      size="lg"
    />
  );
}
```

- [ ] **Step 3: Adopt it in `login.tsx`**

Add the import alongside the existing component imports:

```tsx
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
```

Replace lines 222-232 — the whole `{(Platform.OS === 'android' || Platform.OS === 'web') && (...)}` block containing the `TouchableOpacity` — with:

```tsx
            {(Platform.OS === 'android' || Platform.OS === 'web') && (
              <GoogleSignInButton onPress={handleGoogleSignIn} />
            )}
```

Leave the explanatory comment above the block exactly as it is. Do **not** remove the `TouchableOpacity` import — it is still used by the Sign Up link at line 238.

- [ ] **Step 4: Adopt it in `signup.tsx`**

Add the same import. Replace lines 401-410 with:

```tsx
            {(Platform.OS === 'android' || Platform.OS === 'web') && (
              <GoogleSignInButton onPress={handleGoogleSignIn} disabled={isLoading} />
            )}
```

- [ ] **Step 5: Adopt it in `welcome.tsx`**

Add the same import. Replace lines 248-256 with:

```tsx
            {(Platform.OS === 'android' || Platform.OS === 'web') && (
              <GoogleSignInButton onPress={handleGoogleSignIn} />
            )}
```

- [ ] **Step 6: Typecheck**

Run: `cd mobile && npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 7: Run the gate**

Run: `cd mobile && npm run gate`
Expected: exit 0.

⚠️ If `primitive-adoption-check.js` reports the `Button` contract's `expected` file list, confirm all three auth screens are still listed. They render `GoogleSignInButton`, which renders `Button` — if the check scans raw source per file, `login.tsx` may no longer show a direct `Button` usage from this block. It has other `Button` call sites (the Log In control), so the file-level assertion still holds. **If it does not, report the exact failing assertion rather than editing the gate.**

- [ ] **Step 8: Confirm no utility rule moved**

```bash
cd mobile
node scripts/resolve-utilities.js > "$SCRATCH/after.json"
node scripts/resolve-utilities.js --diff "$SCRATCH/before.json" "$SCRATCH/after.json"
```

Expected: `0 rule(s) moved, of N seen.` and exit 0. A non-zero count means prose or markup in this batch emitted a Tailwind rule — find it before continuing.

- [ ] **Step 9: Build and drive**

```bash
cd mobile && npm run web:export && node scripts/serve-web.js 8093
```

Expected: `verify-export: PASS`, 0 failures. Then load `http://localhost:8093/login`, `/signup` and `/welcome` and confirm the Google button renders on all three and still opens Google's UI when tapped.

- [ ] **Step 10: Commit**

```bash
git add mobile/components/auth/GoogleSignInButton.tsx "mobile/app/(auth)/login.tsx" "mobile/app/(auth)/signup.tsx" "mobile/app/(auth)/welcome.tsx"
git commit -m "refactor(auth): extract GoogleSignInButton, converge three screens on the primitive

login.tsx hand-rolled a TouchableOpacity where welcome and signup render the
Button primitive. That is the exact regression the adoption gate's Button
contract describes — fixed height, pill, foreground pairing and a11y contract,
all lost in one edit and none of it visible on Android. The gate missed this
instance because login.tsx renders the primitive elsewhere, so its file-level
assertion was already satisfied.

The shared component wraps the primitive, so all three screens now sit at the
same size step. login.tsx's Google button gains that fixed height on Android —
the one visible native change in this work, owner-approved.

No behaviour change: the component takes onPress and the screens pass the same
handler they already had.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Split the store into acquire + `completeGoogleLogin`

Behaviour-preserving on both platforms. Task 4 needs an entry point that accepts a credential the caller already holds.

**Files:**
- Modify: `mobile/store/authStore.ts:27` (the `AuthState` interface)
- Modify: `mobile/store/authStore.ts:224-282` (`loginWithGoogle`)

**Interfaces:**
- Consumes: `authAPI.loginWithGoogle(idToken, name)`, `storage.saveToken`, `storage.saveUser`, `identifyUser`, `subscriptionService.linkRevenueCatUser`, `loginOneSignalUser`, `setUserTags`, `router.replace` — all already imported in this file
- Produces: `completeGoogleLogin(idToken: string, name: string): Promise<void>` on the auth store, reachable as `useAuthStore((s) => s.completeGoogleLogin)` or `useAuthStore.getState().completeGoogleLogin`

- [ ] **Step 1: Declare the new action on the interface**

In the `AuthState` interface, directly below the `loginWithGoogle` line (`authStore.ts:27`), add:

```ts
  completeGoogleLogin: (idToken: string, name: string) => Promise<void>;
```

- [ ] **Step 2: Replace `loginWithGoogle` with the split pair**

Replace the whole `loginWithGoogle` implementation (from `loginWithGoogle: async () => {` through its closing `},`) with the following two actions. The body of `completeGoogleLogin` is the existing tail moved verbatim — do not re-derive it, and do not drop the RevenueCat or OneSignal calls.

```ts
  loginWithGoogle: async () => {
    // 🔴 TWO gates guard this flow and BOTH have to agree — the button's own
    //    Platform check in the three auth screens, and this one. Widening only
    //    the UI made the button appear and then do nothing: this guard returned
    //    early and merely set an inline error, so nothing threw and no dialog
    //    appeared. If Google ever seems dead on a platform, check both.
    //
    //    Android and web are allowed; iOS-native is not, because App Store
    //    guideline 4.8 requires Sign in with Apple alongside any third-party
    //    sign-in. That rule governs an App Store binary — a PWA in Safari is
    //    not reviewed by Apple, so the WEB build may offer Google on an iPhone,
    //    which matters because web is the only route iOS users have.
    if (Platform.OS !== 'android' && Platform.OS !== 'web') {
      set({ error: 'Google Sign In is not available on this platform' });
      return;
    }

    // This path is NATIVE's. On web the credential arrives from Google's
    // rendered button and the component calls completeGoogleLogin directly —
    // see components/auth/GoogleSignInButton.web.tsx.
    set({ isLoading: true, error: null });
    let credential: { idToken: string; name: string };
    try {
      configureGoogleSignIn();
      credential = await signInWithGoogle();
    } catch (error: any) {
      if (error.code === GOOGLE_SIGN_IN_CANCELLED) {
        set({ isLoading: false });
        return;
      }
      const errorMessage = error.message || 'Google Sign In failed';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }

    await get().completeGoogleLogin(credential.idToken, credential.name);
  },

  // Everything after a Google credential is in hand. Platform-agnostic on
  // purpose: acquiring the credential differs per platform, turning it into a
  // session never did.
  completeGoogleLogin: async (idToken: string, name: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.loginWithGoogle(idToken, name);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Google Sign In failed');
      }

      const { user, token } = response.data;
      await storage.saveToken(token);
      await storage.saveUser(user);

      set({ user, token, isAuthenticated: true, isLoading: false });

      try {
        await identifyUser(user._id);
        await subscriptionService.linkRevenueCatUser(user._id);
      } catch (error) {
        console.error('RevenueCat identification error:', error);
      }

      try {
        loginOneSignalUser(user._id);
        setUserTags({ tier: user.subscription?.tier || 'free', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
      } catch (error) {
        console.error('OneSignal login error:', error);
      }

      // Defer to index.tsx for canonical post-auth routing — new Google users
      // (no profile yet) go to /(capture)/birth-data; returning users go to home.
      router.replace('/' as any);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Google Sign In failed';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },
```

- [ ] **Step 3: Typecheck**

Run: `cd mobile && npx tsc --noEmit`
Expected: no output, exit 0. A missing `completeGoogleLogin` on the interface surfaces here.

- [ ] **Step 4: Run the gate**

Run: `cd mobile && npm run gate`
Expected: exit 0. No `--diff` needed — `store/` is not under a Tailwind content glob.

- [ ] **Step 5: Confirm the native path still reads correctly**

Read the new `loginWithGoogle` and check three things by eye, because no test can:
1. `set({ isLoading: true })` still happens **before** `signInWithGoogle()`, so Android's spinner behaviour during the native chooser is unchanged.
2. The `GOOGLE_SIGN_IN_CANCELLED` branch still returns silently.
3. `loginOneSignalUser` and `identifyUser` both survive inside `completeGoogleLogin`.

- [ ] **Step 6: Build and drive the unchanged web path**

```bash
cd mobile && npm run web:export && node scripts/serve-web.js 8093
```

Load `http://localhost:8093/login` and tap the Google button. The old One Tap flow should behave exactly as before this task — this is a refactor checkpoint, not the feature.

- [ ] **Step 7: Commit**

```bash
git add mobile/store/authStore.ts
git commit -m "refactor(auth): split loginWithGoogle into acquire + completeGoogleLogin

loginWithGoogle did two unrelated jobs: acquire a credential, which is
platform-specific, and turn it into a session, which never was. The web flow
needs the second half on its own, because Google's rendered button hands the
credential over before any store action runs.

Native is behaviourally identical — isLoading is still set before the native
chooser opens, the cancelled branch still returns silently, and the RevenueCat
and OneSignal calls every login path owes are untouched inside the moved tail.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Replace the web flow with Google's rendered button and the confirm step

This is the feature. The lib rewrite and the web component must land together — the lib's new exports have no caller without the component, and the component has no credential source without the lib.

**Files:**
- Modify: `mobile/lib/googleSignIn.web.ts` (rewrite)
- Create: `mobile/components/auth/GoogleSignInButton.web.tsx`

**Interfaces:**
- Consumes: `showAlert(title: string, message?: string, buttons?: AlertButton[])` from `@/lib/alert`; `completeGoogleLogin(idToken: string, name: string)` from Task 3; `Button` from `@/components/ui/Button`
- Produces (from `lib/googleSignIn.web.ts`):
  - `mountGoogleButton(host: HTMLElement, onCredential: (idToken: string) => void): Promise<void>`
  - `profileFromIdToken(idToken: string): { name: string; email: string }`
  - `confirmGoogleAccount(profile: { name: string; email: string }): Promise<boolean>`
  - plus the parity set: `GOOGLE_SIGN_IN_CANCELLED`, `configureGoogleSignIn`, `signInWithGoogle`, `signOutGoogle`

- [ ] **Step 1: Capture the utility-rule baseline**

```bash
cd mobile
node scripts/resolve-utilities.js > "$SCRATCH/before.json"
```

- [ ] **Step 2: Rewrite `mobile/lib/googleSignIn.web.ts`**

Replace the entire file with:

```ts
// Web fork of lib/googleSignIn.ts, using Google Identity Services (GSI).
//
// @react-native-google-signin/google-signin is native-only. On web the
// equivalent is GSI, which returns the SAME artifact — a Google ID token — so
// the SERVER NEEDS NO CHANGE: auth.service.verifyGoogleToken already validates
// the token against GOOGLE_OAUTH_WEB_CLIENT_ID, and that is the very client ID
// used here. One client ID, two front ends.
//
// 🔴 WHY THE RENDERED BUTTON AND NOT ONE TAP. This fork used to call
//    google.accounts.id.prompt(). Dismissing that prompt puts the origin into a
//    COOLDOWN — the browser suppresses third-party sign-in for a growing window
//    — and the two status callbacks written to detect it, isNotDisplayed and
//    isSkippedMoment, DO NOT FIRE UNDER FedCM. Measured, and Google's own
//    console warning says those methods are being retired. The result was a
//    button that opened the chooser once and then produced a two-minute spinner
//    on every later press.
//
//    The rendered button is BUTTON MODE: user-gesture initiated, always shows
//    the chooser, exempt from that cooldown. It is also why the old 120-second
//    backstop is gone rather than shortened — nothing is awaited across
//    Google's UI anymore, so there is no promise left to strand.
//
// OWNER ACTION REQUIRED before this works in a browser: the origin must be
// listed under "Authorized JavaScript origins" on that OAuth client in Google
// Cloud Console, project revelia-497203. See
// docs/GOOGLE_SIGNIN_WEB_SETUP.md. Without it GSI rejects the origin.
//
// Export list mirrors lib/googleSignIn.ts and adds three web-only helpers;
// parity is asserted by scripts/web-fork-check.js.

import { showAlert } from './alert';

export const GOOGLE_SIGN_IN_CANCELLED = 'GOOGLE_SIGN_IN_CANCELLED';

const CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
const GSI_SRC = 'https://accounts.google.com/gsi/client';

// Google's rendered button takes a pixel width and caps at 400.
const MAX_BUTTON_WIDTH = 400;
const FALLBACK_BUTTON_WIDTH = 320;

let gsiLoader: Promise<void> | null = null;

/** Loads Google's script once, on demand. */
function loadGsi(): Promise<void> {
  if (gsiLoader) return gsiLoader;
  gsiLoader = new Promise<void>((resolve, reject) => {
    if ((window as any).google?.accounts?.id) {
      resolve();
      return;
    }
    const el = document.createElement('script');
    el.src = GSI_SRC;
    el.async = true;
    el.defer = true;
    el.onload = () => resolve();
    el.onerror = () => {
      gsiLoader = null; // allow a retry on the next attempt
      reject(new Error('Google Sign-In script failed to load'));
    };
    document.head.appendChild(el);
  });
  return gsiLoader;
}

/**
 * No-op on web: initialization happens in mountGoogleButton, which is the only
 * place that has the credential callback to hand it.
 */
export function configureGoogleSignIn(): void {}

/**
 * Renders Google's own button into `host` and reports each credential.
 *
 * Rejects if the script cannot load or no client ID is configured; the caller
 * is expected to fall back to a control that explains itself rather than a
 * button that does nothing.
 */
export async function mountGoogleButton(
  host: HTMLElement,
  onCredential: (idToken: string) => void
): Promise<void> {
  if (!CLIENT_ID) {
    throw new Error('No Google client ID — EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID not set');
  }
  await loadGsi();

  const google = (window as any).google;
  if (!google?.accounts?.id) {
    throw new Error('Google Sign-In unavailable');
  }

  google.accounts.id.initialize({
    client_id: CLIENT_ID,
    callback: (response: { credential?: string }) => {
      if (response?.credential) onCredential(response.credential);
    },
  });

  const measured = Math.round(host.getBoundingClientRect().width) || FALLBACK_BUTTON_WIDTH;
  google.accounts.id.renderButton(host, {
    type: 'standard',
    theme: 'filled_black',
    size: 'large',
    shape: 'pill',
    text: 'signin_with',
    logo_alignment: 'center',
    width: Math.min(measured, MAX_BUTTON_WIDTH),
  });
}

/**
 * Best-effort display fields out of the ID token payload.
 *
 * NEVER trusted for auth — the server re-verifies the token itself. These two
 * values exist only so the confirm dialog can name the account the user is
 * about to sign in as.
 */
export function profileFromIdToken(idToken: string): { name: string; email: string } {
  try {
    const payload = idToken.split('.')[1];
    if (!payload) return { name: '', email: '' };
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const parsed = JSON.parse(json);
    return { name: parsed?.name ?? '', email: parsed?.email ?? '' };
  } catch {
    return { name: '', email: '' };
  }
}

/**
 * Asks the user to confirm the account Google returned, BEFORE anything is sent
 * to our server.
 *
 * 🔴 WHY THIS EXISTS: the server does User.create on a first Google sign-in, so
 *    a mis-tapped account does not merely sign you in wrong — it creates a whole
 *    stray Revelia account. This dialog is the only thing between the chooser
 *    and that write.
 *
 * The second button carries the cancel style, which is what makes Escape and a
 * backdrop tap resolve false as well (see cancelButtonOf in alert.web.ts). Every
 * accidental exit therefore lands on "do not sign in".
 *
 * Always settles. The one gap: another showAlert opening over this one closes it
 * without running any handler, which would strand the promise. The caller's
 * in-flight guard makes that unreachable from this flow.
 */
export function confirmGoogleAccount(profile: {
  name: string;
  email: string;
}): Promise<boolean> {
  if (typeof document === 'undefined') return Promise.resolve(false);

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const done = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    showAlert(`Continue as ${profile.name || profile.email}`, profile.email, [
      { text: 'Continue', onPress: () => done(true) },
      { text: 'Use a different account', style: 'cancel', onPress: () => done(false) },
    ]);
  });
}

/**
 * Native-only. Kept exported so web-fork-check's parity assertion holds, and
 * throwing rather than returning so a future web call site fails loudly instead
 * of hanging — which is the failure mode this whole rewrite removed.
 */
export async function signInWithGoogle(): Promise<{ idToken: string; name: string }> {
  throw new Error(
    'signInWithGoogle is native-only. On web the credential arrives from the rendered ' +
      'button — use mountGoogleButton, see components/auth/GoogleSignInButton.web.tsx.'
  );
}

export async function signOutGoogle(): Promise<void> {
  try {
    (window as any).google?.accounts?.id?.disableAutoSelect?.();
  } catch {
    // Signing out of the app must never fail because a Google script is absent.
  }
}
```

- [ ] **Step 3: Create `mobile/components/auth/GoogleSignInButton.web.tsx`**

```tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { showAlert } from '@/lib/alert';
import {
  confirmGoogleAccount,
  mountGoogleButton,
  profileFromIdToken,
  signOutGoogle,
} from '@/lib/googleSignIn';
import { useAuthStore } from '@/store/authStore';

interface GoogleSignInButtonProps {
  // Accepted for prop-shape parity with the native fork. Web never calls it:
  // Google's own button owns the click, so there is no press for us to handle.
  onPress?: () => void;
  disabled?: boolean;
}

const UNAVAILABLE_TITLE = 'Sign In Failed';
const UNAVAILABLE_BODY =
  'Google Sign In is unavailable. Please try again or use another sign-in method.';

/**
 * Web fork: hosts Google's own rendered button.
 *
 * This file holds the React lifecycle and the orchestration and NOTHING ELSE —
 * every reference to the Google SDK lives in lib/googleSignIn.web.ts. Keeping
 * that boundary is what lets the flow be reasoned about without reading GSI's
 * documentation.
 *
 * If the button cannot be mounted at all we render a control that SAYS SO when
 * pressed. A control that silently does nothing is the failure mode this screen
 * has now produced three separate times.
 */
export function GoogleSignInButton({ disabled }: GoogleSignInButtonProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const inFlight = useRef(false);
  const [unavailable, setUnavailable] = useState(false);
  const completeGoogleLogin = useAuthStore((s) => s.completeGoogleLogin);

  const handleCredential = useCallback(
    async (idToken: string) => {
      // A second credential while the confirm is open would open a second
      // dialog over the first, closing it without running a handler.
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const profile = profileFromIdToken(idToken);
        const confirmed = await confirmGoogleAccount(profile);
        if (!confirmed) {
          // Clears Google's auto-select so the next press offers the chooser
          // rather than silently reusing the account just declined.
          await signOutGoogle();
          return;
        }
        await completeGoogleLogin(idToken, profile.name);
      } catch (error) {
        console.error('Google Sign In error:', error);
        showAlert(UNAVAILABLE_TITLE, UNAVAILABLE_BODY);
      } finally {
        inFlight.current = false;
      }
    },
    [completeGoogleLogin]
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;

    mountGoogleButton(host, handleCredential).catch((error) => {
      console.error('Google Sign In unavailable:', error);
      if (!disposed) setUnavailable(true);
    });

    return () => {
      disposed = true;
    };
  }, [handleCredential]);

  if (unavailable) {
    return (
      <Button
        title="Sign in with Google"
        onPress={() => showAlert(UNAVAILABLE_TITLE, UNAVAILABLE_BODY)}
        disabled={disabled}
        variant="secondary"
        fullWidth
        size="lg"
      />
    );
  }

  return <div ref={hostRef} style={{ width: '100%', display: 'flex', justifyContent: 'center' }} />;
}
```

- [ ] **Step 4: Typecheck**

Run: `cd mobile && npx tsc --noEmit`
Expected: no output, exit 0.

The intrinsic `div` is not a novelty here: `components/ui/DateTimeField.web.tsx:55` already does exactly this, holding a real DOM node with `useRef<HTMLInputElement | null>(null)` and rendering an intrinsic `<input>`. Its header states the reason — on web the renderer *is* react-dom. If `tsc` objects, match that file rather than inventing a cast.

- [ ] **Step 5: Run the gate, including fork parity**

Run: `cd mobile && npm run gate`
Expected: exit 0, and `web-fork-check` PASS.

`web-fork-check` asserts the web fork exports every name the native fork exports. The parity set is `GOOGLE_SIGN_IN_CANCELLED`, `configureGoogleSignIn`, `signInWithGoogle`, `signOutGoogle` — all four are present above. The three new exports are extras, which the check permits.

- [ ] **Step 6: Confirm no utility rule moved**

```bash
cd mobile
node scripts/resolve-utilities.js > "$SCRATCH/after.json"
node scripts/resolve-utilities.js --diff "$SCRATCH/before.json" "$SCRATCH/after.json"
```

Expected: `0 rule(s) moved`. This batch adds long comments to a file under a content glob, which is exactly the case that has emitted a phantom rule twenty-plus times in this project. Do not skip it.

- [ ] **Step 7: Build**

Run: `cd mobile && npm run web:export`
Expected: `verify-export: PASS`, failures 0.

- [ ] **Step 8: Drive the full flow**

Serve and open `http://localhost:8093/login` in a browser signed into Google.

| check | expected |
|---|---|
| Google's rendered button appears on login, signup, welcome | yes, in place of the pill |
| tap → chooser opens | yes |
| **dismiss, then tap again → chooser opens again** | 🔴 **yes. This is the reported bug. If it fails here, Task 1's premise was wrong** |
| pick an account → confirm dialog | shows `Continue as <name>` and the account's email |
| press Escape / tap the backdrop | dialog closes, **not signed in** |
| "Use a different account" | dialog closes, **not signed in**, still on the auth screen |
| "Continue" | signs in and routes onward; the spinner appears only now, not while Google's UI was open |

- [ ] **Step 9: Commit**

```bash
git add mobile/lib/googleSignIn.web.ts mobile/components/auth/GoogleSignInButton.web.tsx
git commit -m "fix(web): Google's chooser now reopens, and the account is confirmed first

TWO problems, one commit, because the fix for the first is the mechanism for
the second.

1 · THE CHOOSER STOPPED APPEARING AFTER ONE DISMISSAL. This fork drove One Tap
via prompt(). Dismissing it puts the origin into a cooldown, and the two status
callbacks written to catch that — isNotDisplayed and isSkippedMoment — DO NOT
FIRE UNDER FedCM. Measured; Google's own console warning says they are being
retired. Neither callback ran, so the promise only ended at the 120s backstop:
a two-minute spinner on every press after the first.

2 · A MIS-TAPPED ACCOUNT CREATED A STRAY REVELIA ACCOUNT, because the server
does User.create on a first Google sign-in and nothing sat between the chooser
and that write.

Google's rendered button is button mode: user-gesture initiated, always shows
the chooser, exempt from the cooldown. That fixes 1 and gives 2 somewhere to
stand — the credential now passes through a confirm dialog before any request
is made.

THE BACKSTOP IS DELETED, NOT SHORTENED. Nothing is awaited across Google's UI
anymore, so no promise can be stranded. isLoading moves into completeGoogleLogin,
so the spinner covers the server call and nothing else.

The confirm reuses showAlert rather than adding a component. Its second button
takes the cancel style, which is what makes Escape and a backdrop tap resolve
false too — every accidental exit lands on do-not-sign-in.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Full verification pass and register updates

**Files:**
- Modify: `docs/GOOGLE_SIGNIN_WEB_SETUP.md`
- Modify: `tracking_files/owner-actions.md`
- Modify: `tracking_files/session_handoff.md`

**Interfaces:**
- Consumes: the completed Tasks 2-4
- Produces: nothing consumed by later tasks

- [ ] **Step 1: Run every gate from a clean tree**

```bash
cd mobile && npx tsc --noEmit && npm run gate
cd ../server && npx tsc --noEmit
```

Expected: all exit 0. Record the actual output — a printed count is not a checked count, so read the reasons, not just the exit codes.

- [ ] **Step 2: Re-read the report-only rule**

`no-white-on-accent` in `token-gate.sh` is permanently report-only. Read its output for this batch. The new controls use the `secondary` variant, which is a surface fill rather than an accent fill, so it should be silent — if it is not, investigate rather than assume.

- [ ] **Step 3: Export and drive over the tunnel**

Rebuild, then run the flow from Task 4 Step 8 once more against the public tunnel URL rather than localhost, so the check runs over HTTPS with a live service worker. The tunnel host must be on the OAuth client's authorised origins.

- [ ] **Step 4: Update the setup runbook**

In `docs/GOOGLE_SIGNIN_WEB_SETUP.md`, section 5's decode table still describes the One Tap symptoms. Replace the row that reads

> `[GSI_LOGGER]: FedCM get() rejects with NetworkError`, then ~2 minutes of nothing…

with a row describing the current behaviour: an unauthorised origin now leaves Google's rendered button failing to mount, which surfaces as the fallback control saying Google Sign-In is unavailable. Add one line noting the two-minute spinner no longer exists.

- [ ] **Step 5: Record the Android smoke as an owner action**

Append a new P-item to `tracking_files/owner-actions.md` (take the next free number from the marker at the end of the file, and bump that marker):

> `login.tsx`'s Google button gains the primitive's fixed `lg` height on Android — the one visible native change in this work. No device was available, so it has `tsc` and gate coverage but no runtime proof. Smoke all three auth screens on a device before release.

- [ ] **Step 6: Update the handoff**

Overwrite the CURRENT HANDOFF block in `tracking_files/session_handoff.md` with the state after this work: what landed, what is verified, and that the Android smoke is outstanding.

- [ ] **Step 7: Commit**

```bash
git add docs/GOOGLE_SIGNIN_WEB_SETUP.md tracking_files/owner-actions.md tracking_files/session_handoff.md
git commit -m "docs(web): update the Google Sign-In runbook and registers for the button flow

The setup runbook's failure-decode table described One Tap symptoms that can no
longer occur — the two-minute spinner is gone with the backstop, and an
unauthorised origin now shows the fallback control instead.

Records the Android smoke as an owner action: login.tsx's Google button changed
height on Android and no device was available to prove it.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Self-review notes

**Spec coverage.** D1 confirm-before-server → Task 4 Steps 2-3. D2 rendered button → Task 4 Step 2. D3 web only → native fork untouched throughout; the one native change is D6, called out in Task 2. D4 fallback-only re-selection → Task 4 Step 3's `signOutGoogle` branch, with no programmatic re-trigger anywhere. D5 reuse `showAlert` → Task 4 Step 2's `confirmGoogleAccount`. D6 wrap the primitive → Task 2. Spec §5's failure table → Task 4's fallback control, the in-flight guard, and the `document === 'undefined'` early return. Spec §7 verification → Tasks 2, 4 and 5. Spec §8's premise risk → Task 1, gating everything.

**Type consistency.** `completeGoogleLogin(idToken: string, name: string): Promise<void>` is declared in Task 3 Step 1, implemented in Task 3 Step 2, and consumed in Task 4 Step 3 with the same name and arity. `profileFromIdToken` returns `{ name, email }` in Task 4 Step 2 and is destructured as `profile.name` / `profile.email` in the same task. `GoogleSignInButton` takes `{ onPress, disabled }` in Task 2 and `{ onPress?, disabled? }` in Task 4 — the web fork widens `onPress` to optional because Google owns the click; the three call sites pass it either way, so both shapes accept every existing usage.

**Known gaps, stated rather than hidden.** No Android runtime proof (Task 5 Step 5 records it). Task 1 needs a human. `confirmGoogleAccount` can be stranded by an unrelated `showAlert` opening over it; the in-flight guard makes that unreachable from this flow but does not make it impossible in principle.
