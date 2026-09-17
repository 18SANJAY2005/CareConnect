import React from "react";
import {
  HeartPulse,
  UserCheck,
  LogOut,
  MapPin,
  ShieldCheck,
  FileText,
  Calendar,
  Smartphone,
  Activity,
  Users,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useOnboarding } from "../context/OnboardingContext";

interface NavbarProps {
  activePortal: "SPONSOR" | "CAREGIVER" | "OPERATIONS";
  setActivePortal: (portal: "SPONSOR" | "CAREGIVER" | "OPERATIONS") => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePortal,
  setActivePortal,
}) => {
  const { user, logout } = useAuth();
  const { currentStep, setCurrentStep } = useOnboarding();

  const steps = [
    { key: "GEO_VERIFICATION", label: "1. Location", icon: MapPin },
    { key: "PERSONA", label: "2. Patient Persona", icon: FileText },
    { key: "ASSESSMENT", label: "3. Home Assessment", icon: Calendar },
    { key: "DASHBOARD", label: "4. Summary & Active Care", icon: ShieldCheck },
    { key: "MATCHING", label: "5. Phase B Caregivers", icon: Users },
    { key: "DASHBOARD", label: "4. Summary", icon: ShieldCheck },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer shrink-0"
          onClick={() => {
            setActivePortal("SPONSOR");
            if (user) setCurrentStep("DASHBOARD");
          }}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-700 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-teal-500/20">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-slate-900 tracking-tight">
                CareConnect
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                Chennai
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-none">
              Elder Care Platform
            </p>
          </div>
        </div>

        {/* Unified Portal / Role Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActivePortal("SPONSOR")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition ${
              activePortal === "SPONSOR"
                ? "bg-white text-primary shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Family Sponsor</span>
          </button>

          <button
            onClick={() => setActivePortal("CAREGIVER")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition ${
              activePortal === "CAREGIVER"
                ? "bg-primary text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Caregiver Mobile</span>
            <span className="text-[10px] opacity-75 font-normal">தமிழ்</span>
          </button>

          <button
            onClick={() => setActivePortal("OPERATIONS")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition ${
              activePortal === "OPERATIONS"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden sm:inline">Operations Desk</span>
          </button>
        </div>

        {/* Phase A Stepper & Dedicated Caregiver Matching */}
        {activePortal === "SPONSOR" && user && currentStep !== "AUTH" && (
          <div className="hidden lg:flex items-center gap-2">
            <nav className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200/80">
              {steps.map((step) => {
                const Icon = step.icon;
                const isActive = currentStep === step.key;

                return (
                  <button
                    key={step.key}
                    onClick={() => setCurrentStep(step.key as any)}
                    className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all ${
                      isActive
                        ? "bg-white text-teal-800 shadow-sm font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Icon
                      className={`w-3 h-3 ${isActive ? "text-teal-600" : "text-slate-400"}`}
                    />
                    <span>{step.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="h-6 w-px bg-slate-200" />

            {/* Distinct Separate Caregiver Matching Section */}
            <button
              onClick={() => setCurrentStep("MATCHING")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all shadow-sm ${
                currentStep === "MATCHING"
                  ? "bg-teal-700 text-white shadow-teal-700/20 ring-2 ring-teal-600/30"
                  : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
              }`}
            >
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>Caregiver Matching</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-600 text-white uppercase tracking-wider">
                Phase B
              </span>
            </button>
          </div>
        )}

        {/* User Context & Logout */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-800 leading-snug">
                  {user.fullName}
                </span>
                <span className="text-[10px] text-teal-700 font-semibold capitalize">
                  {user.role.replace("_", " ").toLowerCase()}
                </span>
              </div>
              <button
                onClick={logout}
                title="Log out"
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <UserCheck className="w-4 h-4 text-teal-600" />
              <span className="hidden sm:inline">Verified Care Network</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
