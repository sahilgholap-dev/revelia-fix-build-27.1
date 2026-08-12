import { useEffect, useRef, useState } from 'react';
import { Stack, useSegments, useRouter, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';
import { useEngagementStore } from '@/store/engagementStore';
import { useSubscriptionStore, initSubscriptionSync } from '@/store/subscriptionStore';
import { initReviewStore } from '@/store/reviewStore';
import {
  initializeOneSignal,
  setNotificationClickHandler,
  getOneSignalPlayerId,
  getOneSignalPushToken,
} from '@/lib/onesignal';
import { initializeRevenueCat, identifyUser } from '@/lib/revenuecat';
import { subscriptionService } from '@/services/subscription.service';
import { notificationService } from '@/services/notification.service';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { installTextDefaults } from '@/lib/textDefaults';
import { registerServiceWorker } from '@/lib/registerSw';
import { setNavigationReady, safeNavigate } from '@/lib/navigationReady';
import { InstallGate } from '@/components/InstallGate';
import '../global.css';
import * as t from '@/theme';

// Keep the native splash visible until React has its first frame ready.
// Without this, iOS shows a brief uncolored frame (or worse, a color shift
// from the splash purple to the app's dark background) between the native
// launch image and the JS-rendered tree. Calling at module scope (before
// any component runs) ensures the prevent-hide takes effect early enough.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Silently ignore — preventAutoHide can throw if called twice or after
  // the splash already auto-hid. Either way we just proceed.
});

// Brand background color used everywhere a render might fall through.
const BRAND_BG = t.color.bg;

// ── PASS 4 · E6a + E6b — the two app-wide text defaults. MODULE SCOPE, and it has to be. ──
// Effects run AFTER the first render, and a <Text> that has already mounted does not re-resolve
// its typeface — so an effect would leave the first frame of every screen in the system font.
// This call never throws (it logs and returns false); see lib/textDefaults.ts for why the
// documented `Text.defaultProps` route is a silent no-op on React 19, and for the census showing
// that 592 of this app's 1,118 <Text> nodes have no other way to name a face.
installTextDefaults();

// Web only (the native module is a no-op): registers /sw.js, which is what makes
// the PWA installable and gives an installed app an offline launch. Module scope
// like the call above, but for the opposite reason — it is not render-sensitive,
// it simply has no dependency on React and nothing to wait for. It never throws.
registerServiceWorker();

// ╔══════════════════════════════════════════════════════════════════════════════════════╗
// ║  PASS 4 · E1 — THE FIVE FACES.  RUNTIME `useFonts`, NEVER THE expo-font PLUGIN.       ║
// ╚══════════════════════════════════════════════════════════════════════════════════════╝
//
// 🔴 THE KEYS BELOW ARE THE CONTRACT. They must match theme.js's `family` object EXACTLY,
//    because on the RUNTIME path the JS key *is* the fontFamily namespace on both platforms —
//    verified against the INSTALLED expo-font 13.3.2, not from docs:
//      · iOS     FontLoaderModule.swift registers the font, reads its real PostScript name and
//                stores alias -> postScriptName in FontFamilyAliasManager; then
//                UIFont+FontFamilyAlias.swift SWIZZLES fontNames(forFamilyName:) so a lookup
//                that finds nothing retries through the alias.
//      · Android FontLoaderModule.kt:50 calls ReactFontManager.setTypeface(<key>, ...) with the
//                same key.
//    A key/PostScript mismatch therefore CANNOT occur on this path.
//
// 🔴 DO NOT ADD `expo-font` TO app.json's `plugins` ARRAY, AND DO NOT ACCEPT IT IF AN
//    `expo install` PUTS IT THERE. The plugin path is platform-ASYMMETRIC: its iOS mod appends
//    the FILENAME to UIAppFonts and iOS then resolves against the font's INTERNAL PostScript
//    name (there is no alias manager on that path at all), while its Android mod copies the file
//    and RN resolves against the FILENAME BASE. When those two strings differ, one platform
//    silently renders SF Pro and the other silently renders Roboto — no throw, no warning, no
//    log. Mixing the two paths is worse still: it gives one face two resolvable names.
//    `preflight-findings.md` §E2 has the line-level evidence; P24 records that an `expo install`
//    already added the plugin once, at pass 0, and that the revert is HELD.
const FONT_MAP = {
  'Literata-Bold': require('../assets/fonts/Literata-Bold.ttf'),
  'Literata-Italic': require('../assets/fonts/Literata-Italic.ttf'),
  'Figtree-Regular': require('../assets/fonts/Figtree-Regular.ttf'),
  'Figtree-SemiBold': require('../assets/fonts/Figtree-SemiBold.ttf'),
  'Figtree-Bold': require('../assets/fonts/Figtree-Bold.ttf'),
};

// Ceiling on the font wait, following app/index.tsx's `stalled` precedent (:38-42). `useFonts`
// resolves to loaded-or-error in tens of milliseconds from a bundled asset, so this only ever
// fires if the native module never answers at all. Without it, "hold the splash until fonts
// resolve" becomes "hold the splash forever" on a device where it doesn't.
const FONT_WAIT_CEILING_MS = 3000;

export default function RootLayout() {
  const { isAuthenticated, isLoading, checkAuth, user, hasHydrated } = useAuthStore();
  const { profile, fetchProfile, lastFetchOk } = useProfileStore();
  const { checkIn, hasCheckedInToday } = useEngagementStore();
  const { checkSubscriptionStatus } = useSubscriptionStore();
  const segments = useSegments();
  const router = useRouter();
  // Mount signal for the navigator. Read here so the auth-redirect effect below
  // can wait for it — see the comment at that effect for why a cold load at a
  // deep route (a page refresh, on web) otherwise throws before anything renders.
  const rootNavigationState = useRootNavigationState();

  // Holds a deep-link target captured before auth resolves (killed-app launch
  // via notification tap). Replayed by the deferred-nav effect below once the
  // entry redirect has settled, so the tap isn't clobbered by index.tsx.
  const pendingDeepLinkRef = useRef<string | null>(null);

  // ---- The five faces (pass 4 · E1) ----
  // 🔴 GATED ON `fontsLoaded || fontError`, NEVER ON `fontsLoaded` ALONE (§1.7). A face that
  //    fails to decode must not leave the app permanently on the splash — that would turn a
  //    cosmetic defect into a total launch failure.
  const [fontsLoaded, fontError] = useFonts(FONT_MAP);
  const [fontWaitExpired, setFontWaitExpired] = useState(false);
  const fontsReady = fontsLoaded || !!fontError || fontWaitExpired;

  useEffect(() => {
    const timer = setTimeout(() => setFontWaitExpired(true), FONT_WAIT_CEILING_MS);
    return () => clearTimeout(timer);
  }, []);

  // ---- Auth check ----
  useEffect(() => {
    void checkAuth();
  }, []);

  // ---- Hide the native splash once React has mounted its first frame.
  // The auth check above continues in parallel; we don't gate splash hide
  // on its completion because the index.tsx loading state already shows
  // the user a clean dark gradient with logo while auth resolves.
  // Hiding here = no white flash, no color shift between splash and app.
  //
  // 🔴 PASS 4 · E1 — THE FONT WAIT SITS *BEHIND* THIS HOLD, NOT IN FRONT OF IT, AND THE
  //    DIFFERENCE IS THE WHOLE POINT. The obvious shape — `if (!fontsLoaded) return null` at
  //    the top of the component — is WRONG here twice over: effects run regardless of what a
  //    render returns, so this hideAsync would still fire and reveal an EMPTY frame; and
  //    returning null unmounts the three nested BRAND_BG layers that exist specifically as
  //    belt-and-braces against a cold-start white flash (UI-audit §7.5).
  //
  //    So instead of gating the render in front of the splash, the splash STAYS UP until the
  //    fonts resolve. `fontsReady` is the only thing added to this dependency list, and the
  //    ceiling above guarantees it becomes true.
  //
  //    THE FIRST FRAME, stated explicitly because §1.7 asks for it: the native splash image on
  //    the brand-background colour, held from module scope by preventAutoHideAsync() and released
  //    only once the faces are registered. The user never sees a frame of text in the system
  //    font, and never sees a reflow from Roboto metrics to Figtree metrics. If a face fails to
  //    decode, or the ceiling fires, the splash releases anyway and the app renders in the
  //    system font — degraded, never stuck.
  useEffect(() => {
    if (!fontsReady) return;
    SplashScreen.hideAsync().catch(() => {
      // Already hidden — fine to ignore.
    });
  }, [fontsReady]);

  // A decode failure is a real product defect (every named family silently falls back to the
  // system font) and it has NO other signal — so log it once, loudly. Do not throw: see the
  // gate reasoning above.
  useEffect(() => {
    if (fontError) console.error('Font load failed — the app is rendering in the system font:', fontError);
    else if (fontWaitExpired && !fontsLoaded) console.error('Font load did not resolve within the wait ceiling; releasing the splash in the system font.');
  }, [fontError, fontWaitExpired, fontsLoaded]);

  // ---- OneSignal + RevenueCat init (each guarded individually) ----
  useEffect(() => {
    try {
      initializeOneSignal();
    } catch (err) {
      console.error('OneSignal init failed:', err);
    }
    try {
      initializeRevenueCat();
      // Propagate async/deferred CustomerInfo changes into both stores live.
      initSubscriptionSync();
    } catch (err) {
      console.error('RevenueCat init failed:', err);
    }
    try {
      // Rehydrate the app-rating counter from SecureStore once at launch.
      // Without this the count would reset every cold start.
      void initReviewStore();
    } catch (err) {
      console.error('Review store init failed:', err);
    }
    try {
      setNotificationClickHandler((event) => {
        const additional = (event.notification.additionalData ?? {}) as Record<string, string>;
        const screen = additional.screen ?? 'home';
        // Read fresh auth state — this handler is registered once, so the
        // closed-over hook vars (isAuthenticated/isLoading) are stale here.
        const { isAuthenticated: authed, isLoading: loading } = useAuthStore.getState();
        if (authed && !loading) {
          // Warm start: navigate immediately.
          handleDeepLink(screen);
        } else {
          // Cold start: auth not resolved yet. Defer until the entry redirect
          // settles so this nav isn't overwritten by index.tsx.
          pendingDeepLinkRef.current = screen;
        }
      });
    } catch (err) {
      console.error('Notification handler setup failed:', err);
    }
  }, []);

  // ---- Profile fetch when authenticated ----
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      void fetchProfile();
    }
  }, [isAuthenticated, isLoading]);

  // ---- Post-auth side effects ----
  useEffect(() => {
    if (isAuthenticated && !isLoading && user) {
      registerDeviceForNotifications();

      identifyUser(user._id)
        .then(() => subscriptionService.linkRevenueCatUser(user._id))
        .then(() => checkSubscriptionStatus())
        .catch(console.error);

      if (!hasCheckedInToday) {
        try {
          checkIn();
        } catch (err) {
          console.error('Check-in failed:', err);
        }
      }
    }
  }, [isAuthenticated, isLoading, user]);

  // ---- Replay a deferred deep link (killed-app launch via notification) ----
  // index.tsx performs the entry redirect declaratively (<Redirect href=...>),
  // resolving to /(main)/home only once auth + profile settle. If we pushed the
  // deep-link target before that, the Redirect would clobber it. So we gate the
  // replay on segments[0] === '(main)' — i.e. the entry redirect has already
  // landed on home — then push the target on top (back returns to home).
  useEffect(() => {
    if (isAuthenticated && !isLoading && pendingDeepLinkRef.current && segments[0] === '(main)') {
      const screen = pendingDeepLinkRef.current;
      pendingDeepLinkRef.current = null;
      handleDeepLink(screen);
    }
  }, [isAuthenticated, isLoading, profile, segments]);

  const handleDeepLink = (screen: string) => {
    switch (screen) {
      case 'daily-insight':
        router.push('/(main)/astrology/daily' as any);
        break;
      case 'monthly-reading':
        router.push('/(main)/astrology/monthly' as any);
        break;
      case 'compatibility':
        router.push('/(main)/compatibility');
        break;
      case 'home':
      default:
        router.push('/(main)/home');
        break;
    }
  };

  const registerDeviceForNotifications = async () => {
    try {
      // Wait for push token to be available (up to 10 seconds)
      let playerId = null;
      for (let i = 0; i < 10; i++) {
        playerId = await getOneSignalPlayerId();
        const token = await getOneSignalPushToken();
        if (playerId && token) break;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      if (playerId) {
        const platform = Platform.OS as 'ios' | 'android';
        await notificationService.registerDevice(playerId, platform);
      }
    } catch (error) {
      console.error('Device registration failed:', error);
    }
  };

  // ---- Auth-state-driven navigation ----
  useEffect(() => {
    // 🔴 WAIT FOR THE NAVIGATOR TO MOUNT BEFORE REDIRECTING. This is the same
    //    guard app/index.tsx already applies to its <Redirect>, and the reason
    //    is the same one its comment gives — this effect can race root-layout
    //    mount. It was missing here, and on the WEB that is not a rare race but
    //    the normal path for a COLD LOAD AT A DEEP ROUTE: expo-router restores
    //    the URL, this effect runs before the navigator exists, and
    //    router.replace throws "Attempted to navigate before mounting the Root
    //    Layout component". The screen stays blank and the error names only
    //    <ContextNavigator>, so it reads as a router bug rather than this line.
    //
    //    It matters far more on web than native because RELOADING THE PAGE IS A
    //    NORMAL USER ACTION. Every deep link, every bookmark, every refresh,
    //    and every push-notification landing hits this path. Measured: loading
    //    /face-capture directly rendered an empty document.
    if (!rootNavigationState?.key) return;
    // Release anything that tried to navigate before the navigator existed —
    // notably the api.ts 401 redirect, whose timing belongs to the server.
    setNavigationReady();
    if (isLoading) return;

    // 🔴 THE SAME TWO GATES app/index.tsx APPLIES, AND FOR THE SAME REASON — see
    //    the Build 24 note there ("Tell Us About Yourself reappears on warm
    //    resume"). Routing on the DEFAULT EMPTY profile sends a fully-onboarded
    //    user back into onboarding.
    //
    //    This effect was missing them because on native it is not the entry
    //    point: a cold start lands on "/" and index.tsx does the gating. On WEB
    //    a cold load at any other route BYPASSES index.tsx entirely and this
    //    effect decides alone — with the profile still unfetched. Measured after
    //    the blank-page fix: all seven routes rendered, and every one of them
    //    redirected an onboarded account to /birth-data. Same regression, new
    //    door.
    if (!hasHydrated) return;
    if (isAuthenticated && !lastFetchOk) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inMainGroup = segments[0] === '(main)';
    const inCaptureGroup = segments[0] === '(capture)';
    const inPaywallGroup = segments[0] === '(paywall)';

    // safeNavigate, not a bare router.replace: on a cold load the router can
    // still reject a navigation at this point even though rootNavigationState
    // already has a key. It retries for a few frames instead of throwing, which
    // is what kept the page blank.
    if (!isAuthenticated && (inMainGroup || inCaptureGroup || inPaywallGroup)) {
      safeNavigate(() => router.replace('/(auth)/login'));
    } else if (isAuthenticated && inAuthGroup) {
      if (!profile || !profile.birthData) {
        safeNavigate(() => router.replace('/(capture)/birth-data' as any));
      } else if (!profile.images?.face) {
        safeNavigate(() => router.replace('/(capture)/face-capture'));
      } else if (!profile.images?.palmDominant) {
        safeNavigate(() => router.replace('/(capture)/palm-capture'));
      } else {
        safeNavigate(() => router.replace('/(main)/home'));
      }
    }
  }, [isAuthenticated, isLoading, segments, profile, rootNavigationState?.key, hasHydrated, lastFetchOk]);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: BRAND_BG }}>
        <SafeAreaProvider style={{ flex: 1, backgroundColor: BRAND_BG }}>
          <StatusBar style="light" />
          <ErrorBoundary>
            <View style={{ flex: 1, backgroundColor: BRAND_BG }}>
              {/* 🔴 PASS 4 · E1 — THE GATE IS *INSIDE* ALL THREE BRAND_BG LAYERS, and it must
                  stay there. Whatever this branch renders, the frame underneath is BRAND_BG —
                  which is why the null branch is safe and why hoisting this gate above
                  GestureHandlerRootView (or into an early `return null`) would reintroduce
                  exactly the white flash those three layers exist to prevent.

                  WHY THE TREE IS GATED AT ALL, rather than left to re-render: registering a
                  family does NOT restyle text that is already mounted. On Android the typeface
                  is resolved when the text view is created, and `useFonts` resolving only
                  re-renders THIS component — children whose props did not change never
                  re-render, so their native views keep the system font until something else
                  invalidates them. Mounting the tree after the faces are registered is the only
                  version of this that is correct on a cold start. */}
              {/* 🔴 ON WEB THE NAVIGATOR MUST EXIST ON THE *FIRST* RENDER, so the font gate
                  above is bypassed there — and only there.

                  Expo Router resolves the current URL into navigation state as it mounts. On
                  native that is always "/" and nothing navigates until later, so rendering null
                  for the few milliseconds fonts take is harmless. On web the URL can be ANY
                  route — a refresh, a bookmark, a shared link, a notification landing — and the
                  router tries to restore it immediately. With no navigator mounted it throws
                  "Attempted to navigate before mounting the Root Layout component" and the tree
                  never recovers: the page stays BLANK, and the error names only
                  <ContextNavigator>, which points nowhere near this line.

                  Measured before the fix: all seven of /home /readings /astrology /profile
                  /face-capture /palm-capture /birth-data rendered an empty document on a cold
                  load. In-app navigation was fine throughout, which is what makes it easy to
                  miss — and reloading the page is a NORMAL user action on the web.

                  🟢 THE ANDROID REASON FOR THE GATE DOES NOT APPLY ON WEB. It exists because a
                  native text view resolves its typeface once, at creation, so children mounted
                  before the faces registered keep the system font forever. A browser has no such
                  problem: text reflows automatically when a webfont finishes loading. So web
                  gives up nothing here, and NATIVE BEHAVIOUR IS UNCHANGED — the condition below
                  still evaluates to `fontsReady` on iOS and Android. */}
              {/* 🔴 THE INSTALL GATE WRAPS THE STACK RATHER THAN REDIRECTING TO A ROUTE.
                  On iOS in a browser it renders install instructions INSTEAD of the navigator,
                  which is what makes it unescapable: there is no route to navigate away from
                  and no history entry to go back through, and every deep link resolves to it
                  because no router is mounted underneath. A redirect would give all three away.
                  Inert everywhere else — the native fork renders its children untouched, so
                  Android and both native builds are unaffected. See components/InstallGate.tsx. */}
              {(fontsReady || Platform.OS === 'web') ? (
                <InstallGate>
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: BRAND_BG },
                      animation: 'fade',
                    }}
                  >
                    <Stack.Screen name="index" />
                    <Stack.Screen name="(auth)" />
                    <Stack.Screen name="(main)" />
                    <Stack.Screen name="(capture)" options={{ presentation: 'modal' }} />
                    <Stack.Screen name="(paywall)" options={{ presentation: 'modal' }} />
                  </Stack>
                </InstallGate>
              ) : null}
            </View>
          </ErrorBoundary>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
