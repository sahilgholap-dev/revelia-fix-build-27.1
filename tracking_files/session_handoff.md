# Session Handoff — Revelia

> **HOW TO USE**: When a session ends, the outgoing session overwrites the "CURRENT HANDOFF" block below. The incoming session reads it, then checks `claude_progress.md` for full current-build history. Keep this file compact — just enough for a cold-start pickup.

---

## CURRENT HANDOFF

**Written by**: `google-signin-web-followup` (+ a same-day review-fix pass) | 2026-08-11
**Branch**: `fix/google-signin-web` (cut from `master` at `50e174a`, NOT `fix/build-27.1`) —
12 commits, tree otherwise clean (one unrelated, unstaged `mobile/public/sw.js` timestamp bump from
running `web:export` during verification — not committed, same as every prior session on this
branch). **NOT YET MERGED.**

# 🔴 A WHOLE-BRANCH REVIEW CAME BACK "DO NOT MERGE" — ONE CRITICAL, TWO IMPORTANT. ALL NINE FINDINGS ARE NOW FIXED, VERIFIED, BELOW.

The 3-commit round this handoff originally described shipped a real regression. Read the review
findings before touching this area again — the shape of each one is worth knowing, not just the fix:

- **F1 · CRITICAL — the back arrow signed out an ONBOARDED user editing their birth data.**
  `/birth-data` is reached three ways, not one: `app/(main)/profile.tsx`'s "Update Birth Data" row
  and `app/(main)/astrology/index.tsx`'s "Add Birth Data" / locked-cell "Edit Profile" all
  `router.push` into it with REAL history. The shipped `handleBack` ran the sign-out path
  unconditionally, on every entry — so a subscriber who tapped "Update Birth Data," changed their
  mind, and tapped back got logged out. `birth-data.tsx` has no `.web` fork, so this would have
  shipped to Play production. **Fixed:** `handleBack` now checks `router.canGoBack()` FIRST — true
  means a plain `router.back()`, unconditionally, and the sign-out path never runs; only the
  no-history (first-run replace chain) case takes it. **Driven-browser regression test, both
  directions, this pass** — see below.
- **F2 · IMPORTANT — `logout()` already navigates, so the old handler navigated twice.**
  `authStore.logout()` ends with its own `router.replace('/(auth)/login')`. The shipped code then
  ran `signOutGoogle()` AFTER `logout()` and added a SECOND explicit `router.replace('/(auth)/welcome')`
  on top — so `/login` transiently mounted (a real `GoogleSignInButton`, a real `initialize()` call,
  a real native SDK round-trip) before the jump to `/welcome`. The in-file comment claiming "clear
  the session... BEFORE navigating" was backwards — navigation had already happened inside
  `logout()`. **Fixed:** `signOutGoogle()` now runs BEFORE `logout()`, and the extra explicit
  `replace('/welcome')` is gone — `logout()`'s own destination (`/login`) stands. ⚠️ **One residual
  finding, verified pre-existing and out of scope, not a new defect:** a single
  `[GSI_LOGGER]: initialize() is called multiple times` warning still fires on this path.
  Root-caused this pass, not hand-waved: `logout()` sets `isAuthenticated: false` AND explicitly
  navigates, and the root layout's OWN reactive redirect effect (`app/_layout.tsx`) ALSO fires a
  `replace('/(auth)/login')` off the state flip alone, landing on the same route twice. **Control
  test, same pass:** the app's pre-existing, completely untouched "Log Out" button on Profile
  (`handleLogout: await logout(); router.replace('/(auth)/welcome');`) produces the SAME warning
  **twice** (its own extra explicit replace doubles it, exactly as the shipped birth-data code did).
  This is `authStore.logout()`'s own latent trait, shared by every caller in the app — not
  introduced here, and out of scope for a birth-data-only fix.
- **F3 · IMPORTANT — the design doc's D1 supersede note vouched for eight sections that were now
  false**, including §7's verification checklist, which instructed a pre-merge tester to confirm a
  dialog that no longer exists. **Fixed:** every stale section (§3's architecture rows and the whole
  module-boundary code block, §4's flow diagram and dialog sketch, two §5 failure-table rows, two
  §6 out-of-scope bullets, three §7 checklist bullets) is now marked 🔴 STALE inline at its own
  site, and D1's note itself names the full list rather than claiming to supersede D1 alone.
- **F5–F9, minor, all fixed this pass:** the `BackButton` gate literal now asserts the guard is
  NESTED inside `if (!onPress) { … }` (governs), not merely present — **defect-injected and
  confirmed it fails** when the guard is hoisted back out, per this repo's own `O-67` discipline;
  `handleBack` now wraps the sign-out branch in `try { … } finally { … }` plus a `backInFlight` ref
  double-tap guard; `profileFromIdToken` no longer returns an unread `email` field (its only reader
  was the deleted dialog); `owner-actions.md`'s `P115` now says the recovery path only exists for a
  PROFILE-LESS mis-tap (a second, already-onboarded account lands on home, no back button — recovery
  there is Profile → sign out) and reflects the corrected push/no-history split; `build-27-caveats.md`'s
  `C-GSI-1` pointed at `P113` where it meant `P114`, fixed; this file's own "five other call sites"
  (there are five total, four others) and "additive-only... Android already visits identically"
  (F1 disproves that — the shape is new on both platforms, not just additive) are corrected in the
  text below rather than repeated.

**`npx tsc --noEmit`**: 🟢 **mobile 0 / server 0**.
**`npm run gate`**: 🟢 **exit 0** (`Button · adoption` 29/29/0, `BackButton · adoption` 5/5/0 — the
new `onPress` prop and the widened literal assertion did not disturb the contract).
**`node scripts/resolve-utilities.js --diff`**: 🟢 **0 rule(s) moved, of 200 seen**, re-run after the
review-fix pass too (before/after snapshots across every edit to `app/(capture)/birth-data.tsx` and
`components/ui/BackButton.tsx`, both under a Tailwind content glob).
`--members`: 🟢 0 unresolved.
**`npm run web:export`**: 🟢 PASS (`verify-export`: 0 failures), re-run after the fix pass.
**Driven Chrome passes**: 🟢 see below — now including a dedicated push-path regression test that
was missing from the original pass (the review's own instruction: "drive the push path... that is
the regression, and it needs to be observed rather than reasoned about").

# 🟢 THE PREMISE IS CONFIRMED. THE PRIOR HANDOFF'S HEADLINE WAS RIGHT TO DOUBT IT AND IS NOW WRONG TO REPEAT.

The previous handoff opened with "THE PLAN'S PREMISE IS UNVERIFIED — DO NOT TRUST THE FIX UNTIL IT
IS," because every prior probe had run against a rejected origin (`http://localhost:8093`, HTTP 403,
`[GSI_LOGGER]: The given origin is not allowed for the given client ID.`) with no Google account
signed in anywhere in the environment. **That has since been resolved by the owner, not by this
session.** The owner ran the flow for real, on an authorised origin, with a signed-in Google test
account, and reported three specific observations — not a one-word reply this time:

1. the **"Continue as <name>" confirm dialog appeared before sign-in completed** — proving the
   credential hand-off out of Google's button and into `completeGoogleLogin` executed for real, not
   merely that a popup opened;
2. **dismissing the chooser and tapping the button again reopened it** — the exact premise the whole
   design rests on (button mode is exempt from the One Tap dismissal cooldown), confirmed by
   observation rather than by the popup-level-only substitute this branch's earlier sessions had to
   settle for;
3. **sign-in completed end to end.**

**Independent corroboration, from the branch review rather than from the owner's run:** FedCM's
dismissal embargo applies to *passive* mode (`google.accounts.id.prompt()`, the One Tap surface this
whole rewrite moved away from) — `renderButton` drives *active* mode, which is not subject to that
embargo. That is a mechanism-level reason to expect observation (2) to hold generally, not just on
the one run it was seen on.

`owner-actions.md`'s `P114` (the item that was hedging on the tunnel-origin workaround) is marked
**SUPERSEDED** with this same record, not closed silently — read it before assuming the origin
question is fully resolved; `P112` (get `localhost:8093` itself onto the authorised list, for
day-to-day local dev) is still open and is a separate, narrower thing from the premise question.

## 🔴 BUT DO NOT READ THAT AS COVERAGE OF WHAT THIS BRANCH NOW SHIPS

**The confirm dialog the owner's observation (1) is about has been REMOVED, THIS SESSION, by owner
decision.** The owner reversed the original call: no more "Continue as <name>" gate between the
chooser and the server call. Instead `/birth-data` gets a working back button that signs out and
clears Google's auto-select, making a mis-tapped account **recoverable after the fact** rather than
**gated up front**. The owner was told explicitly this is not a like-for-like swap — the server still
does `User.create` on first Google sign-in, so a mis-tapped account still creates a stray Revelia
account, it is simply no longer prevented — and accepted that trade. Do not re-argue it; see
`owner-actions.md`'s new `P115` and the design doc's D1 supersede note
(`.superpowers/sdd/2026-08-11-google-signin-account-reselection/`).

**So the fact that survives from the owner's run is narrower than "the dialog works": it is that a
real credential reaches `completeGoogleLogin` and completes sign-in, on an authorised origin, with
button-mode's reopen-on-redismiss behaving as designed.** That is exactly the half this session was
able to re-verify independently — see below — using a stand-in for Google's SDK rather than a real
account, since no signed-in Google account exists in this sandboxed environment either.

## WHAT LANDED (12 commits total, on top of the branch's original 5 — this handoff covers the last 7)

| commit | what |
|---|---|
| `3bf98b2` | **Confirm dialog removed (web only).** `GoogleSignInButton.web.tsx` calls `completeGoogleLogin` directly on a credential; `confirmGoogleAccount` deleted from `lib/googleSignIn.web.ts`; `signOutGoogle` kept (export-parity set). `profileFromIdToken`'s doc comment corrected — it no longer claims the decoded fields are confirm-dialog-only; `name` does travel to the server. |
| `4815722` | **`/birth-data`'s back button made functional** (first pass — F1/F2 below are what a review found wrong with it). `BackButton.tsx` gained an optional `onPress`. `birth-data.tsx` wired it to `logout()` + `signOutGoogle()` + `router.replace('/(auth)/welcome')`, unconditionally. |
| `0e85cf2` | Docs + registers for the first pass (`GOOGLE_SIGNIN_WEB_SETUP.md` §5, design doc D1 note v1, `P113`/`P114`/`P115`). |
| `8028720` | **F1 (CRITICAL) + F2 (IMPORTANT) + F6.** `birth-data.tsx`'s `handleBack` now checks `router.canGoBack()` FIRST — true is an unconditional plain `router.back()`; only `false` (no history) runs the sign-out path, now `signOutGoogle()` THEN `logout()` (not after — logout() navigates on its own), wrapped in `try { … } finally { … }` behind a `backInFlight` double-tap guard. `BackButton.tsx`'s header comment corrected to stop claiming `birth-data` "never has anything to pop." |
| `d9000f0` | **F7.** `profileFromIdToken` drops the unread `email` field — its only reader was the deleted confirm dialog. |
| `2d3cd98` | **F5.** `primitive-adoption-check.js`'s `BackButton` literal now asserts the guard is NESTED inside `if (!onPress) { … }` (governs), not merely present anywhere in the file — defect-injected (hoisted the guard back out) and confirmed the new assertion fails where the old one would have stayed green. |
| *(this commit)* | **F3, F8, F9, this file's two flagged inaccuracies.** Design doc: every stale section named inline, not just D1's note. `owner-actions.md` `P115`: corrected destination + the profile-less-only caveat. `build-27-caveats.md` `C-GSI-1`: `P113`→`P114`. This file, rewritten below. |

## WHAT IS VERIFIED vs. WHAT STILL HAS NOT RUN AGAINST A REAL GOOGLE ACCOUNT

🟢 **F1's regression, driven live this pass — the review's own instruction ("drive the push path...
that is the regression").** Seeded an authenticated, FULLY ONBOARDED session (profile with
`birthData` + both images), loaded `/profile`, tapped "Update Birth Data" (a real `router.push` —
real browser history, unlike a cold `page.goto`), landed on `/birth-data` with the back arrow
visible, tapped it: **landed back on `/profile`, `POST /auth/logout` was NOT observed, "Update Birth
Data" was still there afterward (i.e. still signed in).** Screenshots:
`push-01-profile.png` / `push-02-birth-data-via-push.png` / `push-03-after-back.png` in the driver
scratchpad. This is the exact scenario F1 named as broken, now proven fixed rather than reasoned
about.

🟢 **The no-history path, re-verified after F2's fix.** Same cold-`page.goto('/birth-data')`,
authenticated, no profile yet, no history at all: back arrow renders, tapping it now lands on
**`/(auth)/login`** (not `/welcome` — that was the bug F2 fixed; `logout()`'s own destination now
stands), and `POST /auth/logout` IS observed. ⚠️ Corrected from the original pass, which said this
lands on `/welcome` — it does not, post-fix.

🟢 **Verified live in a driven Chrome session, against the REAL app tree** (expo-router, real
`authStore`, real `BackButton`, real `GoogleSignInButton.web.tsx`) **with only the Google-SDK and
backend network edges faked** (no real Google account exists in this sandbox; the GSI script itself
was intercepted and replaced with a stand-in that renders a clickable div and invokes the same
`initialize({callback})` Google's real script would, with a synthetic ID token):
- clicking the credential handler runs `completeGoogleLogin` **immediately** — no backdrop, no
  "Continue as…" text, no "Continue with this Google account" text appears at any point;
- `POST /api/auth/google` fires with body `{"idToken":"…","name":"Ada Lovelace"}` — `name` really
  does travel to the server, matching the corrected `profileFromIdToken` comment;
- the sign-out path, run with `window.google` never having been loaded on that route at all (no
  `GoogleSignInButton` mounts on `/birth-data`), threw nothing — the email/Apple-user edge case the
  brief called out survives by construction, not by luck.

🟢 **F2's residual, root-caused rather than left as an open question.** One
`[GSI_LOGGER]: initialize() is called multiple times` warning still fires on the no-history path.
Traced to `app/_layout.tsx`'s OWN reactive redirect effect double-firing a `replace` to `/login`
alongside `logout()`'s own explicit one (both react to the same `isAuthenticated` flip). **Control
test:** the app's pre-existing, untouched Profile "Log Out" button produces the SAME warning
**twice** (its own second explicit `replace('/welcome')` doubles it). Confirmed pre-existing to
`authStore.logout()`, shared by every caller, not introduced by this branch, out of scope to fix here.

🔴 **Still never run against a REAL signed-in Google account, by this session or any prior one**:
the actual GSI script's own FedCM behaviour (this session's stand-in proves our code's reaction to a
credential, not Google's willingness to hand one out) — that half is the owner's observation above,
not a re-derivation of it.

🔴 **Android smoke still outstanding** (`P113`, widened this session). ⚠️ **Corrected from the
original pass, which called Part 2 "additive-only for a screen Android already visits identically" —
F1 disproved that.** `BackButton`/`birth-data.tsx` land the SAME new push-vs-no-history behaviour on
Android as on web (neither platform had a working control there before); it is new behaviour on
BOTH platforms, not an addition to an unchanged one. Part 1 (the confirm-dialog removal) remains
strictly web-only by construction. The pre-existing outline/label-colour change from the
`Button`-primitive convergence (prior sessions) is the other thing `P113` needs a device to confirm.

## NEXT STEP

1. Device smoke (`P113`) — the only hard blocker the SDD ledger's owner ruling named for merge.
2. `P112` (get `localhost:8093` itself authorised) is still open for anyone doing further local web
   testing, independent of the above.
3. `P115` (orphaned-account cleanup) is a real gap but explicitly out of scope for this branch — do
   not block merge on it; it needs its own server-side scoping.
4. Then: normal build/release cycle per `dev-notes/workflow.md`.

## ⚠️ CARRIED FORWARD, UNRELATED TO THIS SESSION

Everything the 2026-08-06 `build27.1-r9-qa-incident` handoff said about `fix/build-27.1` (the R9 QA
page-cap incident, `P108`–`P111`, the mobile device checklist) is a **different branch and different
tree** — untouched by this work and not superseded by it. Read that history in
`tracking_files/claude_progress.md` if picking that branch back up.

## 🧭 Register map (cumulative, this branch's whole google-signin-web pass)

| File | What it holds |
|---|---|
| `mobile/components/auth/GoogleSignInButton.web.tsx` · `mobile/lib/googleSignIn.web.ts` | confirm dialog removed (web only); `profileFromIdToken` doc corrected; `email` field dropped (F7) |
| `mobile/components/ui/BackButton.tsx` | optional `onPress`, guard-skip when supplied, byte-identical otherwise; header comment corrected (F1) to stop claiming `birth-data` has nothing to pop |
| `mobile/app/(capture)/birth-data.tsx` | `handleBack` checks `router.canGoBack()` FIRST (F1) — plain pop when true; `signOutGoogle()` then `logout()` (F2, order fixed, no extra `replace`), `try/finally` + double-tap guard (F6) when false |
| `mobile/scripts/primitive-adoption-check.js` | `BackButton`'s literal now asserts the guard is nested/governing, not merely present (F5) |
| `docs/GOOGLE_SIGNIN_WEB_SETUP.md` §5 | real fallback-copy string quoted verbatim; confirm-dialog description marked stale |
| `docs/superpowers/specs/2026-08-11-google-signin-account-reselection-design.md` | D1 supersede note, widened to name every stale downstream section (F3); each marked inline too |
| `owner-actions.md` | `P113` widened (outline/label-colour sentence) · `P114` superseded (owner's real observations) · `P115` corrected (F8 — profile-less-only, push-vs-no-history split). **Next free `P116`** |
| `build-27-caveats.md` | `C-GSI-1`'s `P113`→`P114` reference fixed (F9) |
| `.superpowers/sdd/2026-08-11-google-signin-account-reselection/followup-report.md` + a same-day review-fix addendum | full verification record for both passes — paste of every command's actual output |
