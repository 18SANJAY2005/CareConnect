import { useState, useEffect, useRef, useCallback } from 'react';
import type { FamilyTab } from '../components/mobile/MobileBottomNav';
import type { EditableSection } from '../components/mobile/profile/ElderSectionEditorModal';

export type MobileOnboardingStep =
  | 'WHO'
  | 'BASIC'
  | 'LOCATION'
  | 'REQUIREMENTS'
  | 'PREFERENCES'
  | 'DETAILED_INTAKE'
  | 'MATCHMAKING';

export type MoreModalType = 'REPLACEMENT' | 'FEEDBACK' | 'BILLING' | null;
export type AuthSubStep = 'PHONE' | 'OTP';

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
  tab: 'HOME',
  step: null,
  auth: false,
  authStep: 'PHONE',
  sos: false,
  edit: null,
  del: false,
  more: null,
};

function stateToHash(state: PwaNavState): string {
  if (state.sos) return '#sos';
  if (state.auth) {
    return state.authStep === 'OTP' ? '#auth/otp' : '#auth';
  }
  if (state.step) {
    return `#onboarding/${state.step.toLowerCase()}`;
  }
  if (state.edit) {
    return `#my-care/edit-${state.edit.toLowerCase()}`;
  }
  if (state.del) {
    return '#my-care/delete';
  }
  if (state.more) {
    return `#more/${state.more.toLowerCase()}`;
  }
  if (state.tab && state.tab !== 'HOME') {
    return `#${state.tab.toLowerCase().replace('_', '-')}`;
  }
  return '#home';
}

function hashToState(hash: string): Partial<PwaNavState> {
  const clean = hash.replace(/^#\/?/, '').toLowerCase();
  if (!clean || clean === 'home') return { tab: 'HOME', step: null, auth: false };
  if (clean === 'sos') return { sos: true };
  if (clean === 'auth' || clean === 'auth/phone') return { auth: true, authStep: 'PHONE' };
  if (clean === 'auth/otp') return { auth: true, authStep: 'OTP' };

  if (clean.startsWith('onboarding/')) {
    const stepPart = clean.replace('onboarding/', '').toUpperCase();
    const validSteps: MobileOnboardingStep[] = [
      'WHO',
      'BASIC',
      'LOCATION',
      'REQUIREMENTS',
      'PREFERENCES',
      'DETAILED_INTAKE',
      'MATCHMAKING',
    ];
    if (validSteps.includes(stepPart as MobileOnboardingStep)) {
      return { step: stepPart as MobileOnboardingStep, auth: false };
    }
  }

  if (clean.startsWith('my-care/edit-')) {
    const secPart = clean.replace('my-care/edit-', '').toUpperCase();
    const validSections: EditableSection[] = [
      'NAME',
      'AGE_GENDER',
      'LANGUAGE',
      'REQUIREMENTS',
      'DURATION',
      'PREFERENCES',
      'DETAILED_CARE',
    ];
    if (validSections.includes(secPart as EditableSection)) {
      return { tab: 'MY_CARE', edit: secPart as EditableSection };
    }
  }

  if (clean === 'my-care/delete') {
    return { tab: 'MY_CARE', del: true };
  }

  if (clean.startsWith('more/')) {
    const morePart = clean.replace('more/', '').toUpperCase();
    if (['REPLACEMENT', 'FEEDBACK', 'BILLING'].includes(morePart)) {
      return { tab: 'MORE', more: morePart as MoreModalType };
    }
  }

  if (clean === 'my-care') return { tab: 'MY_CARE', step: null };
  if (clean === 'updates') return { tab: 'UPDATES', step: null };
  if (clean === 'messages') return { tab: 'MESSAGES', step: null };
  if (clean === 'more') return { tab: 'MORE', step: null };

  return { tab: 'HOME', step: null, auth: false };
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

export function usePwaNavigation(_hasUser?: boolean) {
  // Initialize state from existing window history or URL hash
  const getInitialState = (): PwaNavState => {
    if (typeof window === 'undefined') return DEFAULT_STATE;

    const fromHistory = window.history.state as PwaNavState | null;
    if (fromHistory && typeof fromHistory === 'object' && 'tab' in fromHistory) {
      return { ...DEFAULT_STATE, ...fromHistory };
    }

    const fromHash = hashToState(window.location.hash);
    return { ...DEFAULT_STATE, ...fromHash };
  };

  const [navState, setNavState] = useState<PwaNavState>(getInitialState);

  // References to prevent popstate loops
  const isPopStateRef = useRef(false);
  const stateRef = useRef<PwaNavState>(navState);
  stateRef.current = navState;

  // Synchronize on mount and handle popstate / hashchange
  useEffect(() => {
    const syncFromUrl = (stateFromEvent?: any) => {
      let nextState: PwaNavState = DEFAULT_STATE;
      if (stateFromEvent && typeof stateFromEvent === 'object' && 'tab' in stateFromEvent) {
        nextState = { ...DEFAULT_STATE, ...stateFromEvent };
      } else {
        const fromHash = hashToState(window.location.hash);
        nextState = { ...DEFAULT_STATE, ...fromHash };
      }
      setNavState(nextState);
    };

    const initial = getInitialState();
    const hash = stateToHash(initial);
    try {
      window.history.replaceState(initial, '', hash);
    } catch {
      // Ignore security errors in strict sandbox environments
    }

    const handlePopState = (event: PopStateEvent) => {
      isPopStateRef.current = true;
      syncFromUrl(event.state);
      setTimeout(() => {
        isPopStateRef.current = false;
      }, 50);
    };

    const handleHashChange = () => {
      if (!isPopStateRef.current) {
        syncFromUrl();
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Central push navigation method
  const updateNavState = useCallback(
    (updater: Partial<PwaNavState> | ((prev: PwaNavState) => Partial<PwaNavState>)) => {
      setNavState((prev) => {
        const updates = typeof updater === 'function' ? updater(prev) : updater;
        const next: PwaNavState = { ...prev, ...updates };

        if (areStatesEqual(prev, next)) {
          return prev;
        }

        // If this update was triggered by browser popstate, do NOT push to history
        if (!isPopStateRef.current) {
          const hash = stateToHash(next);
          try {
            window.history.pushState(next, '', hash);
          } catch {
            // Fallback for sandboxed frames
          }
        }

        return next;
      });
    },
    []
  );

  // In-app back navigation handler
  // Single clean back action: performs window.history.back(), or in-place replaceState when no history exists
  const goBack = useCallback((_fallback?: () => void) => {
    if (typeof window === 'undefined') return;

    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    // Direct entry fallback if user opened directly in a new tab without prior history:
    // Uses replaceState to avoid pushing extra history entries
    const current = stateRef.current;
    let next: PwaNavState = { ...DEFAULT_STATE };
    if (current.step === 'REQUIREMENTS') {
      next = { ...DEFAULT_STATE, auth: true, authStep: 'OTP', step: 'LOCATION' };
    } else if (current.auth) {
      if (current.authStep === 'OTP') {
        next = { ...DEFAULT_STATE, auth: true, authStep: 'PHONE', step: current.step || 'LOCATION' };
      } else {
        next = { ...DEFAULT_STATE, auth: false, step: current.step || 'LOCATION' };
      }
    } else if (current.step) {
      const stepOrder: MobileOnboardingStep[] = [
        'WHO',
        'BASIC',
        'LOCATION',
        'REQUIREMENTS',
        'PREFERENCES',
        'DETAILED_INTAKE',
        'MATCHMAKING',
      ];
      const idx = stepOrder.indexOf(current.step);
      if (idx > 0) {
        next = { ...DEFAULT_STATE, step: stepOrder[idx - 1] };
      } else {
        next = { ...DEFAULT_STATE, step: null, tab: 'HOME' };
      }
    } else if (current.tab !== 'HOME') {
      next = { ...DEFAULT_STATE, tab: 'HOME' };
    }

    const hash = stateToHash(next);
    try {
      window.history.replaceState(next, '', hash);
    } catch {
      // Fallback
    }
    setNavState(next);
  }, []);

  // Convenience state setters
  const setOnboardingStep = useCallback(
    (step: MobileOnboardingStep | null) => {
      updateNavState({
        step,
        // Reset sub-modals when changing onboarding step
        auth: false,
        authStep: 'PHONE',
        sos: false,
        edit: null,
        del: false,
      });
    },
    [updateNavState]
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
    [updateNavState]
  );

  const setIsAuthOpen = useCallback(
    (auth: boolean, authStep: AuthSubStep = 'PHONE') => {
      updateNavState({ auth, authStep });
    },
    [updateNavState]
  );

  const setAuthStep = useCallback(
    (authStep: AuthSubStep) => {
      updateNavState({ auth: true, authStep });
    },
    [updateNavState]
  );

  const setIsSosOpen = useCallback(
    (sos: boolean) => {
      if (!sos && stateRef.current.sos && window.history.length > 1) {
        window.history.back();
      } else {
        updateNavState({ sos });
      }
    },
    [updateNavState]
  );

  const setEditingSection = useCallback(
    (edit: EditableSection | null) => {
      if (!edit && stateRef.current.edit && window.history.length > 1) {
        window.history.back();
      } else {
        updateNavState({ edit });
      }
    },
    [updateNavState]
  );

  const setIsDeleteModalOpen = useCallback(
    (del: boolean) => {
      if (!del && stateRef.current.del && window.history.length > 1) {
        window.history.back();
      } else {
        updateNavState({ del });
      }
    },
    [updateNavState]
  );

  const setActiveMoreModal = useCallback(
    (more: MoreModalType) => {
      if (!more && stateRef.current.more && window.history.length > 1) {
        window.history.back();
      } else {
        updateNavState({ more });
      }
    },
    [updateNavState]
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
