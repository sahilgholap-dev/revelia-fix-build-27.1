# Session Handoff — Revelia

> **HOW TO USE**: When a session ends, the outgoing session overwrites the "CURRENT HANDOFF" block below. The incoming session reads it, then checks `claude_progress.md` for full current-build history. Keep this file compact — just enough for a cold-start pickup.

---

## CURRENT HANDOFF

**Written by**: `google-signin-web-task5` | 2026-08-11
**Branch**: `fix/google-signin-web` (cut from `master` at `50e174a`, NOT `fix/build-27.1`) — 🟢 **5
commits, tree otherwise clean** (one unrelated, unstaged `mobile/public/sw.js` timestamp bump from
running `web:export` during verification — not committed). **NOT YET MERGED.**
**`npx tsc --noEmit`**: 🟢 **mobile 0 / server 0** (both re-run this session, zero output either way).
**`npm run gate`**: 🟢 **exit 0** (Button contract 29 expected / 29 actual / 0 residue; the
report-only `no-white-on-accent` hits are all pre-existing — none in `login.tsx`, `signup.tsx`,
`welcome.tsx`, or `GoogleSignInButton*`). **`web:export` / `verify-export`**: 🟢 PASS, re-run this
session. **`--diff`** not re-run this session and did not need to be — no file under a Tailwind
content glob changed since Task 4 last checked it at 0 rules moved.

# 🔴 THE PLAN'S PREMISE IS UNVERIFIED. DO NOT TRUST THE FIX UNTIL IT IS.

The whole design rests on one claim: **Google's rendered button is exempt from the One Tap dismissal
cooldown.** A probe (`gsi-probe.html`) was written specifically to test this and this ledger recorded
it as **PASS**. 🔴 **That record was wrong.** It was taken from the owner's one-word reply
("working"), not an observation, and re-measured independently later: the origin the probe ran
against (`http://localhost:8093`) returns `HTTP 403` and
`[GSI_LOGGER]: The given origin is not allowed for the given client ID.` **A rejected origin never
engages FedCM at all, so no cooldown was ever entered on that run — there was nothing to dismiss, and
the probe cannot have passed there.**

**The "popup reopens on repeated clicks" seen during implementation does NOT substitute.** It was
driven the same way, against the same rejected origin, with no Google account signed in anywhere in
this environment: click → Google's full sign-in form (never an account chooser, because there is no
account to choose) → close the popup → click again → a second, fresh popup. That proves button mode
has no *popup-level* cooldown of its own. It says nothing about whether FedCM's *account-chooser
dismissal* cooldown — the one One Tap suffers from, and the whole reason this design exists — also
applies to button mode, because that mechanism was never engaged, on any origin, by anyone, in this
entire piece of work. **Re-run the probe on an authorised origin, with a real signed-in Google test
account, before trusting the fix.**

⚠️ **One new, real data point, not a substitute for the above:** the Cloudflare quick-tunnel already
running in this environment (`https://revolution-shared-ivory-human.trycloudflare.com`, pointed at
this same `localhost:8093`) does **not** show the 403 — measured directly this session, same
`/gsi/button` request, 200 instead of 403, no origin-error console line, on all three auth routes.
This is **not proof the tunnel host is on the authorised list** (Cloud Console wasn't checked) and
the hostname is ephemeral — a new random subdomain on every tunnel restart, so it can't be added
permanently. But it is the one origin in this environment that GSI did not reject outright, so if a
signed-in Google account turns up before this tunnel process dies, try the real probe there first.
Full detail: `owner-actions.md` `P114`.

## WHAT LANDED (5 commits, Tasks 2-5 of the SDD plan under `.superpowers/sdd/2026-08-11-google-signin-account-reselection/`)

| commit | what |
|---|---|
| `f4d0d6e` | extract `GoogleSignInButton`, converge `login`/`signup`/`welcome` on the `Button` primitive (`login.tsx` had hand-rolled a `TouchableOpacity`) |
| `fa370db` | split `authStore.loginWithGoogle` into acquire + `completeGoogleLogin(idToken, name)` |
| `16c65dd` | web fork rewritten: One Tap `prompt()` and its 120s backstop **deleted**; replaced by Google's rendered button (`mountGoogleButton`) + a confirm dialog (`confirmGoogleAccount`) that runs before any server call |
| `e3e7e36` | 5 review findings closed: in-flight guard could latch forever if an unrelated `showAlert` stomped the confirm; `atob` mangled non-ASCII names; `disabled` didn't reach Google's real button; mount effect could stack buttons / render into a detached node; one copy string covered three unrelated failures |
| *(pending, this task)* | docs+registers: `docs/GOOGLE_SIGNIN_WEB_SETUP.md` §5 corrected, `build-27-caveats.md` (`C-GSI-1`), `owner-actions.md` (`P113`/`P114`), this file |

## WHAT IS VERIFIED vs. WHAT HAS NEVER RUN, ANYWHERE

🟢 tsc clean both packages · gate exit 0 across every commit's own check · `--diff` 0 rules moved ·
`web:export`/`verify-export` PASS · driven Chrome passes on all three routes, on both `localhost:8093`
and the tunnel: button renders, 0 page errors, click opens a real `accounts.google.com` popup,
close+re-click opens a fresh one (different session token) every time.

🔴 **No signed-in Google account existed anywhere in this work.** As a direct result, across five
commits and two review rounds, **none of the following has ever executed, in any environment**:
`confirmGoogleAccount`'s dialog rendering with a real name/email, a real credential reaching
`handleCredential`, `completeGoogleLogin`'s HTTP round-trip, or the app actually completing a sign-in
through this flow. Every claim about that half is a code read, disclosed as such in
`task-4-report.md` / `task-4-fix-report.md` — not an observation.

🔴 **Android smoke outstanding** (`P113`): `login.tsx`'s Google button gained the primitive's fixed
`lg` height, the one visible native change here — `tsc`/gate coverage only, no device.

## NEXT STEP

1. Owner: get `http://localhost:8093` (and a stable origin, not just the ephemeral tunnel) onto the
   OAuth client's authorised-origins list (`P112`/`P114`); have a signed-in Google test account ready.
2. Re-run the Task 1 premise probe for real — a genuine observation, not a one-word reply — against
   an origin that does not 403.
3. Only then: device smoke (`P113`) → normal build/release cycle per `dev-notes/workflow.md`.
4. Per the SDD ledger's owner ruling, this branch merges after the Android smoke — not before.

## ⚠️ CARRIED FORWARD, UNRELATED TO THIS SESSION

Everything the 2026-08-06 `build27.1-r9-qa-incident` handoff said about `fix/build-27.1` (the R9 QA
page-cap incident, `P108`–`P111`, the mobile device checklist) is a **different branch and different
tree** — untouched by this work and not superseded by it. Read that history in
`tracking_files/claude_progress.md` if picking that branch back up.

## 🧭 Register map (this session's changes)

| File | What it holds |
|---|---|
| `docs/GOOGLE_SIGNIN_WEB_SETUP.md` §5 | corrected failure-decode table; notes the two-minute spinner no longer exists |
| `build-27-caveats.md` | 🆕 `C-GSI-1` — the silent-origin-failure mechanism (owner-ruled: no code fix) |
| `owner-actions.md` | 🆕 `P113` (Android smoke) · `P114` (origin measurement + premise blocker). **Next free `P115`** |
| `.superpowers/sdd/2026-08-11-google-signin-account-reselection/` | full spec/plan/task ledger, including `progress.md`'s Task 1 correction |
