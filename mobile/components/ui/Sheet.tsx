import React, { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import * as t from '@/theme';

/**
 * Sheet — §9 item 15. A NEW COMPONENT, not a restyle: bottom-anchored, one action, dismissible.
 *
 * ── 🔴 IT IS BUILT ON THE PLATFORM MODAL, AND THAT IS THE PRE-AUTHORISED CHOICE ────────────────
 *
 * §3.1's gate for this row says the component *"degrades to a plain Modal at the same duration if
 * gestures are unproven"*, and the pre-flight measured that they ARE unproven, twice over:
 *
 *   · the approved sheet library is NOT INSTALLED — adding it here would be a new dependency on the
 *     account-deletion and info surfaces, introduced in a loop with no device, no staging and no
 *     test runner (§8.1). It is JS-only over reanimated and gesture-handler, so it is a cheap
 *     upgrade LATER; it is not a cheap thing to ship blind.
 *   · gesture-handler ships with EXACTLY ONE reference in the whole tree — the root view in
 *     app/_layout.tsx — and ZERO gestures. Nothing in this app has ever recognised a pan.
 *
 * 🟢 So `degraded` is not a fallback that was reached for; it is one of this component's seven
 *    DESIGNED STATES, and it is the one whose preconditions are met. The platform Modal is proven in
 *    production here at thirteen existing sites.
 * ⚠️ THE HANDLE IS DRAWN AND IT DOES NOT DRAG. That is deliberate and it is the lesser of two
 *    wrongs: §4.1 requires the gesture and no-gesture builds to LOOK IDENTICAL so that adopting the
 *    library later is not a visual change. It is hidden from the accessibility tree, so no screen
 *    reader ever announces a draggable thing that is not — and dismissal has two REAL affordances
 *    beside it, the labelled backdrop and the cancel action, so nobody is ever trapped.
 *
 * ── 🔴 THE ONE PROHIBITION IN THE WHOLE COLOUR SYSTEM LANDS HERE AND NOWHERE ELSE ──────────────
 *
 * This is the only component whose ground is the OVERLAY step, and design §2.1 bans the danger role
 * as text on that step at any size and any weight — 4.28:1, below AA. So there is no red copy in
 * this file, by construction, and the adoption gate asserts its absence rather than trusting this
 * paragraph. Title and body take the plain and reading roles.
 *
 * 🔴 AND THE MUTED ROLE IS ALSO UNSAFE ON THIS GROUND — 4.44:1, seven hundredths above the value
 *    §2.1 prohibits (`O-66`). §2 publishes that role at 5.36 / 5.11 / 4.81 / 4.43 across the four
 *    surface steps and this component sits on the LAST of them, so the one figure a reader is most
 *    likely to quote is the one that does not apply. The dismiss affordance therefore takes the
 *    reading role, not the label role, and that is a measurement rather than a preference.
 *
 * ── ⚠️ FOUR OF THE SEVEN DESIGNED STATES ARE NOT BUILT, EACH WITH A NAMED DEBTOR ────────────────
 *
 * The standing rule is that a zero-call-site option is a DEFECT, and this phase has applied it
 * twice already — item 5 did not build the disabled field because no site passes the prop, and item
 * 12 did not rebuild the skeleton density. The same reasoning applies here and it is the reason this
 * component is small:
 *
 *   dragging     no gesture exists to drag with. Arrives with the library, if it ever does.
 *   loading      neither adopter has an action in flight. The FORMS do — and they are deferred.
 *   error        neither adopter can fail. Same debtor.
 *   destructive  🔴 NO ADOPTER, AND THIS ONE MATTERS MOST, so it is stated plainly: §2.1's
 *                resolution for the prohibition is a danger-FILLED control with an on-fill label,
 *                and its home is DeleteAccountModal. Building the branch here with no site would
 *                put the app's most sensitive colour pairing in a code path nothing exercises,
 *                which is how a pairing drifts. It stays pinned where it renders, mechanically,
 *                and it MOVES here in the same commit that migrates that modal.
 *
 * ── 🔴 WHY THE FOUR "ACCOUNT MODALS" ARE NOT THE FOUR ADOPTERS — MEASURED ─────────────────────
 *
 * design §9 row 15 scopes this component to *"4 account modals + pickers + info"*. Measured: FOUR
 * OF THE FIVE ARE FULL-SCREEN PAGE SHEETS, not sheets — a header, a safe-area frame, the canvas as
 * their ground, and multi-field forms inside (the password form has three fields). Converting one
 * is a screens-phase restructure, and doing it here would be actively harmful: each of those files
 * renders its errors in the danger role, which is LEGAL today because their ground is the canvas at
 * 5.17:1 and becomes the §2.1 PROHIBITION at 4.28:1 the moment the ground changes. So the scope
 * claim is class 7 again — a document's inference is not verified by being written — and the two
 * adopters are the two surfaces that already have this component's shape.
 */

type Action = { title: string; onPress: () => void };

interface SheetProps {
  visible: boolean;
  /** 🔴 REQUIRED, and it is what accessibility focus moves to on present. */
  title: string;
  onDismiss: () => void;
  body?: string;
  /** An Ionicon name. §9.2 — never a text glyph, never an emoji. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** The one affirmative action. A sheet has exactly one; §9 row 15's ladder is not a menu. */
  primary?: Action;
  /** Ghost, and rendered BELOW the primary — §2.1: the reversible choice sits thumb-nearest. */
  cancel?: Action;
  children?: React.ReactNode;
}

export function Sheet({
  visible,
  title,
  onDismiss,
  body,
  icon,
  primary,
  cancel,
  children,
}: SheetProps) {
  const titleRef = useRef<Text>(null);

  // design §9 row 15: focus moves to the title on present. There is no declarative prop for this
  // on either platform, so it is an imperative call — and it MUST NOT THROW, because a modal that
  // dies on present has no exit. Both the handle lookup and the call are guarded.
  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(() => {
      try {
        const handle = findNodeHandle(titleRef.current);
        if (handle != null) AccessibilityInfo.setAccessibilityFocus(handle);
      } catch {
        // A focus hint is not worth a crash on a surface whose job is to be dismissible.
      }
    }, 0);
    return () => clearTimeout(id);
  }, [visible]);

  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      {/* 🔴 THE BACKDROP IS A LABELLED DISMISS BUTTON, not a bare touchable — design §9 row 15. A
          screen reader that reaches it must be told what it does; a tap target that dismisses a
          modal and announces nothing is the reason that sentence is in the spec.
          ⚠️ AND THE STYLE RULE BELOW IS NOT NAMED FOR THE TOKEN IT USES, deliberately: that token's
          gate rule matches the BARE WORD, so a rule key spelling it — and any sentence spelling it —
          counts as a violation. Measured: naming it that way took a permanent invariant from 0 to 5,
          two in code and three in this very paragraph. CLAUDE.md's sub-case exactly: when a rule's
          pattern is a bare token, there is no spelling that satisfies every tool, so do not use the
          word. The one legal call site is the only place it appears in this file. */}
      <Pressable
        style={styles.backdrop}
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
      >
        {/* The inner press is swallowed so a tap on the sheet body does not dismiss it. The modal
            flag goes here rather than on the backdrop: this subtree is the modal content, and the
            platform Modal already isolates the screen behind it in its own window. */}
        <Pressable
          style={[styles.sheet, { paddingBottom: 24 + insets.bottom }]}
          onPress={() => {}}
          accessibilityViewIsModal
        >
          {/* The visual signature of a sheet, and NOT an affordance — see the header. Hidden from
              the accessibility tree on both platforms so it is never announced as one. */}
          <View
            style={styles.handle}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />

          {icon ? (
            <Ionicons name={icon} size={28} color={t.color.accent} style={styles.icon} />
          ) : null}

          <Text
            ref={titleRef}
            accessibilityRole="header"
            allowFontScaling
            maxFontSizeMultiplier={1.3}
            style={styles.title}
          >
            {title}
          </Text>

          {body ? (
            <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.body}>
              {body}
            </Text>
          ) : null}

          {children}

          {primary ? (
            <View style={styles.action}>
              <Button title={primary.title} onPress={primary.onPress} variant="primary" fullWidth />
            </View>
          ) : null}

          {cancel ? (
            <View style={styles.action}>
              <Button title={cancel.title} onPress={cancel.onPress} variant="ghost" fullWidth />
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    // The canvas role at 60% through the alpha helper, which is the ONE legal spelling — a bare
    // reference to that token is an OPAQUE overlay, and the invariant guarding it is permanent at 0.
    // 60 sits on the 5-step opacity scale, which is what the helper requires.
    backgroundColor: t.alpha(t.color.scrim, 60),
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: t.color['surface-overlay'],
    // 🔴 TOP CORNERS ONLY — design §9 row 15. A sheet whose corners are all curved is a floating
    // card, and the bottom two would be clipped off-screen anyway.
    // ("all four <the bare radius word>" is how that sentence read first, and the bare word IS a
    //  utility name: it took `no-legacy-radii`'s dead-spellings from 0 to 1. Instance 19.)
    borderTopLeftRadius: t.radius.xl,
    borderTopRightRadius: t.radius.xl,
    paddingHorizontal: 24,
    paddingTop: 12,
    // paddingBottom is composed at the call site from the same 24 plus the bottom inset: this
    // surface is anchored to the screen edge, so unlike every card in the app it sits UNDER the
    // home indicator and the Android gesture bar unless it pays for them itself.
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: t.radius.pill,
    backgroundColor: t.color['border-strong'],
    alignSelf: 'center',
    marginBottom: 20,
  },
  icon: {
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: {
    color: t.color.fg,
    fontFamily: t.family['body-bold'],
    fontSize: t.type['text-lg'].size,
    lineHeight: t.type['text-lg'].lineHeight,
    letterSpacing: t.type['text-lg'].letterSpacing,
    textAlign: 'center',
  },
  body: {
    // The READING role, not the label role: 8.59:1 here, where the label role is 4.44:1 and the
    // published 5.36 figure belongs to a different ground entirely. See the header.
    color: t.color['fg-secondary'],
    fontFamily: t.family.body,
    fontSize: t.type['text-sm'].size,
    lineHeight: t.type['text-sm'].lineHeight,
    letterSpacing: t.type['text-sm'].letterSpacing,
    textAlign: 'center',
    marginTop: 8,
  },
  action: {
    marginTop: 12,
  },
});
