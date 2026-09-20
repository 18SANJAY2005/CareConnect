import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Activity,
  HeartPulse,
  Pill,
  Users,
  Utensils,
  Eye,
  Check,
} from 'lucide-react';

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
    id: 'MOBILITY',
    label: 'Mobility Assistance',
    desc: 'Support with walking, standing, and bed transfers',
    icon: Activity,
  },
  {
    id: 'MEDICAL_SUPPORT',
    label: 'Medical Support',
    desc: 'Assistance with vitals, dressing, and health monitoring',
    icon: HeartPulse,
  },
  {
    id: 'MEDICATION',
    label: 'Medication Reminders',
    desc: 'Timely medicine intake according to doctor instructions',
    icon: Pill,
  },
  {
    id: 'COMPANIONSHIP',
    label: 'Companionship',
    desc: 'Conversation, reading, cognitive engagement, and emotional warmth',
    icon: Users,
  },
  {
    id: 'DAILY_ASSISTANCE',
    label: 'Daily Assistance',
    desc: 'Assistance with meals, bathing, personal hygiene, and dressing',
    icon: Utensils,
  },
  {
    id: 'MONITORING',
    label: 'Continuous Monitoring',
    desc: 'Observation for fall prevention and rapid emergency escalation',
    icon: Eye,
  },
];

export const MobileCareRequirements: React.FC<MobileCareRequirementsProps> = ({
  onNext,
  onBack,
  initialRequirements = ['MOBILITY', 'MEDICATION', 'DAILY_ASSISTANCE'],
  initialMobility = 'ASSISTED_WALK',
}) => {
  const [selectedReqs, setSelectedReqs] = useState<string[]>(initialRequirements);
  const [mobility, setMobility] = useState<string>(initialMobility);

  const toggleReq = (id: string) => {
    setSelectedReqs((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex-1 flex flex-col justify-between px-5 py-6 animate-fadeIn text-slate-900">
      {/* Step Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full">
            Step 4 of 4
          </span>
        </div>

        <h2 className="text-2xl font-extrabold font-heading text-slate-900">
          What care is needed?
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Select all areas where assistance is required.
        </p>
      </div>

      {/* Selectable Cards Grid */}
      <div className="my-auto py-4 space-y-2.5 max-h-[58vh] overflow-y-auto pr-1">
        {CARE_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isSelected = selectedReqs.includes(opt.id);

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggleReq(opt.id)}
              className={`w-full p-4 rounded-2xl border-2 text-left flex items-center justify-between gap-3.5 transition active:scale-98 ${
                isSelected
                  ? 'border-primary bg-teal-50/60 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3.5 flex-1">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">{opt.label}</div>
                  <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                    {opt.desc}
                  </div>
                </div>
              </div>

              <div
                className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition ${
                  isSelected
                    ? 'border-primary bg-primary text-white'
                    : 'border-slate-300 bg-white text-transparent'
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </button>
          );
        })}

        {/* Mobility level chips */}
        <div className="pt-2">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Current Mobility Level
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'INDEPENDENT', label: 'Independent' },
              { id: 'ASSISTED_WALK', label: 'Assisted' },
              { id: 'BED_BOUND', label: 'Bedridden' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMobility(m.id)}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                  mobility === m.id
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="pt-4">
        <button
          onClick={() => onNext(selectedReqs, mobility)}
          disabled={selectedReqs.length === 0}
          className="w-full min-h-[56px] bg-primary hover:bg-primary-hover disabled:opacity-50 active:scale-98 text-white rounded-2xl font-bold text-base shadow-md flex items-center justify-center gap-2 transition"
        >
          <span>Continue</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

