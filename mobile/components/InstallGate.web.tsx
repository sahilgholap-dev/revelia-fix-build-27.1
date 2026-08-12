import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Linking, Image } from 'react-native';
import { pwaGateMode, openInSafariAndCopy } from '@/lib/pwaGate.web';
import { PLAY_STORE_URL, androidLaunchIntentUrl } from '@/lib/storeLinks';
import * as t from '@/theme';

/**
 * On iOS, in a browser, this replaces the app with instructions for installing it.
 *
 * 🔴 IT RENDERS INSTEAD OF THE NAVIGATION STACK RATHER THAN REDIRECTING TO A
 *    ROUTE, and that is the whole design. A redirect leaves a route the user can
 *    navigate away from and a history entry they can go back through; replacing
 *    the tree leaves neither. It also covers deep links for free — every path
 *    resolves here, because there is no router underneath to resolve anything
 *    else.
 *
 * ONE SCREEN FOR EVERY iOS BROWSER. Chrome, Firefox and Edge on iPhone have
 * been able to install web apps since iOS 16.4, so the steps below are worded
 * without naming a browser and the closing line covers the pre-16.4 tail. See
 * lib/pwaGate.web.ts trap 3 for why an earlier Safari-only branch was wrong.
 *
 * The mode is read ONCE, at mount. It cannot change without a page load: a user
 * does not switch browsers or install an app mid-session, and re-reading it on
 * every render would only add a way for the tree to flicker.
 *
 * Android and desktop are untouched.
 */
export function InstallGate({ children }: { children: React.ReactNode }) {
  const [mode] = useState(pwaGateMode);

  if (mode === 'none') return <>{children}</>;
  if (mode === 'android-play') return <AndroidGetTheApp />;
  return <InstallInstructions />;
}

// ── Android: the native app is better, so send them there ─────────────────────

function AndroidGetTheApp() {
  return (
    <Screen eyebrow="Available on Android" title="Get Revelia from Google Play">
      <Lede>
        Revelia has a native Android app — faster, with notifications and offline readings. It takes
        a moment to install.
      </Lede>

      {/* 🔴 TWO ROUTES, DELIBERATELY, AND THE SECOND IS THE ONE THAT ALWAYS WORKS.
          The intent opens the app for someone who already has it and falls through
          to Play for someone who does not — but browser_fallback_url is a Chrome
          feature and other Android browsers vary, some ignoring intent URLs
          outright. The plain link below is an ordinary anchor: no scheme games, no
          browser-specific behaviour, works everywhere. */}
      <Action
        label="Open Revelia"
        emphasis="primary"
        onPress={() => Linking.openURL(androidLaunchIntentUrl())}
      />
      <Action
        label="Get it on Google Play"
        emphasis="secondary"
        onPress={() => Linking.openURL(PLAY_STORE_URL)}
      />

      <Footnote>
        Already installed? Open Revelia from your app drawer rather than this tab.
      </Footnote>
    </Screen>
  );
}

// ── shared pieces ─────────────────────────────────────────────────────────────

function Screen({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.color.bg }}
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: t.space['screen-x'],
        paddingVertical: t.space[10],
      }}
    >
      <Text {...t.txt('overline')} style={{ ...t.txt('overline').style, color: t.color.accent, marginBottom: t.space[3] }}>
        {eyebrow}
      </Text>
      <Text {...t.txt('display-sm')} style={{ ...t.txt('display-sm').style, color: t.color.fg, marginBottom: t.space[4] }}>
        {title}
      </Text>
      {children}
    </ScrollView>
  );
}

function Lede({ children }: { children: React.ReactNode }) {
  return (
    <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['fg-secondary'], marginBottom: t.space[6] }}>
      {children}
    </Text>
  );
}

function Footnote({ children }: { children: React.ReactNode }) {
  return (
    <Text
      {...t.txt('text-xs')}
      style={{
        ...t.txt('text-xs').style,
        color: t.color['fg-muted'],
        marginTop: t.space[6],
        borderTopWidth: t.a11y.hairline,
        borderTopColor: t.color['border-subtle'],
        paddingTop: t.space[4],
      }}
    >
      {children}
    </Text>
  );
}

/**
 * A control for this screen only.
 *
 * ⚠️ NOT the Button primitive, and that is a considered exception rather than an
 * oversight. This gate renders INSTEAD of the navigator, so it is the one screen
 * that must survive with the least possible dependency on the rest of the app —
 * it is what an Android or iPhone visitor sees when nothing else has mounted.
 * It stays on the design tokens, which is what the primitive would have given it.
 */
function Action({
  label,
  emphasis,
  onPress,
}: {
  label: string;
  emphasis: 'primary' | 'secondary';
  onPress: () => void;
}) {
  const primary = emphasis === 'primary';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{
        minHeight: t.a11y.tapMin,
        borderRadius: t.radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: t.space[3],
        backgroundColor: primary ? t.color.accent : t.color.surface,
        borderWidth: primary ? 0 : t.a11y.hairline,
        borderColor: t.color['border-subtle'],
      }}
    >
      {/* on-accent is the only legal foreground on an accent fill. */}
      <Text
        {...t.txt('text-base')}
        style={{ ...t.txt('text-base').style, color: primary ? t.color['on-accent'] : t.color.accent }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * The steps, each with a real screenshot of the control it describes.
 *
 * 🔴 THESE ARE `require`d RATHER THAN FETCHED FROM public/ ON PURPOSE. A require
 *    goes through Metro, so a missing or renamed file FAILS THE BUILD. A URL into
 *    public/ would 404 at runtime — and worse, `_redirects` rewrites a 404 to
 *    index.html with a 200, so the browser would receive HTML where it asked for
 *    a PNG and simply render nothing. That is the exact shape of the invisible-
 *    icon defect this project already shipped once.
 *
 * ⚠️ THE IMAGES ARE SUPPLEMENTARY, NEVER LOAD-BEARING. This is the first screen
 *    an iPhone visitor sees, sometimes on a cold cache, so every step still names
 *    its control in words. If an image never arrives the instructions still read
 *    correctly.
 *
 * ⚠️ `width`/`height` are the sources' NATIVE pixel dimensions. Scaling a 200px-
 *    wide capture up to fill the column would blur it, and a blurred screenshot
 *    of a UI is harder to match against the real thing than a small sharp one.
 */
const STEPS: {
  n: string;
  title: string;
  detail: string;
  shot: number;
  width: number;
  height: number;
  alt: string;
}[] = [
  {
    n: '1',
    title: 'Tap the Share button',
    detail: 'A square with an arrow pointing up — in the toolbar in Safari, in the ⋯ menu in Chrome.',
    shot: require('../assets/install/step-1-share-button.png'),
    width: 200,
    height: 16,
    alt: "Safari's bottom toolbar, with the Share button third from the left",
  },
  {
    n: '2',
    title: 'Choose Add to Home Screen',
    detail: 'Scroll down the share sheet if you do not see it straight away.',
    shot: require('../assets/install/step-2-share-sheet.png'),
    width: 200,
    height: 335,
    alt: 'The iOS share sheet, with Add to Home Screen arrowed in the list',
  },
  {
    n: '3',
    title: 'Tap Add, then open Revelia',
    detail: 'It appears on your Home Screen and opens like any other app.',
    shot: require('../assets/install/step-3-confirm.png'),
    // The only step shown ABOVE its native 133px, so the two thin strips share a
    // width instead of reading as an accident. A 1.5x upscale softens it, which
    // is the lesser cost: at native size its label is too small to read at all.
    width: 200,
    height: 23,
    alt: 'The Add to Home Screen dialog, with Add at the top right',
  },
];

/**
 * A screenshot, framed so it reads as a picture of the phone's UI rather than as
 * part of ours.
 *
 * The captures are light-mode iOS on a near-black page, so they need an explicit
 * edge — without one they float as bright rectangles with no relationship to the
 * layout.
 */
function StepShot({ step }: { step: (typeof STEPS)[number] }) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        marginTop: t.space[3],
        borderRadius: t.radius.md,
        borderWidth: t.a11y.hairline,
        borderColor: t.color['border-subtle'],
        overflow: 'hidden',
      }}
    >
      <Image
        source={step.shot}
        accessibilityLabel={step.alt}
        style={{ width: step.width, height: step.height }}
        resizeMode="contain"
      />
    </View>
  );
}

function InstallInstructions() {
  return (
    <Screen eyebrow="One quick step" title="Add Revelia to your Home Screen">
      <Lede>
        Revelia runs as an app on iPhone. Installing takes about ten seconds and gives you full
        screen, offline access and notifications.
      </Lede>

      {STEPS.map((step) => (
        <View key={step.n} style={{ flexDirection: 'row', marginBottom: t.space[5] }}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: t.radius.pill,
              backgroundColor: t.color.accent,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: t.space[4],
            }}
          >
            {/* The only legal foreground on an accent fill. */}
            <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['on-accent'] }}>
              {step.n}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text {...t.txt('text-base')} style={{ ...t.txt('text-base').style, color: t.color.fg }}>
              {step.title}
            </Text>
            <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['fg-muted'] }}>
              {step.detail}
            </Text>
            <StepShot step={step} />
          </View>
        </View>
      ))}

      {/* The pre-16.4 tail. Those versions really are Safari-only, and this line
          is cheaper and more durable than parsing a version out of a user agent
          to show them a different screen. */}
      <SafariFootnote />
    </Screen>
  );
}

/**
 * The footnote, with "Safari" tappable.
 *
 * ⚠️ TAPPING IT COPIES THE LINK AND ATTEMPTS THE HAND-OFF ON THE SAME TAP, which
 * is deliberate rather than belt-and-braces: iOS gives a page no supported way to
 * open Safari and no signal when the attempt is refused, so a control that only
 * tried to hand off could silently do nothing. Copying alongside means the tap
 * always accomplishes something — and if the hand-off did work, the user is gone
 * and never sees the confirmation.
 */
function SafariFootnote() {
  const [copied, setCopied] = useState<boolean | null>(null);

  return (
    <Footnote>
      {copied === null ? (
        <>
          No Add to Home Screen in your browser? Open this page in{' '}
          <Text
            accessibilityRole="link"
            onPress={async () => setCopied(await openInSafariAndCopy())}
            style={{ color: t.color.accent, textDecorationLine: 'underline' }}
          >
            Safari
          </Text>{' '}
          instead. Already added it? Open Revelia from your Home Screen rather than this tab.
        </>
      ) : copied ? (
        'Link copied. If Safari did not open, paste it into Safari and add Revelia from there.'
      ) : (
        'Copy the address from the bar above and open it in Safari to add Revelia.'
      )}
    </Footnote>
  );
}
