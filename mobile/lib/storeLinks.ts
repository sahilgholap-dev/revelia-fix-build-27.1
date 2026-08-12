/**
 * Store links and the Android launch intent, in one place.
 *
 * The Play URL was written out longhand in two files before this existed
 * (the profile screen's rate-us action and the share footer) and the install
 * gate would have been a third. A package name copied by hand is the kind of
 * string that stays right until exactly one copy is missed.
 */

export const ANDROID_PACKAGE = 'com.revelia.app';

/** The app's own URL scheme, as declared in app.json. */
export const APP_SCHEME = 'revelia';

export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

/**
 * An Android intent URL that opens the installed app, or falls through to the
 * Play listing when it is absent.
 *
 * 🔴 IT USES THE APP'S CUSTOM SCHEME, NOT THE WEB URL, AND IT HAS TO. An intent
 * built on `https://app.revelia.me` would only match if the Android app
 * declared that host in an intent filter with App Links verification — and it
 * declares no intent filters at all (app.json has no `intentFilters` key). So
 * an https-based intent would never reach the app and would fall back to Play
 * every time, including for users who already have it.
 *
 * ⚠️ `browser_fallback_url` IS A CHROME FEATURE. Chrome for Android honours it
 * and navigates there when the package is missing; other Android browsers vary,
 * and some ignore intent URLs entirely. So every caller must ALSO show a plain
 * link to `PLAY_STORE_URL` — a normal https anchor works in every browser
 * there is, and is the only part of this that can be relied on.
 */
export function androidLaunchIntentUrl(): string {
  return [
    `intent://#Intent`,
    `scheme=${APP_SCHEME}`,
    `package=${ANDROID_PACKAGE}`,
    `S.browser_fallback_url=${encodeURIComponent(PLAY_STORE_URL)}`,
    `end`,
  ].join(';');
}
