import { useState, useEffect, useRef, useCallback } from 'react';
import type { CaregiverTab } from '../components/layout/CaregiverBottomNav';

export type NavScreen = CaregiverTab | 'elder' | 'support';

export interface CaregiverNavigation {
  currentTab: NavScreen;
  navigateTo: (screen: NavScreen, replace?: boolean) => void;
  goBack: () => void;
  canGoBack: boolean;
  isSecondaryScreen: boolean;
}

const TOP_LEVEL_TABS: NavScreen[] = ['today', 'schedule', 'payout'];

function hashToScreen(hash: string): NavScreen {
  const clean = hash.replace(/^#\/?/, '').toLowerCase().trim();
  if (clean === 'schedule') return 'schedule';
  if (clean === 'payout') return 'payout';
  if (clean === 'tasks') return 'tasks';
  if (clean === 'logs') return 'logs';
  if (clean === 'profile') return 'profile';
  if (clean === 'elder') return 'elder';
  if (clean === 'support') return 'support';
  return 'today';
}

export function useCaregiverNavigation(): CaregiverNavigation {
  const [currentTab, setCurrentTab] = useState<NavScreen>(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      return hashToScreen(window.location.hash);
    }
    return 'today';
  });

  // Track in-app history so direct links / notifications can safely fallback to 'today'
  const inAppHistoryRef = useRef<NavScreen[]>([currentTab]);
  const isPopStateRef = useRef<boolean>(false);

  // Initialize or arm URL hash
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initial = hashToScreen(window.location.hash);
    if (window.location.hash !== `#${initial}`) {
      window.history.replaceState({ screen: initial }, '', `#${initial}`);
    }
  }, []);

  // Handle popstate (Android back button, browser back/forward, native gesture swipes)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = (event: PopStateEvent) => {
      isPopStateRef.current = true;
      const targetScreen = event.state?.screen || hashToScreen(window.location.hash);

      if (inAppHistoryRef.current.length > 1) {
        inAppHistoryRef.current.pop();
      }

      setCurrentTab(targetScreen);

      // Re-enable normal push tracking after state updates
      setTimeout(() => {
        isPopStateRef.current = false;
      }, 50);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = useCallback((screen: NavScreen, replace: boolean = false) => {
    if (typeof window === 'undefined') return;

    if (screen === currentTab) return;

    if (replace) {
      window.history.replaceState({ screen }, '', `#${screen}`);
      if (inAppHistoryRef.current.length > 0) {
        inAppHistoryRef.current[inAppHistoryRef.current.length - 1] = screen;
      } else {
        inAppHistoryRef.current = [screen];
      }
    } else {
      window.history.pushState({ screen }, '', `#${screen}`);
      inAppHistoryRef.current.push(screen);
    }

    setCurrentTab(screen);
  }, [currentTab]);

  const goBack = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Check if we have valid in-app history to pop
    if (inAppHistoryRef.current.length > 1) {
      window.history.back();
    } else {
      // Direct link opened (e.g. from PWA link or notification): safely navigate to 'today'
      navigateTo('today', true);
    }
  }, [navigateTo]);

  const isSecondaryScreen = !TOP_LEVEL_TABS.includes(currentTab);
  const canGoBack = isSecondaryScreen || inAppHistoryRef.current.length > 1;

  return {
    currentTab,
    navigateTo,
    goBack,
    canGoBack,
    isSecondaryScreen,
  };
}
