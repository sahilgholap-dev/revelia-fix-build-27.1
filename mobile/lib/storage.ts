import * as SecureStore from '@/lib/secureStorage';

// User type
export interface User {
  _id: string;
  email: string;
  name?: string;
  authProvider: 'email' | 'apple' | 'google';
  appleId?: string;
  googleId?: string;
  subscription: {
    tier: 'free' | 'premium' | 'premium_plus';
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

const TOKEN_KEY = 'revelia_auth_token';
const REFRESH_TOKEN_KEY = 'revelia_refresh_token';
const USER_KEY = 'revelia_user';

export const storage = {
  // Token management
  saveToken: async (token: string) => {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (error) {
      console.error('Error saving token:', error);
      throw error;
    }
  },

  getToken: async (): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },

  removeToken: async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (error) {
      console.error('Error removing token:', error);
    }
  },

  // Refresh token management
  saveRefreshToken: async (refreshToken: string) => {
    try {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    } catch (error) {
      console.error('Error saving refresh token:', error);
      throw error;
    }
  },

  getRefreshToken: async (): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  },

  removeRefreshToken: async () => {
    try {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error removing refresh token:', error);
    }
  },

  // User management (for quick access without API call)
  saveUser: async (user: User) => {
    try {
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error saving user:', error);
      throw error;
    }
  },

  getUser: async (): Promise<User | null> => {
    try {
      const userData = await SecureStore.getItemAsync(USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },

  removeUser: async () => {
    try {
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch (error) {
      console.error('Error removing user:', error);
    }
  },

  // Clear all auth data
  clearAll: async () => {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(TOKEN_KEY),
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
        SecureStore.deleteItemAsync(USER_KEY),
      ]);
    } catch (error) {
      console.error('Error clearing all storage:', error);
    }
  },
};

export default storage;
