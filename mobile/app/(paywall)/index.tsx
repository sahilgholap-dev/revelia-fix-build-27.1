import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';

import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Linking } from 'react-native';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { FeatureComparisonTable } from '../../components/subscription/FeatureComparisonTable';
import { GrainLayer } from '@/components/ui/GrainLayer';
import * as Haptics from 'expo-haptics';
import * as t from '@/theme';

/**
 * 🔴 THE CLOSE CONTROL'S BOX, NAMED ONCE — because the title's keep-out zone is DERIVED from it and
 * a hand-typed clearance goes stale the moment someone moves the button. X19 pins the control these
 * describe, so neither number may drift on its own.
 * ⚠️ O-39's class: these are DIMENSIONS that merely resolve through the spacing scale, and the
 * authoring vocabulary tops out below all three. Do not "migrate them onto a step".
 */
const CLOSE_SIZE = 44;
const CLOSE_RIGHT = 16;
/** The button's right edge plus a gap — §10.2.3's stated clearance, computed rather than typed. */
const TITLE_CLEARANCE = CLOSE_RIGHT + CLOSE_SIZE + 4;
/** X3's `lg` height. The CTA cannot ADOPT the primitive yet (see its site), so it borrows the number. */
const CTA_HEIGHT = 64;

export default function PaywallScreen() {
  /* 🔴 THIS SCREEN DOES NOT USE `ScreenContainer` AND HAS NO SAFE AREA, so nothing was clearing the
     system navigation row at the bottom. Under Android 16's enforced edge-to-edge that put the two
     legal links — 48dp targets — and the renewal disclosure inside the system row's touch region on
     3-button navigation. ⚠️ COMMERCE LOGIC AND X19 ARE UNTOUCHED: this adds one scroll-content
     distance and reads one inset. Nothing about products, purchase, restore or the close control. */
  const insets = useSafeAreaInsets();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('annual');
  const [selectedPlan, setSelectedPlan] = useState<'premium' | 'premium_plus'>('premium');
  
  const { offerings, isLoading, fetchOfferings, purchasePackage, restorePurchases } = useSubscriptionStore();
  
  useEffect(() => {
    fetchOfferings();
  }, []);
  
  const handleClose = () => {
    if (router.canDismiss()) {
      router.dismiss();
    } else {
      router.replace('/(main)/home');
    }
  };
  
  const handlePurchase = async () => {
    if (!offerings || !offerings.current) {
      Alert.alert('Error', 'Subscription plans not loaded');
      return;
    }
    
    // Get the selected package
    const packageId = `${selectedPlan}_${billingPeriod}`;
    const selectedPackage = offerings.current?.availablePackages.find(
      (pkg: any) => pkg.identifier === packageId
    );
    
    if (!selectedPackage) {
      Alert.alert('Error', 'Selected plan not available');
      return;
    }
    
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const success = await purchasePackage(selectedPackage);
      
      if (success) {
        // Show success message
        Alert.alert('Success!', 'Your subscription is now active', [
          { text: 'Continue', onPress: () => router.back() }
        ]);
      }
    } catch (error: any) {
      Alert.alert('Purchase Failed', error.message || 'Please try again');
    }
  };
  
  const handleRestore = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const tier = await restorePurchases();
      
      if (tier !== 'free') {
        Alert.alert('Success', 'Your subscription has been restored!', [
          { text: 'Continue', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('No Purchases Found', 'No previous purchases were found to restore.');
      }
    } catch (error) {
      Alert.alert('Restore Failed', 'Unable to restore purchases. Please try again.');
    }
  };
  
  return (
    <View style={{ flex: 1, backgroundColor: t.color.bg }}>
      {/* Texture mount iii of iii (design §4.6). This screen does not use ScreenContainer, and
          §10.2.4 argues it needs the texture MOST: it carries the app's only large saturated
          field, and a wide wash on a near-black canvas is exactly what quantises into visible
          rings on cheap OLED panels. This layer is what breaks them up.
          🔴 FIRST CHILD, so it paints under everything. X19's close control keeps its own
             stacking pair and is unaffected — this layer is inert to touch and never rises. */}
      <GrainLayer />

      {/* Close button - fixed above ScrollView
          🔴 X19 IN FULL, AND EVERY PART OF IT IS UNTOUCHED HERE: the absolute positioning OUTSIDE
          the ScrollView, `zIndex: 50` AND `elevation: 10`. That pair is the ONLY `elevation:` in the
          codebase while §4.5 mandates zero elevation, so a depth cleanup will read it as dead code —
          it is a STACKING fix, not depth: zIndex alone does not reliably raise a view above its
          siblings on Android. Drop either half, or move this inside the ScrollView, and THE ONLY
          EXIT from a modal-presentation screen with no header back button can become untappable, on
          the app's highest-revenue surface.
          🔴 THE GLYPH WAS A TEXT CHARACTER, AND §9.2 NAMES THIS ONE EXPLICITLY as an HTML
          placeholder whose shipped element is the named Ionicon at 22. It is also C-P4-3's class:
          absent from the body face, resolving through the platform's symbol-font fallback — so the
          only exit from this screen was drawn in a font nobody chose. Retires a GLYPH exception.
          🔴 AND ITS GROUND WAS A FOREGROUND TOKEN USED AS A FILL — O-26's role-vs-dimension class,
          which passes every gate because the name is legal. §10.2.3 names the surface step for it.
          The glyph goes 9.74:1 -> 13.94:1 on the way. */}
      <Pressable
        onPress={handleClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
        hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
        style={{
          position: 'absolute',
          top: 48,
          right: CLOSE_RIGHT,
          zIndex: 50,
          elevation: 10,
          width: CLOSE_SIZE,
          height: CLOSE_SIZE,
          borderRadius: t.radius.pill,
          backgroundColor: t.color['surface-overlay'],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="close" size={22} color={t.color.fg} />
      </Pressable>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom }}>
      {/* Header */}
      <View className="p-6 pb-4">
        {/* 🔴 §10.2.3's TITLE CLEARANCE, AND IT WAS MISSING — a LIVE LAYOUT DEFECT the design calls
            "new and load-bearing" in those words: at 320dp this title runs UNDER the close button.
            §17.3 assigns the paywall's one display hero to exactly this string, so it is the widest
            type on the screen and the most likely to collide.
            🔴 IT IS DERIVED FROM THE BUTTON'S OWN BOX RATHER THAN TYPED AS 64, and that is the
            point: a hand-typed clearance drifts the moment someone moves the control. The two
            constants below are the button's offset and its size, so the keep-out zone cannot go
            stale — and X19 pins the control it is measured from.
            ⚠️ It is an INLINE dimension rather than a spacing utility ON PURPOSE. This is O-39's
            class: the authoring vocabulary tops out at 48 and a keep-out zone is a DIMENSION that
            merely resolves through the spacing scale, not a step on it. Do not "migrate it onto a
            step" — check which family a utility is in first (O-39's own instruction). */}
        <Text
          className="text-fg text-display-lg font-display mt-8 mb-2"
          style={{ paddingRight: TITLE_CLEARANCE }}
        >
          Unlock Your Full Destiny
        </Text>
        <Text className="text-fg-muted text-base">
          Get unlimited access to all of Revelia's features
        </Text>
      </View>
      
      {/* Feature Comparison */}
      <View className="px-6 mb-6">
        <FeatureComparisonTable />
      </View>
      
      {/* Billing Period Toggle — §10.2.3's box: the pill corner and the 48 height, inside and out.
          ⬜ 🔴 BLOCKED BY S-P1, NOT SKIPPED: §10.2.3 also requires this to render "from the distinct
             periods present in the PAYLOAD, not from a fixed monthly/annual pair", and "one period
             -> the toggle does not render at all". That reads the RevenueCat payload, which is
             exactly what S-P1 gates ("no change to this screen's commerce logic without explicit
             approval; findings recorded and PARKED, not fixed"). Restyled only. */}
      <View className="px-6 mb-4">
        <View className="bg-surface rounded-pill p-1 flex-row" style={{ height: 48 }}>
          <TouchableOpacity
            onPress={() => setBillingPeriod('monthly')}
            accessibilityRole="button"
            accessibilityState={{ selected: billingPeriod === 'monthly' }}
            className={`flex-1 items-center justify-center rounded-pill ${billingPeriod === 'monthly' ? 'bg-accent' : ''}`}
          >
            <Text className={`text-center text-sm font-body-semi ${billingPeriod === 'monthly' ? 'text-on-accent' : 'text-fg-muted'}`}>
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setBillingPeriod('annual')}
            accessibilityRole="button"
            accessibilityState={{ selected: billingPeriod === 'annual' }}
            className={`flex-1 items-center justify-center rounded-pill ${billingPeriod === 'annual' ? 'bg-accent' : ''}`}
          >
            <Text className={`text-center text-sm font-body-semi ${billingPeriod === 'annual' ? 'text-on-accent' : 'text-fg-muted'}`}>
              Annual (Save 37-42%)
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Plan Cards
          ═══ 🔴 THREE DEFECTS IN ONE className TERNARY, ON THE HIGHEST-REVENUE CONTROL ══════════

          (1) 🔴 THE SELECTED BORDER WAS THE SECONDARY ACCENT, AND §16.2's SENTENCE IS
              UNCONDITIONAL AND GREPPABLE: "accent-2 on a Pressable's fill, BORDER or label is a
              violation." This is a Pressable's border, selected, on the purchase control. Its
              qualifier — "the row it sits in may be pressable; the MARKER itself is not the
              affordance" — legalises a chip inside a tappable row and says nothing about the row's
              own border. Read across both cards the intent was clearer and worse: the iris was
              Premium's colour and the clay was Premium Plus's, i.e. TIER AS HUE, which is the
              convention §16 exists to remove. Both selected borders are the primary accent now.

          (2) 🔴 THE BORDER WIDTH CHANGED WITH SELECTION, SO THE CARD'S CONTENT SHIFTED BY 1dp ON
              EVERY TAP. §10.2.3 names this in words: "selection is a 1px -> 1px border change plus
              a wash — never a 2px border, which is what currently makes the cards shift by 1dp on
              select." The width is constant now; only the colour changes, plus the wash.

          (3) 🔴 THE UNSELECTED BOUNDARY WAS 1.18:1 — the control-boundary finding's FOURTH
              instance (after signup's consent box, birth-data's handedness pair and the shutter),
              here on two cards the user has to choose between. WCAG 1.4.11 wants 3:1 for a
              component's boundary and no structural border token can reach it. The meta role does,
              at 5.11:1, and it is a neutral so the accent still means "chosen".

          🔴 AND ADDING §10.2.3's SPECIFIED WASH WOULD HAVE CREATED AN AA FAILURE, WHICH IS WHY THE
             PRICE SUB-LINE MOVED IN THE SAME EDIT. Measured on the wash over the card ground:

                 the meta role      4.12:1   🔴 sub-AA   <- the price sub-line's role
                 the plain role    12.95:1
                 the label role     7.98:1               <- where it went
                 the accent         5.61:1

             So the sub-line reads 5.11:1 on an UNSELECTED card and 4.12:1 the moment the user
             selects it. That is O-66 again — one published figure, two grounds — and it is the same
             coupling birth-data's Clear chip had at screen 4: a correct role fix that introduces a
             contrast failure unless its neighbour moves with it.

          ⚠️ §10.2.3's own cell pairs that wash with the STRONG border role. At 1.55:1 that role
             cannot signal selection, and the owner ruling is explicit that a selection border is
             the accent role — 1b shipped three regressions from exactly this. The ruling wins; the
             conflict was flagged from birth-data at screen 4 and is now resolved the same way in
             both places.

          ⬜ The two badges' fills are LEFT ALONE: §10.2.1's finding (iv) makes them a PM copy call
             ("hardcoded per plan and cannot survive a dynamic package list — derive the one badge
             or drop both"), so recolouring copy that may be deleted is waste. ⚠️ Registered: "MOST
             POPULAR" is not in §16.1's enumerated list of what the secondary accent may label. */}
      <View className="px-6 mb-6">
        {/* 🔴 BOTH CARDS' UNSELECTED EDGE — 2026-08-04, and this closes the second half of the
            selection contract on the app's highest-revenue surface. Screen 7 fixed the SELECTED
            state per the accent-role ruling and left the resting one holding the META FOREGROUND
            role as the nearest specified value: contrast-legal at 5.11 but `O-39`'s role-DIMENSION
            error, a text token doing a border's job. These two cards ARE the choice — an
            unselected plan card is identified by its edge and nothing else — so it is the
            control-boundary role now, 3.87:1 on this ground, and the separation between the two
            states RISES (1.36 -> 1.79) because the wash changes with the edge.
            ⚠️ NOTHING COMMERCIAL IS TOUCHED. `S-P1` is still open and every price here is still a
            hardcoded literal; this is one token name on each of two className ternaries. */}
        {/* Premium Card */}
        <TouchableOpacity
          onPress={() => setSelectedPlan('premium')}
          accessibilityRole="button"
          accessibilityState={{ selected: selectedPlan === 'premium' }}
          className={`rounded-lg p-6 mb-3 border ${selectedPlan === 'premium' ? 'border-accent bg-accent-muted' : 'border-border-control bg-surface'}`}
        >
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-fg text-xl font-body-bold">Premium</Text>
            {billingPeriod === 'annual' && (
              <View className="bg-accent-2 rounded-pill px-3 py-1">
                <Text className="text-on-accent text-xs font-body-semi">MOST POPULAR</Text>
              </View>
            )}
          </View>
          
          <Text className="text-accent text-2xl font-body-bold mb-1">
            {billingPeriod === 'monthly' ? '$7.99' : '$59.99'}
          </Text>
          
          {/* 🔴 THE ROLE BELOW MOVED UP BECAUSE THE GROUND MOVED — see the block above the cards.
              The meta role reads 5.11:1 on an unselected card and 4.12:1 on the selected wash, so it
              would have been sub-AA exactly when the user picks this plan. The STRING is untouched:
              it is one of S-P1's hardcoded literals and it is PARKED. */}
          {billingPeriod === 'annual' && (
            <Text className="text-fg-secondary text-sm mb-3">
              $5.00/month • Save 37%
            </Text>
          )}
          
          <Text className="text-fg-secondary text-sm">
            Full readings and monthly insights
          </Text>
        </TouchableOpacity>
        
        {/* Premium Plus Card */}
        <TouchableOpacity
          onPress={() => setSelectedPlan('premium_plus')}
          accessibilityRole="button"
          accessibilityState={{ selected: selectedPlan === 'premium_plus' }}
          className={`rounded-lg p-6 border ${selectedPlan === 'premium_plus' ? 'border-accent bg-accent-muted' : 'border-border-control bg-surface'}`}
        >
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-fg text-xl font-body-bold">Premium Plus</Text>
            <View className="bg-accent rounded-pill px-3 py-1">
              <Text className="text-on-accent text-xs font-body-semi">BEST VALUE</Text>
            </View>
          </View>
          
          <Text className="text-accent text-2xl font-body-bold mb-1">
            {billingPeriod === 'monthly' ? '$12.99' : '$89.99'}
          </Text>

          {/* Same role move as the card above, same measurement, same reason. */}
          {billingPeriod === 'annual' && (
            <Text className="text-fg-secondary text-sm mb-3">
              $7.50/month • Save 42%
            </Text>
          )}

          <Text className="text-fg-secondary text-sm">
            Everything + Name Destiny, Career Path & more
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* CTA Button
          🔴 IT TAKES X3's `lg` HEIGHT AS A LITERAL AND DOES NOT ADOPT THE PRIMITIVE, AND THE REASON
          IS A COUPLING WORTH STATING RATHER THAN A PREFERENCE. §10.2.3 specifies this control as the
          Button primitive at the lg size, and X3 exists because iOS production collapsed
          PADDING-SIZED full-width controls into thin ribbons — which is exactly the shape this
          control had: a full-width tappable with vertical padding and no height. Third instance in
          the funnel after welcome and signup, and the one on the highest-revenue surface.
          🔴 BUT THE PRIMITIVE TAKES ONE `title` AND THIS CONTROL RENDERS TWO LINES, so adopting it
          REQUIRES deleting the sub-line — and §10.2.2 says to delete it ("a button with a
          sometimes-present sub-line is two components") while §10.2.1's finding (iii) and §10.2.2's
          own closing note make the label a PM DECISION that has not landed. §8's standing default is
          binding: if a copy call has not landed, ship the SOURCE STRING VERBATIM.
          🟢 So the guard lands and the copy waits: the explicit height closes the X3 exposure now,
          and the adoption becomes a one-line change the moment the copy call clears.

          ⬜ 🔴 EVERYTHING ELSE ABOUT THIS BUTTON IS BLOCKED, ON TWO INDEPENDENT GATES, AND NEITHER
             IS MINE TO CLEAR:
             · §10.2.2 (A6) requires a NEUTRAL verb and moves the trial claim into the CARD, phrased
               so it is true regardless of eligibility, rendered only when that package HAS an intro
               offer. Reading the package's intro-offer field is reading the RevenueCat payload —
               S-P1's exact subject, still OPEN, "recorded and PARKED, not fixed".
             · And the label is monetisation copy (audit §6.3), so it is a PM call; §10.2.2 itself
               records that the word "free" leaving the button is a conversion cost PM must accept.
             🔴 THE DEFECT IS REAL AND IT IS REGISTERED, NOT FIXED: the trial is asserted
             UNCONDITIONALLY, and Android exposes no per-user eligibility — so a returning subscriber
             is being promised something the store will refuse.
          ⚠️ The sub-line's opacity modifier takes the on-fill role from 6.86:1 to 4.92:1. That still
             clears AA, with 0.42 of margin, so it is not a defect — but it is an opacity modifier on
             the one legal foreground of an accent fill, and it is measured here rather than assumed.
          🔴 NO FRAME-SYNCHRONISED ANIMATION IS ADDED, AND NONE MAY BE. RevenueCat runs on the legacy
             old-architecture interop bridge; §10.2.5 requires any spinner here to run on its own
             loop, never driven by, awaited on, or interpolated against the purchase promise. The
             indicator below is the platform's own and is not tied to a frame clock. */}
      <View className="px-6 mb-6">
        <TouchableOpacity
          onPress={handlePurchase}
          disabled={isLoading}
          accessibilityRole="button"
          style={{ height: CTA_HEIGHT }}
          className="bg-accent rounded-pill items-center justify-center"
        >
          {isLoading ? (
            <ActivityIndicator color={t.color['on-accent']} />
          ) : (
            <>
              <Text className="text-on-accent text-lg font-body-bold mb-1">
                Start 7-Day Free Trial
              </Text>
              <Text className="text-on-accent text-xs opacity-80">
                Cancel anytime
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      
      {/* Footer Links */}
      <View className="px-6 mb-8 items-center">
        {/* 🔴 RESTORE IS A STORE REQUIREMENT, SO IT HAS TO BE PRESENT, FINDABLE AND A REAL TARGET.
            §10.2.3: it "stays a real 48dp target immediately below the CTA — ABOVE the legal block,
            not inside it", so it is never below the fold on a 360x640 device. It was already in the
            right place with the right role; it was a bare text node with no height, i.e. a ~19dp
            target on a control the store requires. It is 48 now. */}
        <TouchableOpacity
          onPress={handleRestore}
          accessibilityRole="button"
          className="mb-3 items-center justify-center"
          style={{ minHeight: 48, alignSelf: 'stretch' }}
        >
          <Text className="text-accent text-sm font-body-semi">
            Restore Purchases
          </Text>
        </TouchableOpacity>

        {/* 🔴 BOTH LEGAL LINKS WERE DEAD — EMPTY HANDLERS, ON THE SCREEN WHOSE OWN AUTO-RENEW
            PARAGRAPH SITS DIRECTLY BELOW THEM. Tapping either did nothing, which is a store-review
            exposure rather than a styling gap: the disclosure paragraph is meaningless if the terms
            it refers to are unreachable. 🔴 AND THE DESTINATIONS ALREADY EXISTED IN THE APP —
            signup.tsx opens both, so nothing here is invented; the same two URLs are simply wired to
            the controls that were built to open them. Found by reading the file, not by any gate: an
            empty arrow function is valid TypeScript and matches no pattern in the tree.
            §10.2.3 also moves them onto the accent role at 48dp targets, which is what makes them
            read as links rather than as part of the fine print. */}
        <View className="flex-row flex-wrap justify-center items-center">
          <TouchableOpacity
            onPress={() => Linking.openURL('https://revelia.me/terms')}
            accessibilityRole="link"
            style={{ minHeight: 48, justifyContent: 'center' }}
          >
            <Text className="text-accent text-xs font-body-semi mx-2">Terms of Service</Text>
          </TouchableOpacity>
          <Text className="text-fg-muted text-xs">•</Text>
          <TouchableOpacity
            onPress={() => Linking.openURL('https://revelia.me/privacy')}
            accessibilityRole="link"
            style={{ minHeight: 48, justifyContent: 'center' }}
          >
            <Text className="text-accent text-xs font-body-semi mx-2">Privacy Policy</Text>
          </TouchableOpacity>
        </View>
        
        <Text className="text-fg-muted text-xs text-center mt-3 px-6">
          Payment will be charged to your iTunes Account or Google Play account. Subscription automatically renews unless auto-renew is turned off at least 24 hours before the end of the current period.
        </Text>
      </View>
    </ScrollView>
    </View>
  );
}
