import React from "react";
import { CareConnectLogo } from "../common/CareConnectLogo";
import {
  ShieldCheck,
  Heart,
  Activity,
  ArrowRight,
  UserCheck,
  Sparkles,
  MapPin,
} from "lucide-react";

interface MobileEntryScreenProps {
  onGetStarted: () => void;
  onSignIn: () => void;
  onSelectRole?: (role: "FAMILY" | "CAREGIVER" | "OPERATIONS") => void;
}

export const MobileEntryScreen: React.FC<MobileEntryScreenProps> = ({
  onGetStarted,
  onSignIn,
}) => {
  return (
    <div className="flex flex-1 flex-col justify-between px-4 sm:px-5 py-4 animate-fadeIn text-slate-900 min-h-full overflow-y-auto">
      <div>
        <div className="flex items-center justify-between">
          <CareConnectLogo size="md" showWordmark />
          <button
            onClick={onSignIn}
            className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[11px] font-bold text-primary transition hover:bg-teal-100"
          >
            Sign In
          </button>
        </div>
        
        {/* Coverage Notice */}
        <div className="mt-3 flex items-center justify-between p-2 rounded-2xl bg-teal-50/70 border border-teal-200/60 text-xs">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            <span className="text-[11px] font-semibold text-teal-900">
              Chennai Active Care Corridors
            </span>
          </div>
          <button 
            onClick={onGetStarted}
            className="rounded-full bg-slate-900 px-3 py-1 text-[10px] font-bold text-white transition hover:bg-slate-800 shrink-0"
          >
            Check Coverage
          </button>
        </div>
      </div>

      <div className="my-auto space-y-3 py-3">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-[10px] font-bold tracking-[0.1em] text-primary uppercase">
          <ShieldCheck className="h-3 w-3" />
          Trusted elder care
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-gradient-to-br from-white via-teal-50/80 to-slate-50 p-3.5 sm:p-4 shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
          <div className="mb-2 flex items-center justify-between">
            <div className="rounded-xl bg-primary p-2 text-white shadow-sm">
              <Heart className="h-4 w-4 fill-current" />
            </div>
            <div className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
              24/7 support
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold leading-tight tracking-[-0.04em] text-slate-900">
            Compassionate care for the ones who matter most.
          </h1>
          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600">
            Verified attendants, daily health support, and a real care team
            designed for comfort and peace of mind.
          </p>
        </div>

        <div className="space-y-2">
          {[
            {
              icon: UserCheck,
              title: "Verified attendants",
              text: "Background-checked and trained for elder care.",
            },
            {
              icon: Activity,
              title: "Daily health support",
              text: "Vitals, routines, and medication reminders.",
            },
            {
              icon: Sparkles,
              title: "Care that feels personal",
              text: "Simple onboarding and a caring support desk.",
            },
          ].map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">{title}</div>
                <div className="text-[10px] leading-snug text-slate-500">
                  {text}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2.5 pt-1">
        <button
          onClick={onGetStarted}
          className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold text-white shadow-lg shadow-teal-900/20 transition hover:bg-primary-hover active:scale-[0.98]"
        >
          <span>Find Suitable Care</span>
          <ArrowRight className="h-4 w-4" />
        </button>

        <div className="text-center text-[11px] text-slate-500">
          Already have an account?{" "}
          <button
            onClick={onSignIn}
            className="ml-1 font-bold text-primary underline-offset-2 hover:underline"
          >
            Sign In
          </button>
        </div>

        <div className="pt-1 text-center text-[9px] leading-relaxed text-slate-400">
          Non-emergency elder care • DPDP Act 2023 • 24/7 care desk
        </div>
      </div>
    </div>
  );
};
