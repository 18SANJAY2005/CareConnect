import { useState, useEffect, useRef, useCallback } from "react";
import type { FamilyTab } from "../components/mobile/MobileBottomNav";
import type { EditableSection } from "../components/mobile/profile/ElderSectionEditorModal";

export type MobileOnboardingStep =
  | "WHO"
  | "BASIC"
  | "LOCATION"
  | "REQUIREMENTS"
  | "PREFERENCES"
  | "DETAILED_INTAKE"
  | "MATCHMAKING";

export type MoreModalType = "REPLACEMENT" | "FEEDBACK" | "BILLING" | null;
export type AuthSubStep = "PHONE" | "OTP";

export interface PwaNavState {
  tab: FamilyTab;
  step: MobileOnboardingStep | null;
  auth: boolean;
  authStep: AuthSubStep;
  sos: boolean;
  edit: EditableSection | null;
  del: boolean;
  more: MoreModalType;
}

const DEFAULT_STATE: PwaNavState = {
  tab: "HOME",
  step: null,
  auth: false,
  authStep: "PHONE",
  sos: false,
  edit: null,
  del: false,
  more: null,
};

function stateToHash(state: PwaNavState): string {
  if (state.sos) return "#sos";
  if (state.auth) {
    return state.authStep === "OTP" ? "#auth/otp" : "#auth";
  }
  if (state.step) {
    return `#onboarding/${state.step.toLowerCase()}`;
  }
  if (state.edit) {
    return `#my-care/edit-${state.edit.toLowerCase()}`;
  }
  if (state.del) {
    return "#my-care/delete";
  }
  if (state.more) {
    return `#more/${state.more.toLowerCase()}`;
  }
  if (state.tab && state.tab !== "HOME") {
    return `#${state.tab.toLowerCase().replace("_", "-")}`;
  }
  return "#home";
}

function hashToState(
  hash: string,
  hasUser: boolean = false,
): Partial<PwaNavState> {
  const clean = hash.replace(/^#\/?/, "").toLowerCase();
  if (!clean || clean === "home")
    return { tab: "HOME", step: null, auth: false };
  if (clean === "sos") return { sos: true };
  if (clean === "auth" || clean === "auth/phone") {
    return hasUser
      ? { tab: "HOME", step: null, auth: false }
      : { auth: true, authStep: "PHONE" };
  }
  if (clean === "auth/otp") {
    return hasUser
      ? { tab: "HOME", step: null, auth: false }
      : { auth: true, authStep: "OTP" };
  }

  if (clean.startsWith("onboarding/")) {
    const stepPart = clean.replace("onboarding/", "").toUpperCase();
    const validSteps: MobileOnboardingStep[] = [
      "WHO",
      "BASIC",
      "LOCATION",
      "REQUIREMENTS",
      "PREFERENCES",
      "DETAILED_INTAKE",
      "MATCHMAKING",
    ];
    if (validSteps.includes(stepPart as MobileOnboardingStep)) {
      return { step: stepPart as MobileOnboardingStep, auth: false };
    }
  }

  if (clean.startsWith("my-care/edit-")) {
    const secPart = clean.replace("my-care/edit-", "").toUpperCase();
    const validSections: EditableSection[] = [
      "NAME",
      "AGE_GENDER",
      "LANGUAGE",
      "REQUIREMENTS",
      "DURATION",
      "PREFERENCES",
      "DETAILED_CARE",
    ];
    if (validSections.includes(secPart as EditableSection)) {
      return { tab: "MY_CARE", edit: secPart as EditableSection };
    }
  }

  if (clean === "my-care/delete") {
    return { tab: "MY_CARE", del: true };
  }

  if (clean.startsWith("more/")) {
    const morePart = clean.replace("more/", "").toUpperCase();
    if (["REPLACEMENT", "FEEDBACK", "BILLING"].includes(morePart)) {
      return { tab: "MORE", more: morePart as MoreModalType };
    }
  }

  if (clean === "my-care") return { tab: "MY_CARE", step: null };
  if (clean === "updates") return { tab: "UPDATES", step: null };
  if (clean === "messages") return { tab: "MESSAGES", step: null };
  if (clean === "more") return { tab: "MORE", step: null };

  return { tab: "HOME", step: null, auth: false };
}

function areStatesEqual(a: PwaNavState, b: PwaNavState): boolean {
  return (
    a.tab === b.tab &&
    a.step === b.step &&
    a.auth === b.auth &&
    a.authStep === b.authStep &&
    a.sos === b.sos &&
    a.edit === b.edit &&
    a.del === b.del &&
    a.more === b.more
  );
}

export interface BackNotice {
  visible: boolean;
  message: string;
  isRefreshing?: boolean;
}

export function usePwaNavigation(
  hasUser: boolean = false,
  onRefreshHome?: () => void,
) {
  const hasUserRef = useRef(hasUser);
  const onRefreshHomeRef = useRef(onRefreshHome);
  onRefreshHomeRef.current = onRefreshHome;

  // Initialize state from existing window history or URL hash
  const getInitialState = (): PwaNavState => {
    if (typeof window === "undefined") return DEFAULT_STATE;

    const fromHistory = window.history.state as PwaNavState | null;
    if (
      fromHistory &&
      typeof fromHistory === "object" &&
      "tab" in fromHistory
    ) {
      const state = { ...DEFAULT_STATE, ...fromHistory };
      if (hasUser) state.auth = false;
      return state;
    }

    const fromHash = hashToState(window.location.hash, hasUser);
    if (hasUser) fromHash.auth = false;
    return { ...DEFAULT_STATE, ...fromHash };
  };

  const [navState, setNavState] = useState<PwaNavState>(getInitialState);
  const [backNotice, setBackNotice] = useState<BackNotice | null>(null);

  // References to prevent popstate loops, track history depth, and debounce home back presses
  const isPopStateRef = useRef(false);
  const isNavigatingBackRef = useRef(false);
  const historyDepthRef = useRef(0);
  const lastBackPressTimeRef = useRef<number>(0);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef<PwaNavState>(navState);
  stateRef.current = navState;

  // Helper to establish a 2-level trap: Base entry without #home, Active entry with #home
  // This guarantees that the Back button pops between distinct URLs and triggers popstate every time
  const armHomeTrap = useCallback((state: PwaNavState) => {
    if (typeof window === "undefined") return;
    try {
      const basePath = window.location.pathname + window.location.search;
      window.history.replaceState({ ...state, __base: true }, "", basePath);
      window.history.pushState(state, "", "#home");
      historyDepthRef.current = 1;
    } catch {}
  }, []);

  // Dedicated Reset to Home: Clears history depth and arms back trap on Home dashboard
  const resetToHome = useCallback(() => {
    const nextState: PwaNavState = {
      ...DEFAULT_STATE,
      tab: "HOME",
      step: null,
      auth: false,
      edit: null,
      del: false,
      more: null,
      sos: false,
    };
    stateRef.current = nextState;
    lastBackPressTimeRef.current = 0;
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    armHomeTrap(nextState);
    setNavState(nextState);
  }, [armHomeTrap]);

  // Home Back Action Handler:
  // 1 press: shows toast, triggers data refresh & reloads page after 1.5s
  // 2 presses in sequence (< 2000ms): cancels reload and minimizes/closes the app
  const handleHomeBackAction = useCallback(() => {
    const now = Date.now();
    const diff = now - lastBackPressTimeRef.current;

    // 2 times in sequence (< 2000ms): MINIMIZE THE APP
    if (diff < 2000 && lastBackPressTimeRef.current > 0) {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      if (noticeTimerRef.current) {
        clearTimeout(noticeTimerRef.current);
        noticeTimerRef.current = null;
      }
      lastBackPressTimeRef.current = 0;

      setBackNotice({
        visible: true,
        message: "Minimizing CareConnect...",
        isRefreshing: false,
      });

      // Attempt native PWA / browser exit
      setTimeout(() => {
        if (typeof window !== "undefined") {
          if ((window.navigator as any)?.app?.exitApp) {
            (window.navigator as any).app.exitApp();
          } else {
            try {
              window.close();
            } catch {}
          }
        }
      }, 200);

      noticeTimerRef.current = setTimeout(() => {
        setBackNotice(null);
      }, 2500);
      return;
    }

    // 1 time press: REFRESH THE PAGE
    lastBackPressTimeRef.current = now;

    setBackNotice({
      visible: true,
      message: "Press back again to exit",
      isRefreshing: true,
    });

    // Trigger in-app immediate data refresh if provided
    if (onRefreshHomeRef.current) {
      try {
        onRefreshHomeRef.current();
      } catch {}
    }

    // After 1500ms, if not double-pressed, reload the page
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      lastBackPressTimeRef.current = 0;
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    }, 1500);

    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = setTimeout(() => {
      setBackNotice(null);
    }, 2500);
  }, []);

  // React to changes in user authentication status
  useEffect(() => {
    hasUserRef.current = hasUser;
    if (hasUser) {
      // If user became authenticated while at an auth screen/hash, clear auth
      if (
        stateRef.current.auth ||
        (typeof window !== "undefined" &&
          window.location.hash.startsWith("#auth"))
      ) {
        if (stateRef.current.step) {
          // Preserve the onboarding intent
          const next = { ...stateRef.current, auth: false, authStep: "PHONE" as const };
          stateRef.current = next;
          setNavState(next);
          try {
            window.history.replaceState(next, "", stateToHash(next));
          } catch {}
        } else {
          resetToHome();
        }
      } else if (
        stateRef.current.tab === "HOME" &&
        stateRef.current.step === null
      ) {
        // Arm trap for Home root
        armHomeTrap(stateRef.current);
      }
    }
  }, [hasUser, resetToHome, armHomeTrap]);

  // Re-affirm trap with user gesture on first mobile touch so Chromium never treats it as skippable
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (
        hasUserRef.current &&
        stateRef.current.tab === "HOME" &&
        stateRef.current.step === null &&
        !stateRef.current.auth &&
        !stateRef.current.sos
      ) {
        armHomeTrap(stateRef.current);
      }
    };

    window.addEventListener("pointerdown", handleFirstInteraction, {
      once: true,
      passive: true,
    });
    window.addEventListener("touchstart", handleFirstInteraction, {
      once: true,
      passive: true,
    });
    return () => {
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
    };
  }, [armHomeTrap]);

  // Synchronize on mount and handle popstate / hashchange
  useEffect(() => {
    const syncFromUrl = (stateFromEvent?: any) => {
      let nextState: PwaNavState = DEFAULT_STATE;
      if (
        stateFromEvent &&
        typeof stateFromEvent === "object" &&
        "tab" in stateFromEvent
      ) {
        nextState = { ...DEFAULT_STATE, ...stateFromEvent };
      } else {
        const fromHash = hashToState(window.location.hash, hasUserRef.current);
        nextState = { ...DEFAULT_STATE, ...fromHash };
      }

      // If user is authenticated, guarantee auth is never true
      if (hasUserRef.current) {
        nextState.auth = false;
        if (window.location.hash.startsWith("#auth")) {
          try {
            window.history.replaceState(nextState, "", stateToHash(nextState));
          } catch {}
        }
      }

      stateRef.current = nextState;
      setNavState((prev) =>
        areStatesEqual(prev, nextState) ? prev : nextState,
      );
    };

    const initial = getInitialState();
    const hash = stateToHash(initial);
    try {
      // Arm back trap if starting on authenticated home dashboard
      if (
        hasUserRef.current &&
        initial.tab === "HOME" &&
        initial.step === null
      ) {
        armHomeTrap(initial);
      } else {
        window.history.replaceState(initial, "", hash);
      }
    } catch {
      // Ignore security errors in strict sandbox environments
    }

    const handlePopState = (event: PopStateEvent) => {
      isPopStateRef.current = true;
      if (historyDepthRef.current > 0) {
        historyDepthRef.current -= 1;
      }

      // INTERCEPT BACK IN HOME ROOT:
      // When user is authenticated and on the root Home dashboard:
      // A back button or swipe gesture must NEVER redirect the user nowhere or to onboarding.
      // Instead, 1 press refreshes the page, 2 presses in sequence minimize the app.
      const wasAtHomeRoot =
        hasUserRef.current &&
        stateRef.current.tab === "HOME" &&
        stateRef.current.step === null &&
        !stateRef.current.auth &&
        !stateRef.current.sos &&
        !stateRef.current.edit &&
        !stateRef.current.del &&
        !stateRef.current.more;

      if (wasAtHomeRoot) {
        const now = Date.now();
        const diff = now - lastBackPressTimeRef.current;
        const isSecondPress = diff < 2000 && lastBackPressTimeRef.current > 0;

        // If not double-pressing to minimize, re-arm the trap at #home
        if (!isSecondPress) {
          try {
            window.history.pushState(stateRef.current, "", "#home");
          } catch {}
        }

        handleHomeBackAction();

        setTimeout(() => {
          isPopStateRef.current = false;
        }, 100);
        return;
      }

      let nextState: PwaNavState = DEFAULT_STATE;
      if (
        event.state &&
        typeof event.state === "object" &&
        "tab" in event.state
      ) {
        nextState = { ...DEFAULT_STATE, ...event.state };
      } else {
        const fromHash = hashToState(window.location.hash, hasUserRef.current);
        nextState = { ...DEFAULT_STATE, ...fromHash };
      }

      // GUARD: If user is authenticated, NEVER restore auth screen or guest landing from history
      if (hasUserRef.current) {
        nextState.auth = false;
        if (event.state?.auth || window.location.hash.startsWith("#auth")) {
          nextState.tab = nextState.tab || "HOME";
          const cleanHash = stateToHash(nextState);
          try {
            window.history.replaceState(nextState, "", cleanHash);
          } catch {}
        }
      }

      stateRef.current = nextState;
      setNavState((prev) =>
        areStatesEqual(prev, nextState) ? prev : nextState,
      );
      setTimeout(() => {
        isPopStateRef.current = false;
      }, 100);
    };

    const handleHashChange = () => {
      if (!isPopStateRef.current) {
        syncFromUrl();
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [handleHomeBackAction]);

  // Central push navigation method
  const updateNavState = useCallback(
    (
      updater:
        Partial<PwaNavState> | ((prev: PwaNavState) => Partial<PwaNavState>),
    ) => {
      const prev = stateRef.current;
      const updates = typeof updater === "function" ? updater(prev) : updater;
      const next: PwaNavState = { ...prev, ...updates };

      if (hasUserRef.current && next.auth) {
        next.auth = false;
      }

      if (areStatesEqual(prev, next)) {
        return;
      }

      stateRef.current = next;

      // Only push to browser history if not triggered by browser popstate
      if (!isPopStateRef.current && typeof window !== "undefined") {
        const hash = stateToHash(next);
        try {
          if (window.location.hash !== hash) {
            window.history.pushState(next, "", hash);
            historyDepthRef.current += 1;
          } else {
            window.history.replaceState(next, "", hash);
          }
        } catch {
          // Fallback for sandboxed frames
        }
      }

      setNavState(next);
    },
    [],
  );

  // Central replace navigation method (replaces current history entry instead of pushing)
  const replaceNavState = useCallback(
    (
      updater:
        Partial<PwaNavState> | ((prev: PwaNavState) => Partial<PwaNavState>),
    ) => {
      const prev = stateRef.current;
      const updates = typeof updater === "function" ? updater(prev) : updater;
      const next: PwaNavState = { ...prev, ...updates };

      if (hasUserRef.current && next.auth) {
        next.auth = false;
      }

      stateRef.current = next;

      if (typeof window !== "undefined") {
        const hash = stateToHash(next);
        try {
          window.history.replaceState(next, "", hash);
        } catch {
          // Fallback for sandboxed frames
        }
      }

      setNavState(next);
    },
    [],
  );

  // In-app back navigation handler
  // Single clean back action: performs window.history.back(), or in-place replaceState when no history exists
  const goBack = useCallback(
    (fallback?: () => void) => {
      if (typeof window === "undefined") return;

      // Prevent double-click race conditions (200ms debounce)
      if (isNavigatingBackRef.current) return;
      isNavigatingBackRef.current = true;
      setTimeout(() => {
        isNavigatingBackRef.current = false;
      }, 200);

      const current = stateRef.current;

      // INTERCEPT BACK IN HOME ROOT:
      // When user is authenticated and on the root Home dashboard:
      // A back action must NEVER redirect the user nowhere or to onboarding.
      const isAtHomeRoot =
        hasUserRef.current &&
        current.tab === "HOME" &&
        current.step === null &&
        !current.auth &&
        !current.sos &&
        !current.edit &&
        !current.del &&
        !current.more;

      if (isAtHomeRoot) {
        handleHomeBackAction();
        return;
      }

      // If browser history was pushed during this app session, pop it cleanly in 1 press
      if (historyDepthRef.current > 0) {
        window.history.back();
        return;
      }

      // Direct fallback if provided
      if (typeof fallback === 'function') {
        fallback();
        return;
      }

      // Intelligent in-app step-back fallback (for refreshes or direct deep links)
      let next: PwaNavState = { ...DEFAULT_STATE };
      if (current.step === "REQUIREMENTS") {
        next = { ...DEFAULT_STATE, auth: false, step: "LOCATION" };
      } else if (current.auth) {
        if (current.authStep === "OTP") {
          next = {
            ...DEFAULT_STATE,
            auth: true,
            authStep: "PHONE",
            step: current.step || "LOCATION",
          };
        } else {
          next = { ...DEFAULT_STATE, auth: false, step: current.step || null };
        }
      } else if (current.step) {
        const stepOrder: MobileOnboardingStep[] = [
          "WHO",
          "BASIC",
          "LOCATION",
          "REQUIREMENTS",
          "PREFERENCES",
          "DETAILED_INTAKE",
          "MATCHMAKING",
        ];
        const idx = stepOrder.indexOf(current.step);
        if (idx > 0) {
          next = { ...DEFAULT_STATE, step: stepOrder[idx - 1] };
        } else {
          next = { ...DEFAULT_STATE, step: null, tab: "HOME" };
        }
      } else if (current.tab !== "HOME") {
        next = { ...DEFAULT_STATE, tab: "HOME" };
      }

      if (hasUserRef.current) {
        next.auth = false;
      }

      const hash = stateToHash(next);
      try {
        window.history.replaceState(next, "", hash);
      } catch {
        // Fallback
      }
      stateRef.current = next;
      setNavState(next);
    },
    [handleHomeBackAction],
  );

  // Convenience state setters
  const setOnboardingStep = useCallback(
    (step: MobileOnboardingStep | null) => {
      updateNavState({
        step,
        // Reset sub-modals when changing onboarding step
        auth: false,
        authStep: "PHONE",
        sos: false,
        edit: null,
        del: false,
      });
    },
    [updateNavState],
  );

  const replaceOnboardingStep = useCallback(
    (step: MobileOnboardingStep | null) => {
      replaceNavState({
        step,
        auth: false,
        authStep: "PHONE",
        sos: false,
        edit: null,
        del: false,
      });
    },
    [replaceNavState],
  );

  const setActiveFamilyTab = useCallback(
    (tab: FamilyTab) => {
      updateNavState({
        tab,
        step: null,
        edit: null,
        del: false,
        more: null,
        sos: false,
        auth: false,
      });
    },
    [updateNavState],
  );

  const setIsAuthOpen = useCallback(
    (auth: boolean, authStep: AuthSubStep = "PHONE") => {
      if (auth && hasUserRef.current) return;
      updateNavState({ auth, authStep });
    },
    [updateNavState],
  );

  const setAuthStep = useCallback(
    (authStep: AuthSubStep) => {
      if (hasUserRef.current) return;
      updateNavState({ auth: true, authStep });
    },
    [updateNavState],
  );

  const setIsSosOpen = useCallback(
    (sos: boolean) => {
      if (!sos && stateRef.current.sos && historyDepthRef.current > 0) {
        window.history.back();
      } else {
        updateNavState({ sos });
      }
    },
    [updateNavState],
  );

  const setEditingSection = useCallback(
    (edit: EditableSection | null) => {
      if (!edit && stateRef.current.edit && historyDepthRef.current > 0) {
        window.history.back();
      } else {
        updateNavState({ edit });
      }
    },
    [updateNavState],
  );

  const setIsDeleteModalOpen = useCallback(
    (del: boolean) => {
      if (!del && stateRef.current.del && historyDepthRef.current > 0) {
        window.history.back();
      } else {
        updateNavState({ del });
      }
    },
    [updateNavState],
  );

  const setActiveMoreModal = useCallback(
    (more: MoreModalType) => {
      if (!more && stateRef.current.more && historyDepthRef.current > 0) {
        window.history.back();
      } else {
        updateNavState({ more });
      }
    },
    [updateNavState],
  );

  return {
    navState,
    onboardingStep: navState.step,
    activeFamilyTab: navState.tab,
    isAuthOpen: navState.auth,
    authStep: navState.authStep,
    isSosOpen: navState.sos,
    editingSection: navState.edit,
    isDeleteModalOpen: navState.del,
    activeMoreModal: navState.more,
    setOnboardingStep,
    replaceOnboardingStep,
    replaceNavState,
    resetToHome,
    backNotice,
    dismissBackNotice: () => setBackNotice(null),
    setActiveFamilyTab,
    setIsAuthOpen,
    setAuthStep,
    setIsSosOpen,
    setEditingSection,
    setIsDeleteModalOpen,
    setActiveMoreModal,
    goBack,
  };
}
