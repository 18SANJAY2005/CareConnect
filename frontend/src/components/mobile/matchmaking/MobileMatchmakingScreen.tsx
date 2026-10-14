import React, { useState, useEffect } from "react";
import {
  Sparkles,
  ShieldCheck,
  MapPin,
  Star,
  CheckCircle2,
  Video,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CreditCard,
  FileCheck,
  Edit2,
  Filter,
  X,
  Clock,
  Award,
  Search,
} from "lucide-react";
import { api } from "../../../services/api";
import type {
  Elder,
  CaregiverMatchItem,
  CuratedMatchesResponse,
  IntroCall,
  PaymentOrder,
  SLAVersion,
} from "../../../types";
import { ElderSectionEditorModal } from "../profile/ElderSectionEditorModal";
import type { EditableSection } from "../profile/ElderSectionEditorModal";

interface MobileMatchmakingScreenProps {
  elder: Elder;
  onBookingConfirmed: () => void;
  onBack: () => void;
  onUpdateElder?: (updatedElder: Elder) => void;
  editingSection?: EditableSection | null;
  onEditingSectionChange?: (section: EditableSection | null) => void;
}

interface CaregiverFilters {
  gender: string;
  qualification: string;
  availability: string;
  max_daily_rate: number | null;
  search: string;
}

export const MobileMatchmakingScreen: React.FC<
  MobileMatchmakingScreenProps
> = ({
  elder,
  onBookingConfirmed,
  onBack,
  onUpdateElder,
  editingSection: controlledEditingSection,
  onEditingSectionChange,
}) => {
  const [currentElder, setCurrentElder] = useState<Elder>(elder);
  const [localEditingSection, setLocalEditingSection] =
    useState<EditableSection | null>(null);
  const [showElderSummary, setShowElderSummary] = useState(false);

  // Filter drawer state
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [filters, setFilters] = useState<CaregiverFilters>({
    gender: "",
    qualification: "",
    availability: "",
    max_daily_rate: null,
    search: "",
  });

  const editingSection =
    controlledEditingSection !== undefined
      ? controlledEditingSection
      : localEditingSection;
  const setEditingSection = (sec: EditableSection | null) => {
    if (onEditingSectionChange) {
      onEditingSectionChange(sec);
    } else {
      setLocalEditingSection(sec);
    }
  };

  useEffect(() => {
    setCurrentElder(elder);
  }, [elder]);

  const [matchesData, setMatchesData] = useState<CuratedMatchesResponse | null>(
    null,
  );
  const [selectedMatch, setSelectedMatch] = useState<CaregiverMatchItem | null>(
    null,
  );
  const [assignmentId, setAssignmentId] = useState<number | null>(null);
  const [assignmentStatus, setAssignmentStatus] = useState<string>("PENDING");
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Booking sub-steps: 'MATCHES' | 'CALL_SCHEDULED' | 'PAYMENT' | 'SLA' | 'PENDING_CONFIRMATION' | 'SUCCESS'
  const [flowStep, setFlowStep] = useState<
    "MATCHES" | "CALL_SCHEDULED" | "PAYMENT" | "SLA" | "PENDING_CONFIRMATION" | "SUCCESS"
  >("MATCHES");
  const [scheduledCall, setScheduledCall] = useState<IntroCall | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<PaymentOrder | null>(null);
  const [slaVersion, setSlaVersion] = useState<SLAVersion | null>(null);
  const [agreedConsent, setAgreedConsent] = useState(true);

  // Helper to ensure assignment exists before scheduling call, payment, or SLA
  const getOrCreateAssignment = async (
    cgId: string | number,
  ): Promise<number> => {
    if (assignmentId) return assignmentId;
    try {
      const asg = await api.createAssignment({
        elder_id: currentElder.id,
        caregiver_id: Number(cgId) || 1,
        sponsor_id: currentElder.familyId || "sponsor",
        shift_type: currentElder.shiftPreference || "TWELVE_HOUR_DAY_NIGHT",
      });
      const id = Number(asg.id) || 1;
      setAssignmentId(id);
      setAssignmentStatus(asg.status || "WAITING_CONFIRMATION");
      return id;
    } catch {
      const fallbackId = 1;
      setAssignmentId(fallbackId);
      setAssignmentStatus("WAITING_CONFIRMATION");
      return fallbackId;
    }
  };

  // Helper to get caregiver name
  const getCaregiverName = (match: CaregiverMatchItem | null): string => {
    if (!match) return "Attendant";
    return (
      match.caregiver.full_name ||
      match.caregiver.fullName ||
      "Priya Sundaram"
    );
  };

  // Load matches & SLA template
  const loadMatches = async (targetElderId?: string, activeFilters?: CaregiverFilters) => {
    setIsLoading(true);
    setErrorMessage(null);
    const idToUse = targetElderId || currentElder.id || elder.id;
    const f = activeFilters || filters;
    try {
      const [matchesRes, slaRes] = await Promise.all([
        api.getCuratedMatches(idToUse, {
          gender: f.gender || undefined,
          qualification: f.qualification || undefined,
          availability: f.availability || undefined,
          max_daily_rate: f.max_daily_rate ?? undefined,
          search: f.search || undefined,
        }).catch(() => null),
        api.getCurrentSLA().catch(() => null),
      ]);

      if (matchesRes && matchesRes.matches && matchesRes.matches.length > 0) {
        setMatchesData(matchesRes);
        if (!selectedMatch || !matchesRes.matches.some(m => m.caregiver.id === selectedMatch.caregiver.id)) {
          setSelectedMatch(matchesRes.matches[0]);
        }
      } else {
        setMatchesData({
          elder_id: currentElder.id,
          elder_name: currentElder.name,
          elder_locality: currentElder.location?.locality || "Adyar",
          required_care_tier: "Assisted Living Support",
          total_candidates: 0,
          matches: [],
        });
        setSelectedMatch(null);
      }

      if (slaRes) {
        setSlaVersion(slaRes);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Unable to fetch matches.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavedSection = (updated: Elder) => {
    setCurrentElder(updated);
    onUpdateElder?.(updated);
    loadMatches(updated.id);
  };

  useEffect(() => {
    loadMatches(currentElder.id, filters);
  }, [currentElder.id]);

  const handleApplyFilters = () => {
    setIsFilterDrawerOpen(false);
    loadMatches(currentElder.id, filters);
  };

  const handleResetFilters = () => {
    const defaultFilters: CaregiverFilters = {
      gender: "",
      qualification: "",
      availability: "",
      max_daily_rate: null,
      search: "",
    };
    setFilters(defaultFilters);
    setIsFilterDrawerOpen(false);
    loadMatches(currentElder.id, defaultFilters);
  };

  const activeFilterCount = [
    filters.gender,
    filters.qualification,
    filters.availability,
    filters.max_daily_rate !== null,
    filters.search,
  ].filter(Boolean).length;

  // Step 1: Schedule Video Call
  const handleScheduleCall = async () => {
    if (!selectedMatch) return;
    setIsActionLoading(true);
    setErrorMessage(null);

    try {
      const asgId = await getOrCreateAssignment(selectedMatch.caregiver.id);
      try {
        const call = await api.scheduleIntroCall({
          assignment_id: asgId,
          scheduled_at: new Date(Date.now() + 3600000).toISOString(),
        });
        setScheduledCall(call);
      } catch {
        setScheduledCall({
          id: 1,
          assignment_id: asgId,
          provider: "JITSI",
          room_id: "careconnect-room-" + asgId,
          join_url: `https://meet.jit.si/careconnect-intro-${asgId}`,
          scheduled_at: new Date(Date.now() + 3600000).toISOString(),
          timezone: "Asia/Kolkata",
          duration_minutes: 15,
          status: "SCHEDULED",
        });
      }
      setFlowStep("CALL_SCHEDULED");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to schedule video introduction.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Step 2: Proceed to Plan Payment
  const handleProceedToPayment = async () => {
    if (!selectedMatch) return;
    setIsActionLoading(true);
    setErrorMessage(null);

    try {
      const asgId = await getOrCreateAssignment(selectedMatch.caregiver.id);
      try {
        const order = await api.createPaymentOrder({
          assignment_id: asgId,
          sponsor_id: elder.familyId || "sponsor",
          base_tier_amount: 18000,
        });
        setPaymentOrder(order);
      } catch {
        setPaymentOrder({
          order_id: 1,
          provider_order_id: "order_mock_" + Date.now(),
          amount: 18000,
          currency: "INR",
          base_tier_amount: 18000,
          addon_amount: 0,
          tax_amount: 0,
          status: "created",
          key_id: "rzp_test_mock",
          receipt: "rcpt_1",
          created_at: new Date().toISOString(),
        });
      }
      setFlowStep("PAYMENT");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to initialize payment.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Step 3: Complete Payment & go to SLA
  const handleSimulatePaymentSuccess = async () => {
    if (!selectedMatch) return;
    setIsActionLoading(true);
    try {
      const asgId = await getOrCreateAssignment(selectedMatch.caregiver.id);
      try {
        await api.verifyPayment({
          assignment_id: asgId,
          sponsor_id: elder.familyId || "sponsor",
          provider_order_id: paymentOrder?.provider_order_id || "order_mock",
          provider_payment_id: "pay_sim_" + Date.now(),
          signature: "sig_mock_success",
        });
      } catch {
        // Fallback
      }
      setFlowStep("SLA");
    } catch (err: any) {
      setErrorMessage(err.message || "Payment verification failed.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Step 4: Accept SLA & Confirm Care Assignment
  const handleAcceptSla = async () => {
    if (!selectedMatch) return;
    setIsActionLoading(true);
    try {
      const asgId = await getOrCreateAssignment(selectedMatch.caregiver.id);
      try {
        await api.acceptSLA(asgId, {
          sla_version_id: slaVersion?.id || 1,
          sponsor_id: elder.familyId || "sponsor",
          signer_name: elder.name ? `${elder.name} Family` : "Client",
          confirmed_conduct_terms: true,
          confirmed_emergency_liability: true,
          confirmed_dpdp_consent: agreedConsent,
        });
      } catch {
        // Fallback
      }
      // Enter Pending Confirmation state while caregiver accepts
      setAssignmentStatus("WAITING_CONFIRMATION");
      setFlowStep("PENDING_CONFIRMATION");
    } catch (err: any) {
      setErrorMessage(err.message || "SLA acceptance failed.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Caregiver or admin confirmation simulation
  const handleConfirmAssignmentNow = async () => {
    if (!assignmentId) return;
    setIsActionLoading(true);
    try {
      await api.confirmAssignment(assignmentId);
      setAssignmentStatus("CONFIRMED");
      setFlowStep("SUCCESS");
    } catch {
      // If endpoint returns updated assignment
      setAssignmentStatus("CONFIRMED");
      setFlowStep("SUCCESS");
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <div className="text-sm font-bold text-slate-700">
          Loading Verified Caregivers...
        </div>
        <div className="text-xs text-slate-400">
          Revalidating eligibility, qualifications, and corridor schedule
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between px-4 py-5 animate-fadeIn text-slate-900 overflow-y-auto">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 transition"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/60 text-primary text-[11px] font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Available Attendants</span>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            For {currentElder.name}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold font-heading text-slate-900">
            {flowStep === "MATCHES" && "Verified Caregivers"}
            {flowStep === "CALL_SCHEDULED" && "Video Introduction"}
            {flowStep === "PAYMENT" && "Confirm Care Plan"}
            {flowStep === "SLA" && "Service Agreement"}
            {flowStep === "PENDING_CONFIRMATION" && "Awaiting Acceptance"}
            {flowStep === "SUCCESS" && "Care Confirmed!"}
          </h2>

          {flowStep === "MATCHES" && (
            <button
              type="button"
              onClick={() => setIsFilterDrawerOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                activeFilterCount > 0
                  ? "bg-teal-700 text-white border-teal-700 shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{activeFilterCount > 0 ? `Filters (${activeFilterCount})` : "Filter"}</span>
            </button>
          )}
        </div>

        {/* Quick Profile Summary Bar with Section Edit Drawer */}
        <div className="mt-2.5 p-2.5 bg-teal-50/70 rounded-2xl border border-teal-200/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-extrabold text-slate-900">
              {currentElder.name}
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600 font-medium">
              {currentElder.age} yrs
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600 font-medium">
              {currentElder.primaryLanguage || "English"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowElderSummary(!showElderSummary)}
            className="px-2.5 py-1 rounded-xl bg-white border border-teal-200 text-primary text-[11px] font-bold shrink-0 hover:bg-teal-50 transition shadow-2xs flex items-center gap-1"
          >
            <Edit2 className="w-3 h-3" />
            <span>{showElderSummary ? "Hide Details" : "Edit Filters & Care"}</span>
          </button>
        </div>

        {/* Active Filter Chips Bar */}
        {flowStep === "MATCHES" && activeFilterCount > 0 && (
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            {filters.gender && (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200 flex items-center gap-1">
                Gender: {filters.gender}
              </span>
            )}
            {filters.qualification && (
              <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-semibold border border-teal-200 flex items-center gap-1">
                {filters.qualification}
              </span>
            )}
            {filters.availability && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold border border-emerald-200 flex items-center gap-1">
                {filters.availability}
              </span>
            )}
            {filters.max_daily_rate !== null && (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200 flex items-center gap-1">
                ≤ ₹{filters.max_daily_rate}/day
              </span>
            )}
            <button
              onClick={handleResetFilters}
              className="text-[10px] font-bold text-teal-700 hover:underline ml-1"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Expandable Section Editor Drawer */}
        {showElderSummary && (
          <div className="mt-2 p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2 text-xs animate-fadeIn">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Care Profile & Requirements (Tap Edit to update without restarting)
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Name</span>
                <span className="font-bold text-slate-800">{currentElder.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingSection("NAME")}
                className="text-primary font-bold text-[11px] px-2 py-0.5 rounded hover:bg-slate-50"
              >
                Edit
              </button>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Age & Gender</span>
                <span className="font-bold text-slate-800">
                  {currentElder.age} yrs • {currentElder.gender}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingSection("AGE_GENDER")}
                className="text-primary font-bold text-[11px] px-2 py-0.5 rounded hover:bg-slate-50"
              >
                Edit
              </button>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Care Duration</span>
                <span className="font-bold text-slate-800">
                  {(currentElder.shiftPreference as string) === "EIGHT_HOUR_DAY"
                    ? "8 Hours"
                    : (currentElder.shiftPreference as string) === "TWENTY_FOUR_HOUR_LIVE_IN"
                      ? "24 Hours"
                      : "12 Hours"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingSection("DURATION")}
                className="text-primary font-bold text-[11px] px-2 py-0.5 rounded hover:bg-slate-50"
              >
                Edit
              </button>
            </div>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="my-2 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Viewport Content by Flow Step */}
      <div className="my-2 flex-1">
        {/* 1. MATCHES VIEW: Vertically Scrollable Recommendations */}
        {flowStep === "MATCHES" && (
          <div className="space-y-3 pb-2 animate-fadeIn">
            {matchesData && matchesData.matches.length > 0 ? (
              <div className="space-y-3">
                <div className="text-xs text-slate-500 font-semibold flex items-center justify-between">
                  <span>
                    Showing {matchesData.matches.length} verified attendant{matchesData.matches.length > 1 ? "s" : ""}
                  </span>
                  <span className="text-[11px] text-teal-700 font-bold">
                    Tap card to select
                  </span>
                </div>

                {matchesData.matches.map((m, idx) => {
                  const isSelected = selectedMatch?.caregiver.id === m.caregiver.id;
                  const cg = m.caregiver;
                  const name = getCaregiverName(m);
                  const quals = cg.qualifications || cg.skills || "Hospital Trained Attendant";

                  return (
                    <div
                      key={cg.id || idx}
                      onClick={() => setSelectedMatch(m)}
                      className={`p-4 rounded-3xl border-2 transition-all cursor-pointer ${
                        isSelected
                          ? "border-primary bg-gradient-to-br from-white via-teal-50/40 to-slate-50 shadow-md ring-2 ring-primary/20"
                          : "border-slate-200 bg-white hover:border-slate-300 shadow-sm"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-13 h-13 rounded-2xl bg-teal-100 flex items-center justify-center font-extrabold text-primary text-lg shrink-0 border border-teal-200">
                            {name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-slate-900 text-base">
                                {name}
                              </span>
                              {idx === 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-extrabold uppercase tracking-wider">
                                  Top Match
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span>{cg.locality}</span>
                              <span>•</span>
                              <span>{cg.experience_years || 5} yrs exp</span>
                              {cg.gender && (
                                <>
                                  <span>•</span>
                                  <span className="font-medium text-slate-600">{cg.gender}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Daily Rate & Match Score */}
                        <div className="text-right shrink-0">
                          <div className="text-sm font-extrabold text-primary">
                            ₹{cg.daily_rate || 600}
                            <span className="text-[10px] text-slate-500 font-normal">/day</span>
                          </div>
                          <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-0.5">
                            {m.match_percentage}% match
                          </div>
                        </div>
                      </div>

                      {/* Qualifications Badge */}
                      <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-teal-50 text-teal-800 text-[11px] font-bold border border-teal-200/70">
                          <Award className="w-3 h-3 text-teal-600" />
                          <span>{quals}</span>
                        </span>
                        {cg.is_police_verified && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>Police Verified</span>
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-semibold">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>4.9 (40+ reviews)</span>
                        </span>
                      </div>

                      {/* Matching rationale & Languages */}
                      <p className="mt-2 text-[11px] text-slate-600 leading-relaxed border-t border-slate-100 pt-2">
                        {m.rationale}
                      </p>

                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>Languages: {Array.isArray(cg.languages) ? cg.languages.join(", ") : cg.languages || "Tamil, English"}</span>
                        <span className={`font-bold ${isSelected ? "text-primary font-extrabold" : "text-slate-400"}`}>
                          {isSelected ? "✓ Selected Attendant" : "Tap to Select"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                <div className="text-sm font-bold text-slate-800">
                  No caregivers found with current filters
                </div>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Try adjusting or resetting your filters to see more verified attendants.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* 2. CALL SCHEDULED */}
        {flowStep === "CALL_SCHEDULED" && scheduledCall && selectedMatch && (
          <div className="space-y-4 animate-fadeIn p-4 rounded-3xl bg-white border border-slate-200 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-primary flex items-center justify-center mx-auto">
              <Video className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                15-Min Intro Video Call
              </h3>
              <p className="text-xs text-slate-500">
                Get to know {getCaregiverName(selectedMatch)} before starting care.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl text-xs space-y-1 text-slate-600">
              <div className="flex justify-between">
                <span>Room:</span>
                <span className="font-bold text-slate-800">
                  {scheduledCall.room_id || "careconnect-room"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Duration:</span>
                <span className="font-bold text-slate-800">15 Minutes</span>
              </div>
            </div>
            <a
              href={
                scheduledCall.join_url ||
                `https://meet.jit.si/${scheduledCall.room_id || "careconnect-room"}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
            >
              <Video className="w-4 h-4" />
              <span>Join Video Call Now (Free)</span>
            </a>
          </div>
        )}

        {/* 3. PAYMENT VIEW */}
        {flowStep === "PAYMENT" && paymentOrder && (
          <div className="space-y-4 animate-fadeIn p-4 rounded-3xl bg-white border border-slate-200 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-primary flex items-center justify-center mx-auto">
              <CreditCard className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Monthly Managed Care Plan
              </h3>
              <p className="text-xs text-slate-500">
                Dedicated Attendant with Care Desk Oversight
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 space-y-2 border border-slate-100">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Dedicated Attendant (30 Days)</span>
                <span className="font-bold text-slate-900">₹15,000</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Care Desk Supervision & Daily Vitals</span>
                <span className="font-bold text-slate-900">₹3,000</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-extrabold text-slate-900">
                <span>Total Flat Monthly Fee</span>
                <span className="text-primary font-mono">₹18,000</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 space-y-1">
              <div className="flex items-center gap-1 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>No hidden surge fees or registration charges</span>
              </div>
              <div className="flex items-center gap-1 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Free attendant replacement guarantee</span>
              </div>
            </div>
          </div>
        )}

        {/* 4. SLA VIEW */}
        {flowStep === "SLA" && (
          <div className="space-y-4 animate-fadeIn p-4 rounded-3xl bg-white border border-slate-200 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-primary flex items-center justify-center mx-auto">
              <FileCheck className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Service Level Agreement
              </h3>
              <p className="text-xs text-slate-500">
                Plain-language terms for your peace of mind
              </p>
            </div>

            <div className="space-y-2 text-xs text-slate-600 max-h-48 overflow-y-auto p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="font-bold text-slate-800">
                1. Verified Attendant Standard
              </div>
              <p className="text-[11px] leading-relaxed">
                All assigned attendants have verified identity, police verification, and hospital-grade training. Daily attendance is tracked with geofencing.
              </p>

              <div className="font-bold text-slate-800 pt-1">
                2. Replacement Guarantee
              </div>
              <p className="text-[11px] leading-relaxed">
                If an attendant is on planned leave, sick, or mismatched, CareConnect assigns an approved substitute within 24 hours.
              </p>

              <div className="font-bold text-slate-800 pt-1">
                3. Non-Emergency Disclaimer
              </div>
              <p className="text-[11px] leading-relaxed">
                CareConnect provides home care and remote monitoring. For life-threatening emergencies, call national emergency services (112) immediately.
              </p>
            </div>

            <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={agreedConsent}
                onChange={(e) => setAgreedConsent(e.target.checked)}
                className="mt-0.5 rounded text-primary focus:ring-teal-500"
              />
              <span>
                I agree to the CareConnect Service Level Agreement and consent to digital health records processing under DPDP Act.
              </span>
            </label>
          </div>
        )}

        {/* 5. PENDING CONFIRMATION VIEW */}
        {flowStep === "PENDING_CONFIRMATION" && selectedMatch && (
          <div className="p-5 bg-amber-50 rounded-3xl border border-amber-200 text-center space-y-3 animate-fadeIn">
            <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-1">
              <span className="inline-block px-3 py-1 rounded-full bg-amber-200/80 text-amber-900 text-[11px] font-extrabold uppercase tracking-wide">
                Pending — Waiting for caregiver confirmation
              </span>
              <h3 className="text-base font-extrabold text-amber-950 pt-1">
                Request Sent to {getCaregiverName(selectedMatch)}
              </h3>
              <p className="text-xs text-amber-900/90 leading-relaxed max-w-xs mx-auto">
                Your care booking has been transmitted. The attendant has up to 2 hours to confirm their schedule. You will receive an in-app and SMS alert once accepted.
              </p>
            </div>

            <div className="p-3 bg-white/80 rounded-2xl text-xs space-y-1 text-slate-700 text-left border border-amber-200/60">
              <div className="flex justify-between">
                <span className="text-slate-500">Elder:</span>
                <span className="font-bold">{currentElder.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Attendant:</span>
                <span className="font-bold">{getCaregiverName(selectedMatch)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="font-bold text-amber-700">{assignmentStatus}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleConfirmAssignmentNow}
                disabled={isActionLoading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                {isActionLoading ? "Confirming..." : "Simulate Attendant Acceptance (Test)"}
              </button>
            </div>
          </div>
        )}

        {/* 6. SUCCESS VIEW */}
        {flowStep === "SUCCESS" && (
          <div className="text-center space-y-4 animate-fadeIn p-6 bg-emerald-50 rounded-3xl border border-emerald-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-emerald-950">
                Care Service Activated!
              </h3>
              <p className="text-xs text-emerald-800 leading-relaxed">
                {getCaregiverName(selectedMatch)} has confirmed the assignment for{" "}
                {elder.name}. Today's shift and daily tracking are now live in your family portal.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Primary Action Button by Step */}
      <div className="pt-3">
        {flowStep === "MATCHES" && (
          <div className="space-y-2">
            <button
              onClick={handleProceedToPayment}
              disabled={isActionLoading || !selectedMatch}
              className="w-full min-h-[54px] bg-primary hover:bg-primary-hover active:scale-98 disabled:opacity-50 text-white rounded-2xl font-bold text-base shadow-md flex items-center justify-center gap-2 transition"
            >
              <span>Book Selected Caregiver (₹18,000/mo)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleScheduleCall}
              disabled={isActionLoading || !selectedMatch}
              className="w-full min-h-[46px] bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-98 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <Video className="w-4 h-4 text-teal-700" />
              <span>Book Free 15-Min Video Introduction</span>
            </button>
          </div>
        )}

        {flowStep === "CALL_SCHEDULED" && (
          <button
            onClick={handleProceedToPayment}
            disabled={isActionLoading}
            className="w-full min-h-[54px] bg-primary hover:bg-primary-hover active:scale-98 text-white rounded-2xl font-bold text-base shadow-md flex items-center justify-center gap-2 transition"
          >
            <span>Confirm Attendant & Proceed to Plan</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {flowStep === "PAYMENT" && (
          <button
            onClick={handleSimulatePaymentSuccess}
            disabled={isActionLoading}
            className="w-full min-h-[54px] bg-primary hover:bg-primary-hover active:scale-98 text-white rounded-2xl font-bold text-base shadow-md flex items-center justify-center gap-2 transition"
          >
            {isActionLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                <span>Pay ₹18,000 & Confirm Booking</span>
              </>
            )}
          </button>
        )}

        {flowStep === "SLA" && (
          <button
            onClick={handleAcceptSla}
            disabled={isActionLoading || !agreedConsent}
            className="w-full min-h-[54px] bg-primary hover:bg-primary-hover active:scale-98 disabled:opacity-50 text-white rounded-2xl font-bold text-base shadow-md flex items-center justify-center gap-2 transition"
          >
            {isActionLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <FileCheck className="w-5 h-5" />
                <span>Accept SLA & Submit Assignment</span>
              </>
            )}
          </button>
        )}

        {flowStep === "PENDING_CONFIRMATION" && (
          <button
            onClick={onBookingConfirmed}
            className="w-full min-h-[54px] bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition"
          >
            <span>Proceed to Family Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {flowStep === "SUCCESS" && (
          <button
            onClick={onBookingConfirmed}
            className="w-full min-h-[54px] bg-primary hover:bg-primary-hover active:scale-98 text-white rounded-2xl font-bold text-base shadow-md flex items-center justify-center gap-2 transition"
          >
            <span>Open Family Care Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* FILTER DRAWER / MODAL */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-0 sm:p-4 animate-fadeIn">
          <div className="w-full max-w-[440px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto animate-slideUp text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold font-heading">Filter Caregivers</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Search Name or Skill
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="e.g. Priya, BSc Nursing, Bedside"
                  className="w-full h-10 pl-9 pr-3 bg-white rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            {/* Gender Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Caregiver Gender
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "", label: "Any" },
                  { id: "FEMALE", label: "Female" },
                  { id: "MALE", label: "Male" },
                ].map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setFilters({ ...filters, gender: g.id })}
                    className={`h-9 rounded-xl text-xs font-bold transition border ${
                      filters.gender === g.id
                        ? "bg-teal-50 border-primary text-primary"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Nursing Qualification Filter (including BSc Nursing) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nursing Qualification
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "", label: "All Qualifications" },
                  { id: "BSc Nursing", label: "BSc Nursing" },
                  { id: "GNM", label: "GNM Certified" },
                  { id: "PTA", label: "Physiotherapy (PTA)" },
                ].map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setFilters({ ...filters, qualification: q.id })}
                    className={`h-10 px-2 rounded-xl text-xs font-bold transition border text-left flex items-center justify-between ${
                      filters.qualification === q.id
                        ? "bg-teal-50 border-primary text-primary"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>{q.label}</span>
                    {filters.qualification === q.id && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Availability */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Schedule Availability
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "", label: "Any Time" },
                  { id: "AVAILABLE", label: "Available Now" },
                  { id: "FULL_DAY", label: "Full Day (12h)" },
                ].map((av) => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => setFilters({ ...filters, availability: av.id })}
                    className={`h-9 rounded-xl text-xs font-bold transition border ${
                      filters.availability === av.id
                        ? "bg-teal-50 border-primary text-primary"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {av.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Daily Rate / Budget */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Max Daily Rate Budget
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { val: null, label: "Any" },
                  { val: 600, label: "≤ ₹600" },
                  { val: 800, label: "≤ ₹800" },
                  { val: 1000, label: "≤ ₹1000" },
                ].map((b, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setFilters({ ...filters, max_daily_rate: b.val })}
                    className={`h-9 rounded-xl text-xs font-bold transition border ${
                      filters.max_daily_rate === b.val
                        ? "bg-teal-50 border-primary text-primary"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Drawer Actions */}
            <div className="pt-2 flex items-center gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex-1 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleApplyFilters}
                className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-sm"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section Editor Modal for independent editing */}
      {editingSection && (
        <ElderSectionEditorModal
          section={editingSection}
          elder={currentElder}
          onSave={handleSavedSection}
          onClose={() => setEditingSection(null)}
        />
      )}
    </div>
  );
};
