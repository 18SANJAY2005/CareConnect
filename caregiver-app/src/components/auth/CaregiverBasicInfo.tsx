import React, { useState } from 'react';
import { AlertCircle, ArrowRight, RefreshCw, CheckCircle2 } from 'lucide-react';
import { CareConnectLogo } from '../common/CareConnectLogo';
import { useCaregiverAuth } from '../../context/CaregiverAuthContext';

export const CaregiverBasicInfo: React.FC = () => {
  const { user, verifiedPhone, verifiedCountryCode, updateProfile, logout } = useCaregiverAuth();

  // Pre-fill fields if known from existing user record
  const initialName =
    user?.fullName && !['caregiver', 'new caregiver', 'family sponsor'].includes(user.fullName.trim().toLowerCase())
      ? user.fullName
      : '';

  const [fullName, setFullName] = useState<string>(initialName);
  const [dob, setDob] = useState<string>(user?.dob || '');
  const [gender, setGender] = useState<string>(user?.gender ? user.gender.toUpperCase() : '');
  const [email, setEmail] = useState<string>(user?.email || '');
  const [locality, setLocality] = useState<string>(user?.locality || '');

  // Errors state
  const [nameError, setNameError] = useState<string | null>(null);
  const [dobError, setDobError] = useState<string | null>(null);
  const [genderError, setGenderError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Format display phone
  const getFormattedPhone = (): string => {
    const raw = verifiedPhone || user?.phone || '';
    if (!raw) return '+91 9876500001';
    const trimmed = raw.trim();
    if (trimmed.startsWith('+91') && trimmed.length === 13) {
      return `+91 ${trimmed.slice(3)}`;
    }
    if (trimmed.startsWith('+')) {
      return trimmed;
    }
    const cc = verifiedCountryCode || '+91';
    return `${cc} ${trimmed}`;
  };

  const validateName = (val: string): string | null => {
    const trimmed = val.trim();
    if (!trimmed) {
      return 'Full name is required.';
    }
    if (trimmed.length < 2) {
      return 'Full name must have at least 2 characters.';
    }
    if (!/^[a-zA-Z\s.\-']+$/.test(trimmed)) {
      return 'Full name should contain letters, spaces, dots, or hyphens only.';
    }
    return null;
  };

  const validateDob = (val: string): string | null => {
    if (!val || !val.trim()) {
      return 'Date of birth is required.';
    }
    const birthDate = new Date(val);
    if (isNaN(birthDate.getTime())) {
      return 'Please enter a valid date of birth.';
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (birthDate > today) {
      return 'Date of birth cannot be in the future.';
    }
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 18) {
      return 'Caregiver must be at least 18 years of age.';
    }
    if (age > 100) {
      return 'Please enter a valid date of birth.';
    }
    return null;
  };

  const validateGender = (val: string): string | null => {
    if (!val || !val.trim()) {
      return 'Please select your gender.';
    }
    const upper = val.trim().toUpperCase();
    if (!['FEMALE', 'MALE', 'OTHER'].includes(upper)) {
      return 'Please select a valid gender option.';
    }
    return null;
  };

  const validateEmail = (val: string): string | null => {
    const trimmed = val.trim();
    if (!trimmed) return null; // Email is optional
    const emailRegex = /^[\w.\-+]+@[a-zA-Z0-9\-]+(\.[a-zA-Z0-9\-]+)+$/;
    if (!emailRegex.test(trimmed)) {
      return 'Please enter a valid email address.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const nErr = validateName(fullName);
    const dErr = validateDob(dob);
    const gErr = validateGender(gender);
    const eErr = validateEmail(email);

    setNameError(nErr);
    setDobError(dErr);
    setGenderError(gErr);
    setEmailError(eErr);

    if (nErr || dErr || gErr || eErr) {
      return;
    }

    setLoading(true);

    try {
      const res = await updateProfile({
        fullName: fullName.trim(),
        dob: dob.trim(),
        gender: gender.trim().toUpperCase(),
        email: email.trim() || undefined,
        locality: locality.trim() || undefined,
      });

      if (!res.success) {
        setServerError(res.error || 'Unable to update your profile. Please try again.');
      }
    } catch (err: any) {
      setServerError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const displayPhone = getFormattedPhone();
  const maxDate = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-primary px-6 py-6 text-white text-center">
          <div className="flex justify-center mb-2.5">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-xs">
              <CareConnectLogo size="md" showWordmark={false} />
            </div>
          </div>
          <h1 className="text-xl font-bold tracking-tight">Complete Your Profile</h1>
          <p className="text-teal-100 text-xs mt-1">Please provide your basic information to continue.</p>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {serverError && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Full Name Field */}
            <div>
              <label htmlFor="fullName" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="fullName"
                type="text"
                autoFocus={!initialName}
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (nameError) setNameError(validateName(e.target.value));
                }}
                onBlur={() => setNameError(validateName(fullName))}
                placeholder="e.g. John Doe"
                aria-invalid={!!nameError}
                aria-describedby={nameError ? 'fullName-error' : undefined}
                className={`w-full px-4 py-3 min-h-[48px] text-sm text-slate-900 bg-white border rounded-xl shadow-xs transition-all focus:outline-none focus:ring-2 ${
                  nameError
                    ? 'border-red-400 focus:ring-red-400/20 bg-red-50/20'
                    : 'border-slate-300 focus:border-primary focus:ring-primary/20'
                }`}
                disabled={loading}
              />
              {nameError && (
                <p id="fullName-error" className="mt-1.5 text-xs text-red-600 flex items-center gap-1 font-medium animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{nameError}</span>
                </p>
              )}
            </div>

            {/* Date of Birth Field */}
            <div>
              <label htmlFor="dob" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input
                id="dob"
                type="date"
                max={maxDate}
                value={dob}
                onChange={(e) => {
                  setDob(e.target.value);
                  if (dobError) setDobError(validateDob(e.target.value));
                }}
                onBlur={() => setDobError(validateDob(dob))}
                aria-invalid={!!dobError}
                aria-describedby={dobError ? 'dob-error' : undefined}
                className={`w-full px-4 py-3 min-h-[48px] text-sm text-slate-900 bg-white border rounded-xl shadow-xs transition-all focus:outline-none focus:ring-2 ${
                  dobError
                    ? 'border-red-400 focus:ring-red-400/20 bg-red-50/20'
                    : 'border-slate-300 focus:border-primary focus:ring-primary/20'
                }`}
                disabled={loading}
              />
              {dobError && (
                <p id="dob-error" className="mt-1.5 text-xs text-red-600 flex items-center gap-1 font-medium animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{dobError}</span>
                </p>
              )}
            </div>

            {/* Gender Field */}
            <div>
              <label htmlFor="gender" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Gender <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="gender"
                  value={gender}
                  onChange={(e) => {
                    setGender(e.target.value);
                    if (genderError) setGenderError(validateGender(e.target.value));
                  }}
                  onBlur={() => setGenderError(validateGender(gender))}
                  aria-invalid={!!genderError}
                  aria-describedby={genderError ? 'gender-error' : undefined}
                  className={`w-full px-4 py-3 min-h-[48px] text-sm text-slate-900 bg-white border rounded-xl shadow-xs transition-all focus:outline-none focus:ring-2 appearance-none ${
                    genderError
                      ? 'border-red-400 focus:ring-red-400/20 bg-red-50/20'
                      : 'border-slate-300 focus:border-primary focus:ring-primary/20'
                  }`}
                  disabled={loading}
                >
                  <option value="">Select Gender ▼</option>
                  <option value="FEMALE">Female</option>
                  <option value="MALE">Male</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              {genderError && (
                <p id="gender-error" className="mt-1.5 text-xs text-red-600 flex items-center gap-1 font-medium animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{genderError}</span>
                </p>
              )}
            </div>

            {/* Read-only Verified Phone Number Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Phone Number
              </label>
              <div className="flex items-center gap-2 px-4 py-3 min-h-[48px] bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold tracking-wide">{displayPhone}</span>
                <span className="ml-auto text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-300">
                  Verified
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Verified via OTP verification. Read-only.
              </p>
            </div>

            {/* Email Address Field (Optional) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="email" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Email Address
                </label>
                <span className="text-[11px] text-slate-500 font-medium">(Optional)</span>
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(validateEmail(e.target.value));
                }}
                onBlur={() => setEmailError(validateEmail(email))}
                placeholder="e.g. john@example.com"
                aria-invalid={!!emailError}
                aria-describedby={emailError ? 'email-error' : undefined}
                className={`w-full px-4 py-3 min-h-[48px] text-sm text-slate-900 bg-white border rounded-xl shadow-xs transition-all focus:outline-none focus:ring-2 ${
                  emailError
                    ? 'border-red-400 focus:ring-red-400/20 bg-red-50/20'
                    : 'border-slate-300 focus:border-primary focus:ring-primary/20'
                }`}
                disabled={loading}
              />
              {emailError && (
                <p id="email-error" className="mt-1.5 text-xs text-red-600 flex items-center gap-1 font-medium animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{emailError}</span>
                </p>
              )}
            </div>

            {/* Address / Locality Field */}
            <div>
              <label htmlFor="locality" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Address / Locality
              </label>
              <input
                id="locality"
                type="text"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                placeholder="e.g. Adyar, Chennai"
                className="w-full px-4 py-3 min-h-[48px] text-sm text-slate-900 bg-white border border-slate-300 rounded-xl shadow-xs transition-all focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/20"
                disabled={loading}
              />
            </div>

            {/* Submit Action */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[48px] py-3.5 px-4 bg-primary hover:bg-primary-dark active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed touch-action-manipulation"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving Profile...</span>
                  </>
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Account Switcher */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={logout}
              disabled={loading}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors cursor-pointer"
            >
              Need to use a different phone number? <span className="text-primary underline">Log out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

