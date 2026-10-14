import React, { useState, useEffect } from "react";
import {
  User,
  Phone,
  PhoneCall,
  MessageSquare,
  Clock,
  Calendar,
  Languages,
  Award,
  ShieldCheck,
  CheckCircle2,
  Heart,
  Star,
  MapPin,
  Sparkles,
  Stethoscope,
  Activity,
  AlertCircle,
  Loader2,
  KeyRound,
} from "lucide-react";
import { api } from "../../../services/api";
import type {
  Elder,
  CareAssignment,
  Caregiver,
  ShiftOtpStatus,
} from "../../../types";

interface FamilyCaregiverScreenProps {
  elder: Elder;
  onOpenMessages?: () => void;
  onOpenTab?: (tab: string) => void;
}

// Reusable standard model for fallback caregiver data (matching Home page reference)
interface CaregiverProfileData {
  fullName: string;
  role: string;
  designation: string;
  languages: string[];
  experienceYears: number;
  phone: string;
  locality: string;
  photoUrl?: string | null;
  rating: number;
  reviewCount: number;
  isPoliceVerified: boolean;
  isClinicalCertified: boolean;
  isIdentityVerified: boolean;
  specializations: string[];
  bio?: string;
}

const FALLBACK_CAREGIVER_DATA: CaregiverProfileData = {
  fullName: "Priya Sundaram",
  role: "Caregiver",
  designation: "Senior Geriatric Caregiver & BSc Nursing Attendant",
  languages: ["Tamil", "English", "Telugu"],
  experienceYears: 6,
  phone: "+91 98402 11223",
  locality: "Adyar, Chennai",
  photoUrl: "https://images.unsplash.com/photo-1594824813629-65313364f9f7?w=300&auto=format&fit=crop&q=80",
  rating: 4.9,
  reviewCount: 54,
  isPoliceVerified: true,
  isClinicalCertified: true,
  isIdentityVerified: true,
  specializations: [
    "Dementia & Alzheimer Care",
    "Mobility & Bedside Assistance",
    "Vital Signs Monitoring",
    "Medication Administration",
    "Post-Operative Recovery",
  ],
  bio: "Senior geriatric attendant certified by AHA (BLS/CPR) with 6+ years of dedicated elder care companion experience.",
};

export const FamilyCaregiverScreen: React.FC<FamilyCaregiverScreenProps> = ({
  elder,
  onOpenMessages,
  onOpenTab,
}) => {
  const [assignment, setAssignment] = useState<CareAssignment | null>(null);
  const [shiftStatus, setShiftStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [callErrorNotice, setCallErrorNotice] = useState<string | null>(null);

  // OTP and Verification state
  const [otpStatus, setOtpStatus] = useState<ShiftOtpStatus | null>(null);
  const [startOtp, setStartOtp] = useState<string | null>(null);
  const [completionOtp, setCompletionOtp] = useState<string | null>(null);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);

  const loadData = async (isInitial = false) => {
    if (isInitial) setIsLoading(true);
    try {
      const [asg, shift] = await Promise.all([
        api.getActiveAssignment(elder.id).catch(() => null),
        api.getElderShiftStatus(elder.id).catch(() => null),
      ]);
      setAssignment(asg);
      setShiftStatus(shift);
      if (shift?.id) {
        const st = await api.getShiftOtpStatus(shift.id).catch(() => null);
        if (st) setOtpStatus(st);
      }
    } catch {
      // Gracefully retain existing state or fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
    const interval = setInterval(() => loadData(false), 15000);
    return () => clearInterval(interval);
  }, [elder.id]);

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center space-y-4 p-8 min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm font-bold text-slate-700">
          Loading Caregiver Profile...
        </span>
      </div>
    );
  }

  // Derive caregiver fields from active assignment if available, else gracefully fallback
  const rawCg: Caregiver | undefined | null = assignment?.caregiver;

  const caregiverName =
    rawCg?.full_name ||
    rawCg?.fullName ||
    FALLBACK_CAREGIVER_DATA.fullName;

  const roleHeadline =
    rawCg?.headline ||
    FALLBACK_CAREGIVER_DATA.designation;

  const photoUrl =
    rawCg?.photo_url ||
    rawCg?.avatarUrl ||
    FALLBACK_CAREGIVER_DATA.photoUrl;

  const languagesList: string[] = rawCg?.languages
    ? Array.isArray(rawCg.languages)
      ? rawCg.languages
      : rawCg.languages.split(",").map((l: string) => l.trim())
    : FALLBACK_CAREGIVER_DATA.languages;

  const experienceYears: number =
    rawCg?.experience_years ??
    rawCg?.experienceYears ??
    FALLBACK_CAREGIVER_DATA.experienceYears;

  const phone: string =
    rawCg?.phone || FALLBACK_CAREGIVER_DATA.phone;

  const locality: string =
    rawCg?.locality ||
    elder.location?.locality ||
    FALLBACK_CAREGIVER_DATA.locality;

  const rating: number =
    rawCg?.rating ?? FALLBACK_CAREGIVER_DATA.rating;

  const reviewCount: number =
    rawCg?.review_count ?? FALLBACK_CAREGIVER_DATA.reviewCount;

  const isPoliceVerified: boolean =
    rawCg?.is_police_verified ?? FALLBACK_CAREGIVER_DATA.isPoliceVerified;

  const isClinicalCertified: boolean =
    rawCg?.is_clinical_certified ?? FALLBACK_CAREGIVER_DATA.isClinicalCertified;

  const specializations: string[] = rawCg?.specializations
    ? Array.isArray(rawCg.specializations)
      ? rawCg.specializations
      : rawCg.specializations.split(",").map((s: string) => s.trim())
    : FALLBACK_CAREGIVER_DATA.specializations;

  // Shift & Duty status
  const isOnDuty =
    shiftStatus?.status === "ACTIVE" ||
    shiftStatus?.status === "CHECKED_IN" ||
    rawCg?.status === "ON_DUTY";

  const availabilityStatus = isOnDuty ? "On duty now" : "Shift scheduled";

  // Shift Schedule formatting
  const shiftType =
    assignment?.shift_type ||
    assignment?.shiftType ||
    shiftStatus?.shiftType ||
    elder.shiftPreference ||
    "DAY_10_HOUR";

  const formatShiftType = (type: string) => {
    switch (type) {
      case "DAY_10_HOUR":
      case "EIGHT_HOUR_DAY":
        return "Day 10-Hour Shift (08:00 AM – 06:00 PM)";
      case "TWELVE_HOUR_DAY_NIGHT":
        return "12-Hour Day/Night Rotation";
      case "TWENTY_FOUR_HOUR_LIVE_IN":
        return "24-Hour Live-in Care";
      case "FLEXIBLE":
        return "Flexible Customized Hours";
      default:
        return type.replace(/_/g, " ");
    }
  };

  const scheduledHours =
    shiftStatus?.scheduledHours ||
    (shiftStatus?.startTime && shiftStatus?.endTime
      ? `${shiftStatus.startTime} – ${shiftStatus.endTime}`
      : "08:00 AM – 06:00 PM (10 hrs)");

  const nextScheduledShift =
    shiftStatus?.nextShift ||
    (isOnDuty ? "Tomorrow, 08:00 AM" : "Today, 08:00 AM (Upcoming)");

  const handleRequestStartOtp = async () => {
    const shiftId = shiftStatus?.id || "shift-demo-1";
    setIsRequestingOtp(true);
    setOtpMessage(null);
    try {
      const res = await api.requestStartOtp(shiftId);
      if (res?.startOtp) setStartOtp(res.startOtp);
      setOtpMessage(
        "Visit-start OTP generated (10-min validity). Share with attendant upon arrival.",
      );
      const st = await api.getShiftOtpStatus(shiftId).catch(() => null);
      if (st) setOtpStatus(st);
    } catch (err: any) {
      setOtpMessage(err.message || "Failed to generate start OTP.");
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const handleRequestCompletionOtp = async () => {
    const shiftId = shiftStatus?.id || "shift-demo-1";
    setIsRequestingOtp(true);
    setOtpMessage(null);
    try {
      const res = await api.requestCompletionOtp(shiftId);
      if (res?.completionOtp) setCompletionOtp(res.completionOtp);
      setOtpMessage(
        "Completion OTP generated. Share with attendant only after verifying care tasks.",
      );
      const st = await api.getShiftOtpStatus(shiftId).catch(() => null);
      if (st) setOtpStatus(st);
    } catch (err: any) {
      setOtpMessage(err.message || "Failed to generate completion OTP.");
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const handleCallCaregiver = (e: React.MouseEvent) => {
    if (!phone) {
      e.preventDefault();
      setCallErrorNotice("Contact number is not currently available.");
      setTimeout(() => setCallErrorNotice(null), 3000);
    }
  };

  return (
    <div className="space-y-4 px-3.5 sm:px-4 py-4 pb-safe-nav animate-fadeIn text-slate-900">
      {/* SECTION A: HEADER */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/60 text-teal-900 text-xs font-bold mb-1.5 shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <span>Care Recipient: {elder.name}</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold font-heading text-slate-900 tracking-tight">
          Caregiver
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Your dedicated care professional
        </p>
      </div>

      {/* Call Error / Notice banner if triggered */}
      {callErrorNotice && (
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{callErrorNotice}</span>
        </div>
      )}

      {/* VISIT VERIFICATION OTPS (TOP OF PAGE) */}
      <div className="rounded-[28px] sm:rounded-[30px] border border-teal-200/80 bg-gradient-to-br from-white via-teal-50/40 to-white p-4 sm:p-5 shadow-[0_8px_24px_rgba(0,67,64,0.06)] space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-primary flex items-center justify-center shrink-0">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-slate-900">
                Visit Verification OTPs
              </div>
              <div className="text-[10px] text-slate-500">
                Single-use security codes for attendant arrival and shift completion
              </div>
            </div>
          </div>
          <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
            In-App OTP
          </span>
        </div>

        {otpMessage && (
          <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs animate-fadeIn">
            {otpMessage}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          {/* Start OTP */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700">Visit-Start OTP</span>
              {otpStatus?.startOtpUsed && (
                <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                  Verified
                </span>
              )}
            </div>
            {startOtp ? (
              <div className="text-center py-1">
                <span className="text-xl font-mono font-extrabold text-primary tracking-widest">
                  {startOtp}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Valid for 10 min (Single-use)</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleRequestStartOtp}
                disabled={isRequestingOtp}
                className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl transition active:scale-95 disabled:opacity-50"
              >
                {isRequestingOtp ? "Generating..." : "Generate Code"}
              </button>
            )}
          </div>

          {/* Completion OTP */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700">Completion OTP</span>
              {otpStatus?.completionOtpUsed && (
                <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                  Verified
                </span>
              )}
            </div>
            {completionOtp ? (
              <div className="text-center py-1">
                <span className="text-xl font-mono font-extrabold text-primary tracking-widest">
                  {completionOtp}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Valid for 10 min (Single-use)</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleRequestCompletionOtp}
                disabled={isRequestingOtp}
                className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl transition active:scale-95 disabled:opacity-50"
              >
                {isRequestingOtp ? "Generating..." : "Generate Code"}
              </button>
            )}
          </div>
        </div>

        <div className="text-[10px] text-slate-400 leading-relaxed border-t border-slate-100 pt-2">
          Note: Delivered via secure in-app channel. Share start code when {caregiverName} arrives and completion code only after verifying all care tasks.
        </div>
      </div>

      {/* SECTION B: CAREGIVER PROFILE CARD */}
      <div className="rounded-[28px] sm:rounded-[30px] border border-slate-200 bg-white p-4 sm:p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Circular / Rounded Profile Avatar with duty badge */}
            <div className="relative shrink-0">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={caregiverName}
                  className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-cover border-2 border-teal-200 shadow-sm"
                  onError={(e) => {
                    // Graceful fallback to initial if image fails
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl border-2 border-teal-200 bg-teal-50 text-2xl font-extrabold text-primary shadow-sm">
                  {caregiverName.charAt(0)}
                </div>
              )}
              {/* Subtle visual indicator for availability */}
              <span
                className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white ${
                  isOnDuty ? "bg-emerald-500" : "bg-amber-500"
                }`}
                title={availabilityStatus}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h3 className="truncate text-base sm:text-lg font-extrabold text-slate-900">
                  {caregiverName}
                </h3>
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              </div>
              <p className="text-xs font-bold text-primary truncate mt-0.5">
                Caregiver
              </p>
              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                {roleHeadline}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="flex items-center gap-0.5 text-[11px] font-bold text-amber-600">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span>{rating.toFixed(1)}</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  ({reviewCount} reviews)
                </span>
              </div>
            </div>
          </div>

          {/* Availability Status Badge */}
          <span
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${
              isOnDuty
                ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isOnDuty ? "bg-emerald-500 animate-ping" : "bg-amber-500"
              }`}
            />
            <span>{availabilityStatus}</span>
          </span>
        </div>

        {/* Verification Badges */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
          {isPoliceVerified && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200/60 text-[10px] font-bold text-teal-800">
              <ShieldCheck className="h-3 w-3 text-primary" />
              Police Verified
            </span>
          )}
          {isClinicalCertified && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200/60 text-[10px] font-bold text-teal-800">
              <Award className="h-3 w-3 text-primary" />
              AHA BLS Certified
            </span>
          )}
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700">
            <MapPin className="h-3 w-3 text-slate-500" />
            {locality}
          </span>
        </div>
      </div>

      {/* SECTION D: CONTACT ACTIONS */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {phone ? (
          <a
            href={`tel:${phone.replace(/\s+/g, "")}`}
            onClick={handleCallCaregiver}
            className="flex min-h-[48px] sm:min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-primary px-3 py-2 text-xs font-bold text-white shadow-sm shadow-teal-900/20 transition hover:bg-primary-hover active:scale-[0.98]"
            title={`Call ${caregiverName}`}
          >
            <PhoneCall className="h-4 w-4 shrink-0" />
            <span>Call Caregiver</span>
          </a>
        ) : (
          <button
            disabled
            className="flex min-h-[48px] sm:min-h-[52px] cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-400"
          >
            <Phone className="h-4 w-4 shrink-0" />
            <span>Phone Unavailable</span>
          </button>
        )}

        <button
          onClick={() => {
            if (onOpenMessages) {
              onOpenMessages();
            } else if (onOpenTab) {
              onOpenTab("MESSAGES");
            }
          }}
          className="flex min-h-[48px] sm:min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-bold text-primary shadow-sm transition hover:bg-teal-100 active:scale-[0.98]"
          title="Message Caregiver via Care Desk"
        >
          <MessageSquare className="h-4 w-4 shrink-0" />
          <span>Message Caregiver</span>
        </button>
      </div>

      {/* SECTION C: BASIC INFORMATION */}
      <div className="rounded-[28px] sm:rounded-[30px] border border-slate-200 bg-white p-4 sm:p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Basic Information
            </h4>
          </div>
          <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
            Verified Record
          </span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {/* Full Name */}
          <div className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-2 text-slate-500">
              <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>Full Name</span>
            </div>
            <span className="font-bold text-slate-900 text-right">
              {caregiverName || "Not provided"}
            </span>
          </div>

          {/* Role / Designation */}
          <div className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-2 text-slate-500">
              <Stethoscope className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>Role / Designation</span>
            </div>
            <span className="font-bold text-slate-900 text-right">
              Caregiver (Attendant)
            </span>
          </div>

          {/* Languages Spoken */}
          <div className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-2 text-slate-500">
              <Languages className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>Languages Spoken</span>
            </div>
            <span className="font-bold text-slate-900 text-right">
              {languagesList.length > 0
                ? languagesList.join(", ")
                : "Not provided"}
            </span>
          </div>

          {/* Experience */}
          <div className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-2 text-slate-500">
              <Award className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>Experience</span>
            </div>
            <span className="font-bold text-slate-900 text-right">
              {experienceYears > 0
                ? `${experienceYears} years`
                : "Not provided"}
            </span>
          </div>

          {/* Contact Number */}
          <div className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-2 text-slate-500">
              <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>Contact Number</span>
            </div>
            <span className="font-bold text-slate-900 text-right">
              {phone || "Not provided"}
            </span>
          </div>

          {/* Assigned Care Recipient */}
          <div className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-2 text-slate-500">
              <Heart className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>Assigned Recipient</span>
            </div>
            <span className="font-bold text-primary text-right">
              {elder.name || "Not provided"}
            </span>
          </div>

          {/* Shift Schedule */}
          <div className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-2 text-slate-500">
              <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>Shift Schedule</span>
            </div>
            <span className="font-bold text-slate-900 text-right max-w-[200px] truncate">
              {formatShiftType(shiftType)}
            </span>
          </div>

          {/* Availability Status */}
          <div className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-2 text-slate-500">
              <Activity className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>Availability Status</span>
            </div>
            <span
              className={`font-bold text-right ${
                isOnDuty ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              {availabilityStatus}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION E: SHIFT INFORMATION */}
      <div className="rounded-[28px] sm:rounded-[30px] border border-slate-200 bg-white p-4 sm:p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Shift Information
            </h4>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isOnDuty
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-amber-50 text-amber-800 border border-amber-200"
            }`}
          >
            {isOnDuty ? "Active Shift" : "Scheduled Shift"}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2.5 text-xs">
          {/* Current shift status */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Current Shift Status
              </span>
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isOnDuty ? "bg-emerald-500 animate-ping" : "bg-amber-500"
                  }`}
                />
                <span>{isOnDuty ? "Checked-In & On Duty" : "Shift Scheduled"}</span>
              </div>
            </div>
            <span className="text-[10px] text-slate-500">
              {isOnDuty ? "Adyar, Chennai" : "Assigned"}
            </span>
          </div>

          {/* Scheduled working hours */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Scheduled Working Hours
              </span>
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{scheduledHours}</span>
              </div>
            </div>
            <span className="text-[10px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
              10 Hours
            </span>
          </div>

          {/* Next scheduled shift */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Next Scheduled Shift
              </span>
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{nextScheduledShift}</span>
              </div>
            </div>
            <span className="text-[10px] text-slate-500">Upcoming</span>
          </div>
        </div>
      </div>


      {/* SPECIALIZATIONS & CLINICAL SKILLS */}
      {specializations && specializations.length > 0 && (
        <div className="rounded-[28px] sm:rounded-[30px] border border-slate-200 bg-white p-4 sm:p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Care Specializations
            </h4>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {specializations.map((skill, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-xl bg-teal-50/70 border border-teal-200/60 text-[11px] font-bold text-teal-900"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 24/7 CARE DESK OVERSIGHT ASSURANCE */}
      <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200/60 flex items-center gap-3 text-xs">
        <div className="h-9 w-9 rounded-xl bg-teal-100 border border-teal-200 flex items-center justify-center text-primary shrink-0">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-bold text-teal-950 block">
            24/7 Care Desk Monitoring
          </span>
          <span className="text-[11px] text-teal-800/80 leading-relaxed block">
            Every shift is supervised by registered nurses and clinical coordinators in Chennai.
          </span>
        </div>
      </div>
    </div>
  );
};
