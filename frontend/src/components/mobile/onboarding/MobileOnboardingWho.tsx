import React, { useState } from 'react';
import { User, Users, ArrowRight, ArrowLeft } from 'lucide-react';

interface MobileOnboardingWhoProps {
  onSelect: (recipient: 'ME' | 'SOMEONE_ELSE') => void;
  onBack: () => void;
  initialValue?: 'ME' | 'SOMEONE_ELSE';
}

export const MobileOnboardingWho: React.FC<MobileOnboardingWhoProps> = ({
  onSelect,
  onBack,
  initialValue = 'SOMEONE_ELSE',
}) => {
  const [recipient, setRecipient] = useState<'ME' | 'SOMEONE_ELSE'>(initialValue);

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
            Step 1 of 4
          </span>
        </div>

        <h2 className="text-2xl font-extrabold font-heading text-slate-900">
          Who is care for?
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Tell us who will be receiving care so we can tailor the questions.
        </p>
      </div>

      {/* Selectable Cards */}
      <div className="space-y-3.5 my-auto py-6">
        <button
          type="button"
          onClick={() => setRecipient('ME')}
          className={`w-full p-5 rounded-3xl border-2 text-left flex items-center gap-4 transition active:scale-98 ${
            recipient === 'ME'
              ? 'border-primary bg-teal-50/60 shadow-md ring-2 ring-primary/20'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
              recipient === 'ME' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            <User className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <div className="text-base font-bold text-slate-900">Myself</div>
            <div className="text-xs text-slate-500 mt-0.5">
              I am looking for personal care assistance or companionship at home.
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setRecipient('SOMEONE_ELSE')}
          className={`w-full p-5 rounded-3xl border-2 text-left flex items-center gap-4 transition active:scale-98 ${
            recipient === 'SOMEONE_ELSE'
              ? 'border-primary bg-teal-50/60 shadow-md ring-2 ring-primary/20'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
              recipient === 'SOMEONE_ELSE' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            <Users className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <div className="text-base font-bold text-slate-900">Someone else</div>
            <div className="text-xs text-slate-500 mt-0.5">
              For a parent, spouse, grandparent, or relative who needs daily support.
            </div>
          </div>
        </button>
      </div>

      {/* Primary Action Button */}
      <div className="pt-4">
        <button
          onClick={() => onSelect(recipient)}
          className="w-full min-h-[56px] bg-primary hover:bg-primary-hover active:scale-98 text-white rounded-2xl font-bold text-base shadow-md flex items-center justify-center gap-2 transition"
        >
          <span>Continue</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

