import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Edit3,
  RefreshCw,
  LogOut,
  ArrowLeft,
  X,
  Check,
} from 'lucide-react';
import { useCaregiverAuth } from '../../context/CaregiverAuthContext';
import { caregiverApi } from '../../services/api';
import { CaregiverKycModal } from './CaregiverKycModal';
import type { CaregiverKyc } from '../../types';

export const CaregiverProfileScreen: React.FC = () => {
  const { user, updateProfile, logout } = useCaregiverAuth();

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [kycData, setKycData] = useState<CaregiverKyc | null>(null);
  const [loadingKyc, setLoadingKyc] = useState<boolean>(true);
  const [isKycModalOpen, setIsKycModalOpen] = useState<boolean>(false);

  // Edit form state
  const [fullName, setFullName] = useState<string>(user?.fullName || '');
  const [dob, setDob] = useState<string>(user?.dob || '');
  const [gender, setGender] = useState<string>(user?.gender ? user.gender.toUpperCase() : '');
  const [email, setEmail] = useState<string>(user?.email || '');
  const [locality, setLocality] = useState<string>(user?.locality || '');

  // Validation errors
  const [nameError, setNameError] = useState<string | null>(null);
  const [dobError, setDobError] = useState<string | null>(null);
  const [genderError, setGenderError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [saving, setSaving] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch KYC status on mount
  const fetchKyc = async () => {
    setLoadingKyc(true);
    try {
      const data = await caregiverApi.getMyKyc();
      setKycData(data);
    } catch {
      setKycData(null);
    } finally {
      setLoadingKyc(false);
    }
  };

  useEffect(() => {
    fetchKyc();
  }, []);

  // Sync edit form with user data when switching to edit or when user updates
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setDob(user.dob || '');
      setGender(user.gender ? user.gender.toUpperCase() : '');
      setEmail(user.email || '');
      setLocality(user.locality || '');
    }
  }, [user, isEditing]);

  // Format Date for display (e.g. 15 May 1998)
  const formatDisplayDate = (dStr?: string): string => {
    if (!dStr) return 'Not provided';
    try {
      const parts = dStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      }
      return dStr;
    } catch {
      return dStr;
    }
  };

  // Format Gender for display
  const formatDisplayGender = (gStr?: string): string => {
    if (!gStr) return 'Not provided';
    const upper = gStr.toUpperCase();
    if (upper === 'FEMALE') return 'Female';
    if (upper === 'MALE') return 'Male';
    if (upper === 'OTHER') return 'Other';
    return gStr;
  };

  // Format verified phone
  const formatDisplayPhone = (p?: string): string => {
    if (!p) return '+91 9876543210';
    const trimmed = p.trim();
    if (trimmed.startsWith('+91') && trimmed.length === 13) {
      return `+91 ${trimmed.slice(3)}`;
    }
    return trimmed;
  };

  const validateName = (val: string): string | null => {
    const trimmed = val.trim();
    if (!trimmed) return 'Full name is required.';
    if (trimmed.length < 2) return 'Full name must have at least 2 characters.';
    if (!/^[a-zA-Z\s.\-']+$/.test(trimmed)) {
      return 'Full name should contain letters, spaces, dots, or hyphens only.';
    }
    return null;
  };

  const validateDob = (val: string): string | null => {
    if (!val || !val.trim()) return 'Date of birth is required.';
    const birthDate = new Date(val);
    if (isNaN(birthDate.getTime())) return 'Please enter a valid date of birth.';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (birthDate > today) return 'Date of birth cannot be in the future.';
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 18) return 'Caregiver must be at least 18 years of age.';
    if (age > 100) return 'Please enter a valid date of birth.';
    return null;
  };

  const validateGender = (val: string): string | null => {
    if (!val || !val.trim()) return 'Please select your gender.';
    const upper = val.trim().toUpperCase();
    if (!['FEMALE', 'MALE', 'OTHER'].includes(upper)) {
      return 'Please select a valid gender option.';
    }
    return null;
  };

  const validateEmail = (val: string): string | null => {
    const trimmed = val.trim();
    if (!trimmed) return null;
    const emailRegex = /^[\w.\-+]+@[a-zA-Z0-9\-]+(\.[a-zA-Z0-9\-]+)+$/;
    if (!emailRegex.test(trimmed)) return 'Please enter a valid email address.';
    return null;
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMessage(null);

    const nErr = validateName(fullName);
    const dErr = validateDob(dob);
    const gErr = validateGender(gender);
    const eErr = validateEmail(email);

    setNameError(nErr);
    setDobError(dErr);
    setGenderError(gErr);
    setEmailError(eErr);

    if (nErr || dErr || gErr || eErr) return;

    setSaving(true);

    try {
      const res = await updateProfile({
        fullName: fullName.trim(),
        dob: dob.trim(),
        gender: gender.trim().toUpperCase(),
        email: email.trim() || undefined,
        locality: locality.trim() || undefined,
      });

      if (res.success) {
        setFeedbackMessage({ type: 'success', text: 'Profile updated successfully.' });
        setIsEditing(false);
      } else {
        setFeedbackMessage({
          type: 'error',
          text: res.error || 'Unable to update your profile. Please try again.',
        });
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Unable to update your profile. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const maxDate = new Date().toISOString().split('T')[0];

  return (
    <div className="pb-24 max-w-md mx-auto px-4 pt-4 animate-in fade-in">
      {/* Toast / Feedback Banner */}
      {feedbackMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`mb-4 p-3.5 rounded-xl border flex items-center justify-between gap-2.5 text-xs font-semibold shadow-xs transition-all ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Profile Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm mb-4">
        <div className="flex items-center gap-4">
          {/* Profile Photo / Avatar */}
          <div className="relative">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName}
                className="w-16 h-16 rounded-full object-cover border-2 border-primary shadow-xs"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-teal-700 to-teal-500 text-white flex items-center justify-center font-bold text-xl shadow-xs border-2 border-white">
                {user?.fullName ? user.fullName[0].toUpperCase() : 'C'}
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-slate-900 truncate tracking-tight">
              {user?.fullName || 'Caregiver'}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-primary border border-teal-200 uppercase tracking-wider">
                Field Caregiver
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
              <span>{user?.locality || 'Chennai, Tamil Nadu'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* KYC / Identity Verification Summary Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Identity Verification
            </h2>
          </div>
          {loadingKyc ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
          ) : kycData?.verification_status === 'VERIFIED' ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              ✓ Verified
            </span>
          ) : kycData?.verification_status === 'REJECTED' ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
              ● Rejected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              ● Pending
            </span>
          )}
        </div>

        <p className="text-xs text-slate-600 mb-3 leading-relaxed">
          {kycData?.verification_status === 'VERIFIED'
            ? 'Your government identity document (KYC) is verified and active.'
            : 'Government photo identification is required for elder care shift compliance.'}
        </p>

        <button
          type="button"
          onClick={() => setIsKycModalOpen(true)}
          className="w-full min-h-[44px] py-2 px-3 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer touch-action-manipulation"
        >
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span>{kycData ? 'View KYC Document Details' : 'Complete KYC Verification'}</span>
        </button>
      </div>

      {/* Personal Information Card */}
      {!isEditing ? (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-primary" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Personal Information
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setFeedbackMessage(null);
                setIsEditing(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] bg-teal-50 hover:bg-teal-100 text-primary border border-teal-200 rounded-lg text-xs font-bold transition-colors cursor-pointer touch-action-manipulation"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
          </div>

          <div className="space-y-3.5 divide-y divide-slate-100 text-sm">
            {/* Full Name */}
            <div className="pt-1">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Full Name
              </span>
              <span className="font-semibold text-slate-900 mt-0.5 block">
                {user?.fullName || 'Not provided'}
              </span>
            </div>

            {/* Date of Birth */}
            <div className="pt-3">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Date of Birth
              </span>
              <span className="font-semibold text-slate-900 mt-0.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {formatDisplayDate(user?.dob)}
              </span>
            </div>

            {/* Gender */}
            <div className="pt-3">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Gender
              </span>
              <span className="font-semibold text-slate-900 mt-0.5 block">
                {formatDisplayGender(user?.gender)}
              </span>
            </div>

            {/* Phone Number (Verified, Read-only) */}
            <div className="pt-3">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Phone Number
              </span>
              <div className="flex items-center justify-between mt-0.5">
                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {formatDisplayPhone(user?.phone)}
                </span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  ✓ Verified
                </span>
              </div>
            </div>

            {/* Email Address */}
            <div className="pt-3">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Email Address
              </span>
              <span className="font-semibold text-slate-900 mt-0.5 flex items-center gap-1.5 truncate">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {user?.email || 'Not provided'}
              </span>
            </div>

            {/* Address / Locality */}
            <div className="pt-3">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Address / Locality
              </span>
              <span className="font-semibold text-slate-900 mt-0.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {user?.locality || 'Not provided'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Edit Profile Screen */
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm mb-4 animate-in fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-1 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer"
                title="Cancel Edit"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Edit Profile</h2>
            </div>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4" noValidate>
            {/* Full Name */}
            <div>
              <label htmlFor="edit-fullName" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-fullName"
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (nameError) setNameError(validateName(e.target.value));
                }}
                onBlur={() => setNameError(validateName(fullName))}
                placeholder="e.g. John Doe"
                aria-invalid={!!nameError}
                className={`w-full px-4 py-3 min-h-[48px] text-sm text-slate-900 bg-white border rounded-xl shadow-xs transition-all focus:outline-none focus:ring-2 ${
                  nameError
                    ? 'border-red-400 focus:ring-red-400/20 bg-red-50/20'
                    : 'border-slate-300 focus:border-primary focus:ring-primary/20'
                }`}
                disabled={saving}
              />
              {nameError && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{nameError}</span>
                </p>
              )}
            </div>

            {/* Date of Birth */}
            <div>
              <label htmlFor="edit-dob" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-dob"
                type="date"
                max={maxDate}
                value={dob}
                onChange={(e) => {
                  setDob(e.target.value);
                  if (dobError) setDobError(validateDob(e.target.value));
                }}
                onBlur={() => setDobError(validateDob(dob))}
                aria-invalid={!!dobError}
                className={`w-full px-4 py-3 min-h-[48px] text-sm text-slate-900 bg-white border rounded-xl shadow-xs transition-all focus:outline-none focus:ring-2 ${
                  dobError
                    ? 'border-red-400 focus:ring-red-400/20 bg-red-50/20'
                    : 'border-slate-300 focus:border-primary focus:ring-primary/20'
                }`}
                disabled={saving}
              />
              {dobError && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{dobError}</span>
                </p>
              )}
            </div>

            {/* Gender */}
            <div>
              <label htmlFor="edit-gender" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Gender <span className="text-red-500">*</span>
              </label>
              <select
                id="edit-gender"
                value={gender}
                onChange={(e) => {
                  setGender(e.target.value);
                  if (genderError) setGenderError(validateGender(e.target.value));
                }}
                onBlur={() => setGenderError(validateGender(gender))}
                aria-invalid={!!genderError}
                className={`w-full px-4 py-3 min-h-[48px] text-sm text-slate-900 bg-white border rounded-xl shadow-xs transition-all focus:outline-none focus:ring-2 appearance-none ${
                  genderError
                    ? 'border-red-400 focus:ring-red-400/20 bg-red-50/20'
                    : 'border-slate-300 focus:border-primary focus:ring-primary/20'
                }`}
                disabled={saving}
              >
                <option value="">Select Gender ▼</option>
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
                <option value="OTHER">Other</option>
              </select>
              {genderError && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{genderError}</span>
                </p>
              )}
            </div>

            {/* Verified Phone Number (Protected Read-only) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Phone Number
              </label>
              <div className="flex items-center gap-2 px-4 py-3 min-h-[48px] bg-slate-100/90 border border-slate-200 rounded-xl text-slate-800 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold tracking-wide">{formatDisplayPhone(user?.phone)}</span>
                <span className="ml-auto text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-300">
                  Verified
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Verified phone cannot be changed here. Phone changes require verification.
              </p>
            </div>

            {/* Email Address */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="edit-email" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Email Address
                </label>
                <span className="text-[11px] text-slate-500 font-medium">(Optional)</span>
              </div>
              <input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(validateEmail(e.target.value));
                }}
                onBlur={() => setEmailError(validateEmail(email))}
                placeholder="e.g. john@example.com"
                aria-invalid={!!emailError}
                className={`w-full px-4 py-3 min-h-[48px] text-sm text-slate-900 bg-white border rounded-xl shadow-xs transition-all focus:outline-none focus:ring-2 ${
                  emailError
                    ? 'border-red-400 focus:ring-red-400/20 bg-red-50/20'
                    : 'border-slate-300 focus:border-primary focus:ring-primary/20'
                }`}
                disabled={saving}
              />
              {emailError && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{emailError}</span>
                </p>
              )}
            </div>

            {/* Address / Locality */}
            <div>
              <label htmlFor="edit-locality" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Address / Locality
              </label>
              <input
                id="edit-locality"
                type="text"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                placeholder="e.g. Adyar, Chennai"
                className="w-full px-4 py-3 min-h-[48px] text-sm text-slate-900 bg-white border border-slate-300 rounded-xl shadow-xs transition-all focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/20"
                disabled={saving}
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={saving}
                className="flex-1 min-h-[48px] py-3 px-4 border border-slate-300 hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-bold text-sm rounded-xl transition-all cursor-pointer touch-action-manipulation"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 min-h-[48px] py-3 px-4 bg-primary hover:bg-primary-dark active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 touch-action-manipulation"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Profile</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Logout Action Card */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm text-center">
        <button
          type="button"
          onClick={logout}
          className="w-full min-h-[48px] py-2.5 px-4 text-red-600 hover:bg-red-50 active:bg-red-100 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer touch-action-manipulation"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out of Caregiver Portal</span>
        </button>
      </div>

      {/* KYC Modal */}
      <CaregiverKycModal
        isOpen={isKycModalOpen}
        onClose={() => {
          setIsKycModalOpen(false);
          fetchKyc();
        }}
      />
    </div>
  );
};
