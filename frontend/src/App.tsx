import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { OnboardingProvider, useOnboarding } from "./context/OnboardingContext";
import { api } from "./services/api";
import type { Elder } from "./types";

// Mobile Shell & Navigation
import { CareConnectLogo } from "./components/common/CareConnectLogo";
import { MobileTopBar } from "./components/mobile/MobileTopBar";
import { MobileBottomNav, type FamilyTab } from "./components/mobile/MobileBottomNav";
import { MobileSosModal } from "./components/mobile/MobileSosModal";

// Mobile Entry & Auth
import { MobileEntryScreen } from "./components/mobile/MobileEntryScreen";
import { MobileAuthScreen } from "./components/mobile/MobileAuthScreen";

// Mobile Onboarding
import { MobileOnboardingWho } from "./components/mobile/onboarding/MobileOnboardingWho";
import { MobileOnboardingBasic } from "./components/mobile/onboarding/MobileOnboardingBasic";
import { MobileLocationCheck } from "./components/mobile/onboarding/MobileLocationCheck";
import { MobileCareRequirements } from "./components/mobile/onboarding/MobileCareRequirements";
import { MobilePreferences } from "./components/mobile/onboarding/MobilePreferences";
import { MobileDetailedIntake } from "./components/mobile/onboarding/MobileDetailedIntake";

// Mobile Matchmaking & Booking
import { MobileMatchmakingScreen } from "./components/mobile/matchmaking/MobileMatchmakingScreen";

// Family Mobile Screens
import { FamilyHomeScreen } from "./components/mobile/family/FamilyHomeScreen";
import { FamilyMyCareScreen } from "./components/mobile/family/FamilyMyCareScreen";
import { FamilyUpdatesScreen } from "./components/mobile/family/FamilyUpdatesScreen";
import { FamilyMessagesScreen } from "./components/mobile/family/FamilyMessagesScreen";
import { FamilyMoreScreen } from "./components/mobile/family/FamilyMoreScreen";

// Caregiver & Operations Portals
import { CaregiverMobileApp } from "./components/caregiver/CaregiverMobileApp";
import { MobileOperationsApp } from "./components/mobile/operations/MobileOperationsApp";

import {
  Heart,
  Sparkles,
  UserPlus,
  ArrowRight,
  Loader2,
} from "lucide-react";

type MobileOnboardingStep =
  | "WHO"
  | "BASIC"
  | "LOCATION"
  | "REQUIREMENTS"
  | "PREFERENCES"
  | "DETAILED_INTAKE"
  | "MATCHMAKING";

const AppContent: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { elders, activeElder, setActiveElder, refreshElders } = useOnboarding();

  const [activePortal, setActivePortal] = useState<"FAMILY" | "CAREGIVER" | "OPERATIONS">("FAMILY");
  const [activeFamilyTab, setActiveFamilyTab] = useState<FamilyTab>("HOME");
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Onboarding flow state
  const [onboardingStep, setOnboardingStep] = useState<MobileOnboardingStep | null>(null);
  const [draftRecipient, setDraftRecipient] = useState<"ME" | "SOMEONE_ELSE">("SOMEONE_ELSE");
  const [draftBasic, setDraftBasic] = useState<{
    name: string;
    age: number;
    gender: "FEMALE" | "MALE" | "OTHER";
    dob?: string;
  }>({ name: "Kalyani Ammal", age: 74, gender: "FEMALE" });
  const [draftLocation, setDraftLocation] = useState<{
    addressLine1: string;
    locality: string;
    city: string;
    postalCode: string;
    latitude?: number;
    longitude?: number;
  } | null>(null);
  const [draftRequirements, setDraftRequirements] = useState<string[]>([
    "MOBILITY",
    "MEDICATION",
    "COMPANIONSHIP",
  ]);
  const [draftMobility, setDraftMobility] = useState<string>("ASSISTED_WALKER");
  const [draftPreferences, setDraftPreferences] = useState<{
    languages: string[];
    primaryLanguage: string;
    shiftDuration: string;
    startTime: string;
    additionalPreferences: string;
  }>({
    languages: ["Tamil", "English"],
    primaryLanguage: "Tamil",
    shiftDuration: "12_HOURS_DAY",
    startTime: "08:00",
    additionalPreferences: "Patient is soft-spoken, prefers vegetarian diet.",
  });
  const [draftIntake, setDraftIntake] = useState<{
    medicalConditions: string[];
    medicalDevices: string[];
    dietaryPreferences: string[];
    wakeTime: string;
    bedTime: string;
  } | null>(null);

  const [draftElder, setDraftElder] = useState<Elder | null>(null);
  const [isCreatingElder, setIsCreatingElder] = useState(false);
  const [isSeedingDemo, setIsSeedingDemo] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Sync portal when user role arrives
  useEffect(() => {
    if (user?.role === "CAREGIVER") {
      setActivePortal("CAREGIVER");
    } else if (user?.role === "OPS_MANAGER" || user?.role === "ADMIN") {
      setActivePortal("OPERATIONS");
    }
  }, [user?.role]);

  // Persist elder draft into backend
  const finalizeElderOnboarding = async (intakeOverride?: typeof draftIntake) => {
    if (!user) {
      // Need login before final persistence
      setIsAuthOpen(true);
      return;
    }

    setIsCreatingElder(true);
    setActionError(null);

    try {
      // 1. Create Elder record
      const created = await api.createElder({
        name: draftBasic.name || "Elder",
        age: draftBasic.age || 70,
        gender: draftBasic.gender || "FEMALE",
        dateOfBirth: draftBasic.dob || null,
      });

      // 2. Persist Location if available
      if (draftLocation) {
        await api.persistElderLocation(created.id, {
          addressLine1: draftLocation.addressLine1 || "Verified Residence",
          locality: draftLocation.locality || "Care Corridor",
          city: draftLocation.city || "Regional Hub",
          state: "State",
          postalCode: draftLocation.postalCode || "600020",
          latitude: draftLocation.latitude || 13.0012,
          longitude: draftLocation.longitude || 80.2565,
        });
      }

      // 3. Persist Persona Requirements & Preferences
      const effectiveIntake = intakeOverride || draftIntake;
      const updated = await api.updateElder(created.id, {
        mobilityLevel: (draftMobility as any),
        careRequirements: draftRequirements,
        languages: draftPreferences.languages,
        primaryLanguage: draftPreferences.primaryLanguage,
        shiftPreference: (draftPreferences.shiftDuration as any),
        medicalConditions: effectiveIntake?.medicalConditions || ["Hypertension"],
        medicalDevices: effectiveIntake?.medicalDevices || [],
        dietaryPreferences: effectiveIntake?.dietaryPreferences || ["Vegetarian"],
        dailyRoutine: {
          wakeTime: effectiveIntake?.wakeTime || "07:00",
          bedTime: effectiveIntake?.bedTime || "21:00",
        },
        additionalNotes: draftPreferences.additionalPreferences,
        personaStatus: "SAVED",
      });

      setDraftElder(updated);
      setActiveElder(updated);
      await refreshElders(updated.id);
      setOnboardingStep("MATCHMAKING");
    } catch (err: any) {
      console.error("Failed to finalize onboarding:", err);
      setActionError(err.message || "Failed to save profile. Please try again.");
    } finally {
      setIsCreatingElder(false);
    }
  };

  // One-click demo seeder for testing
  const handleLoadDemoCare = async () => {
    setIsSeedingDemo(true);
    setActionError(null);
    try {
      await api.seedDemoScenario();
      const updatedList = await refreshElders();
      if (updatedList && updatedList.length > 0) {
        setActiveElder(updatedList[0]);
      }
      setOnboardingStep(null);
      setActiveFamilyTab("HOME");
    } catch (err: any) {
      console.error("Failed to seed demo scenario:", err);
      setActionError(err.message || "Failed to load demo scenario.");
    } finally {
      setIsSeedingDemo(false);
    }
  };

  // Loading Screen
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-900 sm:py-6 flex justify-center items-center">
        <div className="mobile-canvas w-full max-w-[430px] min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
          <CareConnectLogo size="lg" className="animate-pulse" />
          <span className="text-xs font-bold text-teal-800 tracking-wide">
            Loading CareConnect...
          </span>
        </div>
      </div>
    );
  }

  // 1. Unauthenticated Auth Screen Modal
  if (isAuthOpen) {
    return (
      <div className="min-h-screen bg-slate-900 sm:py-6 flex justify-center items-center">
        <div className="mobile-canvas w-full max-w-[430px] min-h-screen sm:min-h-[844px] bg-slate-50 flex flex-col">
          <MobileAuthScreen
            onBack={() => setIsAuthOpen(false)}
            onSuccess={() => {
              setIsAuthOpen(false);
              // If was in middle of onboarding, proceed to finalize
              if (onboardingStep === "PREFERENCES" || onboardingStep === "DETAILED_INTAKE") {
                finalizeElderOnboarding();
              }
            }}
          />
        </div>
      </div>
    );
  }

  // 2. Unauthenticated Entry Screen (when not signed in and not onboarding)
  if (!user && onboardingStep === null) {
    return (
      <div className="min-h-screen bg-slate-900 sm:py-6 flex justify-center items-center">
        <div className="mobile-canvas w-full max-w-[430px] min-h-screen sm:min-h-[844px] bg-slate-50 flex flex-col">
          <MobileEntryScreen
            onGetStarted={() => setOnboardingStep("WHO")}
            onSignIn={() => setIsAuthOpen(true)}
            onSelectRole={(role) => {
              setActivePortal(role);
              setIsAuthOpen(true);
            }}
          />
        </div>
      </div>
    );
  }

  // 3. Mobile Onboarding Flow (Accessible to Guests & Authenticated Users)
  if (onboardingStep !== null) {
    return (
      <div className="min-h-screen bg-slate-900 sm:py-6 flex justify-center items-center">
        <div className="mobile-canvas w-full max-w-[430px] min-h-screen sm:min-h-[844px] bg-slate-50 flex flex-col">
          {actionError && (
            <div className="m-3 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center justify-between">
              <span>{actionError}</span>
              <button onClick={() => setActionError(null)} className="font-bold">✕</button>
            </div>
          )}

          {isCreatingElder && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <h3 className="text-base font-bold text-slate-900">Setting up elder profile...</h3>
              <p className="text-xs text-slate-500">Matching verified attendants in your corridor</p>
            </div>
          )}

          {!isCreatingElder && onboardingStep === "WHO" && (
            <MobileOnboardingWho
              initialValue={draftRecipient}
              onSelect={(recipient) => {
                setDraftRecipient(recipient);
                setOnboardingStep("BASIC");
              }}
              onBack={() => setOnboardingStep(null)}
            />
          )}

          {!isCreatingElder && onboardingStep === "BASIC" && (
            <MobileOnboardingBasic
              recipient={draftRecipient}
              initialData={draftBasic}
              onNext={(data) => {
                setDraftBasic(data);
                setOnboardingStep("LOCATION");
              }}
              onBack={() => setOnboardingStep("WHO")}
            />
          )}

          {!isCreatingElder && onboardingStep === "LOCATION" && (
            <MobileLocationCheck
              initialPostalCode={draftLocation?.postalCode || "600020"}
              onSuccess={(locData) => {
                setDraftLocation(locData);
                setOnboardingStep("REQUIREMENTS");
              }}
              onBack={() => setOnboardingStep("BASIC")}
            />
          )}

          {!isCreatingElder && onboardingStep === "REQUIREMENTS" && (
            <MobileCareRequirements
              initialRequirements={draftRequirements}
              initialMobility={draftMobility}
              onNext={(reqs, mob) => {
                setDraftRequirements(reqs);
                setDraftMobility(mob);
                setOnboardingStep("PREFERENCES");
              }}
              onBack={() => setOnboardingStep("LOCATION")}
            />
          )}

          {!isCreatingElder && onboardingStep === "PREFERENCES" && (
            <MobilePreferences
              initialPreferences={draftPreferences}
              onProceedToMatches={async (prefs) => {
                setDraftPreferences(prefs);
                await finalizeElderOnboarding();
              }}
              onWantDetailedIntake={() => setOnboardingStep("DETAILED_INTAKE")}
              onBack={() => setOnboardingStep("REQUIREMENTS")}
            />
          )}

          {!isCreatingElder && onboardingStep === "DETAILED_INTAKE" && (
            <MobileDetailedIntake
              onComplete={async (intakeData) => {
                setDraftIntake(intakeData);
                await finalizeElderOnboarding(intakeData);
              }}
              onSkip={async () => {
                await finalizeElderOnboarding();
              }}
              onBack={() => setOnboardingStep("PREFERENCES")}
            />
          )}

          {!isCreatingElder && onboardingStep === "MATCHMAKING" && (
            <MobileMatchmakingScreen
              elder={draftElder || activeElder || { id: "draft", name: draftBasic.name } as Elder}
              onBookingConfirmed={() => {
                setOnboardingStep(null);
                setActiveFamilyTab("HOME");
                refreshElders();
              }}
              onBack={() => setOnboardingStep("PREFERENCES")}
            />
          )}
        </div>
      </div>
    );
  }

  // 4. Authenticated Caregiver Portal
  if (activePortal === "CAREGIVER") {
    return (
      <div className="min-h-screen bg-slate-900 sm:py-6 flex justify-center items-center">
        <div className="mobile-canvas w-full max-w-[430px] min-h-screen bg-slate-50 flex flex-col">
          <CaregiverMobileApp onSwitchPortal={setActivePortal} />
        </div>
      </div>
    );
  }

  // 5. Authenticated Operations Portal
  if (activePortal === "OPERATIONS") {
    return (
      <div className="min-h-screen bg-slate-900 sm:py-6 flex justify-center items-center">
        <div className="mobile-canvas w-full max-w-[430px] min-h-screen bg-slate-50 flex flex-col">
          <MobileOperationsApp onSwitchPortal={setActivePortal} />
        </div>
      </div>
    );
  }

  // 6. Authenticated Family / Client Portal
  return (
    <div className="min-h-screen bg-slate-900 sm:py-6 flex justify-center items-center">
      <div className="mobile-canvas w-full max-w-[430px] min-h-screen sm:min-h-[844px] bg-slate-50 flex flex-col relative overflow-hidden">
        {/* Top App Bar */}
        <MobileTopBar
          activePortal={activePortal}
          onPortalChange={setActivePortal}
          elders={elders}
          activeElder={activeElder}
          onSelectElder={(id) => {
            const chosen = elders.find((e) => e.id === id);
            if (chosen) setActiveElder(chosen);
          }}
          onOpenSos={() => setIsSosOpen(true)}
          userName={user?.fullName || "Client"}
        />

        {/* Global Error Banner if any */}
        {actionError && (
          <div className="mx-4 my-2 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center justify-between">
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)} className="font-bold">✕</button>
          </div>
        )}

        {/* Main Body */}
        <main className="flex-1 flex flex-col overflow-y-auto">
          {elders.length === 0 ? (
            /* Empty State: No Elder Registered */
            <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 text-center space-y-6 animate-fadeIn">
              <div className="w-16 h-16 rounded-3xl bg-teal-50 border border-teal-200 flex items-center justify-center text-primary shadow-sm">
                <Heart className="w-8 h-8 fill-teal-100" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-extrabold font-heading text-slate-900">
                  Welcome to CareConnect
                </h2>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Start your care journey with verified attendants, 24/7 care desk oversight, and real-time health monitoring.
                </p>
              </div>

              <div className="w-full space-y-3 pt-2">
                <button
                  onClick={() => setOnboardingStep("WHO")}
                  className="w-full min-h-[56px] bg-primary hover:bg-primary-hover active:scale-98 text-white rounded-2xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Find Care for Elder (3 Min)</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>

                <button
                  onClick={handleLoadDemoCare}
                  disabled={isSeedingDemo}
                  className="w-full min-h-[48px] bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 active:scale-98 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition"
                >
                  {isSeedingDemo ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span>Loading Active Care Demo...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Load Demo Active Care (Kalyani Ammal)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : activeElder ? (
            /* Active Family Tabs */
            <>
              {activeFamilyTab === "HOME" && (
                <FamilyHomeScreen
                  elder={activeElder}
                  onOpenTab={(tab) => setActiveFamilyTab(tab as FamilyTab)}
                  onOpenSos={() => setIsSosOpen(true)}
                />
              )}

              {activeFamilyTab === "MY_CARE" && (
                <FamilyMyCareScreen
                  elder={activeElder}
                  onEditProfile={() => setOnboardingStep("REQUIREMENTS")}
                />
              )}

              {activeFamilyTab === "UPDATES" && (
                <FamilyUpdatesScreen elder={activeElder} />
              )}

              {activeFamilyTab === "MESSAGES" && (
                <FamilyMessagesScreen elder={activeElder} />
              )}

              {activeFamilyTab === "MORE" && (
                <FamilyMoreScreen elder={activeElder} />
              )}
            </>
          ) : null}
        </main>

        {/* Bottom Navigation (Sticky at bottom) */}
        {elders.length > 0 && (
          <MobileBottomNav
            portal="FAMILY"
            activeTab={activeFamilyTab}
            onTabChange={(tab) => setActiveFamilyTab(tab as FamilyTab)}
          />
        )}

        {/* Emergency SOS Modal */}
        <MobileSosModal
          isOpen={isSosOpen}
          onClose={() => setIsSosOpen(false)}
          elderId={activeElder?.id}
          elderName={activeElder?.name}
        />
      </div>
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
