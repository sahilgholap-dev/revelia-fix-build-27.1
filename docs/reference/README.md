# Revelia — Reference Docs

Structured, maintained documentation of the Revelia codebase, generated and updated by an AI documentation framework (see `.doc-framework-state.md` for run history). Unlike the legacy `docs/` folder, this set is kept current per build.

## Relationship to the legacy `docs/` folder

The pre-existing files directly under `docs/` (API.md, DEPLOYMENT.md, PRE_LAUNCH_CHECKLIST.md, etc.) are the **original pre-launch doc set from January 2026**. They are preserved untouched, but most are stale — written before Build 26 shipped and before the Build 27 empirical-accuracy work. Notable examples of drift: `docs/API.md` shows an old API domain, `docs/PROMPTS.md` predates the Fable 5 synthesis engine, `docs/BACKEND_DEPLOYMENT.md` still discusses Render (Railway is the sole production host). Treat legacy `docs/` as historical; treat this folder + `CLAUDE.md` + `tracking_files/` as current.

Evergreen exceptions in the legacy set: `PRIVACY_POLICY.md`, `TERMS_OF_SERVICE.md` (legal text, dated 2026-01-31), `SCREENSHOTS.md`, `VERSION_MANAGEMENT.md`.

## Organization

| Folder | Contents |
|---|---|
| `architecture/` | System overview, hosting/infrastructure, MongoDB data model |
| `server/` | Backend modules — routes, controllers, services, jobs, middleware |
| `mobile/` | App structure — screens, stores, lib wrappers |
| `packages/` | Shared TypeScript types package |
| `features/` | One doc per major feature (astrology/ephemeris, face extraction, palm extraction, numerology, synthesis engine, auth, push, subscriptions) |
| `builds/` | `build-26.md` (shipped baseline), `build-27.md` (in-progress delta), `changelog.md` (per-run log) |
| `history/` | Consolidated early-development history (WEEK*/MVP completion files at repo root) |
| `setup/` | Getting started + environment variables |

## Other authoritative sources (not duplicated here)

- `CLAUDE.md` — permanent conventions + hard-won gotchas (env var names, OneSignal/FCM, share/review invariants). **Gotchas live there, not here.**
- `tracking_files/session_handoff.md` + `claude_progress.md` — live session state for the current build.
- `plans/build-27.md` + `plans/build-27/RN-*.md` — deep per-requirement plans (R1–R8).
- `PROJECT_CONTEXT.md` — evergreen context file for web-based AI chats.
- `dev-notes/workflow.md` — the AI-collaboration and release-cycle workflow.
