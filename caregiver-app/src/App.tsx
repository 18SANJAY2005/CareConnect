import React, { useState, useEffect } from 'react';
import { CaregiverAuthProvider, useCaregiverAuth } from './context/CaregiverAuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { CaregiverLogin } from './components/auth/CaregiverLogin';
import { CaregiverBasicInfo } from './components/auth/CaregiverBasicInfo';
import { CaregiverHeader } from './components/layout/CaregiverHeader';
import { CaregiverBottomNav } from './components/layout/CaregiverBottomNav';
import { TodayScreen } from './components/today/TodayScreen';
import { TasksScreen } from './components/tasks/TasksScreen';
import { VitalsAndLogsScreen } from './components/logs/VitalsAndLogsScreen';
import { ElderProfileScreen } from './components/elder/ElderProfileScreen';
import { ScheduleScreen } from './components/schedule/ScheduleScreen';
import { PayoutScreen } from './components/payout/PayoutScreen';
import { CaregiverProfileScreen } from './components/profile/CaregiverProfileScreen';
import { SupportScreen } from './components/support/SupportScreen';
import { useCaregiverNavigation } from './hooks/useCaregiverNavigation';
import { caregiverApi } from './services/api';
import { offlineQueue } from './services/offlineQueue';
import type { ShiftDetails, OfflineQueueItem } from './types';
import { RefreshCw, ShieldAlert } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, isLoading } = useCaregiverAuth();
  const { currentTab, navigateTo, goBack } = useCaregiverNavigation();
  const [shiftDetails, setShiftDetails] = useState<ShiftDetails | null>(null);
  const [loadingShift, setLoadingShift] = useState<boolean>(true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isSosOpen, setIsSosOpen] = useState<boolean>(false);

  const fetchShift = async () => {
    if (!user || !user.isProfileComplete) return;
    setLoadingShift(true);
    try {
      const data = await caregiverApi.getCurrentShift();
      setShiftDetails(data);
    } catch (err) {
      console.error('Failed to load current shift:', err);
    } finally {
      setLoadingShift(false);
    }
  };

  useEffect(() => {
    if (user && user.isProfileComplete) {
      fetchShift();
    }
  }, [user]);

  useEffect(() => {
    const unsub = offlineQueue.subscribe((items: OfflineQueueItem[]) => {
      const count = items.filter((i) => i.status === 'PENDING' || i.status === 'FAILED').length;
      setPendingSyncCount(count);
    });
    return unsub;
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <RefreshCw className="w-10 h-10 animate-spin text-primary mb-3" />
        <p className="text-xs font-semibold text-slate-600">Loading CareConnect Portal...</p>
      </div>
    );
  }

  if (!user) {
    return <CaregiverLogin />;
  }

  if (!user.isProfileComplete) {
    return <CaregiverBasicInfo />;
  }

  const isOnDuty =
    shiftDetails?.shift?.status === 'ACTIVE' || shiftDetails?.shift?.status === 'CHECKED_IN';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800 relative">
      {/* Sticky SOS Header on EVERY Screen (Requirement 7 & 10) */}
      <CaregiverHeader
        isOnDuty={isOnDuty}
        shiftDetails={shiftDetails}
        onNavigateToProfile={() => navigateTo('profile')}
        onRefreshShift={fetchShift}
        isSosOpen={isSosOpen}
        setIsSosOpen={setIsSosOpen}
      />

      <main className="flex-1 w-full">
        {currentTab === 'today' && (
          <TodayScreen
            shiftDetails={shiftDetails}
            loading={loadingShift}
            onRefresh={fetchShift}
            onNavigateToTasks={() => navigateTo('tasks')}
            onNavigateToLogs={() => navigateTo('logs')}
            onNavigateToProfile={() => navigateTo('profile')}
          />
        )}

        {currentTab === 'schedule' && <ScheduleScreen onBack={goBack} />}

        {currentTab === 'payout' && <PayoutScreen onBack={goBack} />}

        {currentTab === 'profile' && <CaregiverProfileScreen onBack={goBack} />}

        {currentTab === 'tasks' && <TasksScreen shiftDetails={shiftDetails} onBack={goBack} />}

        {currentTab === 'logs' && <VitalsAndLogsScreen shiftDetails={shiftDetails} onBack={goBack} />}

        {currentTab === 'elder' && <ElderProfileScreen shiftDetails={shiftDetails} onBack={goBack} />}

        {currentTab === 'support' && <SupportScreen onBack={goBack} />}
      </main>

      {/* Persistent Floating Emergency SOS Action Button (Requirement 4: Visible and accessible on all screens above bottom nav) */}
      <button
        type="button"
        id="floating-emergency-sos-button"
        onClick={() => setIsSosOpen(true)}
        aria-label="Emergency SOS - Immediate assistance"
        className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-3.5 sm:right-6 z-40 flex items-center gap-1.5 px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs rounded-full shadow-xl border-2 border-white ring-2 ring-rose-500/50 animate-pulse hover:animate-none transition-all cursor-pointer touch-action-manipulation shrink-0"
        title="Trigger Emergency SOS"
      >
        <ShieldAlert className="w-4.5 h-4.5 text-white shrink-0" />
        <span className="tracking-wider">SOS</span>
      </button>

      {/* Overhauled 3-Tab Bottom Nav (Today, Schedule, Payout - Requirement 11) */}
      <CaregiverBottomNav
        currentTab={currentTab === 'schedule' || currentTab === 'payout' ? currentTab : 'today'}
        onSelectTab={(tab) => navigateTo(tab)}
        pendingSyncCount={pendingSyncCount}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <CaregiverAuthProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </CaregiverAuthProvider>
  );
};

export default App;
