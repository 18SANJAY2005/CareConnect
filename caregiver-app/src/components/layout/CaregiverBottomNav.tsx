import React from 'react';
import { Calendar, CalendarDays, IndianRupee } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export type CaregiverTab = 'today' | 'schedule' | 'payout' | 'profile' | 'tasks' | 'logs';

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
}) => {
  const { t } = useLanguage();

  const tabs: { id: CaregiverTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'today',
      label: 'Today',
      icon: <Calendar className="w-5 h-5" />,
      badge: pendingTasksCount > 0 ? pendingTasksCount : undefined,
    },
    {
      id: 'schedule',
      label: 'Schedule',
      icon: <CalendarDays className="w-5 h-5" />,
    },
    {
      id: 'payout',
      label: 'Payout',
      icon: <IndianRupee className="w-5 h-5" />,
    },
  ];

  return (
    <nav 
      aria-label="Caregiver navigation tabs"
      role="tablist"
      className="fixed bottom-0 inset-x-0 z-40 bg-white/98 backdrop-blur-md border-t border-slate-200/90 shadow-lg pb-safe"
    >
      <div className="max-w-md mx-auto grid grid-cols-3 h-16 px-2">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              id={`nav-tab-${tab.id}`}
              aria-selected={isActive}
              aria-label={`${tab.label}${tab.badge ? ` (${tab.badge} pending)` : ''}`}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center relative min-h-[52px] w-full min-w-0 px-1 touch-action-manipulation transition-all focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary cursor-pointer ${
                isActive ? 'text-primary font-black' : 'text-slate-500 hover:text-slate-700 font-semibold'
              }`}
            >
              <div className="relative">
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-teal-50 text-primary scale-110 shadow-2xs' : 'text-slate-500'}`}>
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
              <span className="text-[11px] leading-tight tracking-tight mt-0.5 truncate max-w-full text-center">
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute top-0 inset-x-4 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
