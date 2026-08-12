import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Button } from '@/components/ui/Button';
import { pwaGateMode, tryOpenInSafari, copyCurrentUrl } from '@/lib/pwaGate.web';
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
 * The mode is read ONCE, at mount. It cannot change without a page load: a user
 * does not switch browsers or install an app mid-session, and re-reading it on
 * every render would only add a way for the tree to flicker.
 *
 * Android and desktop are untouched — see lib/pwaGate.web.ts for why iOS alone
 * gets this treatment.
 */
export function InstallGate({ children }: { children: React.ReactNode }) {
  const [mode] = useState(pwaGateMode);

  if (mode === 'none') return <>{children}</>;
  return mode === 'open-in-safari' ? <OpenInSafari /> : <InstallInstructions />;
}

// ── shared shell ──────────────────────────────────────────────────────────────

function Shell({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
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

function Body({ children }: { children: React.ReactNode }) {
  return (
    <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['fg-secondary'], marginBottom: t.space[6] }}>
      {children}
    </Text>
  );
}

// ── iOS + Safari: how to install ──────────────────────────────────────────────

const STEPS: { n: string; title: string; detail: string }[] = [
  { n: '1', title: 'Tap the Share button', detail: 'The square with an arrow pointing up, in Safari’s toolbar.' },
  { n: '2', title: 'Choose Add to Home Screen', detail: 'Scroll down the share sheet if you do not see it straight away.' },
  { n: '3', title: 'Tap Add, then open Revelia', detail: 'It appears on your Home Screen like any other app.' },
];

function InstallInstructions() {
  return (
    <Shell eyebrow="One quick step" title="Add Revelia to your Home Screen">
      <Body>
        Revelia runs as an app on iPhone. Installing takes about ten seconds and gives you full
        screen, offline access and notifications.
      </Body>

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
          </View>
        </View>
      ))}

      <Text
        {...t.txt('text-xs')}
        style={{
          ...t.txt('text-xs').style,
          color: t.color['fg-muted'],
          marginTop: t.space[2],
          borderTopWidth: t.a11y.hairline,
          borderTopColor: t.color['border-subtle'],
          paddingTop: t.space[4],
        }}
      >
        Already added it? Open Revelia from your Home Screen rather than this tab.
      </Text>
    </Shell>
  );
}

// ── iOS + another browser: only Safari can install ────────────────────────────

function OpenInSafari() {
  // 🔴 THE HAND-OFF CANNOT BE CONFIRMED. iOS gives a page no supported way to
  //    launch Safari and no signal when the attempt is refused — see
  //    tryOpenInSafari. So the copy-link path is revealed on the first tap
  //    regardless of whether the hand-off worked: if it did, this screen is
  //    gone and nobody reads it; if it did not, the way forward is already
  //    on screen instead of the user tapping a dead control repeatedly.
  const [attempted, setAttempted] = useState(false);
  const [copied, setCopied] = useState<boolean | null>(null);

  return (
    <Shell eyebrow="Safari required" title="Open this page in Safari">
      <Body>
        iPhone can only add apps to the Home Screen from Safari — the other browsers do not offer
        it. Open Revelia in Safari and the install takes about ten seconds.
      </Body>

      <Button
        title="Open in Safari"
        onPress={() => {
          setAttempted(true);
          tryOpenInSafari();
        }}
        variant="primary"
        fullWidth
        size="lg"
      />

      {attempted ? (
        <View style={{ marginTop: t.space[6] }}>
          <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color['fg-secondary'], marginBottom: t.space[3] }}>
            Still here? Your browser blocked the hand-off. Copy the link and paste it into Safari.
          </Text>
          <Button
            title={copied === true ? 'Link copied' : copied === false ? 'Copy failed — select the address bar' : 'Copy link'}
            onPress={async () => setCopied(await copyCurrentUrl())}
            variant="secondary"
            fullWidth
            size="lg"
          />
        </View>
      ) : null}
    </Shell>
  );
}
