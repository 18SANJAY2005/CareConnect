import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { caregiverApi } from '../services/api';

export interface UpdateProfileData {
  fullName: string;
  dob?: string;
  gender?: string;
  email?: string;
  locality?: string;
  avatarUrl?: string;
}

interface CaregiverAuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  verifiedPhone: string | null;
  verifiedCountryCode: string | null;
  loginWithOtp: (phone: string, otp: string, countryCode?: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (data: UpdateProfileData | string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const CaregiverAuthContext = createContext<CaregiverAuthContextType | undefined>(undefined);

export const CaregiverAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('careconnect_caregiver_token');
  });
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(() => {
    return localStorage.getItem('careconnect_cg_verified_phone');
  });
  const [verifiedCountryCode, setVerifiedCountryCode] = useState<string | null>(() => {
    return localStorage.getItem('careconnect_cg_verified_cc') || '+91';
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
        if (me.phone) {
          setVerifiedPhone(me.phone);
          localStorage.setItem('careconnect_cg_verified_phone', me.phone);
        }
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
      const cc = countryCode || '+91';
      setVerifiedPhone(phone);
      setVerifiedCountryCode(cc);
      localStorage.setItem('careconnect_cg_verified_phone', phone);
      localStorage.setItem('careconnect_cg_verified_cc', cc);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'OTP verification failed. Please try again.',
      };
    }
  };

  const updateProfile = async (
    data: UpdateProfileData | string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const payload: UpdateProfileData = typeof data === 'string' ? { fullName: data } : data;
      const updatedUser = await caregiverApi.updateProfile(payload);
      setUser(updatedUser);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to update profile. Please try again.',
      };
    }
  };

  const logout = () => {
    caregiverApi.clearToken();
    localStorage.removeItem('careconnect_cg_verified_phone');
    localStorage.removeItem('careconnect_cg_verified_cc');
    setToken(null);
    setUser(null);
    setVerifiedPhone(null);
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
        verifiedPhone,
        verifiedCountryCode,
        loginWithOtp,
        updateProfile,
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
