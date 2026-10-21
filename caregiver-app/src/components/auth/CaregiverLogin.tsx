import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { CareConnectLogo } from '../common/CareConnectLogo';
import { PhoneOtpAuthCard } from '../common/PhoneOtpAuthCard';
import { useCaregiverAuth } from '../../context/CaregiverAuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { caregiverApi } from '../../services/api';

export const CaregiverLogin: React.FC = () => {
  const { loginWithOtp } = useCaregiverAuth();
  const { t } = useLanguage();

  const handleSendOtp = async (
    fullPhone: string,
    countryCode: string,
    consents: { serviceConsent: boolean; promotionalConsent: boolean }
  ) => {
    // Record consent disclosures
    try {
      await caregiverApi.recordConsent({
        phone: fullPhone,
        consents: [
          {
            consentType: 'SERVICE_COMMUNICATIONS',
            granted: consents.serviceConsent,
            version: '1.0',
            purpose: 'Essential shift updates, visit OTPs, and emergency alerts',
            userAction: 'LOGIN_OPT_IN',
          },
          {
            consentType: 'PROMOTIONAL_COMMUNICATIONS',
            granted: consents.promotionalConsent,
            version: '1.0',
            purpose: 'Product updates and optional partner announcements',
            userAction: consents.promotionalConsent ? 'OPT_IN' : 'OPT_OUT',
          },
        ],
      });
    } catch (e) {
      console.warn('Consent recording note:', e);
    }

    const res = await caregiverApi.sendOtp(fullPhone, 'WHATSAPP', countryCode);
    return {
      success: res.success,
      devOtp: res.dev_otp,
      message: res.message,
    };
  };

  const handleVerifyOtp = async (
    fullPhone: string,
    otp: string,
    countryCode: string
  ) => {
    const res = await loginWithOtp(fullPhone, otp, countryCode);
    return {
      success: res.success,
      message: res.error,
    };
  };

  return (
    <div className="min-h-screen bg-slate-50 sm:bg-slate-100 flex flex-col justify-center items-center px-3 sm:px-4 py-4 sm:py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-primary px-4 sm:px-6 py-6 sm:py-8 text-white text-center">
          <CareConnectLogo size="lg" showWordmark variant="inverted" className="justify-center mb-3" />
          <p className="text-teal-100 text-xs sm:text-sm mt-1">{t('appTitle')}</p>
          <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-teal-800/60 border border-teal-600/40 text-[10px] sm:text-[11px] text-teal-200">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-300" />
            <span>Authorized Caregiver Access Only</span>
          </div>
        </div>

        {/* Content with Shared Phone/OTP Component */}
        <div className="p-4 sm:p-6">
          <PhoneOtpAuthCard
            roleBadgeText="Caregiver Field Access"
            appTitle="Caregiver Login"
            initialPhone=""
            initialCountryCode="+91"
            onSendOtp={handleSendOtp}
            onVerifyOtp={handleVerifyOtp}
            showDemoFillButton={false}
          />
        </div>

        {/* Footer info */}
        <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-500">
            Field Worker App • CareConnect Operations Network
          </p>
        </div>
      </div>
    </div>
  );
};
