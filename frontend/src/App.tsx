import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { OnboardingProvider, useOnboarding } from "./context/OnboardingContext";
import { api } from "./services/api";
import type { Elder } from "./types";

// Mobile Shell & Navigation
import { CareConnectLogo } from "./components/common/CareConnectLogo";
import { MobileTopBar } from "./components/mobile/MobileTopBar";
import {
  MobileBottomNav,
  type FamilyTab,
} from "./components/mobile/MobileBottomNav";
import { MobileSosModal } from "./components/mobile/MobileSosModal";
import { PwaInstallBanner } from "./components/mobile/PwaInstallBanner";

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
  RotateCw,
  LogOut,
} from "lucide-react";
import { usePwaNavigation } from "./hooks/usePwaNavigation";

const AppContent: React.FC = () => {
  const { user, logout, isLoading: isAuthLoading } = useAuth();
  const { elders, activeElder, setActiveElder, refreshElders } =
    useOnboarding();

  const [activePortal, setActivePortal] = useState<
    "FAMILY" | "CAREGIVER" | "OPERATIONS"
  >("FAMILY");

  const [justLoggedIn, setJustLoggedIn] = useState(false);


  // Synchronous check so that if user is stored in localStorage, hasUser is true on initial mount
  const isKnownAuthenticated =
    Boolean(user) ||
    (typeof window !== "undefined" &&
      Boolean(localStorage.getItem("careconnect_token")));

  // Centralized PWA Navigation & Browser History synchronization
  const {
    onboardingStep,
    activeFamilyTab,
    isAuthOpen,
    authStep,
    isSosOpen,
    editingSection,
    isDeleteModalOpen,
    activeMoreModal,
    setOnboardingStep,
    replaceOnboardingStep,
    resetToHome,
    backNotice,
    setActiveFamilyTab,
    setIsAuthOpen,
    setAuthStep,
    setIsSosOpen,
    setEditingSection,
    setIsDeleteModalOpen,
    setActiveMoreModal,
    goBack,
  } = usePwaNavigation(isKnownAuthenticated, refreshElders);
  const [draftRecipient, setDraftRecipient] = useState<
    "ME" | "SOMEONE_ELSE" | null
  >(null);
  const [draftBasic, setDraftBasic] = useState<{
    name: string;
    age: number;
    gender: "FEMALE" | "MALE" | "OTHER";
    dob?: string;
    phone?: string;
  }>({ name: "", age: 0, gender: "FEMALE" });
  const [draftLocation, setDraftLocation] = useState<{
    addressLine1: string;
    locality: string;
    city: string;
    postalCode: string;
    latitude?: number;
    longitude?: number;
  } | null>(null);
  const [draftPhone, setDraftPhone] = useState("");
  const [draftRequirements, setDraftRequirements] = useState<string[]>([]);
  const [draftMobility, setDraftMobility] = useState<string>("");
  const [draftPreferences, setDraftPreferences] = useState<{
    languages: string[];
    primaryLanguage: string;
    careDuration:
      | "EIGHT_HOUR_DAY"
      | "TWELVE_HOUR_DAY_NIGHT"
      | "TWENTY_FOUR_HOUR_LIVE_IN"
      | "FLEXIBLE";
    preferredStartTime?: string;
    preferredEndTime?: string;
    additionalPreferences: string;
  }>({
    languages: [],
    primaryLanguage: "",
    careDuration: "TWELVE_HOUR_DAY_NIGHT",
    preferredStartTime: "",
    preferredEndTime: "",
    additionalPreferences: "",
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
    } else if (user?.role === "OPS_MANAGER") {
      setActivePortal("OPERATIONS");
    }
  }, [user?.role]);

  // Handle immediate redirection for users with zero elders right after login
  useEffect(() => {
    if (user && justLoggedIn) {
      setJustLoggedIn(false);
      if (elders.length === 0) {
        setOnboardingStep("WHO");
      }
    }
  }, [user, elders, justLoggedIn, setOnboardingStep]);

  // Persist elder draft into backend
  const finalizeElderOnboarding = async (
    intakeOverride?: typeof draftIntake,
    preferencesOverride?: typeof draftPreferences,
  ) => {
    if (!user) {
      // Need login before final persistence
      setIsAuthOpen(true, "PHONE");
      return;
    }

    setIsCreatingElder(true);
    setActionError(null);

    try {
      const effectivePrefs = preferencesOverride || draftPreferences;
      const effectiveIntake = intakeOverride || draftIntake;

      // 1. Create Elder record
      const created = await api.createElder({
        name: draftBasic.name || "Elder",
        age: draftBasic.age || 70,
        gender: draftBasic.gender || "FEMALE",
        dateOfBirth: draftBasic.dob || null,
        phoneNumber:
          draftRecipient === "ME"
            ? user?.phone || undefined
            : draftBasic.phone || undefined,
      });

      // 2. Persist Location if available
      if (draftLocation) {
        await api.persistElderLocation(created.id, {
          addressLine1: draftLocation.addressLine1 || "Verified Residence",
          locality: draftLocation.locality || "Care Corridor",
          city: draftLocation.city || "Chennai",
          state: "Tamil Nadu",
          postalCode: draftLocation.postalCode || "600020",
          latitude: draftLocation.latitude || 13.0012,
          longitude: draftLocation.longitude || 80.2565,
        });
      }

      // 3. Persist Persona Requirements & Preferences
      const mappedShift = effectivePrefs.careDuration;

      // Build daily routine including preferred flexible hours if set
      const dailyRoutineObj: Record<string, any> = {
        wakeTime: effectiveIntake?.wakeTime || "07:00",
        bedTime: effectiveIntake?.bedTime || "21:00",
        shiftType: effectivePrefs.careDuration,
      };
      if (effectivePrefs.careDuration === "FLEXIBLE") {
        dailyRoutineObj.preferredStartTime =
          effectivePrefs.preferredStartTime || "09:00";
        dailyRoutineObj.preferredEndTime =
          effectivePrefs.preferredEndTime || "17:00";
      }

      const formattedNotes =
        effectivePrefs.careDuration === "FLEXIBLE" &&
        effectivePrefs.preferredStartTime &&
        effectivePrefs.preferredEndTime
          ? `${effectivePrefs.additionalPreferences || ""}${effectivePrefs.additionalPreferences ? " | " : ""}Preferred Care Hours: ${effectivePrefs.preferredStartTime} - ${effectivePrefs.preferredEndTime}`
          : effectivePrefs.additionalPreferences;

      const updated = await api.updateElder(created.id, {
        mobilityLevel: draftMobility as any,
        careRequirements: draftRequirements,
        languages: effectivePrefs.languages,
        primaryLanguage: effectivePrefs.primaryLanguage,
        shiftPreference: mappedShift as any,
        medicalConditions: effectiveIntake?.medicalConditions || [
          "Hypertension",
        ],
        medicalDevices: effectiveIntake?.medicalDevices || [],
        dietaryPreferences: effectiveIntake?.dietaryPreferences || [
          "Vegetarian",
        ],
        dailyRoutine: dailyRoutineObj,
        additionalNotes: formattedNotes,
        personaStatus: "SAVED",
      });

      setDraftElder(updated);
      setActiveElder(updated);
      await refreshElders(updated.id);
      setOnboardingStep("MATCHMAKING");
    } catch (err: any) {
      console.error("Failed to finalize onboarding:", err);
      setActionError(
        err.message || "Failed to save profile. Please try again.",
      );
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
      resetToHome();
    } catch (err: any) {
      console.error("Failed to seed demo scenario:", err);
      setActionError(err.message || "Failed to load demo scenario.");
    } finally {
      setIsSeedingDemo(false);
    }
  };

  // Handle elder deletion from Family Care Screen
  const handleDeleteElder = async (deletedElderId: string) => {
    try {
      const updatedList = await refreshElders();
      if (updatedList && updatedList.length > 0) {
        const next =
          updatedList.find((e) => e.id !== deletedElderId) || updatedList[0];
        setActiveElder(next);
        setDraftElder(next);
      } else {
        setActiveElder(null);
        setDraftElder(null);
      }
    } catch (err: any) {
      console.error("Failed to refresh elders after deletion:", err);
      setActionError(
        err.message || "Failed to update elder list after deletion.",
      );
    }
  };

  // Floating Toast for Double-Back to Exit and 1-Press Refresh on Home Dashboard
  const renderBackNotice = () => {
    if (!backNotice?.visible) return null;
    return (
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none px-4 w-full max-w-[430px] flex justify-center animate-fadeIn">
        <div className="bg-slate-900/95 backdrop-blur-md text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-2xl border border-slate-700/60 flex items-center gap-2.5">
          {backNotice.isRefreshing ? (
            <RotateCw className="w-4 h-4 text-teal-400 animate-spin shrink-0" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping shrink-0" />
          )}
          <span>{backNotice.message}</span>
        </div>
      </div>
    );
  };

  // Loading Screen
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 sm:bg-slate-100 flex justify-center items-start">
        <div className="mobile-canvas w-full max-w-[440px] min-h-screen min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center gap-3 sm:shadow-lg sm:border-x sm:border-slate-200">
          <CareConnectLogo size="lg" className="animate-pulse" />
          <span className="text-xs font-bold text-teal-800 tracking-wide">
            Loading CareConnect...
          </span>
        </div>
      </div>
    );
  }

  // 1. Auth Screen Modal (renders when isAuthOpen is true and user is not yet logged in)
  if (isAuthOpen && !user) {
    return (
      <div className="min-h-screen bg-slate-50 sm:bg-slate-100 flex justify-center items-start">
        <div className="mobile-canvas w-full max-w-[440px] min-h-screen min-h-[100dvh] bg-slate-50 flex flex-col sm:shadow-lg sm:border-x sm:border-slate-200">
          <MobileAuthScreen
            authStep={authStep}
            onStepChange={(step) => setAuthStep(step)}
            savedPhone={draftPhone}
            onPhoneChange={(p) => setDraftPhone(p)}
            onBack={goBack}
            onSuccess={() => {
              setJustLoggedIn(true);
              if (onboardingStep === "WHO") {
                // Do nothing, the modal will close and the WHO screen will render
              } else if (onboardingStep) {
                // Immediately route directly to REQUIREMENTS, replacing #auth in history
                replaceOnboardingStep("REQUIREMENTS");
              } else {
                resetToHome();
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
      <div className="min-h-screen bg-slate-50 sm:bg-slate-100 flex justify-center items-start">
        <div className="mobile-canvas w-full max-w-[440px] min-h-screen min-h-[100dvh] bg-slate-50 flex flex-col sm:shadow-lg sm:border-x sm:border-slate-200">
          <PwaInstallBanner />
          <MobileEntryScreen
            onGetStarted={() => {
              setOnboardingStep("WHO");
              setIsAuthOpen(true, "PHONE");
            }}
            onSignIn={() => setIsAuthOpen(true, "PHONE")}
            onSelectRole={(role) => {
              setActivePortal(role);
              setIsAuthOpen(true, "PHONE");
            }}
          />
        </div>
      </div>
    );
  }

  // 3. Mobile Onboarding Flow (Accessible to Guests & Authenticated Users)
  if (onboardingStep !== null) {
    return (
      <div className="min-h-screen bg-slate-50 sm:bg-slate-100 flex justify-center items-start">
        <div className="mobile-canvas w-full max-w-[440px] min-h-screen min-h-[100dvh] bg-slate-50 flex flex-col sm:shadow-lg sm:border-x sm:border-slate-200">
          {actionError && (
            <div className="m-3 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center justify-between">
              <span>{actionError}</span>
              <button
                onClick={() => setActionError(null)}
                className="font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {isCreatingElder && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <h3 className="text-base font-bold text-slate-900">
                Setting up elder profile...
              </h3>
              <p className="text-xs text-slate-500">
                Matching verified attendants in your corridor
              </p>
            </div>
          )}

          {/* Step 1: WHO */}
          {!isCreatingElder && onboardingStep === "WHO" && (
            <MobileOnboardingWho
              initialValue={draftRecipient || undefined}
              isMyselfActive={
                !!user?.phone &&
                elders.some((elder) => elder.phoneNumber === user.phone)
              }
              onSelect={(recipient) => {
                setDraftRecipient(recipient);
                setOnboardingStep("BASIC");
              }}
              onBack={goBack}
              onLogout={elders.length === 0 ? logout : undefined}
            />
          )}

          {/* Step 2: BASIC */}
          {!isCreatingElder && onboardingStep === "BASIC" && (
            <MobileOnboardingBasic
              recipient={draftRecipient || "SOMEONE_ELSE"}
              initialData={draftBasic.name ? draftBasic : undefined}
              onNext={(data) => {
                setDraftBasic(data);
                setOnboardingStep("LOCATION");
              }}
              onBack={goBack}
            />
          )}

          {/* Step 3: LOCATION */}
          {!isCreatingElder && onboardingStep === "LOCATION" && (
            <MobileLocationCheck
              initialPostalCode={draftLocation?.postalCode || ""}
              onSuccess={(locData) => {
                setDraftLocation(locData);
                if (user) {
                  setOnboardingStep("REQUIREMENTS");
                } else {
                  setIsAuthOpen(true, "PHONE");
                }
              }}
              onBack={goBack}
            />
          )}

          {/* Step 6: REQUIREMENTS */}
          {!isCreatingElder && onboardingStep === "REQUIREMENTS" && (
            <MobileCareRequirements
              initialRequirements={draftRequirements}
              initialMobility={draftMobility}
              onNext={(reqs, mob) => {
                setDraftRequirements(reqs);
                setDraftMobility(mob);
                setOnboardingStep("PREFERENCES");
              }}
              onBack={goBack}
            />
          )}

          {!isCreatingElder && onboardingStep === "PREFERENCES" && (
            <MobilePreferences
              initialPreferences={draftPreferences}
              onProceedToMatches={async (prefs) => {
                setDraftPreferences(prefs);
                await finalizeElderOnboarding(undefined, prefs);
              }}
              onWantDetailedIntake={(currentPrefs) => {
                if (currentPrefs) setDraftPreferences(currentPrefs);
                setOnboardingStep("DETAILED_INTAKE");
              }}
              onBack={goBack}
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
              onBack={goBack}
            />
          )}

          {!isCreatingElder && onboardingStep === "MATCHMAKING" && (
            <MobileMatchmakingScreen
              elder={
                draftElder ||
                activeElder ||
                ({ id: "draft", name: draftBasic.name } as Elder)
              }
              onBookingConfirmed={() => {
                resetToHome();
                refreshElders();
              }}
              onBack={goBack}
              onUpdateElder={(updated) => {
                setDraftElder(updated);
                setActiveElder(updated);
              }}
              editingSection={editingSection}
              onEditingSectionChange={setEditingSection}
            />
          )}
        </div>
      </div>
    );
  }

  // 4. Authenticated Caregiver Portal
  if (activePortal === "CAREGIVER") {
    return (
      <div className="min-h-screen bg-slate-50 sm:bg-slate-100 flex justify-center items-start">
        <div className="mobile-canvas w-full max-w-[440px] min-h-screen min-h-[100dvh] bg-slate-50 flex flex-col relative sm:shadow-lg sm:border-x sm:border-slate-200">
          <PwaInstallBanner />
          <CaregiverMobileApp onSwitchPortal={setActivePortal} />
          {renderBackNotice()}
        </div>
      </div>
    );
  }

  // 5. Authenticated Operations Portal
  if (activePortal === "OPERATIONS") {
    return (
      <div className="min-h-screen bg-slate-50 sm:bg-slate-100 flex justify-center items-start">
        <div className="mobile-canvas w-full max-w-[440px] min-h-screen min-h-[100dvh] bg-slate-50 flex flex-col relative sm:shadow-lg sm:border-x sm:border-slate-200">
          <PwaInstallBanner />
          <MobileOperationsApp onSwitchPortal={setActivePortal} />
          {renderBackNotice()}
        </div>
      </div>
    );
  }

  // 6. Authenticated Family / Client Portal
  return (
    <div className="min-h-screen bg-slate-50 sm:bg-slate-100 flex justify-center items-start">
      <div className="mobile-canvas w-full max-w-[440px] min-h-screen min-h-[100dvh] bg-slate-50 flex flex-col relative sm:shadow-lg sm:border-x sm:border-slate-200">
        <PwaInstallBanner />
        {/* Top App Bar */}
        <MobileTopBar
          activePortal={activePortal}
          elders={elders}
          activeElder={activeElder}
          onSelectElder={(id) => {
            const chosen = elders.find((e) => e.id === id);
            if (chosen) setActiveElder(chosen);
          }}
          onOpenSos={() => setIsSosOpen(true)}
          onAddElder={onboardingStep === null ? () => {
            setDraftRecipient(null);
            setDraftBasic({ name: "", age: 0, gender: "FEMALE" });
            setOnboardingStep("WHO");
          } : undefined}
          userName={user?.fullName || "Client"}
        />

        {/* Global Error Banner if any */}
        {actionError && (
          <div className="mx-4 my-2 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center justify-between">
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)} className="font-bold">
              ✕
            </button>
          </div>
        )}

        {/* Main Body */}
        <main className="flex-1 flex flex-col overflow-y-auto">
          {elders.length === 0 ? (
            /* Empty State: No Elders Added */
            <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 text-center space-y-6 animate-fadeIn">
              <div className="w-16 h-16 rounded-3xl bg-teal-50 border border-teal-200 flex items-center justify-center text-primary shadow-sm">
                <Heart className="w-8 h-8 fill-teal-100" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-extrabold font-heading text-slate-900">
                  No elders added yet.
                </h2>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Start your care journey by adding an elder profile with
                  verified attendants, 24/7 care desk oversight, and real-time
                  health monitoring.
                </p>
              </div>

              <div className="w-full space-y-3 pt-2">
                <button
                  onClick={() => setOnboardingStep("WHO")}
                  className="w-full min-h-[56px] bg-primary hover:bg-primary-hover active:scale-98 text-white rounded-2xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add Elder</span>
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

                <button
                  onClick={logout}
                  className="w-full min-h-[48px] bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 active:scale-98 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          ) : activeElder || elders[0] ? (
            /* Active Family Tabs */
            <>
              {activeFamilyTab === "HOME" && (
                <FamilyHomeScreen
                  elder={activeElder || elders[0]}
                  onOpenTab={(tab) => setActiveFamilyTab(tab as FamilyTab)}
                  onOpenSos={() => setIsSosOpen(true)}
                />
              )}

              {activeFamilyTab === "MY_CARE" && (
                <FamilyMyCareScreen
                  elder={activeElder || elders[0]}
                  onUpdateElder={(updated) => {
                    setActiveElder(updated);
                    setDraftElder(updated);
                    refreshElders(updated.id);
                  }}
                  onDeleteElder={handleDeleteElder}
                  editingSection={editingSection}
                  onEditingSectionChange={setEditingSection}
                  isDeleteModalOpen={isDeleteModalOpen}
                  onDeleteModalOpenChange={setIsDeleteModalOpen}
                />
              )}

              {activeFamilyTab === "UPDATES" && (
                <FamilyUpdatesScreen elder={activeElder || elders[0]} />
              )}

              {activeFamilyTab === "MESSAGES" && (
                <FamilyMessagesScreen
                  elder={activeElder || elders[0]}
                  currentUser={user}
                />
              )}

              {activeFamilyTab === "MORE" && (
                <FamilyMoreScreen
                  elder={activeElder || elders[0]}
                  activeModal={activeMoreModal}
                  onActiveModalChange={setActiveMoreModal}
                />
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-3">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <span className="text-xs text-slate-500">
                Preparing care portal...
              </span>
            </div>
          )}
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

        {/* Home Double-Back & Refresh Toast Notification */}
        {renderBackNotice()}
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







