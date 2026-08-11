# Session Handoff — Revelia

> **HOW TO USE**: When a session ends, the outgoing session overwrites the "CURRENT HANDOFF" block below. The incoming session reads it, then checks `claude_progress.md` for full current-build history. Keep this file compact — just enough for a cold-start pickup.

---

## CURRENT HANDOFF

**Written by**: `google-signin-web-followup` | 2026-08-11
**Branch**: `fix/google-signin-web` (cut from `master` at `50e174a`, NOT `fix/build-27.1`) —
8 commits, tree otherwise clean (one unrelated, unstaged `mobile/public/sw.js` timestamp bump from
running `web:export` during verification — not committed, same as every prior session on this
branch). **NOT YET MERGED.**
**`npx tsc --noEmit`**: 🟢 **mobile 0 / server 0**.
**`npm run gate`**: 🟢 **exit 0** (`Button · adoption` 29/29/0, `BackButton · adoption` 5/5/0 — the
new `onPress` prop did not disturb the contract).
**`node scripts/resolve-utilities.js --diff`**: 🟢 **0 rule(s) moved, of 200 seen** (before/after
snapshots taken across this session's edits to `app/(capture)/birth-data.tsx`,
`components/auth/GoogleSignInButton.web.tsx`, `components/ui/BackButton.tsx`,
`lib/googleSignIn.web.ts` — all four are under a Tailwind content glob).
`--members`: 🟢 0 unresolved.
**`npm run web:export`**: 🟢 PASS (`verify-export`: 0 failures).
**Driven Chrome pass**: 🟢 see below — this is the first session on this branch where the credential
path and the back button were actually exercised live, not just read.

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

## WHAT LANDED THIS SESSION (3 commits, on top of the branch's existing 5)

| commit | what |
|---|---|
| `3bf98b2` | **Confirm dialog removed (web only).** `GoogleSignInButton.web.tsx` calls `completeGoogleLogin` directly on a credential; `confirmGoogleAccount` deleted from `lib/googleSignIn.web.ts`; `signOutGoogle` kept (export-parity set). `profileFromIdToken`'s doc comment corrected — it no longer claims the decoded fields are confirm-dialog-only; `name` does travel to the server. |
| `4815722` | **`/birth-data`'s back button made functional.** `BackButton.tsx` gained an optional `onPress` that, when supplied, skips the `canGoBack()` guard entirely (byte-identical when omitted — the literal `if (!router.canGoBack()) return null;` is unchanged, five other call sites unaffected). `birth-data.tsx` wires it to `logout()` + `signOutGoogle()` (wrapped in try/catch at the call site — the native fork's `signOutGoogle` is not defensive on its own) + `router.replace('/(auth)/welcome')`. |
| *(this commit)* | **Docs + registers.** `docs/GOOGLE_SIGNIN_WEB_SETUP.md` §5: fixed the fallback-copy string — web's real copy is "Sign In Unavailable" / "Google Sign In is not available in this browser…", which the doc had wrong (it quoted the DIFFERENT native copy, "Google Sign In is unavailable. Please try again…", `login.tsx`/`welcome.tsx`'s string) — and marked the confirm-dialog description stale. Design doc's D1 gets a dated supersede note. `owner-actions.md`: `P113` widened (secondary variant also drops the outline and turns the label gold — both AA, both expected), `P114` superseded with this record, new `P115` (orphaned-account cleanup — cause, not yet a fix). This file. |

## WHAT IS VERIFIED vs. WHAT STILL HAS NOT RUN AGAINST A REAL GOOGLE ACCOUNT

🟢 **Verified live in a driven Chrome session this session, against the REAL app tree** (expo-router,
real `authStore`, real `BackButton`, real `GoogleSignInButton.web.tsx`) **with only the Google-SDK
and backend network edges faked** (no real Google account exists in this sandbox; the GSI script
itself was intercepted and replaced with a stand-in that renders a clickable div and invokes the
same `initialize({callback})` Google's real script would, with a synthetic ID token):
- clicking the credential handler runs `completeGoogleLogin` **immediately** — no backdrop, no
  "Continue as…" text, no "Continue with this Google account" text appears at any point;
- `POST /api/auth/google` fires with body `{"idToken":"…","name":"Ada Lovelace"}` — `name` really
  does travel to the server, matching the corrected `profileFromIdToken` comment;
- navigating straight to `/birth-data` as an authenticated-but-no-profile-yet user (seeded via
  localStorage + mocked `/auth/me` + `/profile` 404) renders the "Tell us about yourself" screen
  **with a visible back arrow** — before this session that control rendered `null` there, because the
  real route is reached via two `router.replace()`s with no history;
- clicking it navigates to `/(auth)/welcome` and a `POST /auth/logout` is observed — `logout()` ran;
- the same click, run with `window.google` never having been loaded on that route at all (no
  `GoogleSignInButton` mounts on `/birth-data`), threw nothing — the email/Apple-user edge case the
  brief called out survives by construction, not by luck.

🔴 **Still never run against a REAL signed-in Google account, by this session or any prior one**:
the actual GSI script's own FedCM behaviour (this session's stand-in proves our code's reaction to a
credential, not Google's willingness to hand one out) — that half is the owner's observation above,
not a re-derivation of it.

🔴 **Android smoke still outstanding** (`P113`, widened this session): no device available. The
Google button on all three auth screens is unchanged by this session's work (Part 1 was web-only by
construction — `GoogleSignInButton.web.tsx` and `lib/googleSignIn.web.ts` do not ship on Android; Part
2's `BackButton`/`birth-data.tsx` changes are cross-platform but additive-only for a screen Android
already visits identically otherwise). The pre-existing outline/label-colour change from the
`Button`-primitive convergence (prior sessions) is still what needs a device to confirm, now with one
more sentence in `P113` about what to expect.

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

## 🧭 Register map (this session's changes)

| File | What it holds |
|---|---|
| `mobile/components/auth/GoogleSignInButton.web.tsx` · `mobile/lib/googleSignIn.web.ts` | confirm dialog removed (web only); `profileFromIdToken` doc corrected |
| `mobile/components/ui/BackButton.tsx` | optional `onPress`, guard-skip when supplied, byte-identical otherwise |
| `mobile/app/(capture)/birth-data.tsx` | wires the back button to `logout()` + `signOutGoogle()` (try/catch at call site) + `router.replace('/(auth)/welcome')` |
| `docs/GOOGLE_SIGNIN_WEB_SETUP.md` §5 | real fallback-copy string quoted verbatim; confirm-dialog description marked stale |
| `docs/superpowers/specs/2026-08-11-google-signin-account-reselection-design.md` | D1 supersede note (dated, appended, history not rewritten) |
| `owner-actions.md` | `P113` widened (outline/label-colour sentence) · `P114` superseded (owner's real observations) · 🆕 `P115` (orphaned-account cleanup). **Next free `P116`** |
| `.superpowers/sdd/2026-08-11-google-signin-account-reselection/followup-report.md` | this session's full verification record — paste of every command's actual output |
