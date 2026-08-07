#!/usr/bin/env bash
# inject-harness.sh — the shared preamble for every defect-injection run. Source it; do not run it
# (except with --self-test, which validates the harness itself).
#
#   source scripts/lib/inject-harness.sh
#   ih_case  "1 · a description"  GATE_FN  path/to/file.tsx  's/perl/expr/'  fail  'exact expected'
#   ih_escape "2 · a legal edit"  GATE_FN  path/to/file.tsx  's/perl/expr/'        'exact expected'
#   ih_report
#
# ── 🔴 WHY THIS EXISTS: FIVE HARNESS DEFECTS IN ONE SESSION, AND ZERO GATE DEFECTS (`O-94`) ───
#
# Every injection run in the 2.1.0 programme was an ad-hoc shell script rewritten per item, and the
# harness — the thing whose only job is to prove the gates work — was the least disciplined code in
# the repo. It produced FIVE defects in one session, TWO of which reported success for doing
# nothing. A validator that can report a false pass is worse than no validator, because its output
# is used to justify shipping.
#
# THE FIVE, with the guard that now prevents each:
#
#  1 🔴 RESTORE BY `git checkout` REVERTED THE ITEM'S OWN UNCOMMITTED WORK. Case 1 restored the file
#    it had injected into — and with it every uncommitted edit the item had just made — so cases
#    2..9 all ran against a tree whose baseline was now RED and reported "INVALID". Only luck
#    limited the damage to one file.
#    ⚠️ A SECOND INSTANCE THE SAME DAY, outside the harness: diagnosing a miss by hand with an
#      ad-hoc `cp`, whose backup path was lost to a `||` short-circuit, left an injected defect
#      sitting in the tree.
#    🟢 GUARD: `ih_require_clean` REFUSES TO START unless `git status --porcelain` is empty, and
#      restore is a BYTE COPY. Both, deliberately: the clean-tree precondition means there is no
#      uncommitted work to lose, and the byte copy means the restore does not depend on git state
#      and works for untracked files too. The final `ih_report` re-asserts the tree is clean.
#      🔴 AND THE PRECONDITION IS THE LOAD-BEARING HALF: it makes the failure mode IMPOSSIBLE rather
#      than merely unlikely, and it costs one commit before validating instead of after.
#
#  2 🔴 A GREP PATTERN LOOSE ENOUGH TO MATCH THE UNCHANGED BASELINE — TWO FALSE PASSES. The expected
#    pattern was `inline UNRESOLVABLE +1[0-9]`, the baseline read 15, and the injection moved
#    nothing: both cases printed CAUGHT for doing nothing. This is `O-67` inside the harness — a
#    pattern that cannot distinguish the injected state from the baseline is not an assertion.
#    🟢 GUARD: `ih_case` captures the gate's output BEFORE injecting and FAILS THE CASE if the
#      expected pattern already matches that baseline output. An expectation that was already true
#      can never be evidence, and now it cannot be recorded as evidence either.
#
#  3 🔴 A PERL PATTERN SPANNING `\n` MATCHED NOTHING IN A CRLF TREE. Every `.tsx` here is CRLF in the
#    working copy, so a `\n`-anchored multi-line substitution silently does nothing.
#    🟢 GUARD: the injection is applied and the file is `cmp`-ed against its backup; an injection
#      that changed nothing is INVALID, never a pass. (This one already worked — it reported INVALID
#      rather than CAUGHT — and it is kept because the guard is what made it visible.)
#
#  4 🔴 AN EXPECTED NUMBER THAT DID NOT MATCH THE INJECTION'S MULTIPLICITY. A `perl -pi -e` with no
#    line scope replaced BOTH matching sites, so the census moved by 2 where the case expected 1.
#    🟢 GUARD: none needed beyond the exact-number discipline, which is what caught it — it reported
#      MISSED, not a false pass. Recorded because it is the counter-example that shows guard 2
#      working: an exact expectation fails loudly when the injection is wrong, and a loose one does
#      not fail at all. ⚠️ Scope injections with `if $. == <line>` when a pattern recurs.
#
#  5 🔴 A SNAPSHOT LOOP THAT TRIED TO `cp` AN UNTRACKED DIRECTORY, printing a spurious "ALTERED".
#    🟢 GUARD: obsolete — with `ih_require_clean` there is nothing to snapshot. The whole snapshot
#      mechanism was a mitigation for defect 1, and fixing 1 properly deletes it.
#
#  7 🔴 THE RESTORE IS NOT CRASH-SAFE, AND A KILLED RUN LEAVES ITS INJECTED DEFECT IN THE TREE.
#    Observed 2026-08-05: a run was still going when the process that started it exited, and
#    `Button.tsx` was left carrying case 14's `_SHAPE_PROBE`. `ih_case` restores AFTER the gate
#    returns, so anything that kills the shell between the `cp` and the restore strands the
#    injection — and the tree then looks like ordinary uncommitted work.
#    ⚠️ THE EXISTING GUARDS DO NOT COVER IT AND THAT IS BY CONSTRUCTION: `ih_require_clean` protects
#      the NEXT run from destroying real work, and `ih_report`'s final check only runs if the script
#      reaches the end. Neither can act after a SIGKILL.
#    🟢 THE MITIGATION IS PROCEDURAL, NOT A TRAP: this harness takes 20-30 minutes, so run it in the
#      BACKGROUND and let it finish. 🔴 AND AFTER ANY INTERRUPTED RUN, `git status` FIRST — a stranded
#      injection is indistinguishable from an edit somebody meant to make, and the one that stranded
#      here would have committed a marker that moves an `exact` census.
#    ⚠️ A `trap ... EXIT` was considered and NOT added: it cannot fire on SIGKILL either, so it would
#      buy partial coverage while reading as complete coverage — which is the shape this whole file
#      exists to argue against.
#
# 🔴 THE ONE-LINE SUMMARY, because it is the transferable part: THE HARNESS NEEDS THE SAME
#    DISCIPLINE AS THE GATES IT VALIDATES — a clean precondition, an exact expectation, and proof
#    that the thing it did actually changed something. All three are the same rule the gates follow.

IH_PASS=0
IH_FAIL=0
IH_REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && cd .. && pwd)"
IH_BK="${TMPDIR:-/tmp}/ih-bk.$$"
mkdir -p "$IH_BK"

# 🔴 THE PRECONDITION. Refuse to start on a dirty tree — see defect 1.
ih_require_clean() {
  local dirty
  dirty="$(cd "$IH_REPO" && git status --porcelain)"
  if [ -n "$dirty" ]; then
    echo "🔴 REFUSING TO START — THE WORKING TREE IS NOT CLEAN."
    echo "   An injection run mutates files and restores them. On a dirty tree a restore can revert"
    echo "   work that was never committed, which is how one run lost an item's edits and invalidated"
    echo "   its own cases 2..9. COMMIT FIRST, THEN VALIDATE."
    echo "   uncommitted:"
    printf '%s\n' "$dirty" | sed 's/^/     /'
    exit 2
  fi
  echo "  🟢 precondition: working tree is clean"
}

_ih_bk() { printf '%s/%s.bak' "$IH_BK" "$(printf '%s' "$1" | tr '/()' '___')"; }

# ih_case <name> <gate-fn> <file> <perl-expr> <fail|pass> <exact-expected-regex>
ih_case() {
  local name="$1" gate="$2" file="$3" expr="$4" want="$5" pat="$6"
  local bk; bk="$(_ih_bk "$file")"

  # a green baseline, asserted per case — a red baseline makes every later "CAUGHT" the stale state
  local base rcb; base="$($gate 2>&1)"; rcb=$?
  if [ $rcb -ne 0 ]; then echo "  🔴 INVALID  $name — baseline was already RED"; IH_FAIL=$((IH_FAIL+1)); return; fi

  # 🔴 GUARD 2: an expectation that already matches the baseline can never be evidence.
  #
  # ⚠️ 🔴 DEFECT 6, FOUND 2026-08-04 BY THE MOTION PHASE'S ITEM 0: GUARD 2 MADE `ih_escape`
  #    STRUCTURALLY IMPOSSIBLE, AND IT INVALIDATED THREE OF FOUR ESCAPE CASES IN ONE RUN.
  #    An ESCAPE case asserts that a LEGAL edit leaves the gate green — so its expected output is,
  #    by definition, THE SAME CLEAN LINE THE BASELINE ALREADY PRINTS. Guard 2 exists to stop a
  #    CATCH case claiming credit for a finding that was already there, which is a real hazard; on
  #    an escape it inverts into "you may only write an escape whose output MOVES", which forces
  #    every escape to be contrived and, in practice, means escapes stop being written.
  #    🔴 THAT MATTERS BECAUSE OVER-FINDING IS THE INSIDIOUS DIRECTION — a rule that cries wolf is
  #       decommissioned by its own output — so the escape half is the half this project can least
  #       afford to lose. It is what `no-white-on-accent` needed and never had.
  #    🟢 SO GUARD 2 APPLIES TO `fail` CASES ONLY. What carries the weight on an escape is the pair
  #       that remains: the gate must EXIT 0 (`want=pass`), and guard 3 must confirm the injection
  #       actually changed the file. An escape that changed nothing is still INVALID.
  if [ "$want" = fail ] && printf '%s\n' "$base" | grep -Eq "$pat"; then
    echo "  🔴 INVALID  $name — the expected pattern ALREADY MATCHES THE BASELINE, so this case"
    echo "               could only ever report success. Tighten it to an exact value."
    echo "               pattern: $pat"
    IH_FAIL=$((IH_FAIL+1)); return
  fi

  cp "$file" "$bk"
  perl -pi -e "$expr" "$file"
  # 🔴 GUARD 3: an injection that changed nothing is INVALID, never a pass.
  if cmp -s "$file" "$bk"; then
    echo "  🔴 INVALID  $name — the injection changed NOTHING (pattern did not match; note CRLF)"
    IH_FAIL=$((IH_FAIL+1)); cp "$bk" "$file"; return
  fi

  local out rc; out="$($gate 2>&1)"; rc=$?
  cp "$bk" "$file"

  local codeok=n
  { [ "$want" = fail ] && [ $rc -ne 0 ]; } && codeok=y
  { [ "$want" = pass ] && [ $rc -eq 0 ]; } && codeok=y
  if [ "$codeok" = y ] && printf '%s\n' "$out" | grep -Eq "$pat"; then
    echo "  ✅ CAUGHT   $name"
    printf '%s\n' "$out" | grep -E "$pat" | head -1 | sed 's/^ */             /'
    IH_PASS=$((IH_PASS+1))
  else
    echo "  🔴 MISSED   $name  (exit=$rc, wanted=$want)"
    echo "               expected: $pat"
    IH_FAIL=$((IH_FAIL+1))
  fi
}

# ih_escape — a legal edit that must NOT be flagged. The OVER-finding direction is what
# decommissions a rule, so every run should carry at least one.
ih_escape() { ih_case "$1" "$2" "$3" "$4" pass "$5"; }

ih_report() {
  echo
  echo "  $IH_PASS correct / $IH_FAIL incorrect"
  local dirty; dirty="$(cd "$IH_REPO" && git status --porcelain)"
  if [ -n "$dirty" ]; then
    echo "  🔴 THE TREE IS DIRTY AFTER THE RUN — a restore did not complete:"
    printf '%s\n' "$dirty" | sed 's/^/     /'
    rm -rf "$IH_BK"; return 1
  fi
  echo "  🟢 working tree clean after the run — every injection was restored"
  rm -rf "$IH_BK"
  [ "$IH_FAIL" -eq 0 ]
}

# ── --self-test: validate the harness's own three guards ─────────────────────────────────────
# 🔴 THE VALIDATOR NEEDS VALIDATING, which is the whole lesson of this file. Each guard is driven
#    into its failure mode on purpose and must report INVALID rather than CAUGHT.
if [ "${1:-}" = "--self-test" ]; then
  cd "$IH_REPO/mobile" || exit 1
  _t=0; _f=0
  _expect() { if printf '%s\n' "$2" | grep -q "$3"; then echo "  ✅ guard $1"; _t=$((_t+1)); else echo "  🔴 guard $1 DID NOT FIRE"; echo "$2" | sed 's/^/      /'; _f=$((_f+1)); fi; }
  GREEN() { echo "  count 7"; return 0; }

  echo "── harness self-test ──"
  # guard 2 · an expectation that already matches the baseline
  IH_PASS=0; IH_FAIL=0
  out="$(ih_case "x" GREEN theme.js 's/never-matches-anything/x/' fail 'count 7' 2>&1)"
  _expect "2 (expectation already true)" "$out" "ALREADY MATCHES THE BASELINE"
  # guard 3 · an injection that changes nothing
  IH_PASS=0; IH_FAIL=0
  out="$(ih_case "x" GREEN theme.js 's/never-matches-anything/x/' fail 'count 9' 2>&1)"
  _expect "3 (no-op injection)" "$out" "changed NOTHING"
  # guard 1 · a dirty tree. Uses a file it can restore from git, and asserts BOTH directions —
  # but the "accepted" direction is only decidable when the tree was already clean, so it is
  # SKIPPED rather than failed otherwise. 🔴 A sub-check that cannot be decided must say so; the
  # alternative is a self-test that reports a false pass, which is defect 2 in this very file.
  _was_clean="$(cd "$IH_REPO" && git status --porcelain)"
  printf '\n// harness self-test scratch\n' >> theme.js
  out="$(ih_require_clean 2>&1)"; _expect "1 (dirty tree refused)" "$out" "REFUSING TO START"
  git -C "$IH_REPO" checkout -- mobile/theme.js
  if [ -z "$_was_clean" ]; then
    out="$(ih_require_clean 2>&1)"; _expect "1 (clean tree accepted)" "$out" "working tree is clean"
  else
    echo "  ⬜ guard 1 (clean tree accepted) SKIPPED — the tree was already dirty when the"
    echo "     self-test started, so this direction is not decidable here. Re-run after committing."
  fi
  echo
  echo "  self-test: $_t guard(s) firing, $_f broken"
  [ "$_f" -eq 0 ] || exit 1
  exit 0
fi
