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

export interface PwaNavState {
  tab: FamilyTab;
  step: MobileOnboardingStep | null;
  auth: boolean;
  sos: boolean;
  edit: EditableSection | null;
  del: boolean;
  more: MoreModalType;
}

const DEFAULT_STATE: PwaNavState = {
  tab: 'HOME',
  step: null,
  auth: false,
  sos: false,
  edit: null,
  del: false,
  more: null,
};

function stateToHash(state: PwaNavState): string {
  if (state.sos) return '#sos';
  if (state.auth) return '#auth';
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
  if (!clean || clean === 'home') return { tab: 'HOME', step: null };
  if (clean === 'sos') return { sos: true };
  if (clean === 'auth') return { auth: true };

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
      return { step: stepPart as MobileOnboardingStep };
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

  return { tab: 'HOME', step: null };
}

function areStatesEqual(a: PwaNavState, b: PwaNavState): boolean {
  return (
    a.tab === b.tab &&
    a.step === b.step &&
    a.auth === b.auth &&
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

  // References to prevent popstate loops and track history stack depth
  const isPopStateRef = useRef(false);
  const stateRef = useRef<PwaNavState>(navState);
  stateRef.current = navState;

  // Track if we have pushed states in this window session
  const historyDepthRef = useRef(0);

  // Synchronize on mount with replaceState
  useEffect(() => {
    const initial = getInitialState();
    const hash = stateToHash(initial);
    try {
      window.history.replaceState(initial, '', hash);
    } catch {
      // Ignore security errors in strict sandbox environments
    }

    const handlePopState = (event: PopStateEvent) => {
      isPopStateRef.current = true;

      let nextState: PwaNavState = DEFAULT_STATE;
      if (event.state && typeof event.state === 'object' && 'tab' in event.state) {
        nextState = { ...DEFAULT_STATE, ...event.state };
      } else {
        const fromHash = hashToState(window.location.hash);
        nextState = { ...DEFAULT_STATE, ...fromHash };
      }

      if (historyDepthRef.current > 0) {
        historyDepthRef.current -= 1;
      }

      setNavState(nextState);

      // Reset popstate flag after React completes render cycle
      setTimeout(() => {
        isPopStateRef.current = false;
      }, 50);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
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
            historyDepthRef.current += 1;
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
  const goBack = useCallback((fallback?: () => void) => {
    if (historyDepthRef.current > 0) {
      window.history.back();
    } else if (fallback) {
      fallback();
    } else {
      // Intelligent fallback based on current state
      const current = stateRef.current;
      if (current.edit) {
        updateNavState({ edit: null });
      } else if (current.del) {
        updateNavState({ del: false });
      } else if (current.more) {
        updateNavState({ more: null });
      } else if (current.sos) {
        updateNavState({ sos: false });
      } else if (current.auth) {
        updateNavState({ auth: false });
      } else if (current.step) {
        // Step back in onboarding
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
          updateNavState({ step: stepOrder[idx - 1] });
        } else {
          updateNavState({ step: null });
        }
      } else if (current.tab !== 'HOME') {
        updateNavState({ tab: 'HOME' });
      }
    }
  }, [updateNavState]);

  // Convenience state setters
  const setOnboardingStep = useCallback(
    (step: MobileOnboardingStep | null) => {
      updateNavState({
        step,
        // Reset sub-modals when changing onboarding step
        auth: false,
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
    (auth: boolean) => {
      if (!auth && stateRef.current.auth && historyDepthRef.current > 0) {
        window.history.back();
      } else {
        updateNavState({ auth });
      }
    },
    [updateNavState]
  );

  const setIsSosOpen = useCallback(
    (sos: boolean) => {
      if (!sos && stateRef.current.sos && historyDepthRef.current > 0) {
        window.history.back();
      } else {
        updateNavState({ sos });
      }
    },
    [updateNavState]
  );

  const setEditingSection = useCallback(
    (edit: EditableSection | null) => {
      if (!edit && stateRef.current.edit && historyDepthRef.current > 0) {
        window.history.back();
      } else {
        updateNavState({ edit });
      }
    },
    [updateNavState]
  );

  const setIsDeleteModalOpen = useCallback(
    (del: boolean) => {
      if (!del && stateRef.current.del && historyDepthRef.current > 0) {
        window.history.back();
      } else {
        updateNavState({ del });
      }
    },
    [updateNavState]
  );

  const setActiveMoreModal = useCallback(
    (more: MoreModalType) => {
      if (!more && stateRef.current.more && historyDepthRef.current > 0) {
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
    isSosOpen: navState.sos,
    editingSection: navState.edit,
    isDeleteModalOpen: navState.del,
    activeMoreModal: navState.more,
    setOnboardingStep,
    setActiveFamilyTab,
    setIsAuthOpen,
    setIsSosOpen,
    setEditingSection,
    setIsDeleteModalOpen,
    setActiveMoreModal,
    goBack,
  };
}
