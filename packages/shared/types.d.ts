export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}
export type AuthProvider = 'email' | 'apple' | 'google';
export type SubscriptionTier = 'free' | 'premium' | 'premium_plus';
export interface User {
    _id: string;
    email: string;
    name?: string;
    authProvider: AuthProvider;
    appleId?: string;
    googleId?: string;
    subscription: {
        tier: SubscriptionTier;
        revenueCatId?: string;
        expiresAt?: string;
    };
    preferences: {
        notifications: boolean;
        dailyInsightTime?: string;
        timezone?: string;
    };
    createdAt: string;
    updatedAt: string;
}
export interface UserProfile {
    _id: string;
    userId: string;
    birthDate?: Date;
    birthTime?: string;
    birthPlace?: {
        city: string;
        country: string;
        latitude: number;
        longitude: number;
    };
    sunSign?: string;
    moonSign?: string;
    risingSign?: string;
    lifePath?: number;
    expression?: number;
    soulUrge?: number;
    faceImageUrl?: string;
    faceAnalyzedAt?: Date;
    dominantPalmImageUrl?: string;
    dominantPalmAnalyzedAt?: Date;
    nonDominantPalmImageUrl?: string;
    nonDominantPalmAnalyzedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export type ReadingType = 'face' | 'palm_dominant' | 'palm_non_dominant' | 'combined' | 'daily' | 'weekly' | 'monthly' | 'compatibility';
export type ReadingTier = 'free' | 'premium';
export interface Reading {
    _id: string;
    userId: string;
    type: ReadingType;
    tier: ReadingTier;
    title: string;
    summary: string;
    content: ReadingContent;
    imageUrl?: string;
    generatedAt: Date;
    expiresAt?: Date;
    viewedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface ReadingContent {
    personality?: ReadingCategory;
    emotions?: ReadingCategory;
    relationships?: ReadingCategory;
    career?: ReadingCategory;
    health?: ReadingCategory;
    destiny?: ReadingCategory;
    lifeLine?: ReadingCategory;
    heartLine?: ReadingCategory;
    headLine?: ReadingCategory;
    fateLine?: ReadingCategory;
    overallInsight?: string;
    keyStrengths?: string[];
    challenges?: string[];
    recommendations?: string[];
    forecast?: string;
    luckyDates?: Date[];
    warnings?: string[];
}
export interface ReadingCategory {
    title: string;
    description: string;
    score?: number;
    traits?: string[];
    insights?: string[];
}
export interface CompatibilityReading {
    _id: string;
    userId: string;
    partnerUserId?: string;
    partnerName: string;
    overallScore: number;
    categories: {
        emotional: CompatibilityCategory;
        intellectual: CompatibilityCategory;
        physical: CompatibilityCategory;
        spiritual: CompatibilityCategory;
    };
    summary: string;
    strengths: string[];
    challenges: string[];
    advice: string[];
    createdAt: Date;
    updatedAt: Date;
}
export interface CompatibilityCategory {
    score: number;
    description: string;
    insights: string[];
}
export interface DailyContent {
    _id: string;
    date: Date;
    sunSign: string;
    teaser: string;
    fullInsight?: string;
    luckyNumbers?: number[];
    luckyColor?: string;
    mood?: string;
    advice?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface AuthTokens {
    accessToken: string;
    refreshToken?: string;
}
export interface LoginRequest {
    email: string;
    password: string;
}
export interface SignupRequest {
    name?: string;
    email: string;
    password: string;
}
export interface AppleAuthRequest {
    identityToken: string;
    user?: {
        name?: {
            firstName?: string;
            lastName?: string;
        };
        email?: string;
    };
}
export interface GoogleAuthRequest {
    idToken: string;
}
export interface AuthResponse {
    user: User;
    token: string;
}
export interface RefreshTokenRequest {
    refreshToken?: string;
}
//# sourceMappingURL=types.d.ts.map