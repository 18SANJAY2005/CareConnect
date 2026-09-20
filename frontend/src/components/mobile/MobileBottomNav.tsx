import React from 'react';
import {
  Home,
  Heart,
  Activity,
  MessageSquare,
  Menu,
  Clock,
  CheckSquare,
  User,
  ClipboardList,
  LayoutDashboard,
  FileText,
  Users,
  AlertTriangle,
} from 'lucide-react';

export type FamilyTab = 'HOME' | 'MY_CARE' | 'UPDATES' | 'MESSAGES' | 'MORE';
export type CaregiverTab = 'TODAY' | 'TASKS' | 'ELDER' | 'LOGS' | 'MESSAGES';
export type OperationsTab = 'DASHBOARD' | 'CASES' | 'MATCHING' | 'ACTIVE_CARE' | 'ALERTS';

interface MobileBottomNavProps {
  portal: 'FAMILY' | 'CAREGIVER' | 'OPERATIONS';
  activeTab: string;
  onTabChange: (tab: string) => void;
  unreadCount?: number;
  alertCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  portal,
  activeTab,
  onTabChange,
  unreadCount = 0,
  alertCount = 0,
}) => {
  const familyTabs = [
    { id: 'HOME', label: 'Home', icon: Home },
    { id: 'MY_CARE', label: 'My Care', icon: Heart },
    { id: 'UPDATES', label: 'Updates', icon: Activity },
    { id: 'MESSAGES', label: 'Messages', icon: MessageSquare, badge: unreadCount },
    { id: 'MORE', label: 'More', icon: Menu },
  ];

  const caregiverTabs = [
    { id: 'TODAY', label: 'Today', icon: Clock },
    { id: 'TASKS', label: 'Tasks', icon: CheckSquare },
    { id: 'ELDER', label: 'Elder', icon: User },
    { id: 'LOGS', label: 'Logs', icon: ClipboardList },
    { id: 'MESSAGES', label: 'Messages', icon: MessageSquare, badge: unreadCount },
  ];

  const opsTabs = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'CASES', label: 'Cases', icon: FileText },
    { id: 'MATCHING', label: 'Matching', icon: Users },
    { id: 'ACTIVE_CARE', label: 'Active Care', icon: Activity },
    { id: 'ALERTS', label: 'Alerts', icon: AlertTriangle, badge: alertCount },
  ];

  const tabs =
    portal === 'FAMILY' ? familyTabs : portal === 'CAREGIVER' ? caregiverTabs : opsTabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 safe-bottom">
      <div className="max-w-[440px] mx-auto h-16 flex items-center justify-around px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 relative min-h-[48px] rounded-xl transition ${
                isActive ? 'text-primary font-bold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span className="absolute -top-1 -right-2 bg-rose-600 text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-1 tracking-tight ${isActive ? 'font-extrabold text-primary' : 'font-medium'}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

