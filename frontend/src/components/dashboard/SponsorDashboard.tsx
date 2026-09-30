import React, { useState, useEffect } from "react";
import {
  MapPin,
  Calendar,
  Heart,
  PlusCircle,
  Stethoscope,
  User,
  Users,
  Activity,
  Utensils,
  Clock,
  CheckCircle2,
  UserCheck,
  ReceiptIndianRupee,
  RefreshCw,
  SlidersHorizontal,
  Bell,
} from "lucide-react";
import { useOnboarding } from "../../context/OnboardingContext";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import type {
  CareAssignment,
  ReplacementRequest,
  Notification,
} from "../../types";

import { ActiveCareCard } from "../care/ActiveCareCard";
import { ReplacementModal } from "../phaseD/ReplacementModal";
import { ReplacementTracker } from "../phaseD/ReplacementTracker";
import { FeedbackModal } from "../phaseD/FeedbackModal";
import { BillingDashboard } from "../phaseD/BillingDashboard";
import { RenewalCard } from "../phaseD/RenewalCard";
import { OperationsConsole } from "../phaseD/OperationsConsole";

export const SponsorDashboard: React.FC = () => {
  const { user } = useAuth();
  const {
    elders,
    activeElder,
    activeAssessment,
    setCurrentStep,
    selectElder,
    startNewElderOnboarding,
  } = useOnboarding();

  // Tab State
  const [activeTab, setActiveTab] = useState<
    "ACTIVE_CARE" | "BILLING" | "RENEWAL" | "PERSONA" | "OPERATIONS"
  >("ACTIVE_CARE");

  // Care assignment and Phase D states
  const [assignment, setAssignment] = useState<CareAssignment | null>(null);
  const [activeReplacement, setActiveReplacement] =
    useState<ReplacementRequest | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isReplacementModalOpen, setIsReplacementModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isCareLoading, setIsCareLoading] = useState(true);

  const loadCareData = async () => {
    if (!activeElder) return;
    try {
      setIsCareLoading(true);
      const [asg, reps, notifs] = await Promise.all([
        api.getActiveAssignment(activeElder.id),
        api.listReplacementRequests(),
        api.listNotifications(),
      ]);
      setAssignment(asg);
      setNotifications(notifs);

      // Check if an open replacement request exists for this assignment
      const openReq = reps.find((r) =>
        [
          "SUBMITTED",
          "ACKNOWLEDGED",
          "UNDER_REVIEW",
          "REPLACEMENT_SEARCH",
          "ASSIGNED",
          "SCHEDULED",
        ].includes(r.status),
      );
      setActiveReplacement(openReq || (reps.length > 0 ? reps[0] : null));
    } catch (err) {
      console.error("Failed to load active care data:", err);
    } finally {
      setIsCareLoading(false);
    }
  };

  useEffect(() => {
    loadCareData();
  }, [activeElder]);

  if (!activeElder) {
    return (
      <div className="max-w-md mx-auto py-16 text-center px-4">
        <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-3">
          <User className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">
          No Elder Profile Found
        </h2>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          Begin Phase A onboarding to create a verified patient profile.
        </p>
        <button
          onClick={() => setCurrentStep("GEO_VERIFICATION")}
          className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-xl shadow-sm transition"
        >
          Start Onboarding
        </button>
      </div>
    );
  }

  const loc = activeElder.location;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-800/60 border border-teal-500/30 text-teal-200 text-xs font-semibold mb-3">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
            <span>Managed Clinical Care Network • Active Service</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Care for {activeElder.name}
          </h1>
          <p className="text-teal-100/80 text-xs sm:text-sm mt-1 max-w-xl flex items-center flex-wrap gap-2">
            <span>
              Sponsor:{" "}
              <span className="font-semibold text-white">{user?.fullName}</span>
            </span>
            <span>•</span>
            <span>
              Location:{" "}
              <span className="font-semibold text-white">
                {loc?.locality || "Care Zone"}
              </span>
            </span>
            {elders && elders.length > 1 && (
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-[11px] font-medium text-teal-100">
                Elder {elders.findIndex((e) => e.id === activeElder.id) + 1} of{" "}
                {elders.length}
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setActiveTab("OPERATIONS")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
              activeTab === "OPERATIONS"
                ? "bg-amber-400 text-slate-950 shadow-md"
                : "bg-white/10 hover:bg-white/20 border border-white/20 text-white"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Operations Console</span>
          </button>

          <button
            onClick={startNewElderOnboarding}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Another Elder</span>
          </button>
        </div>
      </div>

      {/* Registered Elders Selector Ribbon */}
      {elders && elders.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-700" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Family Care Recipients ({elders.length})
              </h2>
              <span className="hidden sm:inline text-[11px] text-slate-400">
                • Click an elder to view active care
              </span>
            </div>
            <button
              onClick={startNewElderOnboarding}
              className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100/80 transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Add Elder</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {elders.map((elder) => {
              const isSelected = activeElder?.id === elder.id;
              const elderLoc = elder.location?.locality || "Care Zone";
              return (
                <button
                  key={elder.id}
                  type="button"
                  onClick={() => selectElder(elder.id)}
                  className={`text-left p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2.5 ${
                    isSelected
                      ? "bg-gradient-to-br from-teal-50/90 to-teal-50/40 border-teal-500 shadow-sm ring-2 ring-teal-500/20"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 w-full">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-bold text-sm truncate ${isSelected ? "text-teal-950" : "text-slate-800"}`}
                        >
                          {elder.name}
                        </span>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-teal-600 shrink-0" />
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span>
                          {elder.age} yrs • {elder.gender}
                        </span>
                      </div>
                    </div>
                    {isSelected ? (
                      <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0 mt-0.5" />
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 w-full">
                    <span className="flex items-center gap-1 truncate max-w-[120px]">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{elderLoc}</span>
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        elder.personaStatus === "SAVED"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {elder.personaStatus === "SAVED"
                        ? "Active"
                        : elder.personaStatus}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Notifications Alert Bar if unread notifications exist */}
      {notifications.length > 0 && notifications[0] && (
        <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 text-xs flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-teal-700 shrink-0" />
            <div>
              <span className="font-bold">{notifications[0].title}: </span>
              <span>{notifications[0].message}</span>
            </div>
          </div>
          <span className="text-[10px] text-teal-700 font-mono shrink-0">
            {new Date(notifications[0].createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      )}

      {/* Dashboard Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("ACTIVE_CARE")}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 ${
            activeTab === "ACTIVE_CARE"
              ? "bg-teal-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Active Care & Attendant</span>
        </button>

        <button
          onClick={() => setActiveTab("BILLING")}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 ${
            activeTab === "BILLING"
              ? "bg-teal-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <ReceiptIndianRupee className="w-4 h-4" />
          <span>Monthly Billing & Invoices</span>
        </button>

        <button
          onClick={() => setActiveTab("RENEWAL")}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 ${
            activeTab === "RENEWAL"
              ? "bg-teal-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>Plan Renewal & Auto-Debit</span>
        </button>

        <button
          onClick={() => setActiveTab("PERSONA")}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 ${
            activeTab === "PERSONA"
              ? "bg-teal-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Heart className="w-4 h-4" />
          <span>Intake Persona & Address</span>
        </button>

        <button
          onClick={() => setActiveTab("OPERATIONS")}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 ml-auto ${
            activeTab === "OPERATIONS"
              ? "bg-amber-500 text-slate-950 shadow-sm"
              : "text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Staff Ops View</span>
        </button>
      </div>

      {/* TAB 1: ACTIVE CARE & ATTENDANT (Phase D Core) */}
      {activeTab === "ACTIVE_CARE" && (
        <div className="space-y-6">
          {assignment ? (
            <>
              <ActiveCareCard
                assignment={assignment}
                onRequestReplacement={() => setIsReplacementModalOpen(true)}
                onGiveFeedback={() => setIsFeedbackModalOpen(true)}
                onViewBilling={() => setActiveTab("BILLING")}
                onViewRenewal={() => setActiveTab("RENEWAL")}
                hasActiveReplacement={Boolean(
                  activeReplacement &&
                  !["RESOLVED", "CANCELLED", "REJECTED"].includes(
                    activeReplacement.status,
                  ),
                )}
              />

              {/* Active Replacement Tracker if a request exists */}
              {activeReplacement && (
                <ReplacementTracker
                  request={activeReplacement}
                  onUpdated={() => {
                    loadCareData();
                  }}
                />
              )}
            </>
          ) : (
            <div className="p-8 text-center rounded-2xl bg-white border border-slate-200 text-xs text-slate-500">
              {isCareLoading
                ? "Loading active care assignment..."
                : "No active care assignment linked yet."}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MONTHLY BILLING & INVOICES (Phase D03) */}
      {activeTab === "BILLING" && <BillingDashboard />}

      {/* TAB 3: PLAN RENEWAL & AUTO-DEBIT (Phase D04) */}
      {activeTab === "RENEWAL" && <RenewalCard />}

      {/* TAB 4: OPERATIONS CONSOLE (Care Manager View) */}
      {activeTab === "OPERATIONS" && <OperationsConsole />}

      {/* TAB 5: CLINICAL PERSONA & ADDRESS (Phase A Review) */}
      {activeTab === "PERSONA" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Elder Clinical Persona Overview (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Main Persona Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-teal-600" />
                    Clinical & Daily Lifestyle Persona
                  </h2>
                  <span className="text-xs text-slate-500">
                    Structured family-supplied care intake
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {activeElder.personaStatus}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                    {activeElder.shiftPreference.replace(/_/g, " ")}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep("PERSONA")}
                    className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                  >
                    Edit Persona
                  </button>
                </div>
              </div>

              {/* Bio Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Age</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {activeElder.age} Years
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    Gender
                  </span>
                  <span className="font-bold text-slate-800 text-sm">
                    {activeElder.gender}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    Mobility Level
                  </span>
                  <span className="font-bold text-teal-800 text-sm">
                    {activeElder.mobilityLevel.replace(/_/g, " ")}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    Primary Language
                  </span>
                  <span className="font-bold text-slate-800 text-sm">
                    {activeElder.primaryLanguage}
                  </span>
                </div>
              </div>

              {/* Conditions & Requirements */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <Activity className="w-4 h-4 text-teal-600" />
                    Known Medical Conditions
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {activeElder.medicalConditions?.length ? (
                      activeElder.medicalConditions.map((c) => (
                        <span
                          key={c}
                          className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-xs font-medium border border-slate-200"
                        >
                          {c}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">
                        No medical conditions specified
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <Stethoscope className="w-4 h-4 text-teal-600" />
                    Attendant Care Requirements
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {activeElder.careRequirements?.length ? (
                      activeElder.careRequirements.map((r) => (
                        <span
                          key={r}
                          className="px-2.5 py-1 bg-teal-50 text-teal-900 rounded-lg text-xs font-semibold border border-teal-200"
                        >
                          {r}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">
                        Standard companionship & hygiene
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <Utensils className="w-4 h-4 text-teal-600" />
                    Dietary Constraints & Cuisine
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {activeElder.dietaryPreferences?.length ? (
                      activeElder.dietaryPreferences.map((d) => (
                        <span
                          key={d}
                          className="px-2.5 py-1 bg-amber-50 text-amber-900 rounded-lg text-xs font-medium border border-amber-200"
                        >
                          {d}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">
                        Regular home food
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Daily Routine */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <span className="font-bold text-slate-700 uppercase tracking-wider block flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-teal-600" />
                  Routine & Special Cultural Notes
                </span>
                <p className="text-slate-700 leading-relaxed">
                  {activeElder.additionalNotes ||
                    "No additional family notes recorded."}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Location & Assessment Cards (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Verified Location Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-teal-600" />
                  Care Address
                </h3>
                <button
                  onClick={() => setCurrentStep("GEO_VERIFICATION")}
                  className="text-xs text-teal-700 hover:text-teal-900 font-semibold"
                >
                  Edit
                </button>
              </div>

              {loc ? (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900">
                    <div className="font-bold text-sm">{loc.locality}</div>
                    <div className="text-emerald-800 mt-0.5">
                      {loc.addressLine1}
                    </div>
                    {loc.addressLine2 && (
                      <div className="text-emerald-800">{loc.addressLine2}</div>
                    )}
                    <div className="text-emerald-700 font-mono mt-1">
                      PIN: {loc.postalCode}
                    </div>
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-500">
                    <div>
                      Status:{" "}
                      <span className="font-semibold text-emerald-700">
                        {loc.verificationStatus}
                      </span>
                    </div>
                    <div>
                      Coordinates:{" "}
                      <span className="font-mono text-slate-700">
                        {loc.latitude}° N, {loc.longitude}° E
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500">
                  No verified address linked yet.
                </div>
              )}
            </div>

            {/* Home Assessment Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-teal-600" />
                  Home Assessment
                </h3>
                <button
                  onClick={() => setCurrentStep("ASSESSMENT")}
                  className="text-xs text-teal-700 hover:text-teal-900 font-semibold"
                >
                  {activeAssessment ? "Manage" : "Book"}
                </button>
              </div>

              {activeAssessment ? (
                <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">
                      {activeAssessment.preferredDate}
                    </span>
                    <span className="px-2 py-0.5 bg-teal-200/80 text-teal-950 font-bold text-[10px] rounded">
                      {activeAssessment.status}
                    </span>
                  </div>
                  <div className="text-teal-800 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-teal-600" />
                    <span>
                      {activeAssessment.preferredTime.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center p-4 border border-dashed border-slate-200 rounded-xl space-y-2">
                  <Stethoscope className="w-6 h-6 text-slate-300 mx-auto" />
                  <p className="text-xs font-medium text-slate-600">
                    No Clinical Assessment Scheduled
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Replacement Request Modal (D01) */}
      {assignment && (
        <ReplacementModal
          assignment={assignment}
          isOpen={isReplacementModalOpen}
          onClose={() => setIsReplacementModalOpen(false)}
          onSuccess={() => {
            loadCareData();
          }}
        />
      )}

      {/* Attendant Feedback Modal (D02) */}
      {assignment && (
        <FeedbackModal
          assignment={assignment}
          isOpen={isFeedbackModalOpen}
          onClose={() => setIsFeedbackModalOpen(false)}
          onSuccess={() => {
            loadCareData();
          }}
        />
      )}
    </div>
  );
};
