import React, { createContext, useContext } from 'react';
import type { SupportedLanguage } from '../types';

export const TRANSLATIONS = {
  en: {
    appTitle: 'Caregiver Portal',
    onDuty: 'On Duty',
    offDuty: 'Off Duty',
    activeShift: "Today's Shift Assignment",
    tabToday: 'Today',
    tabTasks: 'Tasks',
    tabLogs: 'Logs & Vitals',
    tabElder: 'Elder',
    tabProfile: 'Profile',
    tabSupport: 'Support',
    elderProfile: 'Elder Profile',
    age: 'Age',
    years: 'yrs',
    mobility: 'Mobility',
    language: 'Language',
    address: 'Address',
    checkIn: 'Check In (Start Shift)',
    checkOut: 'Check Out (End Shift)',
    checkInSuccess: 'Attendance verified! You are on duty.',
    checkOutSuccess: 'Shift completed successfully.',
    locVerified: 'Location Verified (Within Geofence)',
    locOutOfRange: 'Out of Range Warning',
    householdOtp: 'Verify with Family OTP',
    supervisorOverride: 'Request Supervisor Approval',
    tasksTitle: 'Daily Care Checklist',
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    night: 'Night',
    completed: 'Completed',
    pending: 'Pending',
    skipped: 'Skipped',
    vitalsTitle: 'Health Vitals Monitoring',
    bloodPressure: 'Blood Pressure (BP)',
    systolic: 'Systolic (mmHg)',
    diastolic: 'Diastolic (mmHg)',
    pulse: 'Pulse (BPM)',
    bloodSugar: 'Blood Glucose (mg/dL)',
    fasting: 'Fasting',
    postMeal: 'Post-Meal',
    random: 'Random',
    temperature: 'Temperature (°C)',
    recordVitals: 'Save Vitals Reading',
    careNotes: 'Care Notes',
    photoUpdate: 'Daily Photo Update',
    uploadPhoto: 'Upload Photo',
    voicePrompt: 'Tap to dictate note...',
    sosButton: 'Emergency SOS',
    sosConfirmTitle: 'Confirm Emergency SOS Alert?',
    sosConfirmDesc: 'This will immediately notify Chennai Operations Command & the Family Sponsor with a P1 priority alert.',
    sosHotlineNote: 'For critical ambulance dispatch, call government emergency 108 directly.',
    confirmSos: 'Trigger Emergency SOS',
    cancel: 'Cancel',
    submit: 'Submit',
    logout: 'Logout',
    networkOnline: 'Online',
    networkOffline: 'Offline Mode Active',
    simOffline: 'Simulate Offline',
    simOnline: 'Go Online',
    pendingQueue: 'Pending Offline Activities',
    syncNow: 'Sync Queue Now',
    hotline: '24/7 Operations Hotline',
    supervisorContact: 'Care Supervisor Contact',
  },
};

interface LanguageContextType {
  language: SupportedLanguage;
  t: (key: keyof typeof TRANSLATIONS['en']) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const language: SupportedLanguage = 'en';

  const t = (key: keyof typeof TRANSLATIONS['en']): string => {
    return TRANSLATIONS.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

