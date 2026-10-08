import React from 'react';
import { Calendar, CheckSquare, HeartPulse, User, HelpCircle, CircleUser } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export type CaregiverTab = 'today' | 'tasks' | 'logs' | 'elder' | 'profile' | 'support';

interface CaregiverBottomNavProps {
  currentTab: CaregiverTab;
  onSelectTab: (tab: CaregiverTab) => void;
  pendingTasksCount?: number;
  pendingSyncCount?: number;
}

export const CaregiverBottomNav: React.FC<CaregiverBottomNavProps> = ({
  currentTab,
  onSelectTab,
  pendingTasksCount = 0,
  pendingSyncCount = 0,
}) => {
  const { t } = useLanguage();

  const tabs: { id: CaregiverTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'today',
      label: t('tabToday'),
      icon: <Calendar className="w-5 h-5" />,
    },
    {
      id: 'tasks',
      label: t('tabTasks'),
      icon: <CheckSquare className="w-5 h-5" />,
      badge: pendingTasksCount > 0 ? pendingTasksCount : undefined,
    },
    {
      id: 'logs',
      label: t('tabLogs'),
      icon: <HeartPulse className="w-5 h-5" />,
    },
    {
      id: 'elder',
      label: t('tabElder'),
      icon: <User className="w-5 h-5" />,
    },
    {
      id: 'profile',
      label: t('tabProfile'),
      icon: <CircleUser className="w-5 h-5" />,
    },
    {
      id: 'support',
      label: t('tabSupport'),
      icon: <HelpCircle className="w-5 h-5" />,
      badge: pendingSyncCount > 0 ? pendingSyncCount : undefined,
    },
  ];

  return (
    <nav 
      aria-label="Caregiver navigation tabs"
      role="tablist"
      className="fixed bottom-0 inset-x-0 z-40 bg-white/98 backdrop-blur-md border-t border-slate-200/90 shadow-lg pb-safe"
    >
      <div className="max-w-md mx-auto grid grid-cols-6 h-16 px-0.5 sm:px-1">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-label={`${tab.label}${tab.badge ? ` (${tab.badge} pending)` : ''}`}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center relative min-h-[52px] w-full min-w-0 px-0.5 touch-action-manipulation transition-all focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary ${
                isActive ? 'text-primary font-bold' : 'text-slate-500 hover:text-slate-700 font-medium'
              }`}
            >
              <div className="relative">
                <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-teal-50 text-primary scale-105' : 'text-slate-500'}`}>
                  {tab.icon}
                </div>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span 
                    aria-hidden="true"
                    className="absolute -top-1 -right-2 px-1.5 py-0.2 bg-amber-500 text-white text-[9px] font-bold rounded-full min-w-[15px] text-center shadow-xs"
                  >
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] leading-tight tracking-tight mt-0.5 truncate max-w-full px-0.5 text-center">
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute top-0 inset-x-2 sm:inset-x-3 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
