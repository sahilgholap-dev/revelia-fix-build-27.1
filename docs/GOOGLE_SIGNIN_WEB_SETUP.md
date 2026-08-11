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

Load `http://localhost:8093/login`, click **Sign in with Google**, and watch the DevTools console.

| what you see | what it means |
|---|---|
| Google account chooser appears | 🟢 done |
| `[GSI_LOGGER]: FedCM get() rejects with NetworkError`, then ~2 minutes of nothing, then **"Google Sign-In did not respond… this site is not authorised"** | the origin is not on the list yet, or has not propagated. Re-check step 1 |
| **"No Google client ID — EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID not set"** | the `.env` did not reach the bundle. Re-export with `:clear` (step 3) |
| Google succeeds, then the app shows a network/CORS error | see the adjacent blocker below — not an OAuth problem |

### Why the two-minute wait exists

When the origin is unauthorized, **GSI fails internally and calls neither callback** — the promise
would never settle, and the button would be dead with no error. `googleSignIn.web.ts:101` installs a
120-second backstop that guarantees the promise ends and names the likely cause. It is generous on
purpose: the account chooser is a human interaction and must not be cut off mid-decision. **A slow
answer here is the designed behaviour, not a hang.**

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
