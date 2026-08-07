# BUG-001 — `ipKeyGenerator` called with wrong argument

**Severity**: CRITICAL
**Area**: Server / Middleware
**Phase introduced**: build26-server-ratelimit-fix session (2026-06-16)
**Status**: OPEN

---

## Root cause

`express-rate-limit`'s `ipKeyGenerator` has signature `(ip: string, ipv6Subnet?: number | false): string`.

Both middleware files call it as `ipKeyGenerator(req)` — passing the full Express `Request` object instead of `req.ip`. JavaScript coerces the object to `"[object Object]"`, so every IP-keyed rate limit bucket becomes the shared key `"ip:[object Object]"`.

## Impact

- Per-IP rate limiting is completely non-functional in production.
- A single attacker can exhaust the entire shared bucket, effectively rate-limiting all users simultaneously.
- Conversely, any normal request without an email body (e.g. `POST /api/auth/apple`) can consume the shared bucket and lock out everyone else on the IP-keyed fallback path.
- The `skip` guard only exempts dev (`NODE_ENV === 'development'`), so this is live in production Railway.

## Affected files

| File | Line | Wrong call | Correct call |
|------|------|-----------|-------------|
| `server/src/middleware/auth-rate-limit.middleware.ts` | ~43 | `ipKeyGenerator(req)` | `ipKeyGenerator(req.ip ?? '')` |
| `server/src/middleware/verification-rate-limit.middleware.ts` | ~25 | `ipKeyGenerator(req)` | `ipKeyGenerator(req.ip ?? '')` |

## Fix

In both files, change:
```ts
return ipKeyGenerator(req);
```
to:
```ts
return ipKeyGenerator(req.ip ?? '');
```

## Verification

- Confirm TypeScript compiles with zero errors after change.
- In dev, set `NODE_ENV=production` temporarily and send two requests from the same IP — confirm rate limit correctly throttles on the third within the window.
