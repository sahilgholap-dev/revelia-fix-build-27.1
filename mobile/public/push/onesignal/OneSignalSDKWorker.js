// OneSignal's web-push service worker.
//
// 🔴 IT LIVES IN ITS OWN SCOPE ON PURPOSE. The app registers /sw.js at the ROOT
//    scope (lib/registerSw.web.ts) and that worker owns the offline shell and
//    the PWA's install-ability. Two service workers cannot both control one
//    scope — a second registration at / would DISPLACE ours, and the symptom
//    would be offline support quietly disappearing days later with nothing
//    pointing at push as the cause.
//
//    A push subscription belongs to a service-worker REGISTRATION, not to page
//    control, so this worker does not need to control any page to receive and
//    display notifications. Living under /push/onesignal/ costs nothing and
//    keeps the two workers from ever meeting.
//
// ⚠️ THE PATH, THE FILENAME AND THE SCOPE ARE CONFIGURED IN THREE PLACES AND
//    ALL THREE MUST AGREE: this file's location, OneSignal.init()'s
//    serviceWorkerPath / serviceWorkerParam in lib/onesignal.web.ts, and the
//    dashboard's Advanced Push Settings. A mismatch fails at subscription time
//    with an error that does not name the mismatch.
//
// The single line below is exactly what OneSignal's own v16 download contains —
// their SDK has needed only one worker file since November 2021, which is why
// the dashboard's "updater" filename field points at this same file rather than
// a second byte-identical copy.
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
