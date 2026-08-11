import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as t from '@/theme';

/**
 * BackButton — THE ONE WAY BACK, AND IT IS A CLASS RATHER THAN TWO SITES.
 *
 * ── WHAT WAS MEASURED, AND WHY "two screens are missing a back arrow" WAS THE WRONG FRAME ────
 *
 * The report named two screens. The class is defined by the navigation graph, not by which two
 * a reviewer happened to open: build every `push` / `replace` / `navigate` edge in `app/` and
 * `components/`, count DISTINCT ENTRY POINTS per destination, and ask which destinations that
 * are reachable from more than one place carry no way back. Measured over 93 files:
 *
 *   destination                 entries   had a way back
 *   (capture)/birth-data           3      NONE   <- reported
 *   (main)/readings/palm           3      NONE   <- reported
 *   (main)/readings/face           3      NONE   <- the same shape, not reported
 *   (auth)/login                   4      NONE
 *   (auth)/signup                  2      NONE
 *
 * The six tab roots are reachable from many places and correctly carry nothing — a tab root is
 * not a pushed screen. Seven further destinations already had a hand-rolled control, which is
 * the other half of the finding: the idiom existed SEVEN times and was a component ZERO times.
 *
 * ── 🔴 THE RULE THAT MAKES ONE COMPONENT CORRECT AT ALL FIVE: RENDER NOTHING WHEN THERE IS
 *    NOTHING TO POP ────────────────────────────────────────────────────────────────────────────
 *
 * Three of the five are reached BOTH ways, and the distinction is not cosmetic:
 *
 *   · `birth-data` is pushed from the astrology hub and from the profile — and REPLACED into by
 *     the root layout on first run, when the user has no birth data yet. On that path there is
 *     nothing beneath it. A hard-coded arrow there is a control that does nothing when pressed,
 *     on the first screen a new install sees.
 *   · `face` / `palm` are pushed from Home and the hub — and REPLACED into by the two capture
 *     screens when a reading completes.
 *   · `login` is pushed from welcome and from signup — and REPLACED into by the root layout on
 *     sign-out and by the reset-password success path.
 *
 * So the guard is the component's whole reason to exist, and it is why this is not five copies
 * of a four-line idiom. The seven existing hand-rolled controls are all on push-only screens,
 * which is why none of them needed the guard and why none of them has it.
 *
 * ⚠️ It is read at RENDER, deliberately, not subscribed to. Whether a mounted screen has
 *    something beneath it does not change while it is mounted; a subscription would buy a
 *    re-render for a value that cannot move.
 *
 * ⚠️ The touch target is the 48dp floor (design §4.2) and it is bought with `hitSlop` rather than
 *    padding, because the glyph is 24 and the surrounding rows are already laid out: 24 + 12 + 12.
 *    That is the same reasoning the field primitive's reveal control uses.
 *
 * ⚠️ An icon has no accessible name, so it carries one. It is not the visible text, because there
 *    is none.
 *
 * ── optional `onPress` (added 2026-08-11, corrected 2026-08-11 after a review finding) ────────
 *
 * `birth-data` is reached BOTH ways — pushed from the astrology hub and the profile (real
 * history), AND replaced into by the root layout on first run (none at all, per the class
 * documented above). 🔴 `onPress` is UNCONDITIONAL, not "for the no-history case": supplying it
 * skips the guard above outright, on every render, regardless of what `canGoBack()` would have
 * said. **That is only safe because it hands the destination question to the caller rather than
 * answering it here** — a caller for a destination that must differ by history (`birth-data`'s
 * own `handleBack`, which re-checks `canGoBack()` itself and only takes a sign-out path when it
 * is false) has to make that check itself; `onPress` does not make it for them. A caller with one
 * fixed destination regardless of history has no such obligation. Every caller that omits
 * `onPress` keeps today's guarded behaviour unchanged — the five existing adopters do not pass it.
 */
export function BackButton({
  className,
  onPress,
}: {
  className?: string;
  onPress?: () => void;
}) {
  const router = useRouter();
  if (!onPress) {
    if (!router.canGoBack()) return null;
  }
  return (
    <TouchableOpacity
      onPress={onPress ?? (() => router.back())}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      className={className}
    >
      <Ionicons name="arrow-back" size={24} color={t.color.fg} />
    </TouchableOpacity>
  );
}
