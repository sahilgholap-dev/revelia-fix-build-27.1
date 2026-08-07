const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// inlineRem: 16 — NativeWind's own default is 14 (nativewind/dist/metro/index.js:14), which
// inlined every rem-valued utility at 14px/rem and INVERTED the type ramp: text-sm (15px,
// explicit in tailwind.config.js) rendered LARGER than text-base (1rem -> 14px). Owner decision
// 2026-07-29, shipping inside 2.1.0. See plans/build-27.1/UI-revamp-design.md §6.4 V2 and §6.6.
// Do not revert without reading §6.6 — the 2.1 token config is explicit px throughout, so this
// option goes inert after the codemod; its only job is making before/after comparable.
module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });
