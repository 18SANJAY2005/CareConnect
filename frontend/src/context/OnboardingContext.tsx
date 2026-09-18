import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { Elder, HomeAssessment } from "../types";
import { api } from "../services/api";
import { useAuth } from "./AuthContext";

export type OnboardingStep =
  | "LANDING"
  | "AUTH"
  | "GEO_VERIFICATION"
  | "PERSONA"
  | "ASSESSMENT"
  | "DASHBOARD"
  | "MATCHING";

interface OnboardingContextType {
  currentStep: OnboardingStep;
  setCurrentStep: (step: OnboardingStep) => void;
  elders: Elder[];
  activeElder: Elder | null;
  setActiveElder: (elder: Elder | null) => void;
  activeAssessment: HomeAssessment | null;
  setActiveAssessment: (assessment: HomeAssessment | null) => void;
  loadElderData: (elderId: string) => Promise<void>;
  refreshElders: (preferredElderId?: string) => Promise<Elder[]>;
  selectElder: (elderId: string) => void;
  startNewElderOnboarding: () => void;
  resetOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined,
);

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("LANDING");
  const [elders, setElders] = useState<Elder[]>([]);
  const [activeElder, setActiveElder] = useState<Elder | null>(null);
  const [activeAssessment, setActiveAssessment] =
    useState<HomeAssessment | null>(null);

  const refreshElders = useCallback(
    async (preferredElderId?: string): Promise<Elder[]> => {
      try {
        const fetchedElders = await api.listElders();
        const list = fetchedElders || [];
        setElders(list);

        if (list.length > 0) {
          const targetId = preferredElderId || activeElder?.id;
          const matched = targetId
            ? list.find((e) => e.id === targetId)
            : null;
          const chosen = matched || list[0];
          setActiveElder(chosen);
          return list;
        } else {
          setActiveElder(null);
          return [];
        }
      } catch (err) {
        console.error("Failed to refresh elders:", err);
        return [];
      }
    },
    [activeElder?.id],
  );

  useEffect(() => {
    if (user) {
      // If user is authenticated, check all elders
      api
        .listElders()
        .then((fetchedElders) => {
          const list = fetchedElders || [];
          setElders(list);

          if (list.length > 0) {
            const latest = list[0];
            setActiveElder(latest);
            if (latest.personaStatus === "SAVED") {
              setCurrentStep("DASHBOARD");
            } else if (latest.location && latest.location.serviceable) {
              setCurrentStep("PERSONA");
            } else {
              setCurrentStep("GEO_VERIFICATION");
            }
          } else {
            setActiveElder(null);
            setCurrentStep("GEO_VERIFICATION");
          }
        })
        .catch(() => {
          setElders([]);
          setActiveElder(null);
          setCurrentStep("GEO_VERIFICATION");
        });

      // Check for any assessment bookings
      api
        .listHomeAssessments()
        .then((assessments) => {
          if (assessments && assessments.length > 0) {
            setActiveAssessment(assessments[0]);
          }
        })
        .catch(() => {});
    } else {
      setCurrentStep("LANDING");
      setElders([]);
      setActiveElder(null);
      setActiveAssessment(null);
    }
  }, [user]);

  const selectElder = (elderId: string) => {
    const target = elders.find((e) => e.id === elderId);
    if (target) {
      setActiveElder(target);
      if (target.personaStatus === "SAVED") {
        setCurrentStep("DASHBOARD");
      } else if (target.location && target.location.serviceable) {
        setCurrentStep("PERSONA");
      } else {
        setCurrentStep("GEO_VERIFICATION");
      }
    } else {
      loadElderData(elderId);
    }
  };

  const loadElderData = async (elderId: string) => {
    try {
      const elder = await api.getElder(elderId);
      setActiveElder(elder);
      await refreshElders(elderId);
    } catch (err) {
      console.error("Failed to load elder:", err);
    }
  };

  const startNewElderOnboarding = () => {
    setActiveElder(null);
    setActiveAssessment(null);
    setCurrentStep("GEO_VERIFICATION");
  };

  const resetOnboarding = startNewElderOnboarding;

  return (
    <OnboardingContext.Provider
      value={{
        currentStep,
        setCurrentStep,
        elders,
        activeElder,
        setActiveElder,
        activeAssessment,
        setActiveAssessment,
        loadElderData,
        refreshElders,
        selectElder,
        startNewElderOnboarding,
        resetOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
};
