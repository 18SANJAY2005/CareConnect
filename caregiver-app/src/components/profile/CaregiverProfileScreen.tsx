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
  Power,
  Lock,
  GraduationCap,
  Award,
  Briefcase,
  Star,
  LifeBuoy,
  Clock,
  HeartHandshake,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import { useCaregiverAuth } from '../../context/CaregiverAuthContext';
import { caregiverApi } from '../../services/api';
import { CaregiverKycModal } from './CaregiverKycModal';
import type { CaregiverKyc, CaregiverEligibility, FullCaregiverProfile } from '../../types';

export const CaregiverProfileScreen: React.FC = () => {
  const { user, updateProfile, logout } = useCaregiverAuth();

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [kycData, setKycData] = useState<CaregiverKyc | null>(null);
  const [loadingKyc, setLoadingKyc] = useState<boolean>(true);
  const [isKycModalOpen, setIsKycModalOpen] = useState<boolean>(false);

  // Worker availability state
  const [eligibility, setEligibility] = useState<CaregiverEligibility | null>(null);
  const [loadingEligibility, setLoadingEligibility] = useState<boolean>(true);
  const [togglingAvailability, setTogglingAvailability] = useState<boolean>(false);

  // Expanded Caregiver Profile state (Requirement 4)
  const [fullProfile, setFullProfile] = useState<FullCaregiverProfile | null>(null);
  const [loadingFullProfile, setLoadingFullProfile] = useState<boolean>(true);
  const [isEditingQualifications, setIsEditingQualifications] = useState<boolean>(false);
  const [savingQualifications, setSavingQualifications] = useState<boolean>(false);

  // Qualifications form states
  const [eduInput, setEduInput] = useState<string>('');
  const [certInput, setCertInput] = useState<string>('');
  const [expInput, setExpInput] = useState<string>('');
  const [skillsInput, setSkillsInput] = useState<string>('');
  const [prefCareTypes, setPrefCareTypes] = useState<string[]>([]);
  const [workPrefInput, setWorkPrefInput] = useState<string>('');
  const [prefHoursInput, setPrefHoursInput] = useState<string>('');

  // Support section modal/toggle (Requirement 11)
  const [showSupportModal, setShowSupportModal] = useState<boolean>(false);

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

  // Fetch KYC, worker eligibility, and full profile on mount
  const fetchEligibilityAndKyc = async () => {
    setLoadingKyc(true);
    setLoadingEligibility(true);
    setLoadingFullProfile(true);
    try {
      const [kData, eData, fData] = await Promise.all([
        caregiverApi.getMyKyc().catch(() => null),
        caregiverApi.getEligibility().catch(() => null),
        caregiverApi.getFullProfile().catch(() => null),
      ]);
      setKycData(kData);
      setEligibility(eData);
      if (fData) {
        setFullProfile(fData);
        setEduInput(fData.educationalQualifications || '');
        setCertInput(fData.certifications || '');
        setExpInput(fData.previousExperience || '');
        setSkillsInput(fData.qualifications || '');
        const careTypesArr = fData.preferredCareTypes
          ? fData.preferredCareTypes.split(',').map((s: string) => s.trim()).filter(Boolean)
          : ['PARTIAL_MOBILITY', 'WHEELCHAIR_ASSISTANCE'];
        setPrefCareTypes(careTypesArr);
        setWorkPrefInput(fData.workPreferences || 'Day Shifts (8-10 hours), within 12km');
        setPrefHoursInput(fData.preferredHours || '08:00 - 18:00');
      }
    } finally {
      setLoadingKyc(false);
      setLoadingEligibility(false);
      setLoadingFullProfile(false);
    }
  };

  useEffect(() => {
    fetchEligibilityAndKyc();
  }, []);

  const handleToggleAvailability = async () => {
    if (!eligibility) return;
    if (!eligibility.isEligibleForWork) {
      setFeedbackMessage({
        type: 'error',
        text: 'Complete KYC verification to become available for care work.',
      });
      return;
    }
    const nextState = !eligibility.isAvailable;
    setTogglingAvailability(true);
    try {
      const res = await caregiverApi.setAvailability(nextState);
      setEligibility((prev) => (prev ? { ...prev, isAvailable: res.isAvailable } : null));
      setFeedbackMessage({
        type: 'success',
        text: res.isAvailable
          ? 'Work availability status set to Online (Ready for care jobs).'
          : 'Work availability status paused (Offline).',
      });
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Failed to update availability.',
      });
    } finally {
      setTogglingAvailability(false);
    }
  };

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

  const ALL_CARE_TYPES: { id: string; label: string; desc: string }[] = [
    { id: 'BEDRIDDEN', label: 'Bedridden Care', desc: 'Total assistance, repositioning, bed bath, hygiene' },
    { id: 'WHEELCHAIR_ASSISTANCE', label: 'Wheelchair Assistance', desc: 'Safe transfers, mobility support, outdoor escort' },
    { id: 'PARTIAL_MOBILITY', label: 'Partial Mobility Support', desc: 'Walking support, fall prevention, physical therapy aid' },
    { id: 'DEMENTIA_COMPANION', label: 'Dementia / Memory Care', desc: 'Cognitive engagement, emotional reassurance, routines' },
    { id: 'POST_OPERATIVE', label: 'Post-Operative Recovery', desc: 'Vitals tracking, wound monitoring, doctor instructions' },
    { id: 'PALLIATIVE_CARE', label: 'Palliative Care', desc: 'Compassionate comfort care, pain awareness, family support' },
  ];

  const toggleCareType = (typeId: string) => {
    setPrefCareTypes((prev) =>
      prev.includes(typeId) ? prev.filter((id) => id !== typeId) : [...prev, typeId]
    );
  };

  const maxDate = new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
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
    setFeedbackMessage(null);
    try {
      await updateProfile({
        fullName: fullName.trim(),
        dob: dob.trim(),
        gender: gender.trim().toUpperCase(),
        locality: locality.trim(),
        email: email.trim() || undefined,
      });
      setIsEditing(false);
      setFeedbackMessage({ type: 'success', text: 'Personal profile updated successfully.' });
      fetchEligibilityAndKyc();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveQualifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingQualifications(true);
    setFeedbackMessage(null);
    try {
      const res = await caregiverApi.updateFullProfile({
        educationalQualifications: eduInput.trim(),
        certifications: certInput.trim(),
        previousExperience: expInput.trim(),
        qualifications: skillsInput.trim(),
        preferredCareTypes: prefCareTypes.join(', '),
        workPreferences: workPrefInput.trim(),
        preferredHours: prefHoursInput.trim(),
      });
      setFullProfile(res);
      setIsEditingQualifications(false);
      setFeedbackMessage({ type: 'success', text: 'Professional qualifications & preferences updated.' });
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Failed to update qualifications.' });
    } finally {
      setSavingQualifications(false);
    }
  };

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

      {/* Work Availability Status Card (Worker Experience) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Power className="w-4 h-4 text-teal-700" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Work Availability
            </h2>
          </div>
          {loadingEligibility ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
          ) : !eligibility?.isEligibleForWork ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
              <Lock className="w-3 h-3 text-slate-500" />
              Locked
            </span>
          ) : eligibility?.isAvailable ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              Offline
            </span>
          )}
        </div>

        <p className="text-xs text-slate-600 mb-3 leading-relaxed">
          {!eligibility?.isEligibleForWork
            ? 'Complete KYC verification to unlock worker availability and accept care assignments.'
            : eligibility?.isAvailable
            ? 'You are currently Online and visible for elder care opportunities in Chennai.'
            : 'You are currently Offline. Turn on availability to receive and accept open care shifts.'}
        </p>

        {eligibility?.isEligibleForWork ? (
          <button
            type="button"
            onClick={handleToggleAvailability}
            disabled={togglingAvailability}
            className={`w-full min-h-[44px] py-2 px-3 border rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer touch-action-manipulation ${
              eligibility?.isAvailable
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-xs'
            }`}
          >
            {togglingAvailability ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Power className="w-4 h-4" />
            )}
            <span>{eligibility?.isAvailable ? 'Go Offline (Pause Work)' : 'Go Online (Available for Work)'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsKycModalOpen(true)}
            className="w-full min-h-[44px] py-2 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-xs font-bold text-amber-900 transition-colors flex items-center justify-center gap-2 cursor-pointer touch-action-manipulation"
          >
            <Lock className="w-4 h-4 text-amber-700" />
            <span>Complete KYC to Unlock Availability</span>
          </button>
        )}
      </div>

      {/* KYC / Identity Verification Summary Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Identity Verification (KYC)
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
          ) : kycData ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              ● Pending
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              ⚠ Required
            </span>
          )}
        </div>

        <div className="text-xs text-slate-600 mb-3 space-y-1.5 leading-relaxed">
          {kycData?.verification_status === 'VERIFIED' ? (
            <p className="text-emerald-800 font-medium">
              ✓ <strong>KYC Verified:</strong> You are fully eligible to view and accept elder care assignments.
            </p>
          ) : kycData?.verification_status === 'PENDING' ? (
            <p className="text-amber-800">
              ● <strong>Verification Pending:</strong> Your documents are under review. You cannot accept care assignments until verification is approved.
            </p>
          ) : kycData?.verification_status === 'REJECTED' ? (
            <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 text-[11px] space-y-1">
              <p className="font-bold">✕ Verification Rejected:</p>
              <p>Your identity document was not approved. Care assignment acceptance is blocked.</p>
              {kycData?.rejection_reason && (
                <p className="font-semibold text-rose-950">Reason: {kycData.rejection_reason}</p>
              )}
            </div>
          ) : (
            <p className="text-amber-800">
              ⚠ <strong>Identity Verification Required:</strong> Submit your government photo document to unlock care assignments.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsKycModalOpen(true)}
          className="w-full min-h-[44px] py-2 px-3 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer touch-action-manipulation"
        >
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span>{kycData ? 'KYC / Identity Verification Details' : 'Complete KYC Verification'}</span>
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

      {/* ============================================================ */}
      {/* EXPANDED CAREGIVER PROFILE (Requirement 4)                   */}
      {/* ============================================================ */}

      {/* 1. Professional Qualifications & Certifications Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-primary" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Qualifications & Certifications
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsEditingQualifications(!isEditingQualifications)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] bg-teal-50 hover:bg-teal-100 text-primary border border-teal-200 rounded-lg text-xs font-bold transition-colors cursor-pointer touch-action-manipulation"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditingQualifications ? 'Cancel' : 'Edit Credentials'}</span>
          </button>
        </div>

        {!isEditingQualifications ? (
          <div className="space-y-3.5 divide-y divide-slate-100 text-xs">
            {/* Educational Qualifications */}
            <div className="pt-1">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Educational Qualifications
              </span>
              <div className="flex flex-wrap gap-1.5">
                {fullProfile?.educationalQualifications ? (
                  fullProfile.educationalQualifications.split(',').map((ed, i) => (
                    <span key={i} className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg font-semibold text-slate-800">
                      {ed.trim()}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500 italic">None recorded</span>
                )}
              </div>
            </div>

            {/* Professional Certifications */}
            <div className="pt-3">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Professional Certifications
              </span>
              <div className="flex flex-wrap gap-1.5">
                {fullProfile?.certifications ? (
                  fullProfile.certifications.split(',').map((c, i) => (
                    <span key={i} className="px-2.5 py-1 bg-teal-50 border border-teal-200 rounded-lg font-semibold text-teal-900 flex items-center gap-1">
                      <Award className="w-3 h-3 text-teal-700" />
                      <span>{c.trim()}</span>
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500 italic">No certifications listed</span>
                )}
              </div>
            </div>

            {/* Previous Work Experience */}
            <div className="pt-3">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Work Experience & Background
              </span>
              <p className="text-slate-800 font-medium leading-relaxed">
                {fullProfile?.previousExperience || '3+ years elderly care and hospital patient companion experience'}
              </p>
            </div>

            {/* Skills & Clinical Specializations */}
            <div className="pt-3">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Skills & Clinical Proficiencies
              </span>
              <div className="flex flex-wrap gap-1.5">
                {fullProfile?.qualifications ? (
                  fullProfile.qualifications.split(',').map((s, i) => (
                    <span key={i} className="px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 rounded-md font-semibold text-emerald-800">
                      {s.trim()}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500 italic">No skills listed</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Inline Qualifications Edit Form */
          <form onSubmit={handleSaveQualifications} className="space-y-3.5 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Educational Qualifications (Comma-separated)
              </label>
              <input
                type="text"
                value={eduInput}
                onChange={(e) => setEduInput(e.target.value)}
                placeholder="e.g. Diploma in Nursing, GNM, High School"
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Certifications (Comma-separated)
              </label>
              <input
                type="text"
                value={certInput}
                onChange={(e) => setCertInput(e.target.value)}
                placeholder="e.g. BLS / CPR Certified, Dementia Care Assistant"
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Previous Work Experience
              </label>
              <textarea
                rows={2}
                value={expInput}
                onChange={(e) => setExpInput(e.target.value)}
                placeholder="e.g. 4 years at Apollo Home Care & private family care"
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Skills & Procedures (Comma-separated)
              </label>
              <input
                type="text"
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                placeholder="e.g. Vital Monitoring, Catheter Care, Mobility Escort"
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs"
              />
            </div>

            {/* Mirrored Care Types Selector (Requirement 4) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Supported Care Categories (Mirrored from CareSeeker)
              </label>
              <div className="space-y-1.5">
                {ALL_CARE_TYPES.map((ct) => {
                  const isChecked = prefCareTypes.includes(ct.id);
                  return (
                    <label
                      key={ct.id}
                      onClick={() => toggleCareType(ct.id)}
                      className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer transition-colors ${
                        isChecked ? 'bg-teal-50 border-teal-300 text-teal-950' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by parent onClick
                        className="mt-0.5 rounded text-primary focus:ring-primary shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="font-bold text-xs block">{ct.label}</span>
                        <span className="text-[10px] text-slate-500 block leading-tight">{ct.desc}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Work Preferences</label>
                <input
                  type="text"
                  value={workPrefInput}
                  onChange={(e) => setWorkPrefInput(e.target.value)}
                  placeholder="e.g. Day Shifts, < 10km"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Preferred Hours</label>
                <input
                  type="text"
                  value={prefHoursInput}
                  onChange={(e) => setPrefHoursInput(e.target.value)}
                  placeholder="e.g. 08:00 - 18:00"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditingQualifications(false)}
                className="flex-1 py-2 px-3 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingQualifications}
                className="flex-1 py-2 px-3 bg-primary text-white rounded-xl text-xs font-bold shadow-xs hover:bg-primary-hover flex items-center justify-center gap-1.5"
              >
                {savingQualifications ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save Credentials</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 2. Supported Care Types & Work Preferences Card (Requirement 4) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm mb-4">
        <div className="flex items-center gap-2 mb-3">
          <HeartHandshake className="w-4 h-4 text-teal-700" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Care Types & Work Preferences
          </h2>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Supported Elder Care Requirements
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(fullProfile?.preferredCareTypes || '')
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
                .map((ctId) => {
                  const item = ALL_CARE_TYPES.find((c) => c.id === ctId);
                  return (
                    <span key={ctId} className="px-2.5 py-1 bg-teal-50 border border-teal-200 rounded-lg text-teal-900 font-semibold text-[11px]">
                      ✓ {item?.label || ctId}
                    </span>
                  );
                })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Work Preferences
              </span>
              <span className="font-semibold text-slate-800 text-xs mt-0.5 block">
                {fullProfile?.workPreferences || 'Day Shifts (< 12km)'}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Preferred Hours
              </span>
              <span className="font-semibold text-slate-800 text-xs mt-0.5 block flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>{fullProfile?.preferredHours || '08:00 - 18:00'}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Caregiver Quality & Track Record Metrics Card (Requirement 4) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm mb-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Performance & Track Record
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center justify-center gap-1 text-amber-600 font-black text-base">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              <span>{fullProfile?.rating ? fullProfile.rating.toFixed(1) : '4.9'}</span>
            </div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase mt-0.5 block">Rating</span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="font-black text-base text-slate-900 block">
              {fullProfile?.reviewCount ? `${fullProfile.reviewCount}+` : '48'}
            </span>
            <span className="text-[10px] font-semibold text-slate-500 uppercase mt-0.5 block">Completed Shifts</span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="font-black text-base text-emerald-700 block">
              98.5%
            </span>
            <span className="text-[10px] font-semibold text-slate-500 uppercase mt-0.5 block">Punctuality</span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="font-black text-base text-teal-800 block">
              99.2%
            </span>
            <span className="text-[10px] font-semibold text-slate-500 uppercase mt-0.5 block">Attendance</span>
          </div>
        </div>
      </div>

      {/* 4. Help & Operations Support Card (Requirement 11) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <LifeBuoy className="w-4 h-4 text-teal-700" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Help & Support
            </h2>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800">
            24x7 Chennai Desk
          </span>
        </div>
        <p className="text-xs text-slate-600 mb-3 leading-relaxed">
          Need operational assistance with shifts, attendance questions, or client house directions? Reach out directly to the operations team.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <a
            href="tel:+919840011223"
            className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-primary" />
            <span>Operations Hotline</span>
          </a>
          <button
            type="button"
            onClick={() => setShowSupportModal(true)}
            className="py-2.5 px-3 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-teal-700" />
            <span>FAQs & Help</span>
          </button>
        </div>
      </div>

      {/* Help & Support Details Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">Caregiver Partner Support</h3>
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs text-slate-600">
              <p><strong>Emergency Dispatch:</strong> Call 112 or trigger the sticky red SOS header on any screen.</p>
              <p><strong>Shift Rescheduling:</strong> Inform the Operations Desk at least 4 hours before the shift start time.</p>
              <p><strong>Payout Enquiries:</strong> Payout cycles run weekly on Wednesdays directly to registered UPI/bank accounts.</p>
              <p><strong>Forgotten Tasks:</strong> Tasks cannot be modified after checkout. An Operations Supervisor can submit corrections with reason logging.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowSupportModal(false)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs"
            >
              Close
            </button>
          </div>
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
          fetchEligibilityAndKyc();
        }}
      />
    </div>
  );
};
