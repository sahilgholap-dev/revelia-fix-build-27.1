# Version Management Guide

## Overview

Guidelines for managing app versions, build numbers, and releases for Revelia.

---

## Semantic Versioning

Revelia follows **Semantic Versioning 2.0.0** (https://semver.org)

### Format: MAJOR.MINOR.PATCH

**Example:** 1.2.3
- **MAJOR** = 1 (breaking changes)
- **MINOR** = 2 (new features, backward compatible)
- **PATCH** = 3 (bug fixes, backward compatible)

---

## Version Components

### 1. MAJOR Version (X.0.0)

**Increment when:**
- Breaking changes to API or data models
- Major redesign or rewrite
- Removing features
- Incompatible changes that require user action

**Examples:**
- 1.0.0 → 2.0.0: Complete UI redesign
- 2.0.0 → 3.0.0: New reading engine (incompatible with old readings)

**Impact:**
- May require data migration
- May break existing workflows
- Requires thorough testing
- Major marketing opportunity

### 2. MINOR Version (1.X.0)

**Increment when:**
- Adding new features
- Enhancing existing features
- Adding new reading types
- Backward-compatible changes

**Examples:**
- 1.0.0 → 1.1.0: Add tarot card readings
- 1.1.0 → 1.2.0: Add social sharing features
- 1.2.0 → 1.3.0: Add dark mode

**Impact:**
- No breaking changes
- Users can update safely
- Good for release notes and marketing

### 3. PATCH Version (1.0.X)

**Increment when:**
- Bug fixes
- Performance improvements
- Minor UI tweaks
- Security patches
- Dependency updates

**Examples:**
- 1.0.0 → 1.0.1: Fix crash on iOS 15
- 1.0.1 → 1.0.2: Fix image upload issue
- 1.0.2 → 1.0.3: Improve reading generation speed

**Impact:**
- No new features
- Safe to update immediately
- May be auto-updated by stores

---

## Build Numbers

### iOS Build Number

**Format:** Integer, auto-incremented

**Location:** `app.json` → `ios.buildNumber`

**Rules:**
- Must increase with every build submitted to App Store
- Can be same across versions (e.g., 1.0.0 build 5, 1.0.1 build 6)
- Auto-incremented by EAS when `autoIncrement: true`

**Example:**
```json
"ios": {
  "buildNumber": "1"
}
```

### Android Version Code

**Format:** Integer, auto-incremented

**Location:** `app.json` → `android.versionCode`

**Rules:**
- Must increase with every build submitted to Play Store
- Independent of iOS build number
- Auto-incremented by EAS when `autoIncrement: true`

**Example:**
```json
"android": {
  "versionCode": 1
}
```

### EAS Auto-Increment

**Configuration in eas.json:**
```json
"production": {
  "autoIncrement": true
}
```

**How it works:**
- EAS automatically increments build number on each build
- No manual updates needed
- Prevents build number conflicts

---

## Version Lifecycle

### 1. Development (Pre-Release)

**Version:** 1.0.0-dev, 1.1.0-beta, 1.2.0-rc1

**Purpose:**
- Internal testing
- Feature development
- Bug fixing

**Distribution:**
- Development builds (EAS development profile)
- Not submitted to stores

### 2. Preview (Testing)

**Version:** 1.0.0 (preview build)

**Purpose:**
- TestFlight (iOS)
- Internal Testing (Android)
- QA and user testing

**Distribution:**
- EAS preview profile
- Limited testers

### 3. Production (Release)

**Version:** 1.0.0 (production build)

**Purpose:**
- Public release
- App Store and Play Store

**Distribution:**
- EAS production profile
- All users

---

## Release Process

### Step 1: Plan Release

**Determine version number:**
- Review changes since last release
- Decide: MAJOR, MINOR, or PATCH?
- Update version in `app.json`

**Example:**
```json
"version": "1.1.0"
```

### Step 2: Update Changelog

**Create changelog entry:**
- List all changes
- Categorize: Features, Improvements, Bug Fixes
- Write user-facing descriptions

**Example:**
```markdown
## [1.1.0] - 2026-02-15

### Added
- Tarot card readings
- Social sharing to Instagram
- Dark mode support

### Improved
- Faster reading generation
- Better image quality

### Fixed
- Crash on iOS 15
- Image upload timeout
```

### Step 3: Update Release Notes

**Write release notes for stores:**
- User-friendly language
- Highlight key features
- Keep under 500 characters

**Example:**
```
New in 1.1.0:
• Tarot card readings now available!
• Share your readings on Instagram
• Dark mode for late-night insights
• Faster reading generation
• Bug fixes and improvements
```

### Step 4: Build and Test

**Create preview build:**
```bash
eas build --platform all --profile preview
```

**Test thoroughly:**
- All new features
- Regression testing (old features still work)
- Multiple devices and OS versions

### Step 5: Create Production Build

**Build for production:**
```bash
eas build --platform all --profile production
```

**Verify build:**
- Download and install
- Final smoke test
- Check version number in app

### Step 6: Submit to Stores

**iOS:**
```bash
eas submit --platform ios --profile production
```

**Android:**
```bash
eas submit --platform android --profile production
```

**OR manually:**
- Upload to App Store Connect
- Upload to Play Console
- Fill in release notes
- Submit for review

### Step 7: Monitor Release

**After submission:**
- Monitor review status
- Check for crashes (Sentry)
- Monitor user feedback
- Prepare hotfix if needed

---

## Version History Template

### Changelog Format (CHANGELOG.md)

```markdown
# Changelog

All notable changes to Revelia will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Feature in development

### Changed
- Improvement in progress

### Fixed
- Bug being fixed

## [1.1.0] - 2026-02-15

### Added
- Tarot card readings with 78-card deck
- Social sharing to Instagram, Twitter, Facebook
- Dark mode with automatic switching
- Reading bookmarks and favorites

### Changed
- Improved reading generation speed (30% faster)
- Enhanced image quality for face/palm capture
- Updated onboarding flow

### Fixed
- Fixed crash on iOS 15 when capturing palm photo
- Fixed image upload timeout on slow connections
- Fixed subscription restore on Android

## [1.0.1] - 2026-02-01

### Fixed
- Fixed crash on app launch for some users
- Fixed daily insight not updating
- Fixed notification permission prompt

## [1.0.0] - 2026-01-31

### Added
- Initial release
- Face reading analysis
- Palm reading analysis
- Daily insights
- Weekly forecasts
- Monthly readings
- Compatibility analysis
- Birth chart and numerology
- Subscription system (Weekly, Monthly, Yearly, Lifetime)
- 7-day free trial
- Push notifications
- Social sharing
```

---

## Release Notes Template

### App Store / Play Store Format

**Version 1.0.0 (Initial Release):**
```
Welcome to Revelia 1.0!

✨ Features:
• AI-powered face and palm readings
• Daily personalized insights
• Weekly and monthly forecasts
• Compatibility analysis
• Birth chart and numerology
• 7-day free trial for Premium

Start your journey of self-discovery today!
```

**Version 1.0.1 (Bug Fixes):**
```
Bug fixes and improvements:
• Fixed crash on iOS 15
• Improved reading generation speed
• Enhanced notification delivery
• Minor UI improvements

Thank you for your feedback!
```

**Version 1.1.0 (Feature Update):**
```
New in 1.1.0:

🎴 NEW: Tarot card readings
📸 NEW: Share to Instagram
🌙 NEW: Dark mode

⚡ Faster reading generation
📷 Better image quality
🐛 Bug fixes and improvements
```

**Version 2.0.0 (Major Update):**
```
Revelia 2.0 is here!

🎉 COMPLETELY REDESIGNED
• Beautiful new interface
• Smoother animations
• Easier navigation

✨ NEW FEATURES
• Video readings
• Live chat with astrologers
• Community forums

🚀 IMPROVEMENTS
• 3x faster reading generation
• Offline mode
• Enhanced personalization

Update now to experience the new Revelia!
```

---

## Hotfix Process

### When to Release a Hotfix

**Critical issues:**
- App crashes on launch
- Payment system broken
- Data loss or corruption
- Security vulnerability
- Major feature completely broken

**Process:**
1. **Identify issue** (via Sentry, user reports, reviews)
2. **Fix immediately** (create hotfix branch)
3. **Test fix** (minimal testing, focus on the bug)
4. **Increment PATCH version** (e.g., 1.0.0 → 1.0.1)
5. **Build and submit** (expedited review if critical)
6. **Monitor closely** (ensure fix works)

**Timeline:**
- Fix: 1-4 hours
- Testing: 1-2 hours
- Build and submit: 1 hour
- Review: 1-3 days (request expedited if critical)

---

## OTA Updates (Over-The-Air)

### What are OTA Updates?

OTA updates allow you to push JavaScript changes without going through app store review.

**Powered by:** Expo Updates

**What can be updated:**
- JavaScript code
- React components
- Styles and layouts
- App logic
- API endpoints

**What CANNOT be updated:**
- Native code (Swift, Kotlin)
- Native dependencies
- App permissions
- App icon or splash screen

### When to Use OTA

**Good for:**
- Bug fixes (JS only)
- UI tweaks
- Text changes
- Minor feature updates
- A/B testing

**NOT good for:**
- Native code changes
- New permissions
- Major features (better to go through review)

### How to Publish OTA Update

**1. Make changes to code**

**2. Publish update:**
```bash
eas update --branch production --message "Fix reading generation bug"
```

**3. Users receive update:**
- Next time they open the app
- Update downloads in background
- Applied on next app restart

**4. Monitor:**
- Check Expo dashboard for update adoption
- Monitor Sentry for new errors

### OTA Update Channels

**Configuration in eas.json:**
```json
"production": {
  "channel": "production"
},
"preview": {
  "channel": "preview"
}
```

**Publish to specific channel:**
```bash
eas update --branch production
eas update --branch preview
```

---

## Version Rollback

### When to Rollback

**Critical issues after release:**
- Widespread crashes
- Data corruption
- Payment system broken
- Security breach

### How to Rollback

**Option 1: OTA Rollback (JS changes only)**
```bash
# Publish previous version
eas update --branch production --message "Rollback to 1.0.0"
```

**Option 2: App Store Rollback**
- iOS: Cannot rollback (must submit new version)
- Android: Can rollback to previous version in Play Console

**Option 3: Phased Rollout Pause**
- iOS: Pause phased release in App Store Connect
- Android: Pause rollout in Play Console
- Fix issue and resume

---

## Best Practices

### 1. Version Consistency

**Keep versions in sync:**
- `app.json` version
- `package.json` version (backend)
- Git tags
- Release notes

### 2. Git Tagging

**Tag releases:**
```bash
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0
```

**Benefits:**
- Easy to find release code
- Can checkout specific version
- Clear version history

### 3. Release Branches

**Use release branches for major versions:**
```bash
git checkout -b release/1.0.0
# Make final changes
git commit -m "Prepare 1.0.0 release"
git tag v1.0.0
git push origin release/1.0.0
```

### 4. Changelog Maintenance

**Update changelog continuously:**
- Add entries as features are completed
- Don't wait until release
- Keep "Unreleased" section at top

### 5. Testing Before Release

**Always test:**
- Preview builds before production
- Multiple devices and OS versions
- Upgrade path (existing users updating)
- Fresh install (new users)

### 6. Phased Rollouts

**Use phased rollouts for major updates:**
- iOS: Enable in App Store Connect (7-day rollout)
- Android: Start with 20%, increase gradually
- Monitor for issues before full rollout

### 7. Communication

**Communicate releases:**
- In-app "What's New" screen
- Email to users (for major updates)
- Social media announcements
- Blog posts (for major versions)

---

## Version Numbering Examples

### Revelia Version History (Example)

**1.0.0** - Initial release (Jan 31, 2026)
- Face and palm readings
- Daily insights
- Subscriptions

**1.0.1** - Hotfix (Feb 3, 2026)
- Fixed crash on iOS 15
- Fixed notification bug

**1.0.2** - Hotfix (Feb 10, 2026)
- Fixed image upload timeout
- Improved error messages

**1.1.0** - Feature update (Feb 28, 2026)
- Added tarot readings
- Added dark mode
- Improved UI

**1.1.1** - Bug fix (Mar 5, 2026)
- Fixed tarot card display
- Fixed dark mode issues

**1.2.0** - Feature update (Mar 31, 2026)
- Added video readings
- Added social features
- Performance improvements

**2.0.0** - Major update (Jun 1, 2026)
- Complete redesign
- New reading engine
- Breaking changes

---

## Tools & Resources

### Version Management Tools

**Semantic Release:**
- Automates version bumping
- Generates changelogs
- Creates Git tags
- https://github.com/semantic-release/semantic-release

**Standard Version:**
- Simpler alternative to semantic-release
- Manual control over releases
- https://github.com/conventional-changelog/standard-version

### Changelog Generators

**Conventional Changelog:**
- Generates changelog from Git commits
- Requires conventional commit messages
- https://github.com/conventional-changelog/conventional-changelog

**GitHub Releases:**
- Built-in release notes
- Markdown support
- Automatic changelog from PRs

---

## Troubleshooting

### Build Number Conflicts

**Problem:** "Build number already used"

**Solution:**
- Enable `autoIncrement: true` in eas.json
- OR manually increment in app.json

### Version Mismatch

**Problem:** App shows wrong version

**Solution:**
- Check `app.json` version
- Rebuild app
- Clear cache: `eas build --clear-cache`

### OTA Update Not Applying

**Problem:** Users not receiving OTA update

**Solution:**
- Check update channel matches build
- Verify update published: `eas update:list`
- Users must restart app to apply

---

**Version Management Guide Version:** 1.0.0  
**Last Updated:** January 31, 2026  
**Status:** ✅ Complete
