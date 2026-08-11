# Google Sign-In on the web PWA — Cloud Console runbook

**Scope:** enabling the "Sign in with Google" button in the **web** build (Expo Web / GSI).
Android native sign-in already works and is untouched by everything below.

**Status:** the code shipped in `e77c1ed`. **No further code change is needed.** What remains is a
Cloud Console change plus one build-time environment variable — that is all this document covers.

> Companion docs: `AUTH_SETUP_GUIDE.md` (original three-platform OAuth client creation),
> `plans/build-28/W1-web-pwa.md` (the web PWA plan; §"Google Sign-In" is step 2).

---

## 🔴 The one rule: use the EXISTING client. Do not create a new one.

The server validates the ID token's audience against a single client ID:

```ts
// server/src/services/auth.service.ts:431
const expectedAudience = process.env.GOOGLE_OAUTH_WEB_CLIENT_ID;
if (expectedAudience && tokenInfo.aud !== expectedAudience) {
  throw new Error('Invalid audience');
}
```

GSI on web returns the **same artifact** the Android SDK returns — a Google ID token — so one client
ID serves both front ends. A newly created "web app for the PWA" client would authenticate fine
against Google and then be rejected by our own backend with `Invalid audience`.

**The client ID** (`mobile/google-services.json`, `oauth_client` entry with `client_type: 3`):

```
530984023588-uq36tvq7gbbmrjobh4dc5m995rmpl75o.apps.googleusercontent.com
```

Not a secret — it is baked into every shipped client by design. Project number `530984023588`
matches GCP project **`revelia-497203`**.

---

## Step 1 — Add the Authorized JavaScript origins

1. Open <https://console.cloud.google.com/apis/credentials> and select project **`revelia-497203`**.
2. Under **OAuth 2.0 Client IDs**, click the **Web client** ending `…uq36tvq7gbbmrjobh4dc5m995rmpl75o`.
   **Edit it — do not create a new one.**
3. Under **Authorized JavaScript origins** → **+ ADD URI**, add each of:

| origin | why |
|---|---|
| `https://app.revelia.me` | the production PWA target (`W1-web-pwa.md:5`) |
| `https://revelia-web.pages.dev` | Cloudflare Pages default domain for project `revelia-web`. ⚠️ The Pages project itself is still an open owner action (`W1-web-pwa.md:1000`), so this host may not resolve yet — adding it now is harmless and saves a second trip |
| `http://localhost:8081` | `expo start --web` |
| `http://localhost:8093` | `npm run web:serve` — the local static server that mimics Cloudflare Pages |

4. **Save.** Google's own note: changes take 5 minutes to a few hours to propagate.

### What NOT to touch

**Leave "Authorized redirect URIs" alone.** This is the GSI **ID-token** flow
(`google.accounts.id.initialize` + `.prompt`) — there is no redirect leg. Redirect URIs belong to the
server-side authorization-code flow, which this app does not use.

### Rules that bite

- Exact **scheme + host + port**. No path, no trailing slash. `http://localhost:8093` and
  `http://localhost:8081` are two different origins.
- **No wildcards.** Cloudflare *preview* deploys get random subdomains
  (`https://<hash>.revelia-web.pages.dev`) and therefore **can never be authorized**. Test Google
  Sign-In on the custom domain or on localhost only.

---

## Step 2 — Confirm the consent screen is published

**APIs & Services → OAuth consent screen.** If publishing status is **Testing**, only listed test
users can sign in; everyone else gets `access_denied`.

Android Google Sign-In is already live in production, so this is almost certainly already
**In production**. **Verify — do not change it.**

---

## Step 3 — Get the client ID into the web bundle

The web fork reads the variable at **module scope**, so it is baked at **export time**, not read at
runtime:

```ts
// mobile/lib/googleSignIn.web.ts:19
const CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
```

### Local

Create `mobile/.env`:

```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=530984023588-uq36tvq7gbbmrjobh4dc5m995rmpl75o.apps.googleusercontent.com
```

Then rebuild **with a cleared Metro cache** and serve:

```sh
cd mobile
npm run web:export:clear
npm run web:serve
```

🔴 **Use `:clear` the first time.** `e77c1ed` records this exact trap: *"the client ID did not reach
the bundle until `--clear`."* A stale Metro cache ships a bundle with an empty client ID and no
warning — the same class of silent failure `verify-export.js` guards for on `apiUrl`.

### Deploy

`web:deploy` is `npm run web:export && npx wrangler pages deploy dist --project-name revelia-web`
(`mobile/package.json:17`) — **the export runs on the developer's machine.** The variable must exist
in **the shell that runs the command**.

🔴 **Setting it in the Cloudflare Pages dashboard does nothing**, because Cloudflare never builds the
bundle. Same for the other two export-time bakes (`W1-web-pwa.md:1000`).

---

## Step 4 — Server: nothing to change, one thing to check

`GOOGLE_OAUTH_WEB_CLIENT_ID` on Railway must equal the client ID above. It already does for
production — Android sign-in works, which proves it.

⚠️ **But the current web export bakes the STAGING API** (`mobile/app.json:109` →
`https://revelia-staging.up.railway.app/api`), so check the variable exists on the **staging** service
too.

⚠️ **Note the failure mode if it is unset:** the guard is `if (expectedAudience && …)`, so an unset
variable **skips the audience check entirely**. Sign-in would appear to work while validating nothing.
Unset is not a safe default here.

---

## Step 5 — Verify

**🔴 Superseded 2026-08-11 (twice — read both).** The rows below originally described the One Tap
(`prompt()`) implementation; that code was already deleted once this table was first corrected, in
favour of Google's own rendered button (`mountGoogleButton` in `lib/googleSignIn.web.ts`). **A second
change landed the same day, by owner decision: the confirm dialog that first correction still
describes (`confirmGoogleAccount`, "Continue as <name>" before any server call) has been REMOVED.**
On a credential, `GoogleSignInButton.web.tsx` now calls `completeGoogleLogin` directly — there is no
confirmation step between the chooser and the server call. A mis-tapped account is recoverable
afterward (a working back button on `/birth-data`) rather than gated up front. See
`.superpowers/sdd/2026-08-11-google-signin-account-reselection/` for the design record and its D1
supersede note. The table below is corrected again to match what actually happens now.

Load `http://localhost:8093/login`, click **Sign in with Google**, and watch the DevTools console.

| what you see | what it means |
|---|---|
| Google's button renders and a click opens a popup at `accounts.google.com` | 🟢 done — the button mounted and Google accepted the click |
| Google's button renders, a click opens a popup, **but the console shows** `error: [GSI_LOGGER]: The given origin is not allowed for the given client ID.` **and an HTTP 403 on** `https://accounts.google.com/gsi/button?...` | the origin is not on the authorised list yet, or has not propagated. Re-check step 1. 🔴 **The button still renders and the popup still opens — neither one is gated on authorisation.** What never happens is a credential: `onCredential` is simply never called, `completeGoogleLogin` never runs, and **there is no error shown to the user and no timeout.** Measured on this machine 2026-08-11 against `http://localhost:8093`, which is not yet on the authorised-origins list — see `P112` / `P113` in `owner-actions.md`. |
| the fallback control renders instead of Google's button, and pressing it shows a **"Sign In Unavailable"** alert reading **"Google Sign In is not available in this browser. Please use another sign-in method."** | `mountGoogleButton` itself rejected — the GSI script failed to load, or no client ID reached the bundle (see the next row). ⚠️ These are the exact title/body strings as written in `GoogleSignInButton.web.tsx`'s `MOUNT_FAILURE_TITLE`/`MOUNT_FAILURE_BODY`. They are close to, but NOT, the native copy — `login.tsx`/`welcome.tsx` show "Google Sign In is unavailable. Please try again or use another sign-in method." on a native Google failure, which does not exist on web at all. Match the web string above, never the native one. |
| **"No Google client ID — EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID not set"** | the `.env` did not reach the bundle. Re-export with `:clear` (step 3) |
| Google succeeds, then the app shows a network/CORS error | see the adjacent blocker below — not an OAuth problem |

### The two-minute spinner no longer exists

The One Tap implementation had a 120-second backstop (`googleSignIn.web.ts:101` in the old code)
because `prompt()` could fail internally on an unauthorised origin and call neither callback, leaving
a promise that would never settle. **That backstop, and the `prompt()` call it was protecting, are
both deleted.** Nothing is awaited across Google's UI in the button-mode implementation — the button
is Google's own DOM element, rendered synchronously or not at all, and a click either opens a real
popup or (if the button never mounted) triggers the fallback's `showAlert`. There is no multi-minute
wait state to reproduce, and if you see one, the deployed code is stale.

**The corollary is the row above:** on an unauthorised origin the failure has no backstop to surface
it, because there is nothing left in this design that runs for two minutes waiting to time out. It is
silent by construction, not slow-then-loud. See `build-27-caveats.md` for the standing caveat.

---

## ⚠️ Adjacent blocker — CORS, not OAuth

`W1-web-pwa.md:41` records a measured preflight against the live API:
`https://revelia.me` → `access-control-allow-origin` present; **`https://app.revelia.me` → header
absent.**

So once Google Sign-In succeeds on the deployed origin, the `POST /api/auth/google` that follows will
be blocked by the browser until `https://app.revelia.me` is added to the API's CORS allow-list. That
is `W1-web-pwa.md:1036`, still open. **Fixing OAuth alone will not make sign-in work in production.**

---

## Code references

| what | where |
|---|---|
| web GSI fork (reads the variable, owns the backstop) | `mobile/lib/googleSignIn.web.ts` |
| native fork (parity asserted by `scripts/web-fork-check.js`) | `mobile/lib/googleSignIn.ts` |
| store guard that gates the button per platform | `mobile/store/authStore.ts` → `loginWithGoogle` |
| server-side token verification + audience check | `server/src/services/auth.service.ts:422` |
| the client ID, as shipped | `mobile/google-services.json` (`client_type: 3`) |
| the commit that enabled web | `e77c1ed` — read its body; it documents both gates and the failure modes |
