import React, { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Activity,
  HeartPulse,
  Pill,
  Users,
  Utensils,
  Eye,
} from "lucide-react";

interface MobileCareRequirementsProps {
  onNext: (requirements: string[], mobility: string) => void;
  onBack: () => void;
  initialRequirements?: string[];
  initialMobility?: string;
}

interface CareOption {
  id: string;
  label: string;
  desc: string;
  icon: React.FC<{ className?: string }>;
}

const CARE_OPTIONS: CareOption[] = [
  {
    id: "MOBILITY",
    label: "Mobility Assistance",
    desc: "Support with walking, standing, and bed transfers",
    icon: Activity,
  },
  {
    id: "MEDICAL_SUPPORT",
    label: "Medical Support",
    desc: "Assistance with vitals, dressing, and monitoring",
    icon: HeartPulse,
  },
  {
    id: "MEDICATION",
    label: "Medication Reminders",
    desc: "Timely medicine support according to instructions",
    icon: Pill,
  },
  {
    id: "COMPANIONSHIP",
    label: "Companionship",
    desc: "Conversation, emotional support, and daily connection",
    icon: Users,
  },
  {
    id: "DAILY_ASSISTANCE",
    label: "Daily Assistance",
    desc: "Meals, personal care, hygiene, and dressing support",
    icon: Utensils,
  },
  {
    id: "MONITORING",
    label: "Continuous Monitoring",
    desc: "Observation for safety, falls, and urgent escalation",
    icon: Eye,
  },
];

export const MobileCareRequirements: React.FC<MobileCareRequirementsProps> = ({
  onNext,
  onBack,
  initialRequirements = [],
  initialMobility = "",
}) => {
  const [selectedReqs, setSelectedReqs] =
    useState<string[]>(initialRequirements);
  const [mobility, setMobility] = useState<string>(initialMobility);

  const toggleReq = (id: string) => {
    setSelectedReqs((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  };

  return (
    <div className="flex flex-1 flex-col justify-between px-5 py-6 animate-fadeIn text-slate-900">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="-ml-2 rounded-full p-2 text-slate-600 transition hover:bg-slate-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-teal-700">
            Step 4 of 4
          </span>
        </div>

        <h2 className="text-3xl font-extrabold tracking-[-0.04em] text-slate-900">
          What care is needed?
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Choose the support that feels most helpful for daily life.
        </p>
      </div>

      <div className="my-auto max-h-[58vh] space-y-3 overflow-y-auto py-4 pr-1">
        {CARE_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isSelected = selectedReqs.includes(opt.id);

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggleReq(opt.id)}
              className={`flex w-full items-center justify-between gap-3.5 rounded-[24px] border-2 p-4 text-left transition-all duration-200 active:scale-[0.98] ${
                isSelected
                  ? "border-primary bg-gradient-to-r from-teal-50 to-emerald-50 shadow-[0_12px_24px_rgba(0,67,64,0.08)] ring-2 ring-primary/15"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3.5">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                    isSelected
                      ? "bg-primary text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900">
                    {opt.label}
                  </div>
                  <div className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                    {opt.desc}
                  </div>
                </div>
              </div>

              <div
                className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] transition-all ${
                  isSelected
                    ? "border-2 border-primary bg-primary text-white"
                    : "border border-slate-200 bg-slate-100 text-slate-500"
                }`}
              >
                {isSelected ? "Selected" : "Add"}
              </div>
            </button>
          );
        })}

        <div className="pt-3">
          <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            Current Mobility Level
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "INDEPENDENT", label: "Independent" },
              { id: "ASSISTED_WALK", label: "Assisted" },
              { id: "BED_BOUND", label: "Bedridden" },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMobility(m.id)}
                className={`rounded-2xl border px-2 py-2.5 text-xs font-bold transition ${
                  mobility === m.id
                    ? "border-primary bg-primary text-white shadow-sm"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-4">
        <button
          onClick={() => onNext(selectedReqs, mobility)}
          disabled={selectedReqs.length === 0}
          className="flex w-full min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-primary text-base font-bold text-white shadow-md transition hover:bg-primary-hover disabled:opacity-50 active:scale-[0.98]"
        >
          <span>Continue</span>
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
