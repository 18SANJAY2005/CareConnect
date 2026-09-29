import React, { useState, useEffect } from 'react';
import { CaregiverAuthProvider, useCaregiverAuth } from './context/CaregiverAuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { CaregiverLogin } from './components/auth/CaregiverLogin';
import { CaregiverHeader } from './components/layout/CaregiverHeader';
import { CaregiverBottomNav, CaregiverTab } from './components/layout/CaregiverBottomNav';
import { TodayScreen } from './components/today/TodayScreen';
import { TasksScreen } from './components/tasks/TasksScreen';
import { VitalsAndLogsScreen } from './components/logs/VitalsAndLogsScreen';
import { ElderProfileScreen } from './components/elder/ElderProfileScreen';
import { SupportScreen } from './components/support/SupportScreen';
import { caregiverApi } from './services/api';
import { offlineQueue } from './services/offlineQueue';
import type { ShiftDetails, OfflineQueueItem } from './types';
import { RefreshCw } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, isLoading } = useCaregiverAuth();
  const [currentTab, setCurrentTab] = useState<CaregiverTab>('today');
  const [shiftDetails, setShiftDetails] = useState<ShiftDetails | null>(null);
  const [loadingShift, setLoadingShift] = useState<boolean>(true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  const fetchShift = async () => {
    if (!user) return;
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
    if (user) {
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

  const isOnDuty =
    shiftDetails?.shift?.status === 'ACTIVE' || shiftDetails?.shift?.status === 'CHECKED_IN';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800">
      <CaregiverHeader isOnDuty={isOnDuty} />

      <main className="flex-1 w-full">
        {currentTab === 'today' && (
          <TodayScreen
            shiftDetails={shiftDetails}
            loading={loadingShift}
            onRefresh={fetchShift}
            onNavigateToTasks={() => setCurrentTab('tasks')}
            onNavigateToLogs={() => setCurrentTab('logs')}
          />
        )}

        {currentTab === 'tasks' && <TasksScreen shiftDetails={shiftDetails} />}

        {currentTab === 'logs' && <VitalsAndLogsScreen shiftDetails={shiftDetails} />}

        {currentTab === 'elder' && <ElderProfileScreen shiftDetails={shiftDetails} />}

        {currentTab === 'support' && <SupportScreen />}
      </main>

      <CaregiverBottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
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
