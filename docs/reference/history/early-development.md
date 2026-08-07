# Early development history (pre-Build-26)

Consolidates the root-level completion reports. Originals stay in place at repo root; this page is the index. All dated ~January 2026, before the Build-26/27 numbering existed — they describe the initial MVP sprint.

| File (repo root) | Milestone |
|---|---|
| `WEEK1_TASK1_COMPLETE.md` | Scaffolding: monorepo structure, Express+Mongo backend, Expo mobile app (then SDK 52 — now 53), shared types package, initial docs. |
| `WEEK1_TASK2_COMPLETE.md` | Auth system: email/password + Apple + Google sign-in, JWT, Zustand auth store. |
| `WEEK1_TASK3_COMPLETE.md` | Birth data + profile: zodiac/numerology calculations, profile endpoints and screens. |
| `WEEK1_TASK4_COMPLETE.md` | Camera capture + Cloudflare R2 upload: consent modal, face/palm capture flow, sharp image processing. |
| `WEEK2_TASK6_COMPLETE.md` | Reading display UI: 13 components, 4 screens, sharing, premium gates. |
| `REVELIA_MVP_COMPLETE.md` | MVP completion (2026-01-30): 12 tasks done; Claude Sonnet Vision readings; 3-tier pricing (Free / Premium $7.99 / Premium Plus $14.99). |

The legacy `docs/` folder (API, deployment, store checklists, monitoring, etc.) dates from this same pre-launch era — see `../README.md` for per-file staleness notes.

Timeline after the MVP: iOS submission rejected under 4.3(b) → Android-first pivot → builds culminating in **versionCode 26 live on Play Store production** (2026-06, see `../builds/build-26.md`) → Build 27 empirical-accuracy + Fable 5 work (2026-06/07, see `../builds/build-27.md`). Per-session history for shipped builds is archived under `tracking_files/build-NN/`.
