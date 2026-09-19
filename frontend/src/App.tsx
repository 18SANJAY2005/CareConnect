import React, { useState } from "react";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { OnboardingProvider, useOnboarding } from "./context/OnboardingContext";

import { Navbar } from "./components/Navbar";
import { AuthModal } from "./components/auth/AuthModal";
import { GeographicVerification } from "./components/onboarding/GeographicVerification";
import { PersonaWizard } from "./components/onboarding/persona/PersonaWizard";
import { AssessmentBooking } from "./components/onboarding/AssessmentBooking";
import { SponsorDashboard } from "./components/dashboard/SponsorDashboard";
import { LandingPage } from "./components/LandingPage";

import { PhaseBFlow } from "./components/phaseB/PhaseBFlow";
import { CaregiverMobileApp } from "./components/caregiver/CaregiverMobileApp";
import { OperationsConsole } from "./components/operations/OperationsConsole";

import { ShieldCheck } from "lucide-react";
import { CareConnectLogo } from "./components/common/CareConnectLogo";

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();

  const { currentStep, setCurrentStep, activeElder } = useOnboarding();

  const [activePortal, setActivePortal] = useState<
    "SPONSOR" | "CAREGIVER" | "OPERATIONS"
  >("SPONSOR");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <CareConnectLogo size="lg" className="animate-pulse" />

          <span className="text-sm font-semibold text-slate-700">
            Connecting to CareConnect...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Navbar activePortal={activePortal} setActivePortal={setActivePortal} />

      <main className="flex-1">
        {activePortal === "CAREGIVER" ? (
          <CaregiverMobileApp />
        ) : activePortal === "OPERATIONS" ? (
          <OperationsConsole />
        ) : !user ? (
          currentStep === "AUTH" ? (
            <div className="py-12 px-4 sm:px-6">
              <AuthModal />
            </div>
          ) : (
            <LandingPage />
          )
        ) : currentStep === "GEO_VERIFICATION" ? (
          <GeographicVerification />
        ) : currentStep === "PERSONA" ? (
          <PersonaWizard />
        ) : currentStep === "ASSESSMENT" ? (
          <AssessmentBooking />
        ) : currentStep === "MATCHING" && activeElder ? (
          <PhaseBFlow
            user={user}
            elder={activeElder}
            onBackToDashboard={() => setCurrentStep("DASHBOARD")}
          />
        ) : (
          <SponsorDashboard />
        )}
      </main>

      {/* Internal Portal Footer */}
      {(user || currentStep === "AUTH") && (
        <footer className="border-t border-slate-200 bg-white py-6 mt-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>CareConnect Elder Care Platform</span>
            </div>

            <div className="flex items-center gap-4">
              <span>Phase C Active Care & Remote Monitoring</span>
            </div>
          </div>
        </footer>
      )}
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
