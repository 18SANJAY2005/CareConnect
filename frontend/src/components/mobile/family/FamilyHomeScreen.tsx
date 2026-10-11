import React, { useState, useEffect } from "react";
import {
  Clock,
  HeartPulse,
  PhoneCall,
  CheckCircle2,
  Activity,
  AlertCircle,
  MessageSquare,
  ChevronRight,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { api } from "../../../services/api";
import type { Elder, CareAssignment } from "../../../types";

interface FamilyHomeScreenProps {
  elder: Elder;
  onOpenTab: (tab: string) => void;
  onOpenSos: () => void;
}

export const FamilyHomeScreen: React.FC<FamilyHomeScreenProps> = ({
  elder,
  onOpenTab,
  onOpenSos,
}) => {
  const [assignment, setAssignment] = useState<CareAssignment | null>(null);
  const [shiftStatus, setShiftStatus] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async (isInitial = false) => {
    if (isInitial) {
      setIsLoading(true);
    }
    try {
      const [asg, shift, tline] = await Promise.all([
        api.getActiveAssignment(elder.id),
        api.getElderShiftStatus(elder.id).catch(() => null),
        api.getElderCareTimeline(elder.id).catch(() => []),
      ]);
      setAssignment(asg);
      setShiftStatus(shift);
      setTimeline(tline || []);
    } catch {
      // Fallback to active display
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
      <div className="flex flex-1 flex-col items-center justify-center space-y-4 p-8">
        <Clock className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm font-bold text-slate-700">
          Loading Care Dashboard...
        </span>
      </div>
    );
  }

  const caregiver = assignment?.caregiver;
  const isOnDuty =
    shiftStatus?.status === "ACTIVE" || shiftStatus?.status === "CHECKED_IN";

  return (
    <div className="animate-fadeIn space-y-4 overflow-y-auto px-4 py-4 pb-safe-nav text-slate-900">
      <div 
        onClick={() => onOpenTab("MY_CARE")}
        role="button"
        tabIndex={0}
        className="flex cursor-pointer items-center justify-between gap-2.5 sm:gap-3 rounded-[28px] sm:rounded-[30px] bg-gradient-to-r from-primary to-teal-700 p-4 sm:p-5 text-white shadow-[0_18px_35px_rgba(0,67,64,0.2)] transition-transform active:scale-[0.98]"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-teal-100">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Good morning</span>
          </div>
          <h2 className="mt-1 truncate text-xl sm:text-2xl font-extrabold tracking-[-0.04em]">
            {elder.name}
          </h2>
          <div className="mt-0.5 text-xs sm:text-sm text-teal-100 truncate">
            {elder.location?.locality || "Care Corridor"} • Age {elder.age}
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenSos();
          }}
          className="flex min-h-[44px] min-w-[70px] sm:min-w-[80px] shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-rose-600 px-2.5 sm:px-3 py-2 text-xs font-black text-white shadow-lg shadow-rose-500/20 transition hover:bg-rose-700 active:scale-95"
          aria-label="Emergency SOS"
        >
          <AlertCircle className="h-4 w-4" />
          <span>SOS</span>
        </button>
      </div>

      <div className="rounded-[28px] sm:rounded-[30px] border border-slate-200 bg-white p-4 sm:p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
            Care team
          </span>
          <span
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${
              isOnDuty
                ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${isOnDuty ? "bg-emerald-500 animate-ping" : "bg-amber-500"}`}
            />
            {isOnDuty ? "On duty now" : "Shift scheduled"}
          </span>
        </div>

        <div className="mt-3.5 flex items-center gap-3">
          <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-teal-200 bg-teal-50 text-lg sm:text-xl font-extrabold text-primary">
            {(
              caregiver?.full_name ||
              caregiver?.fullName ||
              "Attendant"
            ).charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm sm:text-base font-bold text-slate-900">
              {caregiver?.full_name ||
                caregiver?.fullName ||
                "Verified attendant assigned"}
            </div>
            <div className="mt-0.5 text-[11px] sm:text-xs text-slate-500 truncate">
              {caregiver?.experience_years
                ? `${caregiver.experience_years} yrs exp • `
                : ""}
              {caregiver?.languages || "Tamil, English"}
            </div>
          </div>
          <a
            href="tel:+914448552200"
            className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl border border-teal-200 bg-teal-50 text-primary shadow-sm transition hover:bg-teal-100 active:scale-95"
            title="Call Care Desk"
            aria-label="Call Care Desk"
          >
            <PhoneCall className="h-4 w-4 sm:h-5 sm:w-5" />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        <button
          onClick={() => onOpenTab("UPDATES")}
          className="flex min-h-[64px] sm:min-h-[72px] items-center gap-2.5 sm:gap-3 rounded-[22px] sm:rounded-[24px] border border-slate-200 bg-white p-3 sm:p-3.5 text-left shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition hover:border-slate-300 active:scale-[0.98]"
        >
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-primary">
            <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">Updates</div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 truncate">
              Vitals & activities
            </div>
          </div>
        </button>

        <button
          onClick={() => onOpenTab("MESSAGES")}
          className="flex min-h-[64px] sm:min-h-[72px] items-center gap-2.5 sm:gap-3 rounded-[22px] sm:rounded-[24px] border border-slate-200 bg-white p-3 sm:p-3.5 text-left shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition hover:border-slate-300 active:scale-[0.98]"
        >
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-primary">
            <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">Messages</div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 truncate">Care desk chat</div>
          </div>
        </button>
      </div>

      <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Clock className="h-4 w-4 text-primary" />
            <span>Today’s care timeline</span>
          </div>
          <button
            onClick={() => onOpenTab("UPDATES")}
            className="flex items-center gap-1 text-[11px] font-bold text-primary"
          >
            <span>View all</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {timeline.length > 0 ? (
          <div className="mt-4 space-y-2.5">
            {timeline.slice(0, 3).map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs"
              >
                <div className="flex min-w-0 items-center gap-2.5 pr-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span className="truncate font-semibold text-slate-900">
                    {item.title || item.taskName}
                  </span>
                </div>
                <span className="shrink-0 font-mono text-[10px] text-slate-500">
                  {item.time || "Completed"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-center text-xs leading-relaxed text-slate-500">
            Shift routine starts at 8:00 AM. Updates will appear here as care
            progresses.
          </div>
        )}
      </div>

      <div className="rounded-[28px] sm:rounded-[30px] border border-slate-200 bg-white p-4 sm:p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <HeartPulse className="h-4 w-4 text-primary" />
          <span>Latest health vitals</span>
        </div>

        <div className="mt-3.5 grid grid-cols-3 gap-1.5 sm:gap-2.5">
          {[
            { label: "Blood Pressure", value: "120/80", status: "Normal" },
            { label: "Pulse Rate", value: "72 bpm", status: "Steady" },
            { label: "Blood Sugar", value: "110 mg/dL", status: "Normal" },
          ].map(({ label, value, status }) => (
            <div
              key={label}
              className="rounded-xl sm:rounded-2xl border border-teal-100 bg-teal-50/60 p-2 sm:p-3 text-center min-w-0"
            >
              <div className="text-[9px] sm:text-[10px] font-bold text-slate-600 truncate">
                {label}
              </div>
              <div className="mt-0.5 sm:mt-1 text-xs sm:text-base font-extrabold text-slate-900 truncate">
                {value}
              </div>
              <div className="mt-0.5 text-[9px] sm:text-[10px] font-bold text-emerald-700 truncate">
                {status}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[30px] border border-teal-100 bg-teal-50/60 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>Care supervision</span>
        </div>
        <div className="mt-2 text-xs leading-relaxed text-slate-600">
          Your care is being monitored by the CareConnect desk for continuity
          and safety.
        </div>
      </div>
    </div>
  );
};

export default FamilyHomeScreen;
