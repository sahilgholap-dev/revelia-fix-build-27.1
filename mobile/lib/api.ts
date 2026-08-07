import axios, { AxiosInstance, AxiosError } from 'axios';
import Constants from 'expo-constants';
import { storage } from './storage';
import { router } from 'expo-router';
import { whenNavigationReady } from './navigationReady';

// Shared types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

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

export interface AuthResponse {
  user: User;
  token: string;
}

export interface SignupRequest {
  name?: string;
  email: string;
  password: string;
  verificationToken?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AppleAuthRequest {
  identityToken: string;
  // Apple returns fullName ONLY on first sign-in for a given bundle ID
  // (privacy feature). When present, mobile flattens it to a single
  // string before sending. Null after the first successful sign-in.
  fullName?: string | null;
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
  name?: string;
}

export interface RefreshTokenRequest {
  refreshToken?: string;
}

const API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'https://revelia-backend-production.up.railway.app/api';

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 180000, // 180s — first-run reading generation can take 60-110s; aligns with backend ceiling
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      async (config) => {
        try {
          const token = await storage.getToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.error('Error getting auth token:', error);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle errors and token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Wait for token refresh
            return new Promise((resolve) => {
              this.refreshSubscribers.push((token: string) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(this.client(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = await storage.getRefreshToken();
            if (refreshToken) {
              const response = await this.refresh(refreshToken);
              const token = response.data?.token;

              if (!token) {
                throw new Error('No token received from refresh');
              }

              await storage.saveToken(token);

              // Notify all subscribers
              this.refreshSubscribers.forEach((callback) => callback(token));
              this.refreshSubscribers = [];

              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, clear auth and redirect to login.
            // Deferred until the navigator exists: this runs from an axios
            // interceptor, so its timing is the server's, not the render
            // tree's. A 401 landing during cold start used to throw
            // "Attempted to navigate before mounting the Root Layout" and
            // leave the page permanently blank. See lib/navigationReady.ts.
            await storage.clearAll();
            whenNavigationReady(() => router.replace('/(auth)/login'));
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Generic request methods
  async get<T = any>(url: string, config?: any): Promise<ApiResponse<T>> {
    const response = await this.client.get(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> {
    const response = await this.client.put(url, data, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> {
    const response = await this.client.patch(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: any): Promise<ApiResponse<T>> {
    const response = await this.client.delete(url, config);
    return response.data;
  }

  // Auth endpoints
  async signup(data: SignupRequest): Promise<ApiResponse<AuthResponse>> {
    return this.post('/auth/signup', data);
  }

  async login(data: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    return this.post('/auth/login', data);
  }

  async loginWithApple(data: AppleAuthRequest): Promise<ApiResponse<AuthResponse>> {
    return this.post('/auth/apple', data);
  }

  async loginWithGoogle(data: GoogleAuthRequest): Promise<ApiResponse<AuthResponse>> {
    return this.post('/auth/google', data);
  }

  async getMe(): Promise<ApiResponse<{ user: User }>> {
    return this.get('/auth/me');
  }

  async updateName(name: string): Promise<ApiResponse<{ user: User }>> {
    return this.patch('/account/name', { name });
  }

  async logout(): Promise<ApiResponse<void>> {
    return this.post('/auth/logout');
  }

  async refresh(refreshToken?: string): Promise<ApiResponse<{ token: string }>> {
    return this.post('/auth/refresh', { refreshToken });
  }

  // User profile endpoints
  async getProfile(): Promise<ApiResponse<User>> {
    return this.get('/user/profile');
  }

  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    return this.put('/user/profile', data);
  }

  // Reading endpoints
  async uploadFaceImage(imageUri: string) {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'face.jpg',
    } as any);

    const response = await this.client.post('/readings/face', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async uploadPalmImage(imageUri: string, hand: 'dominant' | 'non_dominant') {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'palm.jpg',
    } as any);
    formData.append('hand', hand);

    const response = await this.client.post('/readings/palm', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async getReadings() {
    return this.get('/readings');
  }

  async getReading(id: string) {
    return this.get(`/readings/${id}`);
  }

  // Astrology endpoints
  async getAstrologyReading(birthDate: string, birthTime: string, birthPlace: any) {
    return this.post('/astrology', {
      birthDate,
      birthTime,
      birthPlace,
    });
  }

  // Numerology endpoints
  async getNumerologyReading(name: string, birthDate: string) {
    return this.post('/numerology', {
      name,
      birthDate,
    });
  }

  // Compatibility endpoints
  async getCompatibility(user1Data: any, user2Data: any) {
    return this.post('/compatibility', {
      user1: user1Data,
      user2: user2Data,
    });
  }
}

export const api = new ApiClient();

// Export auth API methods for convenience
export const authAPI = {
  signup: (name: string, email: string, password: string, verificationToken?: string) =>
    api.signup({ name, email, password, verificationToken }),

  login: (email: string, password: string) =>
    api.login({ email, password }),

  loginWithApple: (
    identityToken: string,
    fullName?: string | null,
    user?: any
  ) => api.loginWithApple({ identityToken, fullName, user }),

  loginWithGoogle: (idToken: string, name?: string) =>
    api.loginWithGoogle({ idToken, name }),

  getMe: () => api.getMe(),

  updateName: (name: string) => api.updateName(name),

  logout: () => api.logout(),

  refresh: (refreshToken?: string) => api.refresh(refreshToken),
};

export default api;
