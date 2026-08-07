# Getting started

## Prerequisites

Node 20, npm. No root workspace — install per subproject.

```sh
cd server && npm install
cd mobile && npm install
```

## Environment

Copy `server/.env.example` → `server/.env` and `mobile/.env.example` → `mobile/.env`, fill values. Full variable table (and the commonly-confused names): `environment.md` + the table in `CLAUDE.md`.

## Run

```sh
cd server && npm run dev          # local backend
cd mobile && npx expo start       # Expo dev client
```

Note: several features only work on a Play-signed build, not in dev — RevenueCat billing, Google Sign-In (Play app-signing SHA-1), and push delivery (FCM baked in at build time).

## Verify (run after every code change)

```sh
cd mobile && npx tsc --noEmit
cd server && npx tsc --noEmit
```

Both are kept at zero errors.

## Build & release

```sh
cd mobile && eas build --platform android --profile preview     # APK, internal testing
cd mobile && eas build --platform android --profile production  # AAB, Play Store (versionCode auto-increments)
```

Flow: tsc → commit → EAS production build → Play Internal Testing → promote the **same AAB** to Production → merge to `main`. Backend: merge to `main` → Railway auto-deploys → check `/api/health`. Details: `dev-notes/workflow.md`.

## Session-based AI workflow

Every Claude Code session starts by reading `tracking_files/session_handoff.md` (current state + next step); `CLAUDE.md` holds permanent conventions and gotchas.
