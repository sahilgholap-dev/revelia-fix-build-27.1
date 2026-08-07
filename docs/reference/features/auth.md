# Authentication

Three providers converge on a backend-issued JWT. All three flows live in `mobile/store/authStore.ts`; server verification in `server/src/services/auth.service.ts`.

- **Email + password + OTP** — signup requires email OTP (`EmailVerification` model, SendGrid). `/auth/verify-email` returns `verificationToken` at the **top level** of the response body (not `.data`) — mobile reads it via `(verifyResponse as any).verificationToken`; do not "fix" this (see CLAUDE.md).
- **Apple Sign-In** (iOS) — `fullName` only arrives on first sign-in; backend handles it. Verified via jwks.
- **Google Sign-In** (Android) — requires the **Play app-signing SHA-1** in Google Cloud Console (debug keystore SHA-1 → `DEVELOPER_ERROR`). Display name is threaded from the mobile SDK to the backend (tokeninfo returns no profile fields — fixed in build-26 BUG-004).

## Side-effect contract (every path)

Each successful login/signup **and** `checkAuth()` (app-launch restore) must call `loginOneSignalUser(user._id)` (push external_id) and `identifyUser(user._id)` (RevenueCat). Logout calls `logoutOneSignalUser()` + `logoutRevenueCat()`. Without the checkAuth hook, returning users would be unreachable by the push scheduler.

Rate limiting on auth/verification endpoints is IP+email keyed (express-rate-limit v8, `ipKeyGenerator`).
