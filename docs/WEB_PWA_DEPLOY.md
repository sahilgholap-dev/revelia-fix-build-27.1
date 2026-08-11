# Deploy the web PWA to `app.revelia.me`

Cloudflare Pages. Run everything from `mobile/`.

---

## 1. Log in to Wrangler

```sh
cd mobile
npx wrangler login
```

Browser opens → **Allow**.

## 2. Deploy

```sh
npm run web:deploy
```

🟢 **The `revelia-web` project already exists** (created 2026-08-11, production branch `master`), so there is no prompt — this just deploys. Live at `https://revelia-web.pages.dev`.

Creating it from scratch again, if it were ever deleted:

```sh
npx wrangler pages project create revelia-web --production-branch=master
```

Each deploy also prints a one-off `https://<hash>.revelia-web.pages.dev` for that build. Useful for checking a specific deploy; **never** the thing you point DNS at.

## 3. Add the subdomain

Cloudflare dashboard → **Workers & Pages** → **revelia-web** → **Custom domains** → **Set up a domain** → enter `app.revelia.me` → **Continue**.

🔴 **The DNS record is NOT created for you.** `revelia.me` is registered at **Namecheap**, and its nameservers do not point at Cloudflare — so Cloudflare shows a CNAME target and waits for you to create it there.

Namecheap → **Domain List** → `revelia.me` → **Manage** → **Advanced DNS** → **Add New Record**:

| field | value |
|---|---|
| Type | `CNAME Record` |
| Host | `app` |
| Value | `revelia-web.pages.dev` |
| TTL | Automatic |

⚠️ A **CNAME Record**, not a "URL Redirect Record" — a redirect breaks HTTPS and PWA install.

⚠️ Point it at `revelia-web.pages.dev`, the project alias — **never** at a deployment URL like `21bb59e0.revelia-web.pages.dev`. Every deploy mints a new hash, so that record would go stale immediately.

> Moving the whole zone to Cloudflare would make this automatic, but it migrates all of `revelia.me`'s DNS at once — including `api.revelia.me` and the SendGrid MX/SPF/DKIM records. A missed MX record stops OTP codes and report emails silently. That deserves its own window, not a test deploy.

## 4. Authorize the origin for Google Sign-In

Cloud Console → **APIs & Services** → **Credentials** → the Web client ending `…uq36tvq7gbbmrjobh4dc5m995rmpl75o` → **Authorized JavaScript origins** → add both:

```
https://app.revelia.me
https://revelia-web.pages.dev
```

**Save.** Allow ~5 minutes to propagate.

> Full OAuth detail lives in `GOOGLE_SIGNIN_WEB_SETUP.md`. Do not create a new client — the server checks the token's audience against this one.

## 5. Test

Open `https://app.revelia.me` → install as a PWA → sign in with Google.

## Re-deploying

```sh
cd mobile && npm run web:deploy
```

---

## 🔴 The `node_modules` trap — solved, but know it exists

**Cloudflare Pages silently refuses to upload any file under a `node_modules` directory.** Expo's web export writes every vendored asset to a path mirroring its source, so `@expo/vector-icons`' fonts and the react-navigation / expo-router images all landed under `dist/assets/node_modules/…` and **none of them reached the CDN.** Every icon in the app was invisible on the deployed site while working locally and on Android.

**The symptom points away from the cause.** The request does not 404 — `_redirects` rewrites `/*` to `index.html` with a **200**, so the browser asks for a TTF and is handed HTML, fails to parse it, and draws nothing. Measured 2026-08-11:

| URL | response |
|---|---|
| `/assets/assets/fonts/Figtree-Regular.…ttf` | `200 · font/ttf · 51,384 B` ✅ |
| `/assets/node_modules/…/Ionicons.…ttf` | `200 · text/html · 4,037 B` ❌ |

Same file type, same `/assets/` root — the `node_modules` segment is the whole difference.

**Fixed by `mobile/scripts/flatten-vendor-assets.js`**, which runs between `expo export` and `verify-export`. It moves `assets/node_modules/` → `assets/vendor/` and rewrites the references — both halves, because a moved file with a stale reference is just as dead and reads as present.

**`verify-export`'s assertion 6 is what keeps it fixed:** it fails the export if anything ships under a `node_modules` path or still references one. A future Expo version renaming that directory, a new vendored asset, or the script dropping out of the chain all fail loudly instead of shipping invisible icons.

**If icons ever vanish on a deploy again**, check the upload count first — a correct deploy uploads **55** files. Before the fix it uploaded 19.

## Three things that will bite

**1 · `mobile/.env` must exist before step 2.**

```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=530984023588-uq36tvq7gbbmrjobh4dc5m995rmpl75o.apps.googleusercontent.com
```

`web:deploy` runs `web:export` **on your machine**, so the client ID is baked from your local shell. Setting it in Cloudflare's dashboard does nothing — Cloudflare never builds the bundle.

**2 · The build points at STAGING.** `app.json` → `extra.apiUrl` is `https://revelia-staging.up.railway.app/api`. Fine for testing, and CORS works because staging answers `access-control-allow-origin: *`.

⚠️ If you later repoint at production, `https://app.revelia.me` must first be added to the CORS allow-list in `server/src/config/production.ts` — it is not there today. Google Sign-In would succeed and then the API call would be blocked by the browser.

**3 · Preview deploys can never do Google Sign-In.** Cloudflare gives them random hostnames (`https://<hash>.revelia-web.pages.dev`) and Google's origin list takes no wildcards. Test sign-in on `app.revelia.me` or on localhost only.
