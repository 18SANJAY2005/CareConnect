import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  LogOut, 
  Navigation, 
  Calendar,
  Sparkles,
  RefreshCw,
  Briefcase,
  Lock,
  Power,
  ChevronRight,
  IndianRupee,
  Heart,
  ShieldCheck,
  AlertCircle,
  X,
  TrendingUp
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useCaregiverAuth } from '../../context/CaregiverAuthContext';
import { CheckInModal } from './CheckInModal';
import { CheckOutModal } from './CheckOutModal';
import { SosModal } from './SosModal';
import { JobDetailsModal } from './JobDetailsModal';
import { WorkHistoryAndEarningsModal } from './WorkHistoryAndEarningsModal';
import { CaregiverKycModal } from '../profile/CaregiverKycModal';
import { caregiverApi } from '../../services/api';
import { getGoogleMapsNavigationUrl } from '../../utils/mapUtils';
import type { ShiftDetails, CaregiverEligibility, AvailableCareJob, AssignmentOffer } from '../../types';

interface TodayScreenProps {
  shiftDetails: ShiftDetails | null;
  loading: boolean;
  onRefresh: () => void;
  onNavigateToTasks: () => void;
  onNavigateToLogs: () => void;
  onNavigateToProfile?: () => void;
}

export const TodayScreen: React.FC<TodayScreenProps> = ({
  shiftDetails,
  loading,
  onRefresh,
  onNavigateToTasks,
  onNavigateToLogs,
  onNavigateToProfile,
}) => {
  const { t } = useLanguage();
  const { user } = useCaregiverAuth();

  // Shift & attendance modals
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [showSosModal, setShowSosModal] = useState(false);

  // Rapido Captain Worker states: Eligibility & Availability
  const [eligibility, setEligibility] = useState<CaregiverEligibility | null>(null);
  const [loadingEligibility, setLoadingEligibility] = useState(true);
  const [togglingAvailability, setTogglingAvailability] = useState(false);

  // Assignment Offers states (Requirement 5)
  const [assignmentOffers, setAssignmentOffers] = useState<AssignmentOffer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState<boolean>(false);
  const [decliningOfferId, setDecliningOfferId] = useState<number | null>(null);
  const [declineReason, setDeclineReason] = useState<string>('');
  const [showDeclineModal, setShowDeclineModal] = useState<boolean>(false);
  const [respondingOfferId, setRespondingOfferId] = useState<number | null>(null);
  const [nowTime, setNowTime] = useState<Date>(new Date());

  // Available Care Jobs states
  const [availableJobs, setAvailableJobs] = useState<AvailableCareJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [selectedJob, setSelectedJob] = useState<AvailableCareJob | null>(null);
  const [showJobModal, setShowJobModal] = useState(false);
  const [acceptingJobId, setAcceptingJobId] = useState<string | null>(null);

  // Work History & Earnings Modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // KYC Modal trigger
  const [showKycModal, setShowKycModal] = useState(false);

  // Toast / Feedback banner
  const [actionAlert, setActionAlert] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const shift = shiftDetails?.shift;
  const elder = shiftDetails?.elder;
  const attendance = shiftDetails?.latestAttendance;

  const isOnDuty = shift?.status === 'ACTIVE' || shift?.status === 'CHECKED_IN';
  const isCheckedOut = (shift?.status as string) === 'CHECKED_OUT' || (shift?.status as string) === 'COMPLETED';

  // Tick every second for response deadline countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load Caregiver Eligibility
  const fetchEligibility = async () => {
    setLoadingEligibility(true);
    try {
      const data = await caregiverApi.getEligibility();
      setEligibility(data);
      if (data.isAvailable && data.isEligibleForWork) {
        loadAvailableJobs();
      }
    } catch (err: any) {
      console.warn('Failed to load caregiver eligibility:', err);
    } finally {
      setLoadingEligibility(false);
    }
  };

  // Load Assignment Offers with Deadline (Requirement 5)
  const fetchAssignmentOffers = async () => {
    setLoadingOffers(true);
    try {
      const offers = await caregiverApi.getAssignmentOffers();
      setAssignmentOffers(offers);
    } catch (err: any) {
      console.warn('Failed to load assignment offers:', err);
    } finally {
      setLoadingOffers(false);
    }
  };

  // Load Available Jobs
  const loadAvailableJobs = async () => {
    setLoadingJobs(true);
    try {
      const jobs = await caregiverApi.getAvailableJobs();
      setAvailableJobs(jobs);
    } catch (err: any) {
      // If 403 (KYC not verified), available jobs are blocked
      setAvailableJobs([]);
    } finally {
      setLoadingJobs(false);
    }
  };

  useEffect(() => {
    fetchEligibility();
    fetchAssignmentOffers();
  }, []);

  // When shift details change, reload eligibility and offers to sync status
  useEffect(() => {
    if (shiftDetails) {
      fetchEligibility();
      fetchAssignmentOffers();
    }
  }, [shiftDetails]);

  // Toggle Worker Availability (ON/OFF)
  const handleToggleAvailability = async () => {
    if (!eligibility) return;

    if (!eligibility.isEligibleForWork) {
      setActionAlert({
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
      if (nextState) {
        setActionAlert({
          type: 'success',
          text: 'You are now Online and available for elder care assignments.',
        });
        loadAvailableJobs();
      } else {
        setActionAlert({
          type: 'info',
          text: 'You are now Offline. You will not receive new care opportunities.',
        });
      }
    } catch (err: any) {
      setActionAlert({
        type: 'error',
        text: err.message || 'Unable to update availability status.',
      });
    } finally {
      setTogglingAvailability(false);
    }
  };

  // Accept a Job
  const handleAcceptJob = async (job: AvailableCareJob) => {
    const elderId = job.elderId || job.id;
    setAcceptingJobId(elderId);
    setActionAlert(null);
    try {
      await caregiverApi.acceptJob(elderId);
      setActionAlert({
        type: 'success',
        text: `Successfully accepted care for ${job.elderName}! Shift scheduled.`,
      });
      setShowJobModal(false);
      // Refresh shift details so the active shift screen renders
      onRefresh();
      fetchEligibility();
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('already been accepted') || msg.includes('409') || msg.includes('Conflict')) {
        setActionAlert({
          type: 'error',
          text: 'This care assignment is no longer available.',
        });
      } else if (msg.includes('KYC') || msg.includes('403') || msg.includes('Forbidden')) {
        setActionAlert({
          type: 'error',
          text: 'KYC verification is required before accepting care assignments.',
        });
      } else {
        setActionAlert({
          type: 'error',
          text: msg || 'Unable to accept care assignment. Please try again.',
        });
      }
      loadAvailableJobs();
    } finally {
      setAcceptingJobId(null);
    }
  };

  // Format response deadline remaining time (Requirement 5)
  const formatDeadlineRemaining = (deadlineStr?: string) => {
    if (!deadlineStr) return null;
    const diff = new Date(deadlineStr).getTime() - nowTime.getTime();
    if (diff <= 0) return { text: 'EXPIRED', isExpired: true };
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return { text: `${mins}m ${secs < 10 ? '0' : ''}${secs}s remaining`, isExpired: false };
  };

  const handleAcceptOffer = async (offer: AssignmentOffer) => {
    setRespondingOfferId(offer.id);
    setActionAlert(null);
    try {
      await caregiverApi.acceptAssignmentOffer(offer.id);
      setActionAlert({
        type: 'success',
        text: `Successfully accepted assignment for ${offer.elderName}! Shift confirmed.`,
      });
      fetchAssignmentOffers();
      onRefresh();
      fetchEligibility();
    } catch (err: any) {
      setActionAlert({
        type: 'error',
        text: err.message || 'Unable to accept assignment offer.',
      });
      fetchAssignmentOffers();
    } finally {
      setRespondingOfferId(null);
    }
  };

  const handleDeclineOffer = async () => {
    if (!decliningOfferId) return;
    setRespondingOfferId(decliningOfferId);
    try {
      await caregiverApi.declineAssignmentOffer(decliningOfferId, declineReason || 'Schedule conflict');
      setActionAlert({
        type: 'info',
        text: 'Assignment offer declined. Matching next eligible caregiver.',
      });
      setShowDeclineModal(false);
      setDecliningOfferId(null);
      setDeclineReason('');
      fetchAssignmentOffers();
    } catch (err: any) {
      setActionAlert({
        type: 'error',
        text: err.message || 'Failed to decline assignment offer.',
      });
    } finally {
      setRespondingOfferId(null);
    }
  };

  // Requirement 8: Check-in allowed window check
  const checkInWindowCheck = (scheduledStart?: string, scheduledEnd?: string) => {
    if (!scheduledStart) return { allowed: true, msg: '' };
    const start = new Date(scheduledStart).getTime();
    const end = scheduledEnd ? new Date(scheduledEnd).getTime() : start + 8 * 3600 * 1000;
    const now = nowTime.getTime();
    // Allow check-in within 60 minutes before scheduled start up to end time
    const windowStart = start - 60 * 60 * 1000;
    if (now < windowStart) {
      const openTime = new Date(windowStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return { allowed: false, msg: `Check-in opens at ${openTime} (60m prior)` };
    }
    if (now > end) {
      return { allowed: false, msg: 'Shift scheduled window has passed' };
    }
    return { allowed: true, msg: 'Check-in window active' };
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const caregiverFirstName = user?.fullName?.split(' ')[0] || 'Caregiver';

  const isKycVerified = eligibility?.kycStatus === 'VERIFIED';
  const isKycPending = eligibility?.kycStatus === 'PENDING';
  const isKycRejected = eligibility?.kycStatus === 'REJECTED';
  const isKycRequired = !eligibility?.kycStatus || eligibility?.eligibilityState === 'KYC_REQUIRED';
  const isProfileIncomplete = eligibility?.eligibilityState === 'PROFILE_INCOMPLETE';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-xs font-semibold">Loading today's shift assignment...</p>
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-4 py-3 sm:py-4 space-y-3.5 sm:space-y-4 max-w-md mx-auto pb-36 animate-fadeIn">
      {/* Toast Alert Banner */}
      {actionAlert && (
        <div
          role="alert"
          className={`p-3 sm:p-3.5 rounded-2xl border flex items-center justify-between gap-2.5 text-xs font-semibold shadow-xs transition-all ${
            actionAlert.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : actionAlert.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-teal-50 border-teal-200 text-teal-800'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {actionAlert.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : actionAlert.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
            )}
            <span className="truncate">{actionAlert.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionAlert(null)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. RAPIDO CAPTAIN STYLE WORKER HEADER & AVAILABILITY CARD     */}
      {/* ============================================================ */}
      {/* 1. TOP GREETING & OPERATIONS DESK HEADER (Requirement 7: KYC pill moved to Profile) */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-200">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-teal-700">CareConnect Partner</p>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-0.5 truncate">
            {getGreeting()}, {caregiverFirstName}
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">
            {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} • Chennai Operations Desk
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. ASSIGNMENT OFFERS WITH DEADLINE (Requirement 5)           */}
      {/* ============================================================ */}
      {assignmentOffers.filter((o) => o.status === 'WAITING_CONFIRMATION').length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-black text-xs uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-teal-600 animate-spin" />
              <span>New Assignment Offers</span>
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-900">
              Response Deadline Enforced
            </span>
          </div>

          {assignmentOffers
            .filter((o) => o.status === 'WAITING_CONFIRMATION')
            .map((offer) => {
              const deadlineInfo = formatDeadlineRemaining(offer.responseDeadline || undefined);
              const formattedDate = offer.scheduledStart
                ? new Date(offer.scheduledStart).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
                : offer.startDate || 'Scheduled Date';
              const formattedTimes = offer.scheduledStart && offer.scheduledEnd
                ? `${new Date(offer.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${new Date(offer.scheduledEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : (offer.shiftType || 'Full Day Shift');

              return (
                <div
                  key={offer.id}
                  className="bg-white rounded-3xl p-4 shadow-sm border-2 border-teal-500/80 space-y-3 relative overflow-hidden"
                >
                  {/* Top Bar: Care Type & Response Deadline Countdown */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-teal-50 text-teal-800 px-2 py-0.5 rounded-full border border-teal-200">
                      {offer.careType || offer.shiftType || 'Elder Care Assignment'}
                    </span>

                    {deadlineInfo && (
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                          deadlineInfo.isExpired
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>{deadlineInfo.text}</span>
                      </span>
                    )}
                  </div>

                  {/* Elder Details */}
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-700 to-teal-500 text-white font-black text-xl flex items-center justify-center shadow-xs shrink-0">
                      {offer.elderName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-extrabold text-base text-slate-900 truncate">
                        {offer.elderName}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {offer.elderAge ? `${offer.elderAge} yrs • ` : ''}{offer.elderGender || 'Elder Patient'}
                      </p>
                      <p className="text-xs font-semibold text-slate-700 mt-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>{offer.locality || offer.address || 'Chennai'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Timing & Care Requirements */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-700">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-teal-700" />
                        <span>{formattedDate}</span>
                      </div>
                      <span className="font-bold text-teal-800">
                        {formattedTimes}
                      </span>
                    </div>

                    {(offer.careRequirements || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {offer.careRequirements?.map((req, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] text-slate-700 font-medium"
                          >
                            {req}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions: Accept & Decline */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      disabled={respondingOfferId === offer.id || deadlineInfo?.isExpired}
                      onClick={() => {
                        setDecliningOfferId(offer.id);
                        setShowDeclineModal(true);
                      }}
                      className="py-2.5 px-3 min-h-[44px] bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
                    >
                      Decline
                    </button>

                    <button
                      type="button"
                      disabled={respondingOfferId === offer.id || deadlineInfo?.isExpired}
                      onClick={() => handleAcceptOffer(offer)}
                      className="py-2.5 px-3 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {respondingOfferId === offer.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      <span>Accept Offer</span>
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}



      {/* ============================================================ */}
      {/* 2. KYC STATE BANNERS (WHEN KYC IS NOT VERIFIED)               */}
      {/* ============================================================ */}
      {isProfileIncomplete && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-800 shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-amber-950">Complete your profile</h3>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Your caregiver profile is incomplete. Please finish adding your personal details to become eligible for elder care work.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (onNavigateToProfile) onNavigateToProfile();
            }}
            className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            Complete Profile
          </button>
        </div>
      )}

      {isKycRequired && !isProfileIncomplete && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-800 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-amber-950">Identity verification required</h3>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Complete your KYC to become eligible for care assignments. Government photo ID is required before taking shifts.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowKycModal(true)}
            className="w-full py-3 px-4 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Complete KYC</span>
          </button>
        </div>
      )}

      {isKycPending && (
        <div className="bg-teal-50 border border-teal-200 rounded-3xl p-5 shadow-xs space-y-2">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-teal-100 rounded-xl text-teal-800 shrink-0">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-teal-950">KYC verification pending</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-200 text-teal-900 uppercase">
                  In Review
                </span>
              </div>
              <p className="text-xs text-teal-800 mt-1 leading-relaxed">
                Your documents are being reviewed by CareConnect Operations. You will be able to accept care assignments after verification.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowKycModal(true)}
            className="w-full py-2.5 px-4 bg-white border border-teal-200 hover:bg-teal-50 text-teal-900 font-bold text-xs rounded-xl shadow-2xs transition-colors flex items-center justify-center gap-2 mt-2"
          >
            <span>View KYC Document Submission</span>
          </button>
        </div>
      )}

      {isKycRejected && (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-100 rounded-xl text-rose-800 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-rose-950">KYC verification required</h3>
              <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                Your identity verification was not approved. Please re-upload a clear government photo document.
              </p>
              {eligibility?.rejectionReason && (
                <div className="mt-2 p-2.5 bg-white/80 rounded-xl border border-rose-200 text-[11px] text-rose-900">
                  <span className="font-bold">Reason: </span>
                  <span>{eligibility.rejectionReason}</span>
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowKycModal(true)}
            className="w-full py-3 px-4 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Update KYC</span>
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. CASE A: NO ACTIVE SHIFT (AVAILABLE CARE & DISCOVERY)       */}
      {/* ============================================================ */}
      {(!shift || !elder) && (
        <div className="space-y-4">
          {/* If KYC Verified: Show Available Care Work */}
          {isKycVerified ? (
            !eligibility?.isAvailable ? (
              /* When worker is OFFLINE */
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 text-center space-y-3">
                <div className="w-14 h-14 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center mx-auto">
                  <Power className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-base text-slate-900">You Are Currently Offline</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Turn ON <strong>Available for Care Work</strong> above to browse and accept open elder care opportunities in your locality.
                </p>
                <button
                  type="button"
                  onClick={handleToggleAvailability}
                  disabled={togglingAvailability}
                  className="py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                >
                  Turn ON Availability
                </button>
              </div>
            ) : (
              /* When worker is ONLINE: Show Available Care Opportunities */
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <h3 className="font-black text-sm uppercase tracking-wider text-slate-800">
                      Available Care
                    </h3>
                    <p className="text-xs text-teal-800 font-semibold mt-0.5">
                      {availableJobs.length} care {availableJobs.length === 1 ? 'opportunity' : 'opportunities'} nearby
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={loadAvailableJobs}
                    disabled={loadingJobs}
                    className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1 shadow-2xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingJobs ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                {loadingJobs ? (
                  <div className="py-12 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200 text-slate-500">
                    <RefreshCw className="w-7 h-7 animate-spin text-teal-600 mb-2" />
                    <p className="text-xs font-semibold">Finding nearby care opportunities...</p>
                  </div>
                ) : availableJobs.length === 0 ? (
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 text-center space-y-3">
                    <div className="w-12 h-12 bg-teal-50 text-primary rounded-2xl flex items-center justify-center mx-auto">
                      <Briefcase className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-sm text-slate-900">No Open Assignments Right Now</h4>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                      You are online and ready! As soon as families request care in Chennai, jobs will appear here instantly.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {availableJobs.map((job) => {
                      const jobId = job.elderId || job.id;
                      return (
                      <div
                        key={jobId}
                        className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/90 hover:border-teal-300 transition-all space-y-3"
                      >
                        {/* Job Top Row */}
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                              {job.careType}
                            </span>
                            <h4 className="font-extrabold text-base text-slate-900 mt-1">
                              {job.elderName}
                            </h4>
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                              <span>{job.locality}, Chennai</span>
                              <span>•</span>
                              <span className="text-teal-700 font-semibold">~{job.approximateDistanceKm} km</span>
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="text-sm font-black text-emerald-700">{job.compensation}</span>
                            <p className="text-[10px] text-slate-400">per shift</p>
                          </div>
                        </div>

                        {/* Timing and Needs */}
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-150 space-y-2 text-xs">
                          <div className="flex items-center justify-between text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                              <span className="font-semibold">{job.shiftDuration}</span>
                            </div>
                            <span className="text-slate-500 text-[11px]">Starts {job.starts}</span>
                          </div>

                          <div className="flex flex-wrap gap-1 pt-1">
                            {job.careNeeds.map((need, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] text-slate-700 font-medium"
                              >
                                {need}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Job Actions */}
                        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedJob(job);
                              setShowJobModal(true);
                            }}
                            className="py-2.5 px-3 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors"
                          >
                            View Details
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAcceptJob(job)}
                            disabled={acceptingJobId === jobId}
                            className="py-2.5 px-3 min-h-[44px] bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
                          >
                            {acceptingJobId === jobId ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                            )}
                            <span>Accept Care</span>
                          </button>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )
          ) : (
            /* When KYC is NOT Verified: Work Selection is Locked */
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 text-center space-y-3">
              <div className="w-14 h-14 bg-amber-50 text-amber-700 rounded-2xl flex items-center justify-center mx-auto">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Care Opportunities Locked</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                KYC verification is required before accepting care assignments. Complete your identity verification to unlock available elder care shifts.
              </p>
              <button
                type="button"
                onClick={() => setShowKycModal(true)}
                className="py-3 px-6 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all inline-flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Verify KYC Document</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. ACTIVE SHIFT & EMBEDDED CHECK-IN (Requirement 8)          */}
      {/* ============================================================ */}
      {shift && elder && (
        <div className="space-y-4">
          {isCheckedOut ? (
            /* Shift is completed: Removed from active Today, preserved in history (Requirement 8) */
            <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 text-emerald-950 space-y-2.5 shadow-2xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <h3 className="font-extrabold text-sm text-emerald-950">Shift Completed for {elder.name}</h3>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Attendance and daily care tasks have been verified and submitted for today. Completed shifts are accessible under Schedule and Payouts.
              </p>
              <div className="p-2.5 bg-white/80 rounded-xl border border-emerald-200 text-[11px] text-slate-700 leading-snug">
                <strong>Forgotten Task Policy:</strong> Once a shift is closed, tasks cannot be edited retrospectively. If a correction is required, an Operations Supervisor can submit corrections with reason logging.
              </div>
            </div>
          ) : (
            /* Active Assignment Card with Embedded Check-In */
            <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Active Care Assignment
                </span>

                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 shadow-2xs ${
                    isOnDuty ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isOnDuty ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  {shift.status}
                </span>
              </div>

              {/* Elder Details */}
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-700 to-teal-500 text-white font-black text-xl flex items-center justify-center shadow-xs shrink-0">
                  {elder.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                    {shift.shiftType?.replace(/_/g, ' ') || 'Day Shift'}
                  </span>
                  <h2 className="font-extrabold text-lg text-slate-900 truncate mt-0.5">{elder.name}</h2>
                  <p className="text-xs text-slate-500">
                    {elder.age} {t('years')} • {elder.gender} • {elder.primaryLanguage}
                  </p>
                  {shift.scheduledStart && shift.scheduledEnd && (
                    <p className="text-[11px] font-medium text-teal-800 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-teal-600 inline shrink-0" />
                      <span>
                        {new Date(shift.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(shift.scheduledEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Residence Address & Navigation Action */}
              <div className="pt-2 border-t border-slate-100 flex items-start gap-2.5 text-xs text-slate-600">
                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold text-slate-800">{elder.locality}, Chennai</div>
                  <div className="text-slate-500 text-[11px] mt-0.5 leading-snug">{elder.addressLine1}</div>
                </div>
                <a
                  href={getGoogleMapsNavigationUrl(elder)}
                  target="_blank"
                  rel="noreferrer"
                  className="py-1.5 px-3 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs touch-action-manipulation"
                >
                  <Navigation className="w-3.5 h-3.5 text-teal-700" />
                  <span>Navigate</span>
                </a>
              </div>

              {/* Attendance Verification State */}
              {attendance && (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-semibold text-emerald-950">Checked in at: </span>
                      <span className="text-emerald-800 font-mono">
                        {attendance.checkInTime ? new Date(attendance.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Verified'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 uppercase">
                    {attendance.verificationStatus || 'VERIFIED'}
                  </span>
                </div>
              )}

              {/* Embedded Check-In / Check-Out Controls (Requirement 8) */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                {!isOnDuty ? (
                  <>
                    {(() => {
                      const windowCheck = checkInWindowCheck(shift.scheduledStart, shift.scheduledEnd);
                      return (
                        <>
                          {!windowCheck.allowed && (
                            <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>{windowCheck.msg}</span>
                            </p>
                          )}
                          <button
                            type="button"
                            disabled={!windowCheck.allowed}
                            onClick={() => setShowCheckInModal(true)}
                            className="w-full py-3.5 px-4 bg-primary hover:bg-primary-hover text-white font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                            <span>{t('checkIn')}</span>
                          </button>
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCheckOutModal(true)}
                    className="w-full py-3 px-4 min-h-[48px] bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t('checkOut')}</span>
                  </button>
                )}

                {/* Quick Shortcuts to Daily Tasks & Logs */}
                {isOnDuty && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={onNavigateToTasks}
                      className="py-2.5 px-3 min-h-[44px] bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs rounded-xl border border-teal-200 transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>Daily Tasks →</span>
                    </button>
                    <button
                      type="button"
                      onClick={onNavigateToLogs}
                      className="py-2.5 px-3 min-h-[44px] bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>Vitals & Logs →</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. WORKER AVAILABILITY (Requirement 7: Moved Lower on Today)  */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-200 space-y-3">
        <div className="flex items-center justify-between bg-slate-50 p-3 sm:p-3.5 rounded-2xl border border-slate-200 gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                !isKycVerified
                  ? 'bg-slate-200 text-slate-500'
                  : eligibility?.isAvailable
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-300 text-slate-700'
              }`}
            >
              {!isKycVerified ? (
                <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Power className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">Available for Care Work</p>
              <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 mt-0.5 truncate">
                {!isKycVerified ? (
                  <span className="text-amber-800 font-semibold">Locked until KYC verified</span>
                ) : eligibility?.isAvailable ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                    ONLINE • Ready for shifts
                  </span>
                ) : (
                  <span className="text-slate-500 font-semibold">OFFLINE • Paused</span>
                )}
              </p>
            </div>
          </div>

          {/* Switch Toggle */}
          {isKycVerified ? (
            <button
              type="button"
              onClick={handleToggleAvailability}
              disabled={togglingAvailability}
              className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-hidden cursor-pointer ${
                eligibility?.isAvailable ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
              aria-label="Toggle availability"
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform flex items-center justify-center text-[10px] font-bold ${
                  eligibility?.isAvailable ? 'translate-x-9 text-emerald-700' : 'translate-x-1 text-slate-600'
                }`}
              >
                {togglingAvailability ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
                ) : eligibility?.isAvailable ? (
                  'ON'
                ) : (
                  'OFF'
                )}
              </span>
            </button>
          ) : (
            <span className="px-2.5 py-1 bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold flex items-center gap-1">
              <Lock className="w-3 h-3" />
              LOCKED
            </span>
          )}
        </div>

        {/* Worker Quick Access: My Work & Earnings */}
        <div className="pt-1 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="flex-1 py-2.5 px-3 bg-teal-50/80 hover:bg-teal-100 text-teal-900 border border-teal-200 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
          >
            <TrendingUp className="w-4 h-4 text-teal-700" />
            <span>My Work & Earnings</span>
            <ChevronRight className="w-3.5 h-3.5 text-teal-600 ml-auto" />
          </button>
        </div>
      </div>

          {/* Emergency SOS Trigger Card */}
          <div className="bg-rose-50/80 rounded-3xl p-4 border border-rose-200">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h4 className="font-bold text-xs text-rose-950">{t('sosButton')}</h4>
                <p className="text-[11px] text-rose-700 leading-snug mt-0.5">
                  Instant P1 emergency trigger for acute clinical distress or fall.
                </p>
              </div>
              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold text-[10px] rounded-full border border-rose-200">
                P1 Emergency
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowSosModal(true)}
              className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <ShieldAlert className="w-5 h-5 animate-pulse" />
              <span>{t('sosButton')}</span>
            </button>
          </div>

      {/* ============================================================ */}
      {/* MODALS                                                        */}
      {/* ============================================================ */}

      {/* Decline Assignment Offer Modal (Requirement 5) */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900">Decline Assignment Offer</h3>
              <button
                type="button"
                onClick={() => setShowDeclineModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Please tell us why you are declining this care assignment so operations can reassign it immediately.
            </p>
            <div className="space-y-2">
              {['Schedule conflict / Unavailable', 'Travel distance is too far', 'Care requirements mismatch', 'Personal emergency'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setDeclineReason(r)}
                  className={`w-full p-2.5 rounded-xl border text-left text-xs font-semibold transition-colors ${
                    declineReason === r ? 'bg-teal-50 border-teal-300 text-teal-900' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  {r}
                </button>
              ))}
              <input
                type="text"
                placeholder="Or specify custom reason..."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDeclineModal(false)}
                className="flex-1 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={respondingOfferId !== null}
                onClick={handleDeclineOffer}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                {respondingOfferId !== null ? 'Declining...' : 'Confirm Decline'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Job Details Modal */}
      {showJobModal && (
        <JobDetailsModal
          job={selectedJob}
          isOpen={showJobModal}
          onClose={() => {
            setShowJobModal(false);
            setSelectedJob(null);
          }}
          onAccept={handleAcceptJob}
          accepting={acceptingJobId !== null}
        />
      )}

      {/* Work History and Earnings Modal */}
      {showHistoryModal && (
        <WorkHistoryAndEarningsModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
        />
      )}

      {/* KYC Document Verification Modal */}
      {showKycModal && (
        <CaregiverKycModal
          isOpen={showKycModal}
          onClose={() => {
            setShowKycModal(false);
            fetchEligibility();
            onRefresh();
          }}
        />
      )}

      {/* Attendance Check-in Modal */}
      {showCheckInModal && shiftDetails && (
        <CheckInModal
          isOpen={showCheckInModal}
          onClose={() => setShowCheckInModal(false)}
          shiftDetails={shiftDetails}
          onSuccess={() => {
            onRefresh();
            fetchEligibility();
          }}
        />
      )}

      {/* Attendance Check-out Modal */}
      {showCheckOutModal && shiftDetails && (
        <CheckOutModal
          isOpen={showCheckOutModal}
          onClose={() => setShowCheckOutModal(false)}
          shiftDetails={shiftDetails}
          onSuccess={() => {
            onRefresh();
            fetchEligibility();
          }}
        />
      )}

      {/* P1 SOS Emergency Modal */}
      {showSosModal && (
        <SosModal
          isOpen={showSosModal}
          onClose={() => setShowSosModal(false)}
          shiftDetails={shiftDetails}
          onSuccess={() => {
            onRefresh();
            fetchEligibility();
          }}
        />
      )}
    </div>
  );
};
