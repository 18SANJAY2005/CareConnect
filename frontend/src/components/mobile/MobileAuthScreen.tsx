import React, { useState } from "react";
import { CareConnectLogo } from "../common/CareConnectLogo";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { ArrowLeft, AlertCircle, Loader2, ChevronDown, Check, X, UserCheck } from "lucide-react";

// Add Country Codes data
const COUNTRY_CODES = [
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+1", country: "US/Canada", flag: "🇺🇸" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+61", country: "Australia", flag: "🇦🇺" },
  { code: "+65", country: "Singapore", flag: "🇸🇬" },
  { code: "+971", country: "UAE", flag: "🇦🇪" },
];

interface MobileAuthScreenProps {
  onBack: () => void;
  onSuccess: (isNewUser?: boolean) => void;
  authStep?: "PHONE" | "OTP";
  onStepChange?: (step: "PHONE" | "OTP") => void;
  savedPhone?: string;
  onPhoneChange?: (phone: string) => void;
  initialMode?: "SIGN_IN" | "SIGN_UP";
}

export const MobileAuthScreen: React.FC<MobileAuthScreenProps> = ({
  onBack,
  onSuccess,
  authStep = "PHONE",
  onStepChange,
  savedPhone = "",
  onPhoneChange,
  initialMode = "SIGN_IN",
}) => {
  const { loginWithOtp } = useAuth();

  const [mode, setMode] = useState<"SIGN_IN" | "SIGN_UP">(initialMode);
  const [step, setStep] = useState<"PHONE" | "OTP">(authStep);
  const [phone, setPhone] = useState(savedPhone);
  const [countryCode, setCountryCode] = useState("+91");
  const [isCountryCodeDrawerOpen, setIsCountryCodeDrawerOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [existingUserPrompt, setExistingUserPrompt] = useState<string | null>(null);

  React.useEffect(() => {
    if (authStep && authStep !== step) {
      setStep(authStep);
    }
  }, [authStep]);

  React.useEffect(() => {
    if (savedPhone && savedPhone !== phone) {
      setPhone(savedPhone);
    }
  }, [savedPhone]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (mode === "SIGN_UP" && !fullName.trim()) {
      setErrorMessage("Please enter your name to create your account.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setExistingUserPrompt(null);

    try {
      // Check if phone number already exists
      const checkRes = await api.checkPhone(cleanPhone, countryCode).catch(() => null);

      if (mode === "SIGN_UP" && checkRes?.exists) {
        setExistingUserPrompt(
          `An account already exists for +91 ${cleanPhone}. Please sign in to access your dashboard.`,
        );
        setIsLoading(false);
        return;
      }

      const res = await api.sendOtp(cleanPhone);
      if (res.dev_otp) {
        setDevOtp(res.dev_otp);
        setOtp(res.dev_otp); // Auto-fill for convenience in test/demo mode
      }
      setStep("OTP");
      onStepChange?.("OTP");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to send OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!otp.trim() || otp.length < 4) {
      setErrorMessage("Please enter the verification code.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // In SIGN_IN: strictly phone + OTP without name
      // In SIGN_UP: pass fullName
      const cleanPhone = phone.replace(/\D/g, "");
      await loginWithOtp(
        cleanPhone,
        otp,
        mode === "SIGN_UP" ? fullName.trim() : undefined,
      );
      onSuccess(mode === "SIGN_UP");
    } catch (err: any) {
      setErrorMessage(
        err.message || "Invalid verification code. Please check and try again.",
      );
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
      const code = res.dev_otp || "123456";
      await loginWithOtp(demoPhone, code, demoName);
      onSuccess(false);
    } catch (err: any) {
      setErrorMessage(err.message || "Quick sign in failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between px-5 py-6 animate-fadeIn text-slate-900">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 transition"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <CareConnectLogo size="sm" showWordmark />
        <div className="w-9" /> {/* Spacer */}
      </div>

      {/* Main Card Content */}
      <div className="my-auto py-4 space-y-5">
        {/* Mode Selector Tabs (Sign In vs Sign Up) */}
        {step === "PHONE" && (
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setMode("SIGN_IN");
                setErrorMessage(null);
                setExistingUserPrompt(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                mode === "SIGN_IN"
                  ? "bg-white text-primary shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("SIGN_UP");
                setErrorMessage(null);
                setExistingUserPrompt(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                mode === "SIGN_UP"
                  ? "bg-white text-primary shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        <div>
          <h2 className="text-2xl font-extrabold font-heading text-slate-900">
            {step === "PHONE"
              ? mode === "SIGN_IN"
                ? "Sign in with Mobile"
                : "Create CareSeeker Account"
              : "Enter Verification Code"}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {step === "PHONE"
              ? mode === "SIGN_IN"
                ? "Sign in directly with your phone number and OTP."
                : "Verify your phone and enter your details to begin."
              : `Code sent to +91 ${phone}`}
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{errorMessage}</span>
          </div>
        )}

        {existingUserPrompt && (
          <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <UserCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span className="leading-relaxed font-semibold">{existingUserPrompt}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setMode("SIGN_IN");
                setExistingUserPrompt(null);
                handleSendOtp();
              }}
              className="w-full py-2 bg-primary text-white rounded-xl font-bold text-xs shadow hover:bg-primary-hover transition"
            >
              Switch to Sign In & Send Code
            </button>
          </div>
        )}

        {step === "PHONE" ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Mobile Number
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsCountryCodeDrawerOpen(true)}
                  className="absolute inset-y-0 left-0 pl-3 pr-2 flex items-center gap-1 text-slate-700 font-semibold text-sm hover:bg-slate-50 rounded-l-2xl border-r border-slate-200"
                >
                  {countryCode}
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setPhone(val);
                    onPhoneChange?.(val);
                    setExistingUserPrompt(null);
                  }}
                  placeholder="98765 43210"
                  className="w-full h-14 pl-[72px] pr-4 bg-white rounded-2xl border border-slate-300 text-slate-900 font-bold text-base focus:border-primary focus:ring-2 focus:ring-teal-500/20 shadow-sm"
                  required
                />
              </div>
            </div>

            {/* In SIGN_UP mode, collect new account information */}
            {mode === "SIGN_UP" && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Your Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  required
                  className="w-full h-14 px-4 bg-white rounded-2xl border border-slate-300 text-slate-900 font-medium text-sm focus:border-primary focus:ring-2 focus:ring-teal-500/20 shadow-sm"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || phone.length < 10 || (mode === "SIGN_UP" && !fullName.trim())}
              className="w-full min-h-[54px] bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-2xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Sending code...</span>
                </>
              ) : (
                <span>{mode === "SIGN_IN" ? "Sign In with OTP" : "Get Verification Code"}</span>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                6-Digit Verification Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="••••••"
                autoFocus
                className="w-full h-14 px-4 text-center tracking-[0.5em] bg-white rounded-2xl border border-slate-300 text-slate-900 font-extrabold text-xl focus:border-primary focus:ring-2 focus:ring-teal-500/20 shadow-sm"
                required
              />
              {devOtp && (
                <div className="mt-2 text-center text-xs font-semibold text-teal-700 bg-teal-50 py-1 px-3 rounded-xl border border-teal-100 inline-block w-full">
                  Auto-filled demo OTP:{" "}
                  <span className="font-bold">{devOtp}</span>
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
                <span>Verify & Enter Dashboard</span>
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
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
            Demo Account
          </div>
          <button
            type="button"
            onClick={() => handleQuickDemoLogin("9876543210", "Family Client")}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold text-center transition flex items-center justify-center gap-1.5"
          >
            <span>One-Tap Sign In (Family Demo Client)</span>
          </button>
        </div>
      </div>

      {/* Footer Note */}
      <div className="text-[11px] text-slate-400 text-center leading-relaxed">
        By signing in, you agree to CareConnect's Terms of Service and Privacy
        Policy under India DPDP Act 2023.
      </div>

      {/* Country Code Drawer */}
      {isCountryCodeDrawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fadeIn"
            onClick={() => setIsCountryCodeDrawerOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative bg-white w-full max-h-[70vh] rounded-t-3xl shadow-2xl flex flex-col animate-slideUp">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">Select Country Code</h3>
              <button
                onClick={() => setIsCountryCodeDrawerOpen(false)}
                className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-2">
              {COUNTRY_CODES.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => {
                    setCountryCode(item.code);
                    setIsCountryCodeDrawerOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-xl transition-colors ${
                    countryCode === item.code
                      ? "bg-teal-50 text-teal-900"
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.flag}</span>
                    <span className="font-bold text-sm">{item.country}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-500">{item.code}</span>
                    {countryCode === item.code && (
                      <Check className="w-5 h-5 text-teal-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
