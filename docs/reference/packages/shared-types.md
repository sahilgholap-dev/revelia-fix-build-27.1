# Shared types (`packages/shared/`)

Single-file TypeScript types package (`types.ts`), imported in mobile as `@shared/types`. Server has its own `src/types/`. Compiled `types.d.ts`/`.js`/`.map` artifacts alongside are stale build output (recorded R4 caveat — no action).

## Type families

- **API/auth**: `ApiResponse`, `PaginatedResponse`, `AuthProvider`, `AuthTokens`, `LoginRequest`, `SignupRequest`, `AppleAuthRequest`, `GoogleAuthRequest`, `AuthResponse`.
- **User/profile**: `User`, `UserProfile`, `BirthData`/`BirthLocation`, `SubscriptionTier/Info/Status`, `NotificationPreferences`, `UserProfileImage(s)`, `ImageUpload`/`UploadResponse`.
- **Readings**: `Reading`, `ReadingType/Tier/Category`, `FaceReadingCategory/Output`, `PalmLine`, `PalmMount`, `PalmReadingOutput`, `ReadingResponse`, `ReadingHistoryResponse`.
- **Astrology (R1)**: `NatalChart`, `PlanetPosition`, `HouseCusp`, `ChartAngle`, `Aspect`/`AspectType`, `HouseSystem`, `EphemerisMode`, `TransitAspect`/`TransitSet`, `ZodiacSign`, `AstrologyProfile`.
- **Face extraction (R2)**: `FaceFeatureVector`, `FaceTrait`, `FaceArchetypeResult`, `FaceShapeClass`, `FaceDetectorBackend`, plus banded enums (`EyeSpacing`, `BrowArch`, `LipFullness`, `ChinShape`, ...).
- **Palm extraction (R3)**: `HandFeatureVector`, `PalmTrait`, `PalmProfileResult`, `PalmTypeClass`, `PalmShape`, `FingerLength`, `PalmDetectorBackend`.
- **Numerology (R4)**: `NumerologyNumbers`, `NumerologyNameSource`, `NumerologyProfile`, `CalculatedProfile`.
- **Insights**: `DailyInsightOutput`, `DailyTeaserOutput`, `WeeklyForecastOutput`/`WeeklyDayForecast`, `MonthlyReadingOutput`/`MonthlyKeyDate`/`MonthlyLifeArea`, `UserInsightProfile` (the assembled "Cosmic Blueprint" context R5 synthesizes from), `InsightCache`.
- **Compatibility/engagement**: `CompatibilityReading/Category/Output`, `RelationshipType`, `UserCompatibilityProfile`, `PartnerCompatibilityProfile`, `StreakData`, `EngagementCheckIn`, `NotificationPayload`.
- **Continuity (R6)**: `DailyContinuity` (`gapDays`, `highlights`) — attached to `DailyInsightOutput.continuity`/`continuityHook` and `DailyTeaserOutput.continuity`/`continuityHook`.
- **Cosmic Report (R9)**: `ReportSubject`, `ReportSubjectType`, `ReportStatus`, `ReportHighlights`, `Report`.

Note: `SubscriptionTier` as used by mobile UI lives in `mobile/lib/constants.ts` (a CLAUDE.md gotcha) — the shared package also declares subscription types for API payloads.

**Deliberate asymmetry**: R7's Q&A types are **not** in this shared package — they're dual-homed directly in `mobile/lib/qa.ts` and the server, by design (unlike Report, which is genuinely shared).
