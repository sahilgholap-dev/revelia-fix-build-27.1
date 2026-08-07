import { useEffect, useState } from 'react';
import { View, Text, Image } from 'react-native';
import { Redirect, useRootNavigationState } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import * as t from '@/theme';

export default function Index() {
  const rootNavigationState = useRootNavigationState();
  const { isAuthenticated, isLoading, hasHydrated, checkAuth } = useAuthStore();
  const { profile, lastFetchOk, fetchProfile } = useProfileStore();
  const [isReady, setIsReady] = useState(false);
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      fetchProfile();
    }
  }, [isAuthenticated, isLoading]);

  // Wait for navigation to be ready before issuing a Redirect — keeps the
  // declarative redirect from racing root-layout mount.
  useEffect(() => {
    if (rootNavigationState?.key) {
      setIsReady(true);
    }
  }, [rootNavigationState?.key]);

  // Fallback: 3s timeout for the unauthenticated-rehydration case so we
  // don't spin forever on splash if SecureStore reads hang (e.g. broken
  // keychain on first install). For authenticated users we DO keep
  // waiting — the auth-rehydration gate (hasHydrated) and the
  // profile-fetch gate (lastFetchOk) must both resolve before we route.
  useEffect(() => {
    const timer = setTimeout(() => setStalled(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Compute target during render (declarative <Redirect> fires synchronously
  // through expo-router's resolver — works on iOS production where
  // imperative router.replace() in useEffect can be silently dropped).
  //
  // Gating order matters: the Build 24 fix for the "Tell Us About Yourself
  // reappears on warm resume" regression depends on NOT evaluating the
  // birth-data redirect until BOTH auth rehydration (hasHydrated) and a
  // definitive profile fetch (lastFetchOk) have resolved. On Android
  // activity-recreate resumes with a flaky network, fetchProfile can fail
  // while the user is genuinely fully onboarded; routing on default empty
  // profile state was sending those users into onboarding.

  let target: string | null = null;

  if (!isReady) {
    target = null;
  } else if (!hasHydrated) {
    // Auth still rehydrating from SecureStore. Hold splash; fall through
    // to welcome ONLY if rehydration hangs past the 3s stalled timeout.
    target = stalled ? '/(auth)/welcome' : null;
  } else if (!isAuthenticated) {
    target = '/(auth)/welcome';
  } else if (!lastFetchOk) {
    // Authenticated but profile fetch hasn't returned a definitive answer
    // (still in-flight or failed with a non-404 network/5xx). Do NOT route
    // to onboarding based on the default empty store state — that's the
    // regression. Hold splash; the fetchProfile call above will resolve
    // or the user can close and reopen if the network is degraded.
    target = null;
  } else if (!profile || !profile.birthData?.date) {
    target = '/(capture)/birth-data';
  } else if (!profile.images?.face) {
    target = '/(capture)/face-capture';
  } else if (!profile.images?.palmDominant) {
    target = '/(capture)/palm-capture';
  } else {
    target = '/(main)/home';
  }

  if (target === null) {
    // A solid `t.color.bg` fill, the same transparent logo asset (assets/splash.png) as the
    // native splash, and no gradient — so the native-splash → JS handoff has one ground.
    //
    // 🔴 C-P5-4 / P18a — app.json's splash and adaptive-icon values are OS SURFACES painted
    //    before any JS runs, so no token can reach them and `no-raw-hex` is structurally blind
    //    to both. THEY DID NOT FLIP WITH PASS 5. Until the rebrand assets land, this View is
    //    Vellum and the native splash behind it is still the pre-revamp brand ground, so the
    //    app cross-fades between two palettes on first paint. 🔴 THAT SHIPS WITH P18a AND IS
    //    NOT FIXABLE HERE — do not attempt it in code. (Both values are named by role rather
    //    than quoted: a comment is source, CLAUDE.md.)
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: t.color.bg,
        }}
      >
        {/* 🔴 PASS 3a — the screen gutter, named (design §4.2). This screen does not use
            ScreenContainer, so the gutter was hand-typed here. Byte-identical: 24. */}
        <View style={{ alignItems: 'center', paddingHorizontal: t.space['screen-x'] }}>
          <Image
            source={require('../assets/splash.png')}
            style={{ width: 200, height: 200, marginBottom: t.space['4'] }}
            resizeMode="contain"
          />
          {/* 🔴 §17 — THE SPLASH'S ONE HERO, AND IT RETIRES AN ABOVE-CEILING LITERAL.
              The wordmark was a raw size two points over the ramp's top step, carried by an
              explicit body face. §17.1's test is "a single value or identity the user came
              for", and a splash has exactly one of those. So it takes the ramp's top display
              step, which is also the NEAREST SPECIFIED VALUE to what it had (§0.0 rule 2) —
              the excepted count in `no-numeric-fontsize` falls by one and nothing was
              reclassified to get there.
              🔴 AND THE FACE ARRIVES FROM THE SPREAD, WHICH IS WHY THERE IS NO EXPLICIT
              FAMILY HERE. On a display step the spread already carries the serif; naming a
              family alongside it is the defect `family-arrival-check` was written for, and on
              this site it was live — the brand wordmark has never rendered in the display
              face. ⚠️ That is a VISIBLE change to the brand lockup, registered for the owner. */}
          <Text
            {...t.txt('display-lg')}
            style={{ ...t.txt('display-lg').style, color: t.color.fg, marginBottom: t.space['2'], textAlign: 'center' }}
          >
            Revelia
          </Text>
          {/* §17.1's pairing: the hero's immediate neighbour is the eyebrow step, and that
              adjacency IS the contrast — no mid-ramp step between them. The STRING IS
              UNCHANGED; the casing is a `textTransform` render, never an edit (C-6). */}
          <Text
            {...t.txt('overline')}
            style={{
              ...t.txt('overline').style,
              color: t.color.accent,
              marginBottom: t.space['8'],
              textAlign: 'center',
              textTransform: 'uppercase',
            }}
          >
            Trained on 1000+ Years of Wisdom
          </Text>
          <LoadingSpinner size="large" />
          {/* 🔴 THE NEUTERED SAFETY NET IS GONE, AND ITS DEBTOR WAS THIS COMMIT.
              A second indicator used to sit here at zero opacity. `LoadingSpinner`'s own
              header registered it at item 12 and named the reason it was not deleted there:
              this column is vertically centred, so removing ~30 points of column height MOVES
              THE WHOLE SPLASH, which is not a change to slip into a loading-system commit. It
              is exactly a change to make in the splash's own commit, where the column is being
              laid out anyway.
              It was authored as a fallback "in case LoadingSpinner's utility classes fail to
              resolve on a given device" — and it could never have fired: it was set to zero
              opacity four builds ago when the diagnostic instrumentation was stripped, and the
              comment that explained it went with that strip while the element stayed. Item 12
              then rewrote the indicator to a bare RN one with an inline token colour, so the
              failure mode it guarded no longer exists either. An invisible safety net is not a
              safety net — it is a spacer that reads as a working seam. */}
        </View>
      </View>
    );
  }

  return <Redirect href={target as any} />;
}
