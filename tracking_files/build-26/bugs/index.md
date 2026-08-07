# Build-26 Bug Index

> Discovered: 2026-06-17 | Auditor: feature-dev:code-reviewer agent
> Branch: `feature/build-26`

## Summary

| ID | Severity | Area | Title | Status |
|----|----------|------|-------|--------|
| [BUG-001](BUG-001-rate-limiter.md) | CRITICAL | Server / Middleware | `ipKeyGenerator` called with wrong argument — all IPs collapse to one bucket | FIXED 2026-06-17 |
| [BUG-002](BUG-002-android-share-image.md) | HIGH | Mobile / Share | Share image silently dropped on Android | FIXED 2026-06-18 (improved: two-step Android share + captureRef fallback) |
| [BUG-003](BUG-003-readings-count-inflation.md) | HIGH | Mobile / In-app Review | `completedReadingsCount` inflates on every screen visit, not per completion | FIXED 2026-06-17 |
| [BUG-004](BUG-004-google-signin-no-name.md) | HIGH | Mobile + Server / Auth | Google Sign-In creates users with no name — tokeninfo endpoint returns no profile fields | FIXED 2026-06-17 |
| [BUG-005](BUG-005-review-trigger-no-guard.md) | MEDIUM | Mobile / In-app Review | Career + compatibility review triggers fire every app session — no ref guard | FIXED 2026-06-17 |

## Fix order

See [fix-sequence.md](fix-sequence.md) for the full sequenced plan.

Quick order: BUG-001 → BUG-005 → BUG-003 → BUG-002 → BUG-004
