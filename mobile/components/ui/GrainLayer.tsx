import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

/**
 * The paper texture. UI-revamp-design.md §4.6.
 *
 * ONE 120x120 tile, repeated, at 0.05, pinned to fill its parent, inert to touch. It is the
 * ONLY raster the design system adds and there is deliberately no second one.
 *
 * WHY IT IS FUNCTIONAL AND NOT ONLY DECORATIVE (§10.2.4): the paywall carries a ~320dp radial
 * accent wash on a near-black canvas, which is precisely the case that quantises into visible
 * rings on cheap OLED panels. This layer is what breaks the rings up. That is why it sits ABOVE
 * the wash and BELOW the content, and why the layer order is a contract rather than a preference.
 *
 * 🔴 IT MOUNTS AT EXACTLY THREE PLACES AND THE THREE ARE ENUMERATED IN
 *    scripts/primitive-adoption-check.js, WITH THE PLACES IT MUST NEVER MOUNT:
 *      i   ScreenContainer          — 25 of 32 screens
 *      ii  welcome.tsx              — inside its own hand-rolled pinned wrapper (X2)
 *      iii the paywall screen       — it does not use ScreenContainer, and it is the surface
 *                                     with the app's only large accent field
 *    NOT the (auth) stack layout. Design §4.6 lists it as a fourth mount and Appendix A(b)'s
 *    finding I-1 refutes it by measurement: all six non-welcome (auth) screens already draw this
 *    through ScreenContainer, so a layout mount lays a SECOND copy over the entire first-run
 *    funnel — twice the specified density on the screens a new user sees first.
 *    NOT the chat screen and NOT either camera screen (§4.6's stated exclusions).
 *
 * 🔴 THE TILE IS GENERATED, NOT DRAWN, AND ITS AMPLITUDE IS CALIBRATED AGAINST THE 0.05 BELOW.
 *    Change one and re-read the other. Provenance, the two chosen parameters and the reasoning:
 *    assets/textures/README.md. Reproduce with `node scripts/make-grain.js`.
 */
const GRAIN_TILE = require('../../assets/textures/grain.png');

/** design §4.6, verbatim. */
const GRAIN_OPACITY = 0.05;

export const GrainLayer: React.FC = () => (
  <View
    // 🔴 Inert to touch. This layer spans the whole screen, so without this it would swallow
    //    every tap on 25 screens at once — the loudest possible failure, and the cheapest to miss
    //    in review because nothing about the markup suggests it is interactive.
    pointerEvents="none"
    // Decorative. BOTH props are required and neither covers the other: the first is the iOS
    // spelling, the second the Android one. Shipping one leaves the other platform announcing an
    // anonymous node. Put on the component so no mount site can forget it (§6.1's plate rule,
    // applied here for the same reason).
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
    style={StyleSheet.absoluteFill}
  >
    <Image
      source={GRAIN_TILE}
      // Android maps this to a BitmapShader in REPEAT mode; iOS to a pattern fill. Verified
      // present in the installed Android source, not recalled — see the README.
      resizeMode="repeat"
      style={[StyleSheet.absoluteFill, { opacity: GRAIN_OPACITY }]}
    />
  </View>
);

export default GrainLayer;
