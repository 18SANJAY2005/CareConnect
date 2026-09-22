import React, { useState } from 'react';
import { CareConnectLogo } from '../common/CareConnectLogo';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';

interface MobileAuthScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

export const MobileAuthScreen: React.FC<MobileAuthScreenProps> = ({
  onBack,
  onSuccess,
}) => {
  const { loginWithOtp } = useAuth();

  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [phone, setPhone] = useState('9876543210');
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.sendOtp(phone);
      if (res.dev_otp) {
        setDevOtp(res.dev_otp);
        setOtp(res.dev_otp); // Auto-fill for convenience in test/demo mode
      }
      setStep('OTP');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!otp.trim() || otp.length < 4) {
      setErrorMessage('Please enter the verification code.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await loginWithOtp(phone, otp, fullName || undefined);
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid verification code. Please check and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick One-Tap Demo Profiles
  const handleQuickDemoLogin = async (demoPhone: string, demoName: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.sendOtp(demoPhone);
      const code = res.dev_otp || '123456';
      await loginWithOtp(demoPhone, code, demoName);
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Quick sign in failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between px-5 py-6 animate-fadeIn text-slate-900">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={step === 'OTP' ? () => setStep('PHONE') : onBack}
          className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <CareConnectLogo size="sm" showWordmark />
        <div className="w-9" /> {/* Spacer */}
      </div>

      {/* Main Card Content */}
      <div className="my-auto py-4 space-y-6">
        <div>
          <h2 className="text-2xl font-extrabold font-heading text-slate-900">
            {step === 'PHONE' ? 'Sign in with Mobile' : 'Enter Verification Code'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {step === 'PHONE'
              ? 'We will send a one-time verification code to verify your mobile number.'
              : `Code sent to +91 ${phone}`}
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{errorMessage}</span>
          </div>
        )}

        {step === 'PHONE' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Mobile Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-semibold text-sm">
                  +91
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="98765 43210"
                  className="w-full h-14 pl-14 pr-4 bg-white rounded-2xl border border-slate-300 text-slate-900 font-bold text-base focus:border-primary focus:ring-2 focus:ring-teal-500/20 shadow-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Your Name <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="w-full h-12 px-4 bg-white rounded-2xl border border-slate-300 text-slate-900 text-sm focus:border-primary focus:ring-2 focus:ring-teal-500/20 shadow-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || phone.length < 10}
              className="w-full min-h-[54px] bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-2xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Sending code...</span>
                </>
              ) : (
                <span>Get Verification Code</span>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                6-Digit Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                autoFocus
                className="w-full h-14 px-4 text-center tracking-[0.5em] bg-white rounded-2xl border border-slate-300 text-slate-900 font-extrabold text-xl focus:border-primary focus:ring-2 focus:ring-teal-500/20 shadow-sm"
                required
              />
              {devOtp && (
                <div className="mt-2 text-center text-xs font-semibold text-teal-700 bg-teal-50 py-1 px-3 rounded-xl border border-teal-100 inline-block w-full">
                  Auto-filled demo OTP: <span className="font-bold">{devOtp}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.length < 4}
              className="w-full min-h-[54px] bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-2xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Verify & Continue</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSendOtp()}
              className="w-full py-2 text-xs font-semibold text-primary hover:underline text-center"
            >
              Didn't receive code? Resend
            </button>
          </form>
        )}

        {/* 1-Tap Quick Demo Client */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
            Demo Account
          </div>
          <button
            type="button"
            onClick={() => handleQuickDemoLogin('9876543210', 'Family Client')}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold text-center transition flex items-center justify-center gap-1.5"
          >
            <span>One-Tap Sign In (Family Demo Client)</span>
          </button>
        </div>
      </div>

      {/* Footer Note */}
      <div className="text-[11px] text-slate-400 text-center leading-relaxed">
        By signing in, you agree to CareConnect's Terms of Service and Privacy Policy under India DPDP Act 2023.
      </div>
    </div>
  );
};
