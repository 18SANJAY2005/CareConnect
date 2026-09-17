import React, { useState } from "react";

import { AuthProvider, useAuth } from "./context/AuthContext";
import {
  OnboardingProvider,
  useOnboarding,
} from "./context/OnboardingContext";

import { Navbar } from "./components/Navbar";
import { AuthModal } from "./components/auth/AuthModal";
import { GeographicVerification } from "./components/onboarding/GeographicVerification";
import { PersonaWizard } from "./components/onboarding/persona/PersonaWizard";
import { AssessmentBooking } from "./components/onboarding/AssessmentBooking";
import { SponsorDashboard } from "./components/dashboard/SponsorDashboard";

import { PhaseBFlow } from "./components/PhaseBFlow";
import { CaregiverMobileApp } from "./components/caregiver/CaregiverMobileApp";
import { OperationsConsole } from "./components/operations/OperationsConsole";

import { HeartPulse, ShieldCheck } from "lucide-react";

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();

  const { currentStep, activeElder } =
    useOnboarding();

  const [activePortal, setActivePortal] = useState<
    "SPONSOR" | "CAREGIVER" | "OPERATIONS"
  >("SPONSOR");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center animate-pulse shadow-lg">
            <HeartPulse className="w-6 h-6" />
          </div>

          <span className="text-sm font-semibold text-slate-700">
            Connecting to CareConnect Chennai...
          </span>
        </div>
      </div>
    );
  }

  /*
   * Phase B is entered only after Phase A has produced
   * an authenticated sponsor and an active elder.
   *
   * We intentionally do NOT modify the Phase A onboarding
   * states themselves.
   */
  if (
    activePortal === "SPONSOR" &&
    user &&
    activeElder &&
    currentStep === "DASHBOARD"
  ) {
    return (
      <PhaseBFlow
        user={user}
        elder={activeElder}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Navbar
        activePortal={activePortal}
        setActivePortal={setActivePortal}
      />

      <main className="flex-1">
        {activePortal === "CAREGIVER" ? (
          <CaregiverMobileApp />
        ) : activePortal === "OPERATIONS" ? (
          <OperationsConsole />
        ) : !user || currentStep === "AUTH" ? (
          <div className="py-12 px-4 sm:px-6">
            <AuthModal />
          </div>
        ) : currentStep === "GEO_VERIFICATION" ? (
          <GeographicVerification />
        ) : currentStep === "PERSONA" ? (
          <PersonaWizard />
        ) : currentStep === "ASSESSMENT" ? (
          <AssessmentBooking />
        ) : (
          <SponsorDashboard />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600" />

            <span>
              CareConnect Elder Care Platform • Chennai
              Metropolitan Care Network
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span>Phase C Active Care & Remote Monitoring</span>
            <span>•</span>
            <span>DPDP Act 2023 Compliant (asia-south1)</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <OnboardingProvider>
        <AppContent />
      </OnboardingProvider>
    </AuthProvider>
  );
}

export default App;