import React from 'react';
import { CareConnectLogo } from '../common/CareConnectLogo';
import { ShieldCheck, Heart, Activity, ArrowRight, UserCheck } from 'lucide-react';

interface MobileEntryScreenProps {
  onGetStarted: () => void;
  onSignIn: () => void;
  onSelectRole?: (role: 'FAMILY' | 'CAREGIVER' | 'OPERATIONS') => void;
}

export const MobileEntryScreen: React.FC<MobileEntryScreenProps> = ({
  onGetStarted,
  onSignIn,
}) => {
  return (
    <div className="flex-1 flex flex-col justify-between px-5 py-8 animate-fadeIn text-slate-900">
      {/* Top Brand Header */}
      <div className="flex items-center justify-between">
        <CareConnectLogo size="md" showWordmark />
        <button
          onClick={onSignIn}
          className="text-xs font-bold text-primary hover:text-primary-container px-3 py-1.5 rounded-full bg-teal-50 border border-teal-100 transition"
        >
          Sign In
        </button>
      </div>

      {/* Center Hero & Value Proposition */}
      <div className="my-auto py-8 space-y-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/60 text-primary text-[11px] font-bold tracking-wide">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <span>Managed Elder Care at Home</span>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold font-heading tracking-tight text-slate-900 leading-tight">
            Compassionate care for the ones who cared for you.
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Verified, trained attendants with real-time health monitoring, daily vitals tracking, and 24/7 care desk supervision.
          </p>
        </div>

        {/* 3 Mobile Feature Badges */}
        <div className="grid grid-cols-1 gap-2.5 pt-2">
          <div className="interactive-card flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200 shadow-sm cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-primary shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">Verified & Trained Attendants</div>
              <div className="text-[11px] text-slate-500">Background checked with hospital-grade skill training</div>
            </div>
          </div>

          <div className="interactive-card flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200 shadow-sm cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-primary shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">Daily Health Vitals Tracking</div>
              <div className="text-[11px] text-slate-500">BP, blood sugar, medication logs, and photo updates</div>
            </div>
          </div>

          <div className="interactive-card flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200 shadow-sm cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-primary shrink-0">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">24/7 Care Coordination</div>
              <div className="text-[11px] text-slate-500">Dedicated care managers and emergency SOS response</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA Block */}
      <div className="space-y-3 pt-4">
        <button
          onClick={onGetStarted}
          className="btn-primary-exact"
        >
          <span>Find Suitable Care</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        <div className="text-center pt-1">
          <span className="text-xs text-slate-500">
            Already have an account?{' '}
            <button
              onClick={onSignIn}
              className="font-bold text-primary hover:underline ml-0.5"
            >
              Sign In
            </button>
          </span>
        </div>

        {/* 3-Point Mobile Disclaimer */}
        <div className="pt-2 text-[10px] text-slate-400 text-center leading-relaxed">
          Non-emergency elder home assistance • DPDP Act 2023 protected • 24/7 Care Manager support
        </div>
      </div>
    </div>
  );
};
