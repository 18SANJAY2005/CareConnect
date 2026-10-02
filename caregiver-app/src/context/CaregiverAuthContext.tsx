import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { caregiverApi } from '../services/api';

interface CaregiverAuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  loginWithOtp: (phone: string, otp: string, countryCode?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const CaregiverAuthContext = createContext<CaregiverAuthContextType | undefined>(undefined);

export const CaregiverAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('careconnect_caregiver_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkCurrentUser = async () => {
    const storedToken = localStorage.getItem('careconnect_caregiver_token');
    if (!storedToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const me = await caregiverApi.getMe();
      if (me.role !== 'CAREGIVER' && me.role !== 'OPS_MANAGER' && me.role !== 'ADMIN') {
        caregiverApi.clearToken();
        setToken(null);
        setUser(null);
      } else {
        setUser(me);
        setToken(storedToken);
      }
    } catch {
      caregiverApi.clearToken();
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkCurrentUser();
  }, []);

  const loginWithOtp = async (phone: string, otp: string, countryCode?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await caregiverApi.verifyOtp(phone, otp, countryCode);
      if (result.user.role !== 'CAREGIVER' && result.user.role !== 'OPS_MANAGER' && result.user.role !== 'ADMIN') {
        caregiverApi.clearToken();
        setToken(null);
        setUser(null);
        return {
          success: false,
          error: `This account (${phone}) is registered as ${result.user.role}, not as a Caregiver. Please use the Family app on port 5173.`,
        };
      }

      setToken(result.access_token);
      setUser(result.user);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'OTP verification failed. Please try again.',
      };
    }
  };

  const logout = () => {
    caregiverApi.clearToken();
    setToken(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    await checkCurrentUser();
  };

  return (
    <CaregiverAuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        loginWithOtp,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </CaregiverAuthContext.Provider>
  );
};

export const useCaregiverAuth = () => {
  const context = useContext(CaregiverAuthContext);
  if (!context) {
    throw new Error('useCaregiverAuth must be used within a CaregiverAuthProvider');
  }
  return context;
};
