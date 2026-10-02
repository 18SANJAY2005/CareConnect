import React, { useState } from 'react';
import { Phone, KeyRound, ShieldCheck, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';
import { CareConnectLogo } from '../common/CareConnectLogo';
import { useCaregiverAuth } from '../../context/CaregiverAuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { caregiverApi } from '../../services/api';
import type { SupportedLanguage } from '../../types';

const COUNTRY_CODES = [
  { code: '+91', label: '+91 (India)', digits: 10, placeholder: '9876543210' },
  { code: '+1', label: '+1 (US/Canada)', digits: 10, placeholder: '2025550143' },
  { code: '+44', label: '+44 (UK)', digits: 10, placeholder: '7911123456' },
  { code: '+65', label: '+65 (Singapore)', digits: 8, placeholder: '81234567' },
  { code: '+971', label: '+971 (UAE)', digits: 9, placeholder: '501234567' },
];

export const CaregiverLogin: React.FC = () => {
  const { loginWithOtp } = useCaregiverAuth();
  const { language, setLanguage, t } = useLanguage();

  const [countryCode, setCountryCode] = useState<string>('+91');
  const [phoneNumber, setPhoneNumber] = useState<string>('9876500001');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const [otp, setOtp] = useState<string>('123456');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [seeding, setSeeding] = useState<boolean>(false);

  const validatePhone = (rawPhone: string, code: string): string | null => {
    const trimmed = rawPhone.trim();
    if (!trimmed) {
      return 'Mobile number is required.';
    }
    const selected = COUNTRY_CODES.find((c) => c.code === code) || { digits: 10 };
    if (trimmed.length !== selected.digits) {
      if (code === '+91') {
        return 'Please enter a valid 10-digit Indian mobile number.';
      }
      return `Please enter a valid ${selected.digits}-digit mobile number.`;
    }
    return null;
  };

  const handleCountryCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCode = e.target.value;
    setCountryCode(newCode);
    const selected = COUNTRY_CODES.find((c) => c.code === newCode) || { digits: 10 };
    const truncated = phoneNumber.slice(0, selected.digits);
    setPhoneNumber(truncated);
    if (truncated.length > 0 && truncated.length !== selected.digits) {
      if (newCode === '+91') {
        setPhoneError('Please enter a valid 10-digit Indian mobile number.');
      } else {
        setPhoneError(`Please enter a valid ${selected.digits}-digit mobile number.`);
      }
    } else {
      setPhoneError(null);
    }
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    // Reject non-numeric characters: strictly numbers only
    const digitsOnly = rawVal.replace(/\D/g, '');
    const selected = COUNTRY_CODES.find((c) => c.code === countryCode) || { digits: 10 };
    // Prevent additional digits beyond allowed max
    const truncated = digitsOnly.slice(0, selected.digits);
    setPhoneNumber(truncated);

    if (truncated.length > 0 && truncated.length < selected.digits) {
      if (countryCode === '+91') {
        setPhoneError('Please enter a valid 10-digit Indian mobile number.');
      } else {
        setPhoneError(`Please enter a valid ${selected.digits}-digit mobile number.`);
      }
    } else {
      setPhoneError(null);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const validationErr = validatePhone(phoneNumber, countryCode);
    if (validationErr) {
      setPhoneError(validationErr);
      return;
    }
    setPhoneError(null);
    setLoading(true);

    const fullPhone = `${countryCode}${phoneNumber}`;

    try {
      const res = await caregiverApi.sendOtp(fullPhone, 'WHATSAPP', countryCode);
      if (res.success) {
        setStep('OTP');
        setInfo(res.dev_otp ? `Verification code sent. Dev OTP: ${res.dev_otp}` : 'Verification code sent via WhatsApp/SMS.');
      } else {
        setError(res.message || 'Failed to send OTP.');
      }
    } catch (err: any) {
      setError(err.message || 'Error sending OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    const fullPhone = `${countryCode}${phoneNumber}`;

    try {
      const result = await loginWithOtp(fullPhone, otp, countryCode);
      if (!result.success) {
        setError(result.error || 'Verification failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoFill = () => {
    setCountryCode('+91');
    setPhoneNumber('9876500001');
    setPhoneError(null);
    setOtp('123456');
    setStep('OTP');
    setError(null);
    setInfo('Loaded demo caregiver credentials: Meenakshi Sundaram (+91 9876500001)');
  };

  const handleSeedDemo = async () => {
    setSeeding(true);
    setError(null);
    try {
      const res = await caregiverApi.seedDemoScenario();
      setInfo(`Scenario seeded! Caregiver: ${res.caregiverName}, Elder: ${res.elderName}`);
      handleQuickDemoFill();
    } catch (err: any) {
      setError(err.message || 'Seeding failed. Is server in development/test mode?');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center px-4 py-8">
      {/* Top Language Switcher */}
      <div className="w-full max-w-md flex justify-end mb-4 gap-1.5">
        {(['ta', 'en', 'te'] as SupportedLanguage[]).map((lang) => (
          <button
            key={lang}
            type="button"
            onClick={() => setLanguage(lang)}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
              language === lang
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            {lang === 'ta' ? 'தமிழ்' : lang === 'te' ? 'తెలుగు' : 'English'}
          </button>
        ))}
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-primary px-6 py-8 text-white text-center">
          <CareConnectLogo size="lg" showWordmark variant="inverted" className="justify-center mb-3" />
          <p className="text-teal-100 text-sm mt-1">{t('appTitle')}</p>
          <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-teal-800/60 border border-teal-600/40 text-[11px] text-teal-200">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-300" />
            <span>Authorized Caregiver Access Only</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {info && (
            <div className="mb-4 p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-800 flex items-start gap-2">
              <Sparkles className="w-4 h-4 shrink-0 text-teal-600 mt-0.5" />
              <div>{info}</div>
            </div>
          )}

          {step === 'PHONE' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-1.5">
                <div className="grid grid-cols-12 gap-2">
                  {/* Country Code Field */}
                  <div className="col-span-4">
                    <label 
                      htmlFor="caregiver-country-code"
                      className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide truncate"
                    >
                      Country Code
                    </label>
                    <div className="relative">
                      <select
                        id="caregiver-country-code"
                        value={countryCode}
                        onChange={handleCountryCodeChange}
                        className="w-full px-3 py-3 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 bg-slate-50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all cursor-pointer"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Phone Number Field */}
                  <div className="col-span-8">
                    <label 
                      htmlFor="caregiver-phone-number"
                      className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide"
                    >
                      Phone Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        id="caregiver-phone-number"
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        required
                        maxLength={countryCode === '+91' ? 10 : 15}
                        value={phoneNumber}
                        onChange={handlePhoneNumberChange}
                        placeholder={countryCode === '+91' ? '9876543210' : 'Mobile number'}
                        className={`w-full pl-10 pr-3 py-3 border ${
                          phoneError ? 'border-red-400 bg-red-50/20' : 'border-slate-300'
                        } rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-medium tracking-wide`}
                      />
                    </div>
                  </div>
                </div>

                {/* Inline Validation Error Message */}
                {phoneError && (
                  <p className="text-xs text-red-600 mt-1.5 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{phoneError}</span>
                  </p>
                )}
                {!phoneError && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    {countryCode === '+91'
                      ? 'Enter 10-digit Indian mobile number.'
                      : 'Enter registered mobile number.'}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !!phoneError}
                className="w-full py-3.5 px-4 min-h-[52px] bg-primary hover:bg-primary-hover text-white font-bold text-sm rounded-xl shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2 touch-action-manipulation"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Send Verification OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Enter 6-Digit OTP
                  </label>
                  <button
                    type="button"
                    onClick={() => setStep('PHONE')}
                    className="text-xs font-semibold text-primary hover:underline touch-action-manipulation"
                  >
                    Change Number
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    className="w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl text-center text-lg tracking-widest font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 text-center">
                  Sent to {countryCode} {phoneNumber} (Default test OTP: 123456)
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 min-h-[52px] bg-primary hover:bg-primary-hover text-white font-bold text-sm rounded-xl shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2 touch-action-manipulation"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Verify & Enter Portal'}
              </button>
            </form>
          )}

          {/* Quick Demo Assist */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleQuickDemoFill}
              className="w-full py-2.5 px-3 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold rounded-xl border border-teal-200 transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>Quick Demo Fill (Meenakshi Sundaram)</span>
            </button>

            <button
              type="button"
              onClick={handleSeedDemo}
              disabled={seeding}
              className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[11px] font-medium rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5"
            >
              {seeding ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              <span>Reset & Seed Chennai Active Care Scenario</span>
            </button>
          </div>

          <p className="text-[11px] text-slate-400 text-center mt-4">
            Family sponsors should access the Family Portal at{' '}
            <a href="http://localhost:5173" className="text-primary underline">
              port 5173
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
};
