import React, { useState } from 'react';
import { View, Text, ScrollView, Platform, Dimensions } from 'react-native';
import { showAlert } from '@/lib/alert';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { GrainLayer } from '@/components/ui/GrainLayer';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { useAuthStore } from '@/store/authStore';
import * as t from '@/theme';

// On iOS production, flex:1 was not propagating from the navigation host
// down through SafeAreaView + LinearGradient (collapsed to ~82px safe-area
// inset). Pinning the outer container to explicit Dimensions fixes it on
// iOS without affecting Android.
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Guarded require for expo-apple-authentication. The original top-level
// `import * as AppleAuthentication` would throw on parse if the native
// module was unavailable in the iOS production bundle, preventing the
// screen from mounting. The require + try/catch lets the screen render
// even if the module is missing.
let AppleAuth: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AppleAuth = require('expo-apple-authentication');
} catch {
  // Apple Sign In unavailable — screen still renders; button just won't show.
}

export default function Welcome() {
  const router = useRouter();
  const { loginWithApple, loginWithGoogle } = useAuthStore();
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);

  // Check if Apple Sign In is available
  React.useEffect(() => {
    if (Platform.OS === 'ios' && AppleAuth?.isAvailableAsync) {
      AppleAuth.isAvailableAsync()
        .then((avail: boolean) => setIsAppleAvailable(avail))
        .catch(() => setIsAppleAvailable(false));
    }
  }, []);

  const handleAppleSignIn = async () => {
    try {
      await loginWithApple();
    } catch (err: any) {
      // User-cancelled flows aren't a failure — silently swallow.
      if (err?.code === 'ERR_REQUEST_CANCELED' || err?.code === 'ERR_CANCELED') {
        return;
      }
      console.error('Apple Sign In error:', err);
      showAlert(
        'Apple Sign In Unavailable',
        "Apple Sign In is temporarily unavailable. Please tap 'Get Started' to create an account."
      );
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      showAlert(
        'Sign In Failed',
        'Google Sign In is unavailable. Please try again or use another sign-in method.'
      );
    }
  };

  return (
    /* 🔴 O-73 — THE SLAB RETIRES, THE NODE SURVIVES, AND BOTH HALVES ARE REQUIRED.
       This screen's ground ran from the canvas to a translucent accent wash, so every
       foreground's contrast was a function of its VERTICAL POSITION rather than of its own
       style rule — the class the A5 pair rule structurally cannot resolve. Measured down it,
       nothing crossed and nothing was sub-AA, but the meta role fell 5.36:1 -> 4.72:1, i.e.
       to a margin of 0.22 over AA, ON A GROUND WHOSE SECOND STOP IS TRANSLUCENT — so the real
       figure depends on what the layout paints behind it and moves if that ever changes. That
       is O-66 one ground over: a published figure that does not describe the surface the text
       sits on.
       design §2's aura row already retires every gradient slab in the system except the
       primary control's fill, and items 9-11 applied exactly this subtraction to the three
       share cards. So the two stops are now EQUAL and every foreground has one published
       figure again (the meta role 5.36:1).
       🔴 THE ELEMENT IS NOT REPLACED BY A View, AND THAT IS X2 VERBATIM: audit §5.1 X2 says
       "do not simplify it to a plain View". Equalising the stops is the mechanism §10.2.4
       already specifies for X3's button for the same reason — it removes the ramp without
       removing the node. */
    <LinearGradient
      colors={[t.color.bg, t.color.bg]}
      style={{
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        position: 'absolute',
        top: 0,
        left: 0,
      }}
    >
      {/* Texture mount ii of iii (design §4.6). This screen deliberately does NOT use
          ScreenContainer — X2 — so it does not inherit mount i and needs its own. It goes
          INSIDE the pinned wrapper above and BEFORE the safe area, exactly as in the primitive:
          inside, because only this element knows the real screen box; before, because siblings
          paint in order and the texture belongs under everything the screen draws. */}
      <GrainLayer />
      <SafeAreaView style={{ flex: 1, width: '100%', minHeight: SCREEN_HEIGHT }}>
        <ScrollView
          style={{ flex: 1, width: '100%' }}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            // 🔴 PASS 3a — the screen gutter, named. This is the X2 HAND-ROLLED copy of
            //    ScreenContainer's contentContainerStyle (this screen deliberately does not use
            //    ScreenContainer — do NOT "unify" it), so it must carry the same two tokens or the
            //    gutter drifts between the welcome screen and all 25 others the moment either is
            //    retuned. Byte-identical: 24 and 32.
            paddingHorizontal: t.space['screen-x'],
            paddingVertical: t.space['screen-y'],
            minHeight: SCREEN_HEIGHT - 100,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* App Logo & Title */}
          <View className="items-center mb-12">
            {/* 🔴 §17 — THIS SCREEN'S ONE HERO, AND IT RETIRES AN OFF-RAMP className SIZE.
                The wordmark was a legacy Tailwind size utility that resolves to SIXTY POINTS
                WITH NO lineHeight AT ALL — twice the ramp's ceiling, no tracking, and no face,
                because a size utility cannot carry one (§3.1). It takes the ramp's top display
                step, which brings its own serif with it. See the commit body: eleven sites in
                the tree write one of these and five instruments read clean on every one. */}
            <Text {...t.txt('display-lg')} style={{ ...t.txt('display-lg').style, color: t.color.fg }} className="mb-4">
              Revelia
            </Text>
            {/* §17.1's pairing — the eyebrow step as the hero's immediate neighbour, with no
                mid-ramp step between them, and the SAME treatment the splash's identical copy
                now takes so the app's two brand lockups agree. String unchanged; the casing is
                a textTransform render (C-6). */}
            <Text
              {...t.txt('overline')}
              style={{ ...t.txt('overline').style, color: t.color.accent, textTransform: 'uppercase' }}
              className="mb-2"
            >
              Trained on 1000+ Years of Wisdom
            </Text>
            <Text className="text-fg-muted text-center text-base px-4">
              Your face. Your palm. Your future.
            </Text>
          </View>

          {/* Features
              🔴 THREE A5 FAILURES AND ONE accent-2 SEMANTIC MISUSE, ALL RETIRED STRUCTURALLY.
              Each row led with a 48dp saturated disc holding one emoji, and the emoji carried
              the PLAIN foreground: 2.31:1 on the clay fill twice and 1.96:1 on the iris fill
              once — the iris one being the worst and the one `no-white-on-accent` could not
              see. It is also the only reason those pairs were survivable: an emoji renders in
              the emoji font, so its colour barely applies. THAT IS NOT A DEFENCE, IT IS THE
              §9.2 VIOLATION — no emoji renders as an icon anywhere in the system — and the
              moment a real glyph replaces it the colour becomes load-bearing.
              So the discs go and the glyphs arrive, which is §10.1.3's ruling for this exact
              idiom (48dp coloured circles -> 20dp Ionicons in the meta role) applied to the
              same idiom one screen earlier. It resolves four things at once:
                · no fill, so there is no on-fill role to get wrong — the pairs cannot recur;
                · the iris fill is gone, and §16.1 never licensed it here: that list is
                  long-form / generated / premium-depth content and a palm-reading marker is
                  none of those, so the alternation was decorative hue, which §16 exists to
                  remove;
                · clay is left marking exactly one thing on this screen — the CTA — which is
                  §16.2's own sentence ("if clay and iris appear together, clay is the button");
                · and the three glyph names are all SPECIFIED (§9.2, and §10.1's element
                  inventory maps the first two by name), so nothing is invented.
              ⚠️ THE LEADING SLOT KEEPS ITS 48dp BOX ON PURPOSE — only the fill and the corner
              leave. That is what makes the reflow exactly zero: the titles stay on the same
              baseline and the same x, so this is a fill-and-element change, not a re-layout. */}
          <View className="mb-12">
            <View className="flex-row items-center mb-6">
              <View className="w-12 h-12 items-center justify-center mr-4">
                <Ionicons name="person-outline" size={24} color={t.color['fg-muted']} />
              </View>
              <View className="flex-1">
                <Text className="text-fg font-body-semi text-lg">Face Reading</Text>
                <Text className="text-fg-muted text-sm">Ancient physiognomy meets modern insight</Text>
              </View>
            </View>

            <View className="flex-row items-center mb-6">
              <View className="w-12 h-12 items-center justify-center mr-4">
                <Ionicons name="hand-left-outline" size={24} color={t.color['fg-muted']} />
              </View>
              <View className="flex-1">
                <Text className="text-fg font-body-semi text-lg">Palm Reading</Text>
                <Text className="text-fg-muted text-sm">Ancient palmistry insights</Text>
              </View>
            </View>

            <View className="flex-row items-center mb-6">
              <View className="w-12 h-12 items-center justify-center mr-4">
                <Ionicons name="sparkles-outline" size={24} color={t.color['fg-muted']} />
              </View>
              <View className="flex-1">
                <Text className="text-fg font-body-semi text-lg">Astrology & Numerology</Text>
                <Text className="text-fg-muted text-sm">Cosmic guidance & predictions</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={{ gap: t.space['4'] }}>
            <Button
              title="Get Started"
              onPress={() => router.push('/(auth)/signup')}
              variant="primary"
              fullWidth
              size="lg"
            />

            {/* Social Sign In Buttons — only render when both the JS module
                AND the runtime availability check succeed. Defensive against
                the property-access throw mode on broken native modules. */}
            {Platform.OS === 'ios' && isAppleAvailable && AppleAuth?.AppleAuthenticationButton && (
              <AppleAuth.AppleAuthenticationButton
                buttonType={AppleAuth.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuth.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={t.radius.md}
                style={{ width: '100%', height: 56 }}
                onPress={handleAppleSignIn}
              />
            )}

            {/* Google Sign In — Android-only. Apple guideline 4.8 makes
                Google a redundant social-auth option on iOS where Apple
                Sign In is the platform-native choice. */}
            {/* 🔴 THIS WAS A FULL-WIDTH CTA SIZED BY PADDING ALONE — X3's FAILURE MODE, ONE
                COMPONENT OVER. X3 pins Button's three heights because iOS production collapsed
                padding-sized full-width controls into thin ribbons (Build 13); this control
                reproduced the banned shape by hand, outside the primitive, so the guard could
                not reach it. Taking the primitive is what makes it X3-covered — and it lands on
                the `secondary` variant, whose fill IS the surface step this hand-rolled copy
                used, so the treatment is preserved rather than reinvented. ⚠️ Its height moves
                to the `lg` step, which is what its two siblings already are: the screen's three
                CTAs were three different heights and are now one. */}
            {/* Google Sign In — Android AND web, never iOS-native. App Store guideline 4.8
                requires Sign in with Apple alongside third-party sign-in, and that rule governs
                an APP STORE BINARY; a PWA in Safari is not reviewed by Apple, so web may offer
                Google on an iPhone too — which matters because web is the ONLY route iOS users
                have. See login.tsx for the full note. */}
            {(Platform.OS === 'android' || Platform.OS === 'web') && (
              <GoogleSignInButton onPress={handleGoogleSignIn} />
            )}

            <Button
              title="I Already Have an Account"
              onPress={() => router.push('/(auth)/login')}
              variant="outline"
              fullWidth
              size="lg"
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
