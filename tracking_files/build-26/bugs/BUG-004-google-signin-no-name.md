# BUG-004 — Google Sign-In creates users with no name

**Severity**: HIGH
**Area**: Mobile + Server / Auth (Phase 1)
**Phase introduced**: build26-phase1-google session (2026-06-15)
**Status**: OPEN — requires decision (see Options below)

---

## Root cause

`verifyGoogleToken` in `server/src/services/auth.service.ts` calls:

```
https://oauth2.googleapis.com/tokeninfo?id_token=<idToken>
```

The `tokeninfo` endpoint only returns claim fields: `aud`, `sub`, `email`, `email_verified`, `exp`. It does **not** return `name`, `given_name`, `family_name`, or `picture`.

The `loginWithGoogle` service method creates new users via `User.create({...})` with no `name` field — because the service never has access to it. Every new Google user gets the email local-part as their display name throughout the app.

The mobile SDK (`@react-native-google-signin/google-signin`) **does** return the user's full name in the `GoogleSignin.signIn()` result object (`userInfo.user.name`, `userInfo.user.givenName`, `userInfo.user.familyName`). This data is available in `mobile/lib/googleSignIn.ts` — it is currently discarded.

## Impact

- All new Google Sign-In users have no display name set on the User document.
- Any in-app profile display, personalization, or greeting that uses `user.name` falls back to the email local-part (e.g., "john.doe" instead of "John Doe").
- Existing Apple Sign-In users do get their name correctly (Apple sends it in the identity token).

## Affected files

| File | Role |
|------|------|
| `mobile/lib/googleSignIn.ts` | Discards `userInfo.user.name` from SDK response |
| `mobile/lib/api.ts` | `loginWithGoogle(idToken)` — no `name` param |
| `mobile/store/authStore.ts` | `loginWithGoogle()` — calls API with only `idToken` |
| `server/src/services/auth.service.ts` | `loginWithGoogle(idToken)` — no `name` param; `User.create` has no `name` |
| `server/src/controllers/auth.controller.ts` | `googleAuthSchema` — only validates `idToken` |

## Options

### Option A — Pass name from mobile (recommended)

The mobile SDK already has the name. Thread it through to the server as an optional field.

**Pros**: No extra network call; works offline; server stays simple.  
**Cons**: Caller-supplied — a malicious client could send any name. Acceptable since this is the same pattern Apple Sign-In uses.

**Changes:**
1. `mobile/lib/googleSignIn.ts` — return `{ idToken, name: userInfo.user.name ?? '' }` from `signInWithGoogle()`
2. `mobile/lib/api.ts` — `loginWithGoogle(idToken: string, name: string)`; body: `{ idToken, name }`
3. `mobile/store/authStore.ts` — destructure `{ idToken, name }` from `signInWithGoogle()`; pass `name` to `authAPI.loginWithGoogle(idToken, name)`
4. `server/src/controllers/auth.controller.ts` — add `name: z.string().optional()` to `googleAuthSchema`
5. `server/src/services/auth.service.ts` — `loginWithGoogle(idToken: string, name?: string)`; add `name` to `User.create({...})` call

### Option B — Fetch profile from Google userinfo endpoint (server-side)

Switch from `tokeninfo` to `https://oauth2.googleapis.com/oauth2/v3/userinfo` with `Authorization: Bearer <idToken>`.

**Pros**: Canonical Google-side source of truth.  
**Cons**: Extra HTTP call per sign-in; the idToken is not technically an access token — the userinfo endpoint requires an OAuth access token, not an idToken. This would require returning an access token from the mobile SDK as well (the SDK does provide it). More complex.

**Verdict**: Option A is simpler and consistent with how Apple Sign-In is implemented in this codebase.

## Decision needed

User must choose Option A or Option B before this bug is fixed.

## Verification (after fix)

- Sign in with a fresh Google account.
- Check the created `User` document in MongoDB — confirm `name` field is populated with the Google display name.
- Navigate to Profile screen — confirm the user's name appears correctly.
