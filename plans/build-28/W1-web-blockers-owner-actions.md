# Revelia Web PWA — Blockers and Owner Actions

**Prepared:** 2026-08-07 · **Status:** engineering ~55% complete, **4 external blockers open**
**Context:** converting the existing Revelia app to an installable web app (PWA) so iOS users can
use the product in Safari, while Android continues to ship through the Play Store. One shared
codebase — no second app to maintain.

---

## 1 · Executive summary

The engineering work that can be done without outside access **is done and verified**: the app
compiles for web, boots with zero errors, renders correctly in the brand fonts, installs to an
iPhone home screen, and launches offline.

**It cannot yet talk to our own backend.** Four things are needed from outside the codebase — three
are account/dashboard configuration, one is a one-line code change that needs a deployment
decision. None of them are engineering problems; all four require someone with account access or
authority to approve a production deploy.

**The first blocker gates the other three.** Until the API accepts requests from the web address,
nobody can log in — which means the login, capture, readings, and payment flows cannot be tested at
all, not just cannot ship.

| # | Blocker | Who unblocks it | Effort | Consequence while open |
|---|---|---|---|---|
| **B1** | API rejects the web address (CORS) | Owner approves a 1-line deploy | ~15 min | 🔴 **Nothing works.** No login, no readings, no payments |
| **B2** | Google Sign-In origin not authorised | Google Cloud Console admin | ~10 min | Google login fails on web; email login still works |
| **B3** | No web payment method configured | RevenueCat + Stripe account owner | ~2–4 hrs + review | iOS users can use the free tier only — **no revenue from web** |
| **B4** | No web hosting or domain | Cloudflare account owner | ~30 min | Cannot deploy anywhere for testing or launch |

**Total owner time: roughly half a day**, spread across four systems. Everything else is engineering.

---

## 2 · The blockers in detail

### 🔴 B1 — The API rejects requests from the web address (CORS)

**What it is.** A browser will not let a page at one address call an API at another unless the API
explicitly says that address is allowed. Our API currently allows four addresses and the new web
app is not one of them.

**Evidence — measured against the live production API on 2026-08-07:**

| Origin tested | API response |
|---|---|
| `https://revelia.me` | ✅ allowed (returns the permission header) |
| `https://app.revelia.me` | ❌ **no permission header — browser blocks the request** |
| local development address | ❌ **no permission header — browser blocks the request** |

The allow-list lives in `server/src/config/production.ts` and currently contains `revelia.me`,
`www.revelia.me`, `admin.revelia.me`, and `staging.revelia.me`.

**Why it blocks everything.** Login is an API call. Without it there is no session, and with no
session there is no way to reach or test readings, the capture flow, subscriptions, or the report.
This blocker does not just prevent shipping — it prevents **verification** of roughly two-thirds of
the remaining work.

**What the owner needs to do:**

1. **Confirm the final web address.** The plan assumes `app.revelia.me`. If it should be something
   else, decide now — the value is written into the code and into three other systems below.
2. **Approve deploying the change.** It is one line added to a list. It is additive: it grants a new
   permission and removes none, and it changes no response shape for existing clients.
3. **Pick the timing.** ⚠️ Important context for the decision: Revelia has **one live production
   backend and no staging environment**. Any push to `main` auto-deploys straight to production.
   This change is about as low-risk as a backend change gets, but it is still a production deploy
   and should be a deliberate choice rather than a side effect.

**Effort:** ~15 minutes, mostly the decision. **Risk:** very low.

---

### 🟠 B2 — Google Sign-In is not authorised for the web address

**What it is.** Google requires every website that uses Google Sign-In to be registered in advance.
An unregistered site is refused with an `origin_mismatch` error.

**The good news:** no new Google project, no new credentials, and **no server change** are needed.
The web sign-in returns the same kind of identity token the Android app returns, and our server
already validates it against the same client ID. We are only adding an address to an existing
credential.

**What the owner needs to do** — in Google Cloud Console, project `revelia-497203`, on the existing
OAuth Web Client (the one already used for Android sign-in), add to **Authorized JavaScript
origins**:

- `https://app.revelia.me` — the live web address
- `http://localhost:8081` — so developers can test sign-in locally

**Who can do it:** whoever administers the `revelia-497203` Google Cloud project.

**Consequence if deferred:** Google Sign-In simply fails on web. Email/password sign-in continues to
work, so this is **not a launch blocker** — but a returning Android user who created their account
with Google would have no way into the web app, which is a poor first impression for exactly the
users most likely to try it.

**Effort:** ~10 minutes. **Risk:** none — adding an origin cannot affect the Android app.

---

### 🟠 B3 — There is no way to take payment on the web

**What it is.** Subscriptions on Android go through Google Play. That system does not exist in a
browser, so the web app currently has no payment path at all. Web users can sign up, get readings,
and see the paywall — but cannot subscribe.

**The strategic upside, worth stating plainly to management:** web payments run through Stripe, not
Apple. **Apple takes no commission on a PWA subscription.** The entire reason this project exists is
that the App Store has repeatedly rejected the app; routing iOS revenue through the web both
restores access to those users and avoids the 15–30% store cut.

**How it will work.** RevenueCat — which we already use — offers "Web Billing", backed by Stripe. It
uses the same customer identity and the same entitlement names as the Android app, which means:

- a user who subscribes on web is **automatically premium on Android too**, and vice versa;
- our existing subscription webhook and tier logic work **unchanged** — no server changes;
- prices come from the payment system rather than being written into the app.

⚠️ That last point matters beyond the web. There is a **known open issue on Android (`S-P1`) where
the paywall displays a US-dollar price while Google Play charges in rupees** — photographed on a
real device on 2026-08-04. The web implementation reads prices from the payment provider, so it is
correct by construction and does not repeat that defect.

**What the owner needs to do** (RevenueCat and Stripe account holder):

1. **Connect Stripe to RevenueCat** and enable Web Billing.
2. **Create the web products** — mirroring the four existing Android products (Premium monthly and
   annual, Premium Plus monthly and annual). 🔴 **Critical:** attach them to the **same entitlement
   names** already in use (`premium`, `premium_plus`). This is what makes a subscription work across
   both platforms; getting it wrong silently breaks cross-platform access.
3. **Decide the web price points**, including which currencies. This is a commercial decision, not a
   technical one.
4. **Provide the Web Billing public API key** so it can be set as a build variable.
5. **Confirm the trial policy** — the current Android paywall advertises a 7-day free trial
   unconditionally; whether web offers the same needs an explicit answer.
6. **Allow for Stripe account review.** If Stripe is not already set up for this business, expect
   identity and business verification, which can take days and is outside our control.

**Effort:** ~2–4 hours of setup, plus any Stripe review time. **This is the long-lead item — it
should be started first even though it is not the first blocker technically.**

**If deferred:** the web app can still launch. iOS users would get the free tier, and the paywall
would honestly say subscriptions are coming to web soon. That is a legitimate phase-one launch, but
it earns nothing from the iOS audience.

---

### 🟠 B4 — There is nowhere to host the web app

**What it is.** The build produces a folder of static files that has to be served from a real
address with HTTPS. Nothing is set up yet.

⚠️ **HTTPS is not optional here.** Browsers refuse to install a PWA or run its offline capability
over an insecure connection, so hosting is a functional requirement, not just distribution.

**Recommendation: Cloudflare Pages.** We already use Cloudflare for file storage, so no new vendor,
no new billing relationship, and the free tier is sufficient. Deploys are instant and roll back in
one click. The alternative is Expo's own hosting (`eas deploy`), which is more integrated with our
build tool but a newer, less proven product.

**What the owner needs to do:**

1. **Create a Cloudflare Pages project** (suggested name `revelia-web`).
2. **Attach the domain** `app.revelia.me` and add the DNS record.
3. **Provide the deploy credentials** so the release can be automated.
4. **Set three build variables** in the deploy environment: the RevenueCat web key (from B3), the
   Google client ID (already exists), and the OneSignal app ID (already exists).

**Effort:** ~30 minutes. **Risk:** low, and fully reversible.

---

## 3 · Decisions needed (not blockers, but they shape the work)

| Decision | Recommendation | Why |
|---|---|---|
| **Sign in with Apple on web?** | **Skip** | The iOS app never shipped, so no user has an Apple-based account. Adds Apple domain verification for zero existing users |
| **Push notifications on web?** | **Defer to phase two** | On iPhone these only work if the user installs the app to their home screen *and* is on iOS 16.4+. Email and in-app messaging still reach everyone |
| **Launch without web payments?** | **Owner's call** | Free-tier-only launch restores iOS access immediately; payments can follow. Depends on whether access or revenue is the priority |

---

## 4 · Platform limitations to accept (facts, not choices)

These are Apple's constraints on any web app. They cannot be engineered away and should be known
before launch:

- **Push notifications** require the user to add the app to their home screen, on iOS 16.4 or newer.
- **Storage may be cleared** by Safari after about 7 days of not using the site — meaning an
  occasional user could be signed out and have to log in again. **Installing to the home screen
  exempts them**, which is a good reason to promote installation.
- **No app-store review prompts** — the "rate us" flow is Android-only.
- **The camera works** in Safari, but with less control than the native camera. Photo quality for
  face and palm readings needs a real-device check before launch.
- **Discovery is different.** There is no App Store listing, so iOS users have to be sent to the web
  address — a marketing consideration, not a technical one.

---

## 5 · Two unrelated issues found while working (for awareness)

**A live configuration defect in the Android app.** The production build is configured to use
`api.revelia.me`, but because of how the settings are layered, that value has **never taken effect**
— the shipped app has always talked to the Railway address directly. Everything works today, so
there is no user impact, but the intended domain is not in use and anyone relying on that setting
would be misled. **Not touched** — flagging only, as it affects the live Android app.

**This working copy has no version history.** The project was provided as a zip with the Git history
stripped. The web work is committed locally so it can be transferred cleanly, but **it must be
carried into the real repository** before anything can be built or released. Worth confirming who
owns that transfer.

---

## 6 · What is already complete

So the picture is accurate — the following is built and verified, not merely planned:

- The app compiles and runs on the web with **zero console errors**, and navigates correctly.
- All eight device-only components (payments, notifications, sign-in, sharing, storage, camera
  pickers, date pickers, device identity) have working web equivalents. **Android behaviour is
  unchanged** — verified by the project's full automated check suite.
- Brand fonts and the design system render correctly in the browser.
- It is **installable to an iPhone home screen** and **launches offline**.
- The app is **26% smaller** on web than a naive port, because the unused device-only code is
  genuinely excluded.
- **Two new automated checks** were added to the project's existing safety net to stop this class of
  work from silently breaking in future. Both were tested by deliberately introducing faults to
  confirm they catch them.

**Remaining engineering after the blockers clear:** roughly 6–9 working sessions — camera testing on
real devices, the payment screen, the "add to home screen" prompt, and a final device QA pass.

---

## 7 · Suggested order

1. **Start B3 (Stripe/RevenueCat) today** — it has the longest lead time because of account review,
   even though it is not the first technical dependency.
2. **Do B1 (CORS) next** — it is 15 minutes and it unblocks all remaining testing.
3. **Do B2 and B4 together** — both are quick dashboard tasks and together they make an internal
   test link possible.
4. **Then engineering finishes** the remaining screens and runs device QA.

---

## 8 · One scheduling caution

Revelia has a **hard Google Play deadline of 2026-08-31** (an Android compatibility requirement),
and the 2.1.0 release currently carries it. That is **24 days away** as of this document.

This web project is deliberately built on a **separate branch** and does not touch the Android
release. It should stay that way. **If capacity has to be split, the Play deadline wins** — missing
it risks the existing Android listing, which is the business we already have.
