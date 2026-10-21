import React, { useState, useEffect } from 'react';
import { Phone, KeyRound, ShieldCheck, AlertCircle, Sparkles, RefreshCw, ChevronDown } from 'lucide-react';

export interface CountryCodeOption {
  code: string;
  label: string;
  digits?: number;
  minDigits: number;
  maxDigits: number;
  placeholder: string;
  flag?: string;
}

export const SUPPORTED_COUNTRY_CODES: CountryCodeOption[] = [
  { code: '+91', label: '+91 (India)', digits: 10, minDigits: 10, maxDigits: 10, placeholder: '9876543210', flag: '🇮🇳' },
  { code: '+1', label: '+1 (US/Canada)', digits: 10, minDigits: 10, maxDigits: 10, placeholder: '2025550143', flag: '🇺🇸' },
  { code: '+44', label: '+44 (UK)', digits: 11, minDigits: 10, maxDigits: 11, placeholder: '7911123456', flag: '🇬🇧' },
  { code: '+61', label: '+61 (Australia)', digits: 10, minDigits: 9, maxDigits: 10, placeholder: '412345678', flag: '🇦🇺' },
  { code: '+65', label: '+65 (Singapore)', digits: 8, minDigits: 8, maxDigits: 8, placeholder: '81234567', flag: '🇸🇬' },
  { code: '+971', label: '+971 (UAE)', digits: 9, minDigits: 9, maxDigits: 9, placeholder: '501234567', flag: '🇦🇪' },
  { code: '+60', label: '+60 (Malaysia)', digits: 10, minDigits: 9, maxDigits: 10, placeholder: '123456789', flag: '🇲🇾' },
  { code: '+94', label: '+94 (Sri Lanka)', digits: 9, minDigits: 9, maxDigits: 9, placeholder: '712345678', flag: '🇱🇰' },
  { code: '+966', label: '+966 (Saudi Arabia)', digits: 9, minDigits: 9, maxDigits: 9, placeholder: '501234567', flag: '🇸🇦' },
];

export interface PhoneOtpAuthCardProps {
  roleBadgeText?: string;
  appTitle?: string;
  onSendOtp: (fullPhone: string, countryCode: string, consents: { serviceConsent: boolean; promotionalConsent: boolean }) => Promise<{ success: boolean; devOtp?: string; message?: string }>;
  onVerifyOtp: (fullPhone: string, otp: string, countryCode: string, consents: { serviceConsent: boolean; promotionalConsent: boolean }) => Promise<{ success: boolean; message?: string }>;
  initialPhone?: string;
  initialCountryCode?: string;
  showNameField?: boolean;
  name?: string;
  onNameChange?: (name: string) => void;
  onQuickDemoFill?: () => void;
  showDemoFillButton?: boolean;
}

export const PhoneOtpAuthCard: React.FC<PhoneOtpAuthCardProps> = ({
  roleBadgeText = 'Family Sponsor Access',
  appTitle = 'CareConnect Sign In',
  onSendOtp,
  onVerifyOtp,
  initialPhone = '',
  initialCountryCode = '+91',
  showNameField = false,
  name = '',
  onNameChange,
  onQuickDemoFill,
  showDemoFillButton = false,
}) => {
  const [countryCode, setCountryCode] = useState<string>(initialCountryCode);
  const [phoneNumber, setPhoneNumber] = useState<string>(initialPhone);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const [otp, setOtp] = useState<string>('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Consent states
  const [serviceConsent, setServiceConsent] = useState<boolean>(true);
  const [promotionalConsent, setPromotionalConsent] = useState<boolean>(false);
  const [showConsentDetails, setShowConsentDetails] = useState<boolean>(false);

  // Resend countdown timer
  const [countdown, setCountdown] = useState<number>(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const selectedCountry = SUPPORTED_COUNTRY_CODES.find((c) => c.code === countryCode) || SUPPORTED_COUNTRY_CODES[0];

  const validatePhone = (rawPhone: string, code: string): string | null => {
    const trimmed = rawPhone.trim();
    if (!trimmed) {
      return 'Mobile number is required.';
    }
    const selected = SUPPORTED_COUNTRY_CODES.find((c) => c.code === code) || { minDigits: 6, maxDigits: 15, digits: 10 };
    const minRequired = selected.minDigits || selected.digits || 6;
    const maxAllowed = selected.maxDigits || selected.digits || 15;
    if (trimmed.length < minRequired || trimmed.length > maxAllowed) {
      if (code === '+91') {
        return 'Please enter a valid 10-digit Indian mobile number.';
      }
      return `Please enter a valid ${minRequired === maxAllowed ? minRequired : `${minRequired}-${maxAllowed}`}-digit mobile number.`;
    }
    return null;
  };

  const handleCountryCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCode = e.target.value;
    setCountryCode(newCode);
    const selected = SUPPORTED_COUNTRY_CODES.find((c) => c.code === newCode) || { minDigits: 6, maxDigits: 15, digits: 10 };
    const maxAllowed = selected.maxDigits || selected.digits || 15;
    const truncated = phoneNumber.slice(0, maxAllowed);
    setPhoneNumber(truncated);
    const minRequired = selected.minDigits || selected.digits || 6;
    if (truncated.length > 0 && truncated.length < minRequired) {
      setPhoneError(newCode === '+91' ? 'Please enter a valid 10-digit Indian mobile number.' : `Please enter a valid ${minRequired === maxAllowed ? minRequired : `${minRequired}-${maxAllowed}`}-digit mobile number.`);
    } else {
      setPhoneError(null);
    }
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const digitsOnly = rawVal.replace(/\D/g, '');
    const selected = SUPPORTED_COUNTRY_CODES.find((c) => c.code === countryCode) || { minDigits: 6, maxDigits: 15, digits: 10 };
    const maxAllowed = selected.maxDigits || selected.digits || 15;
    const truncated = digitsOnly.slice(0, maxAllowed);
    setPhoneNumber(truncated);

    const minRequired = selected.minDigits || selected.digits || 6;
    if (truncated.length > 0 && truncated.length < minRequired) {
      setPhoneError(countryCode === '+91' ? 'Please enter a valid 10-digit Indian mobile number.' : `Please enter a valid ${minRequired === maxAllowed ? minRequired : `${minRequired}-${maxAllowed}`}-digit mobile number.`);
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
    if (!serviceConsent) {
      setError('Please agree to required service communications to proceed.');
      return;
    }
    setPhoneError(null);
    setLoading(true);

    const fullPhone = `${countryCode}${phoneNumber}`;
    try {
      const res = await onSendOtp(fullPhone, countryCode, { serviceConsent, promotionalConsent });
      if (res.success) {
        setStep('OTP');
        setCountdown(30);
        if (res.devOtp) {
          setOtp(res.devOtp);
          setInfo(`Verification code dispatched. Dev OTP: ${res.devOtp}`);
        } else {
          setInfo('Verification code sent via SMS/WhatsApp.');
        }
      } else {
        setError(res.message || 'Failed to dispatch verification code.');
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

    if (!otp || otp.trim().length < 4) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    const fullPhone = `${countryCode}${phoneNumber}`;
    try {
      const res = await onVerifyOtp(fullPhone, otp.trim(), countryCode, { serviceConsent, promotionalConsent });
      if (!res.success) {
        setError(res.message || 'Verification failed. Please check the code.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setError(null);
    setLoading(true);
    const fullPhone = `${countryCode}${phoneNumber}`;
    try {
      const res = await onSendOtp(fullPhone, countryCode, { serviceConsent, promotionalConsent });
      if (res.success) {
        setCountdown(30);
        if (res.devOtp) {
          setOtp(res.devOtp);
          setInfo(`New code sent! Dev OTP: ${res.devOtp}`);
        } else {
          setInfo('A new verification code has been dispatched.');
        }
      } else {
        setError(res.message || 'Failed to resend code.');
      }
    } catch (err: any) {
      setError(err.message || 'Error resending code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {(appTitle || roleBadgeText) && (
        <div className="mb-4 text-center">
          {roleBadgeText && (
            <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-full bg-teal-50 text-teal-800 border border-teal-200 mb-1">
              {roleBadgeText}
            </span>
          )}
          {appTitle && (
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              {appTitle}
            </h3>
          )}
        </div>
      )}

      {/* Alert banners */}
      {error && (
        <div role="alert" className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <div className="font-medium">{error}</div>
        </div>
      )}

      {info && (
        <div role="status" className="mb-4 p-3 bg-teal-50 border border-teal-200 rounded-2xl text-xs text-teal-800 flex items-start gap-2 animate-fadeIn">
          <Sparkles className="w-4 h-4 shrink-0 text-teal-600 mt-0.5" />
          <div className="font-medium">{info}</div>
        </div>
      )}

      {step === 'PHONE' ? (
        <form onSubmit={handleSendOtp} className="space-y-4">
          {showNameField && onNameChange && (
            <div>
              <label htmlFor="auth-full-name" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                Full Name
              </label>
              <input
                id="auth-full-name"
                type="text"
                required
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Enter your legal full name"
                className="w-full px-3.5 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-primary focus:bg-white transition-all"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <div className="grid grid-cols-12 gap-2">
              {/* Country Code */}
              <div className="col-span-5 xs:col-span-4">
                <label htmlFor="auth-country-code" className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide truncate">
                  Country
                </label>
                <div className="relative">
                  <select
                    id="auth-country-code"
                    value={countryCode}
                    onChange={handleCountryCodeChange}
                    className="w-full pl-2.5 pr-6 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 appearance-none focus:outline-hidden focus:ring-2 focus:ring-primary focus:bg-white transition-all cursor-pointer"
                  >
                    {SUPPORTED_COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Phone Number Input */}
              <div className="col-span-7 xs:col-span-8">
                <label htmlFor="auth-phone-number" className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Mobile Number
                </label>
                <div className="relative">
                  <input
                    id="auth-phone-number"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="tel-national"
                    value={phoneNumber}
                    onChange={handlePhoneNumberChange}
                    placeholder={selectedCountry.placeholder}
                    maxLength={selectedCountry.maxDigits || selectedCountry.digits || 16}
                    required
                    className={`w-full pl-3.5 pr-10 py-3 bg-slate-50 border rounded-xl text-sm font-bold text-slate-900 tracking-wide focus:outline-hidden focus:ring-2 focus:ring-primary focus:bg-white transition-all ${
                      phoneError ? 'border-red-400 bg-red-50/40 text-red-900' : 'border-slate-300'
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Phone className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            {phoneError && (
              <p className="text-[11px] text-red-600 font-medium px-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                <span>{phoneError}</span>
              </p>
            )}
          </div>

          {/* ============================================================ */}
          {/* Explicit Mobile-Number Disclosures & Consents (Requirement 3)  */}
          {/* ============================================================ */}
          <div className="bg-slate-50 p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 space-y-2.5 text-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span>Mobile Number Disclosure & Privacy</span>
              </span>
              <button
                type="button"
                onClick={() => setShowConsentDetails(!showConsentDetails)}
                className="text-[10px] font-bold text-teal-700 hover:text-teal-800 underline"
              >
                {showConsentDetails ? 'Hide details' : 'Why we collect this?'}
              </button>
            </div>

            {showConsentDetails && (
              <p className="text-[11px] text-slate-600 leading-relaxed bg-white p-2.5 rounded-xl border border-slate-200 animate-fadeIn">
                Your mobile number is required to securely identify your account, send instant shift alerts, dispatch visit start/end safety OTPs, and coordinate emergency SOS assistance. We never sell your personal information.
              </p>
            )}

            {/* Required Service Communication Consent */}
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                required
                checked={serviceConsent}
                onChange={(e) => setServiceConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary shrink-0"
              />
              <span className="text-[11px] text-slate-700 leading-tight">
                <strong className="text-slate-900">Service Communications (Required):</strong> I agree to receive essential service reminders, care reports, and verification OTPs via SMS and WhatsApp.
              </span>
            </label>

            {/* Optional Promotional Communication Consent */}
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={promotionalConsent}
                onChange={(e) => setPromotionalConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary shrink-0"
              />
              <span className="text-[11px] text-slate-600 leading-tight">
                <span className="font-semibold text-slate-800">Promotional Updates (Optional):</span> I would like to receive product announcements, wellness tips, and special offers.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || !phoneNumber || !!phoneError || !serviceConsent}
            className="w-full min-h-[48px] py-3 px-4 bg-primary hover:bg-primary-hover text-white font-bold text-sm rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-action-manipulation cursor-pointer"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
            <span>{loading ? 'Sending Code...' : 'Get Verification Code'}</span>
          </button>

          {showDemoFillButton && onQuickDemoFill && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onQuickDemoFill}
                className="w-full py-2.5 px-3 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200/80 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>Fill Demo Family Account</span>
              </button>
            </div>
          )}
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4 animate-fadeIn">
          <div className="bg-slate-50 p-3 sm:p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] font-semibold uppercase tracking-wider">Sending OTP to</span>
              <span className="font-extrabold text-slate-900 text-sm tracking-wide">
                {countryCode} {phoneNumber}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setStep('PHONE');
                setError(null);
                setInfo(null);
              }}
              className="text-xs font-bold text-teal-700 hover:text-teal-900 underline px-2 py-1"
            >
              Change
            </button>
          </div>

          <div>
            <label htmlFor="auth-otp-input" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
              6-Digit Verification Code
            </label>
            <div className="relative">
              <input
                id="auth-otp-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                maxLength={6}
                required
                autoFocus
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full text-center tracking-[0.5em] text-2xl font-mono font-black py-3.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary focus:bg-white text-slate-900 transition-all"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <KeyRound className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs px-1">
            <span className="text-slate-500">Didn't receive the code?</span>
            <button
              type="button"
              disabled={countdown > 0 || loading}
              onClick={handleResendOtp}
              className={`font-bold transition-colors ${
                countdown > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-teal-700 hover:text-teal-900 cursor-pointer'
              }`}
            >
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || otp.length < 4}
            className="w-full min-h-[48px] py-3.5 px-4 bg-primary hover:bg-primary-hover text-white font-bold text-sm rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-action-manipulation cursor-pointer"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            <span>{loading ? 'Verifying Account...' : 'Verify & Enter Portal'}</span>
          </button>
        </form>
      )}
    </div>
  );
};
