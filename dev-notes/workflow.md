# Revelia — Working Workflow (AI collaboration + build/release)

> How the three actors (you, claude.ai web, Claude Code) collaborate, and the standard end-of-task build/release cycle. Reference this when starting or finishing any feature / fix / improvement.

---

## Part A — AI collaboration workflow (planning & building)

### Why the build-26 workflow changed for build-27

In build-26, planning happened on **claude.ai** (no repo access) and was handed to Claude Code to execute — fine for self-contained fixes.

Build 27 is code-heavy. R1 proved the limit: a good implementation plan **requires reading the actual code**. claude.ai, with only `PROJECT_CONTEXT.md`, would have planned "swap the astrology math engine" — and been wrong (it couldn't know there were two disconnected chart systems, or that readings only receive `sunSign`). Only Claude Code, exploring the repo, surfaced that.

**Rule for build-27:**
> **Code-grounded planning (the `plans/build-27/RN-*.md` docs) → Claude Code.**
> **Strategy / decisions / review / prompts / copy → claude.ai.**
> Deep per-requirement plans are authored by whoever can see the code — that's Claude Code, not claude.ai.

### The three roles

| Actor | Best at | Can't do |
|---|---|---|
| **You (dev/owner)** | Orchestrate, decide, own Sid/human gates, hold cross-session intent | — |
| **claude.ai web** | Strategy, pressure-testing a plan, trade-offs, pricing/positioning, disclosure/legal copy, drafting the next Claude Code prompt | **See the repo** — must defer code truth to Claude Code |
| **Claude Code (CLI)** | Explore code, author grounded `RN` plans, implement, run `tsc`/builds, update tracking files | Make product/business calls; resolve human gates |

### Which doc feeds which actor

| Doc | claude.ai | Claude Code |
|---|---|---|
| `PROJECT_CONTEXT.md` | ✅ always (paste first) | auto-known via `CLAUDE.md` |
| `plans/build-27.md` (index) | ✅ for scope/strategy | ✅ |
| `plans/build-27/RN-*.md` (deep plan) | ✅ to *review* one | ✅ authors + executes it |
| `tracking_files/session_handoff.md` | ✅ for "where are we" | ✅ reads at session start |
| `tracking_files/claude_progress.md` | optional (history) | ✅ |

### Per-requirement loop (e.g. R2)

1. **Claude Code: deep-plan** → explores the real code, writes `plans/build-27/R2-*.md` (grounded, like R1). *(Replaces the old "claude.ai writes the plan" step.)*
2. **claude.ai: review + decide** → paste `PROJECT_CONTEXT.md` + `build-27.md` + `R2-*.md`; ask it to pressure-test the approach, surface risks, resolve open design questions, and draft the kickoff prompt for Claude Code.
3. **You + Sid**: resolve the open questions / human gates the plan flagged.
4. **Claude Code: implement** from the RN doc as the spec — check off its checklist, run `tsc`, update tracking files.
5. Repeat for the next requirement.

### Your claude.ai habit (still valid, with one change)

- **Keep**: new chat in the Revelia project → paste `PROJECT_CONTEXT.md` + the current `session_handoff.md` / `claude_progress.md` + your question.
- **Add**: also paste the relevant `plans/build-27/RN-*.md` when the question is about that feature.
- **The one inversion**: don't ask claude.ai to author the deep implementation plan from scratch — have Claude Code write it (grounded) first, then use claude.ai to *review / decide / prompt*. When claude.ai needs a code fact, it should say "have Claude Code confirm X."
- **Prompts are simpler now**: a Claude Code kickoff is often just *"Implement R2 phase 1 per `plans/build-27/R2-*.md`; follow CLAUDE.md conventions; tsc clean; update tracking files."* — the RN doc carries the detail prompts used to.

### Part A — concise flow

```
claude.ai = strategist + reviewer + prompt-writer + copy
Claude Code = code-grounded planner + implementer
You = orchestrator + decider + gates

Per requirement:
  Claude Code writes RN plan (grounded in code)
   → claude.ai reviews / resolves design Qs / drafts kickoff prompt
   → you + Sid resolve gates
   → Claude Code implements from the RN doc
   → tracking files updated
```

---

## Part B — End-of-task build / release cycle

Run this at the end of every feature / fix / improvement / chore.

### Standard cycle

1. **Typecheck** — `cd mobile && npx tsc --noEmit` and `cd server && npx tsc --noEmit` (both must be clean).
2. **Inspect** — `git status` → `git diff` (when you want to review the changes).
3. **Stage** — `git add <relevant files>` (stage intentionally, not blind `-A`).
4. **Commit** — `git commit -m "<conventional message>"`.
5. **Push** — `git push` (when saving/maintaining the work remotely).
6. **Build** —
   - `eas build --platform android --profile preview` (APK) for quick testing, **OR**
   - `eas build --platform android --profile production` (AAB) when the feature needs a Play-signed build — RevenueCat billing, Google Sign-In, and push only behave correctly on a Play-signed build, not a sideloaded APK.
7. **Internal testing** — upload to the Play Console Internal Testing track; run the usual test pass with the team.
8. **Decide** —
   - **Works perfectly** → promote the **same AAB** to Production (never rebuild between tracks) and **merge the PR to `main`**.
   - **Not perfect** → re-enter the build cycle (below).

### Re-build cycle (when internal testing finds issues)

```
fix / improve / chore
 → npx tsc --noEmit (mobile + server) — clean
 → git add <files> → git commit -m "..."
 → (push if saving)
 → eas build --platform android --profile production
 → upload to Internal Testing → re-test
 → if perfect: promote same AAB to Production + merge PR to main
 → if not: repeat
```

### Backend note

Backend changes deploy separately: commit to `main` → Railway auto-deploys (watch the Deployments tab) → verify `api.revelia.me/api/health`. Mobile feature branches merge to `main` only at release.

⚠️ **Single live-production backend — there is NO pre-release device-test path for server-side work.** Revelia runs **one** Railway backend (production), and the app's API base URL is **hardwired** to it (`app.json` `extra.apiUrl`) — there is no staging backend and no non-prod URL an internal-testing APK can point at. So a **server-heavy feature (e.g. a build's R-series engine work) cannot be device-tested before release** without deploying that code to the live backend. The device verification therefore happens **during the normal Internal Testing → promote cycle** against the deployed backend — Internal Testing *is* the device pass. Consequences: (1) do as much verification as possible **locally** first (ts-node/service-level harnesses over the committed functions — this is what "Testing Pass 1/2 local scope" does), so only genuinely device-only behavior (camera capture, real-DB persistence, on-device UX, real-model prose) rides the release; (2) deploying the branch to the live backend for testing is only safe when the change is **fail-open + response-shape-preserving** (flag-gated, byte-identical DTOs, graceful degradation) so live users aren't broken while it's verified. This surfaced in Build 27 Testing Pass 2 (`tracking_files/build-27-testing.md`); constraint recorded in project memory `infra-single-railway-backend.md`.

### Part B — concise flow

```
tsc (mobile + server) → git status → git diff (if needed)
 → git add <relevant> → git commit -m → git push (if saving)
 → eas build (preview APK, or production AAB if Play-signed features)
 → Internal Testing → team tests
   ├─ perfect → promote SAME AAB to Production + merge PR to main
   └─ not → fix/improve/chore → tsc → add & commit → eas prod build
            → internal test → promote to Production if perfect
```

---

## Gotchas to remember at release time
- `google-services.json` must stay git-tracked (FCM/push breaks otherwise).
- Production profile has `autoIncrement: true` — versionCode auto-bumps per build.
- Promote the *same* AAB Internal Testing → Production; don't rebuild between tracks.
- RevenueCat / Google Sign-In / push need a Play-signed build to test correctly.
