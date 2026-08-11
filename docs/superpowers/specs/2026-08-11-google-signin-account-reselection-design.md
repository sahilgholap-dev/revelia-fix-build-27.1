# Web Google Sign-In: chooser reliability + account confirmation

**Date:** 2026-08-11 · **Branch:** `fix/build-27.1` · **Surface:** web PWA only
**Supersedes nothing.** Builds on `e77c1ed` (enabled Google Sign-In on web).

---

## 1. The problem, in two halves

### 1a · The chooser stops appearing after one dismissal

Reproduced on a real device against the tunnel build. Tap "Sign in with Google", get the account
chooser, back out — and every later tap produces a spinner and nothing else.

**Mechanism.** `googleSignIn.web.ts` drives One Tap via `google.accounts.id.prompt()`. Dismissing
One Tap puts the site into a **cooldown**: Chrome suppresses third-party sign-in for that origin,
with the window growing on repeat dismissals. The code is written to notice this and report a cancel
through `isNotDisplayed()` / `isSkippedMoment()` — but **those callbacks do not fire under FedCM**.
Measured this session; Google's own console warning states they are being retired:

> `[GSI_LOGGER]: Your client application uses one of the Google One Tap prompt UI status methods that
> may stop functioning when FedCM becomes mandatory.`

With neither the credential callback nor the notification callback firing, the promise never settles
and the only exit is the 120-second backstop at `googleSignIn.web.ts:101`. **The backstop is working
exactly as designed** — it is why the button reports at all instead of hanging forever — but the
outcome is still a two-minute spinner on the first-run funnel.

### 1b · A mis-tapped account is expensive here

On first Google sign-in the server does `User.create` (`server/src/services/auth.service.ts:299`).
Choosing the wrong account does not merely sign you in wrong — **it creates a stray Revelia account**
with its own profile, readings and subscription state. There is currently no confirmation between
Google returning a credential and that write.

### What is NOT possible

The account list is Google's own UI in Google's frame. **No control can be added to it** — there is
no `google.accounts.id` option for this, and the original request ("add a back button after selecting
the account") cannot be satisfied literally. What follows is an escape hatch on our side of the
handoff.

---

## 2. Decisions

| # | Decision | Rejected alternative |
|---|---|---|
| D1 | **Confirm before the server call.** Google returns a credential; we show name + email and require an explicit Continue before `completeGoogleLogin` runs | Sign in immediately and offer "switch account" later — the stray account is already created by then |
| D2 | **Google's rendered button on web.** `renderButton` is button mode: user-gesture initiated, always shows the chooser, **exempt from the cooldown** | Invisible Google button overlaid on the Vellum pill — fragile (must track the pill's size at every font scale) and against Google's branding terms |
| D3 | **Web only.** Android keeps its current flow untouched | Put the confirm in the shared store so both platforms inherit it. Correct eventually, but it changes a live Play Store flow in a 2.0.x point release |
| D4 | **Fallback-only re-selection.** "Use a different account" dismisses and leaves the user on the auth screen with Google's button in front of them | Programmatically re-trigger the chooser from our modal's click handler — unverified API behaviour, and the fallback costs one tap |
| D5 | **The confirm reuses `showAlert`**, not a new component | A bespoke modal. `lib/alert.web.ts` already solves this exact problem, and its header documents why imperative DOM beats a React host for non-render-tree callers |
| D6 | **The shared component wraps the `Button` primitive** (`variant="secondary" fullWidth size="lg"`) | Reproducing `login.tsx`'s hand-rolled `TouchableOpacity`. See the correction below |

### D1 — SUPERSEDED 2026-08-11, by owner decision, after this plan shipped

**The confirm dialog is REMOVED.** On a credential, the web button now calls
`completeGoogleLogin` directly — no "Continue as <name>" step, no `confirmGoogleAccount`. The
owner reversed the original call: a mis-tapped Google account is made **recoverable after the
fact** (a working back button on `/birth-data`, which signs out and clears Google's auto-select
before returning to `welcome`) rather than **gated up front**.

**The trade-off named in D1's own rejected-alternative column is the one now accepted, explicitly
and with its cost disclosed, not rediscovered:** the server still does `User.create` on a first
Google sign-in, so a mis-tapped account still creates a stray Revelia account — that account is
just no longer prevented, it is abandoned instead. Cleaning it up needs a server endpoint and a
definition of "empty account," and is out of scope; it is carried as a known consequence in
`tracking_files/owner-actions.md`.

This note supersedes D1 only. D2 (rendered button, exempt from the One Tap cooldown) and D3
(web-only) are unaffected — removing the confirm dialog changes nothing about which mode mounts
the button or which platform this branch touches.

### D6 — a correction found while planning

An earlier draft of this spec said the pill would be "extracted verbatim from `login.tsx:223`."
**That was wrong about two of the three screens.** `welcome.tsx:249` and `signup.tsx:402` already
render the `Button` primitive; only `login.tsx` hand-rolls a `TouchableOpacity`.

That hand-rolled copy is precisely the regression `primitive-adoption-check.js`'s `Button` contract
exists to prevent — its comment names the losses as "X3's fixed height, the pill, the on-accent
pairing and the a11y contract IN ONE EDIT, and every one of those losses is undetectable on Android."
The gate misses this instance because `login.tsx` renders `Button` elsewhere, so the file-level
`expected` list is already satisfied.

**Consequence for D3, stated plainly:** "Android untouched" becomes **"Android untouched except
`login.tsx`'s Google button, which gains X3's fixed `lg` height."** `welcome.tsx` and `signup.tsx`
are unaffected — they are already on that height. This converges three screens that shipped at two
different heights, and it is the reason the Android smoke in §7 is required rather than advisory.

**Accepted compromise:** `showAlert` has no image slot, so the confirm shows **name and email, no
avatar**. Adding an image slot to the shared dialog is a larger change than this feature justifies.

**Note on D2:** the current pill is a plain `TouchableOpacity` with text and no Google logo
(`login.tsx:223`), already outside Google's branding guidelines for sign-in buttons. D2 closes that
gap on web as a side effect. Android remains non-compliant and is out of scope here.

---

## 3. Architecture

| file | change |
|---|---|
| `mobile/components/auth/GoogleSignInButton.tsx` | **new** — wraps the `Button` primitive as `variant="secondary" fullWidth size="lg"`, props `{ onPress, disabled? }`. Per D6 |
| `mobile/components/auth/GoogleSignInButton.web.tsx` | **new** — owns the host `<div>` ref and the React lifecycle; calls `mountGoogleButton` on mount and orchestrates decode → confirm → `completeGoogleLogin` |
| `mobile/lib/googleSignIn.web.ts` | rewritten. `prompt()` and the 120s backstop **deleted**. Retains `loadGsi()`. Gains two exports: `mountGoogleButton` and `confirmGoogleAccount` |
| `mobile/lib/googleSignIn.ts` | **untouched** |
| `mobile/store/authStore.ts` | split `loginWithGoogle` at its existing seam (`authStore.ts:244`) into acquire + `completeGoogleLogin(idToken, name)` |
| `mobile/app/(auth)/login.tsx` · `signup.tsx` · `welcome.tsx` | each replaces its inline `TouchableOpacity` with `<GoogleSignInButton />` |

### Module boundary — which half knows about Google

**All GSI knowledge stays in the lib; all React stays in the component.** The component never touches
`window.google`.

```ts
// lib/googleSignIn.web.ts
mountGoogleButton(host: HTMLElement, onCredential: (idToken: string) => void): Promise<void>
  // loadGsi() → google.accounts.id.initialize({ client_id, callback }) → renderButton(host)
  // rejects if the script fails to load or the client ID is absent

confirmGoogleAccount(profile: { name: string; email: string }): Promise<boolean>
  // showAlert(...) wrapper. Resolves true on Continue, false on every other exit.
  // ALWAYS settles — including when `document` is undefined.
```

The component calls `mountGoogleButton` in a mount effect, and on each credential runs
`profileFromIdToken` → `confirmGoogleAccount` → `completeGoogleLogin`. The **in-flight flag lives in
the component** (a ref), since that is where the orchestration is.

On a `false` result the component calls the existing `signOutGoogle()`, which already wraps
`disableAutoSelect()` — no new function is needed for the dismissal path.

### Why the store splits

`loginWithGoogle` does two unrelated jobs: acquire a credential (platform-specific) and turn it into
a session (never was). After the split:

- **native** — `loginWithGoogle` = acquire then complete. Behaviourally identical to today.
- **web** — Google's button already produced the credential, so it calls `completeGoogleLogin`
  directly.

`completeGoogleLogin` owns everything from `authAPI.loginWithGoogle` down to `router.replace('/')`,
including the RevenueCat `identifyUser` and OneSignal `loginOneSignalUser` calls that every login
path is required to make.

### Export parity

`scripts/web-fork-check.js` asserts the web fork exports every name the native fork exports
(one-directional; extra exports are permitted). Web no longer uses `signInWithGoogle`, so it stays
exported and **throws a descriptive developer error if called** — parity satisfied, and any future
call site fails loudly rather than silently. `configureGoogleSignIn` remains the no-op it already is.

---

## 4. Flow

```
mount        loadGsi() → initialize({ client_id, callback }) → renderButton(host div)
tap          Google opens the chooser                    ← button mode: cooldown never applies
pick         callback({ credential })
decode       profileFromIdToken → { name, email }        ← display only; the server re-verifies
confirm      showAlert("Continue as <name>", "<email>", [...])
Continue     completeGoogleLogin(idToken, name)
             → server → storage → RevenueCat → OneSignal → router.replace('/')
```

### The confirm dialog

```
Continue as Sahil Gholap
sahil@example.com

  [ Continue ]                    → completeGoogleLogin(...)
  [ Use a different account ]     → dismiss; signOutGoogle(); stay on the auth screen
```

"Use a different account" carries `style: 'cancel'`, so `cancelButtonOf` (`alert.web.ts:29`) maps
**Escape and backdrop-tap onto it as well**. Every accidental dismissal therefore lands on
*don't sign in*. The careless path is the safe path, structurally rather than by copy.

### Loading state

Today `isLoading` is set the moment the button is tapped, before Google's UI — that is what renders
the 120-second spinner. Here it is set only inside `completeGoogleLogin`, so **the spinner covers the
server call and nothing else.** Google's UI never blocks the app's UI.

---

## 5. Failure handling

| case | behaviour |
|---|---|
| **user backs out of the chooser** | no callback fires, nothing happens, the button stays live — tapping again reopens the chooser. **This is the reported bug, fixed**, because button mode is not subject to the One Tap cooldown |
| GSI script blocked or offline | `loadGsi()` rejects → render the fallback pill; pressing it shows "Google Sign-In is unavailable — use email". **Never a dead button** |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` missing | same fallback path, retaining the existing developer-facing message |
| `document` undefined | `showAlert` no-ops by design (`alert.web.ts:38`), so the confirm helper resolves **not-confirmed**. The promise always settles — the invariant the backstop existed to guarantee, now structural rather than timed |
| server rejects the token | unchanged — `completeGoogleLogin`'s existing catch sets the inline error |
| a second credential arrives mid-confirm | ignored via an in-flight flag |

The 120-second backstop is **deleted, not shortened**. Nothing is awaited across Google's UI anymore,
so there is no promise left to strand.

---

## 6. Out of scope

- **The confirm step on Android.** Same stray-account risk, deliberately deferred (D3).
- **An avatar in the confirm dialog.** Needs an image slot in the shared dialog.
- **Programmatic chooser re-trigger.** Superseded by D4.
- **Production origins.** `https://app.revelia.me` and `https://revelia-web.pages.dev` are not yet
  authorised and the Pages project does not exist — tracked as `P112` in `owner-actions.md`.
- **CORS for the deployed origin.** `W1-web-pwa.md:1036`, still open. Google Sign-In succeeding does
  not make the deployed PWA work; the follow-up `POST /api/auth/google` is blocked until that lands.

---

## 7. Verification

1. `npx tsc --noEmit` in `mobile` — zero errors.
2. `npm run gate` — exit 0. Carries `web-fork-check` (export parity) and `token-gate.sh`.
3. 🔴 **`node scripts/resolve-utilities.js` and `--diff`** — **mandatory.** This adds files under
   `mobile/components/**`, a Tailwind content glob (`tailwind.config.js:112`). `O-69`: `--diff` is the
   only instrument that can see a rule appear from nowhere.
4. `npm run web:export` → `verify-export` PASS.
5. Driven browser pass over the tunnel build:
   - Google's button renders on login, signup and welcome
   - **dismiss the chooser, tap again — the chooser reopens** (the regression this exists to prevent)
   - the confirm shows the correct name and email
   - "Use a different account" leaves the user signed out and on the auth screen
   - Escape and backdrop-tap behave identically to "Use a different account"
   - Continue signs in and lands on the correct post-auth route
6. `no-white-on-accent` read after the batch (permanently report-only). The new pill uses
   `t.color.surface` with foreground `fg`, no accent fill, so the `A5 pair` rule is not engaged.

**Known verification gap:** no Android device is available. The pill extraction is markup moved, not
rewritten, and is covered by `tsc` and the gate — but it has **no runtime proof**. An Android smoke is
required before release and joins the device checklist already outstanding in `session_handoff.md`.

---

## 8. Risks

| risk | mitigation |
|---|---|
| Google's button visual diverges from the app's design system on web | Accepted under D2. Confined to web; Android is unchanged |
| `login.tsx`'s Google button changes height on Android (D6) | Intended and owner-approved. It is the one visible Android change in this work, and the reason the Android smoke is required |
| `renderButton` sizing against a full-width pill container | `renderButton` accepts a pixel width capped at 400; render at container width, clamped |
| Cooldown assumption is wrong and button mode is also suppressed | Verified first during implementation: dismiss the chooser, tap the rendered button, confirm it reopens. If it does not, the design's premise fails and D2 must be revisited before anything else is built |
