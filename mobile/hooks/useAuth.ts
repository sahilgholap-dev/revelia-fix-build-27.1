import { useAuthStore } from '@/store/authStore';
import { useUserStore } from '@/store/userStore';
import { useEffect } from 'react';

export const useAuth = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    signup,
    logout,
    checkAuth,
    clearError,
  } = useAuthStore();

  const { setProfile, clearProfile } = useUserStore();

  // Sync user profile with auth state
  useEffect(() => {
    if (user) {
      setProfile(user as any);
    } else {
      clearProfile();
    }
  }, [user, setProfile, clearProfile]);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    signup,
    logout,
    checkAuth,
    clearError,
  };
};

export default useAuth;
