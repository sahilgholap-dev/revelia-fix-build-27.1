# Harness / Framework Playbook

> **What this is.** A portable description of *how this project is run with AI* — the file
> taxonomy, the chat-session topology, and the rituals that keep many short-lived AI chats
> coherent across a long build. It is deliberately **generic**: hand this one file to another
> project's agent and it can adopt the method without importing any domain content. Where a
> concrete example helps, it cites this repo's real files as worked examples.
>
> **Two things make the system work:** (1) *durable state lives in files, not in chats* — any
> chat can be closed and a fresh one picks up from the tracking files; (2) *there is exactly one
> "home" chat per unit of work* that owns decisions and prompt-authoring, while the actual code
> is written in disposable per-step sub-chats.

---

## 1. The three actors

| Actor | Best at | Cannot do |
|---|---|---|
| **Owner / orchestrator (human)** | Decide, hold cross-session intent, own human/business gates, route work between chats | — |
| **Web AI (no repo access)** — e.g. claude.ai | Strategy, pressure-testing a plan, trade-offs, pricing/positioning, legal/disclosure copy, drafting the next kickoff prompt | **See the repo** — must defer every code fact to the repo-aware agent |
| **Repo-aware coding agent** — e.g. Claude Code (CLI) | Explore code, author code-grounded plans, implement, run typecheck/builds, update tracking files | Make product/business calls; resolve human gates |

**The one inversion that matters:** deep implementation plans are authored by whoever can *see
the code* — the repo-aware agent — **not** by the web AI working blind. The web AI's job is to
*review / decide / draft prompts*, not to invent a plan from a summary. When the web AI needs a
code fact, it says "have the coding agent verify X."

*(This repo: `dev-notes/workflow.md` is the canonical statement of this split.)*

---

## 2. Chat-session topology (the orchestration model)

The core idea: **one "home" (orchestrator) chat per unit of work; disposable sub-chats do the
execution; shared tracking files are the only memory between them.**

```
        WEB-AI LAYER (strategy, no repo)                REPO-AWARE LAYER (execution)
    ┌───────────────────────────────────┐        ┌────────────────────────────────────────┐
    │  Project instructions (set once)   │        │  HOME / ORCHESTRATOR CHAT  (per feature) │
    │  Overview / coordination chat      │        │   • deep-plans the feature (the RN doc)  │
    │   • pressure-tests plans           │◀──────▶│   • generates ONE step-prompt at a time  │
    │   • resolves product/copy calls    │  owner │   • tracks state, verifies commits       │
    │   • drafts kickoff prompts         │ carries│   • does NOT write impl code itself       │
    └───────────────────────────────────┘  work  │            │  spawns                       │
                                                  │            ▼                               │
                                                  │  PER-STEP IMPL SUB-CHATS (fresh, one each) │
                                                  │   • run exactly one step, then report back │
                                                  │  TESTING CHAT (owns the test-strategy log) │
                                                  └────────────────────────────────────────────┘
                                                       ▲
                          SHARED TRACKING FILES ───────┘  (the sync bus every chat reads/writes)
```

### 2a. The web-AI layer
- **Project instructions** — pasted once into the web AI's project settings. States: "you are the
  strategist/reviewer; you cannot see the repo; never invent file contents/APIs/versions; deep
  plans are authored by the coding agent — you review them." *(This repo: `prompts.txt` §6.)*
- **One long-running overview/coordination chat** — holds the build's big picture; you return to it
  to pressure-test, resolve cross-cutting trade-offs, and draft kickoff prompts. *(§7.)*
- **A fixed per-chat paste convention** so any new web-AI chat re-hydrates from files: evergreen
  project context + the current handoff + the relevant feature plan + your question. *(§8.)*

### 2b. The repo-aware layer — the home/sub-chat pattern
- **Home / orchestrator chat (one per feature/requirement).** It first *deep-plans* the feature
  (writing the RN plan doc), then is **"flipped" into the home role** by pasting the **Orchestrator
  Charter** (see §5) into the *same* chat. From then on it:
  1. generates each implementation step as its own tight prompt, appended to its section of the
     prompt library (never deletes finished ones — marks them `[DONE — kept for record]`);
  2. keeps the shared trackers current;
  3. verifies each commit landed exactly the intended files;
  4. **does not write implementation code itself** — it hands each step to a sub-chat.
- **Per-step impl sub-chats (disposable, one per step).** Each runs a single step's prompt, keeps
  the typecheck green, produces one commit, updates the handoff, and reports back. Then it's done.
  A naming convention makes the trail legible: `build{N}-{RN}-{feature}-Impl-Step{K}`
  (e.g. `build27-R6-Continuity-Impl-Step5`). The handoff's "Written by" field records which
  sub-chat wrote it.
- **Testing chat (separate).** Owns the test-strategy log and its prompts; the feature home chats
  do not author test prompts. *(This repo: `tracking_files/build-27-testing.md` + `prompts.txt` §10.)*

### 2c. Why this shape
- **Context stays small and on-topic.** A sub-chat only ever holds one step; the home chat holds
  decisions and plan, not thousands of lines of diff.
- **Failure is cheap.** A confused sub-chat is thrown away, not debugged — the home chat re-issues
  the step. Nothing important lived in the sub-chat.
- **The trail is auditable.** Every prompt ever run is preserved in the prompt library with an
  outcome; every step is a commit; every state change is in the trackers.

---

## 3. The file taxonomy

Files fall into three layers. The first is *pure methodology* (transfers verbatim); the other two
are *instances* whose **structure** is what transfers.

### 3a. Methodology files (the operating system — read first)
| File | Role |
|---|---|
| **`CLAUDE.md`** (repo root) | The master operating doc the coding agent auto-reads. Points at the session-start ritual, documents permanent gotchas, names the tracking files and their rules, defines the build-rollover ritual. *If someone reads one file, this is it.* |
| **`dev-notes/workflow.md`** | The three-actor collaboration split + the end-to-end build/release cycle (typecheck → commit → build → internal test → promote/merge). |
| **`dev-notes/harness-playbook.md`** | *This file* — the portable description of the whole system. |

### 3b. The prompt library / trail
| File | Role |
|---|---|
| **`prompts.txt`** (untracked scratch) | Reusable, copy-from-here prompts **and** the audit trail. One numbered section per feature; within it, every phase's prompt (deep-plan → any spike → each impl step → validation), finished ones marked `[DONE — kept for record]` with a one-paragraph outcome. Also holds the reusable templates: generic kickoffs (§5), the web-AI project instructions (§6–§8), and the **Orchestrator Charter** (§9). Each home chat maintains **only its own section**. |

### 3c. The tracking files (the sync bus) — live at a stable top level, never moved
| File | Role | Lifecycle |
|---|---|---|
| **`session_handoff.md`** | Compact cold-start state: branch, what just happened, next step. Read at the start of *every* session. | Overwritten each session; kept to ~1 screen. |
| **`claude_progress.md`** | Full session log for the **current build only** + a Project Snapshot. | Appended per session; can grow large — never paste it wholesale into a fresh chat. |
| **`{feature-owner}-signoff.md`** | Standing register of **human/owner gates**: what's PENDING / APPROVED / PROCEEDING-ON-DEFAULT, and which step each gates. | Not overwritten; status flipped + dated when the owner replies. *(This repo: `sid-signoff.md`.)* |
| **`build-{N}-caveats.md`** | Standing register of **deliberately deferred** technical caveats / known limitations, tagged by disposition (fix-if-cheap / v1-scope / tuning / cosmetic / watch-in-testing). | Added to whenever a step accepts a caveat; walked at build end + during testing. Never silently dropped. |
| **`build-{N}-testing.md`** | Test strategy + a results log per pass. | Owned by the testing chat. |
| **`build-{N}/`** (archive) | Frozen history of a shipped build: its `claude_progress.md`, `bugs/`, `refactors/`. | Read on demand only. |

### 3d. The planning layer
| File | Role |
|---|---|
| **`plans/build-{N}.md`** | The build's index/plan: goals, a requirements table (R1…Rn with status), passing criteria, open questions, out-of-scope, implementation notes. Kept as an *index* — detail lives in the RN docs. |
| **`plans/build-{N}/R{n}-{feature}.md`** | One **deep, code-grounded** plan per requirement. Standard section shape: goal → *current state verified in code (with file refs)* → target architecture / key decisions → data model → step sequencing → passing criteria → risks → files-in-scope. Authored by the coding agent, reviewed by the web AI. |

**Sending this to another project:** hand over §3a in full (methodology), plus **one representative
example of each instance type** (one `session_handoff.md`, one signoff register, one caveats file,
one `build-N.md`, one `R{n}-*.md`, and the *header* of `prompts.txt` + one archived `bugs/BUG-*.md`)
so the shapes are visible — not the whole domain history.

---

## 4. The lifecycle of one requirement

```
1. DEEP-PLAN     Home chat explores the real code and writes plans/build-N/RN-feature.md.
                 (Planning only — no code. Grounded in file refs, not assumptions.)
2. REVIEW/GATE   Web AI pressure-tests the plan; owner + any human gate-keeper resolve open
                 questions. Gates recorded in the signoff register (proceed-on-default if the
                 gate-keeper is slow AND the decision is cheaply reversible — see §6).
3. FLIP TO HOME  Paste the Orchestrator Charter (§5) into the planning chat → it becomes the
                 feature's home chat.
4. PER-STEP LOOP For each step in the plan's sequence:
                   a. Home chat writes the step prompt into its prompts.txt section.
                   b. Owner runs it in a fresh build-N-RN-Impl-StepK sub-chat.
                   c. Sub-chat: implement ONE concern → typecheck clean → one commit →
                      update trackers → report back with the commit + outcome.
                   d. Home chat verifies the commit (git status clean, exactly intended files),
                      marks the step [DONE] with an outcome, then issues the next step.
5. VALIDATION    A final verification step (often a scratchpad harness over the committed code —
                 no product changes) confirms the passing criteria.
6. CLOSEOUT      Home chat marks the requirement done across the trackers (build-N.md status,
                 plan checkboxes, signoff register, caveats), then the owner moves to the next
                 feature's home chat.
```

**Sequencing discipline:** one step = one concern = one tsc-clean commit. Each step prompt names
what is **out of scope** and which prior-step artifacts to **consume unchanged**, so a sub-chat
can't wander into a neighbouring layer.

---

## 5. Skeleton: the Orchestrator Charter

Pasted into a planning chat *after* its RN plan doc exists, to flip it into the feature's home.
Abstracted from this repo's `prompts.txt` §9:

```
You are now the {RN} ORCHESTRATION HOME chat for {project} build {N}. {RN} is already
deep-planned: plans/build-{N}/{RN}-{feature}.md. Your job: drive {RN} to completion by
generating ONE tight step-prompt at a time, tracking state, and verifying commits. You do NOT
write implementation code in THIS chat — you generate the step prompt; the owner runs it in a
fresh per-step chat and reports back.

FIRST read (trust the CODE over any summary): session_handoff.md, {signoff register}, and the
RN plan (its decisions / sequencing / passing-criteria / risks sections). Skim your own section
of prompts.txt — that's yours to maintain.

HOW YOU RUN IT:
 1. Generate each step as its own prompt, appended to your prompts.txt section. Mark finished ones
    "[DONE — kept for record]" with a one-paragraph outcome; never delete them (preserve the trail).
 2. Each step prompt MUST: say "implement {RN} step N ONLY per the plan (read it first, cite the
    section)"; scope to ONE concern; list what's OUT of scope + which prior-step artifacts to
    CONSUME unchanged; tell it to run in a fresh {build-N-RN-Impl-StepN} chat; and END with
    "typecheck clean; update the tracking files; leave committing to the owner by giving a commit
    message (don't commit unless asked). Follow CLAUDE.md + dev-notes/workflow.md."
 3. Follow the plan's step order; one step per impl chat; keep each commit typecheck-clean.

COMMIT DISCIPLINE: owner commits (or you commit only when asked); messages match repo style.
After each committed step, check git status + git log -1 and confirm EXACTLY the intended files
landed (watch for a sub-agent's blanket `git add -A`). Only then issue the next step.

TRACKING DISCIPLINE (after each step): overwrite the handoff (keep ~1 screen); append a dated
progress entry; keep the signoff register accurate. Touch ONLY your own prompts.txt section.

{RN}-SPECIFIC WATCH-OUTS: {pull the risks / invariants from the plan so they're enforced inside
each step prompt}.

DON'T: relitigate settled plan decisions; over-engineer; touch other requirements' scope; write
impl code in this chat.
```

*(A generic **kickoff** template for the two coding-agent entry points — "deep-plan a requirement"
and "implement a requirement" — lives in `prompts.txt` §5.)*

---

## 6. Rules of thumb that keep it coherent

- **Files are truth; chats are disposable.** Never let a decision live only in a chat. If it
  matters tomorrow, it goes in a tracking file tonight.
- **Read the handoff at every session start; overwrite it at every session end.** This is the
  baton. Keep it to ~1 screen.
- **Data/scaffolding/plumbing is ungated; locking user-facing *copy* is gated.** Build the
  reversible parts now; only pause for human sign-off at the moment irreversible or outward-facing
  copy/decisions get committed. If the gate-keeper is slow *and* the choice is cheaply reversible,
  **proceed on the documented default** and keep the reversal path noted. *(This repo: the
  `RULES_VERSION`-remap pattern — first-pass names are re-mappable data, so shipping them isn't a
  lock.)*
- **Defer, don't drop.** Every accepted caveat lands in the caveats register with a disposition
  tag and a "when we'll revisit" moment. Nothing is silently skipped.
- **One step, one concern, one clean commit.** Verify the diff landed exactly the intended files.
- **Preserve the prompt trail.** Finished prompts are marked `[DONE]` with an outcome, never
  deleted — the library doubles as the audit log.
- **The web AI never invents code facts.** It defers to the repo-aware agent for anything the code
  actually determines.
- **Build rollover ritual:** when a build ships, move the live `claude_progress.md` into
  `tracking_files/build-{N}/`, start a fresh top-level one for the next build, and overwrite the
  handoff. This keeps the live log bounded to a single build.

---

## 7. Adopting this in a new project — minimum viable setup

1. Create `CLAUDE.md` with: the session-start ritual ("read the handoff first"), your permanent
   gotchas, and a table naming your tracking files + their update rules.
2. Create `dev-notes/workflow.md` (the actor split + your build/release cycle) and copy this
   playbook to `dev-notes/harness-playbook.md`.
3. Create the tracking files: `session_handoff.md`, `claude_progress.md`, a signoff register, a
   caveats register, a testing log.
4. Create `plans/build-1.md` (the index) and start writing `plans/build-1/R1-*.md` per requirement.
5. Start a `prompts.txt` with the section skeleton, the web-AI project instructions, the generic
   kickoffs, and the Orchestrator Charter template.
6. Run the lifecycle in §4: deep-plan → review/gate → flip to home → per-step loop → validate →
   closeout. One home chat per feature, one disposable sub-chat per step.
