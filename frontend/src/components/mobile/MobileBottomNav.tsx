import React from "react";
import {
  Home,
  Heart,
  Activity,
  MessageSquare,
  Clock,
  CheckSquare,
  User,
  ClipboardList,
  LayoutDashboard,
  FileText,
  Users,
  AlertTriangle,
  CreditCard,
} from "lucide-react";

export type FamilyTab = "HOME" | "MY_CARE" | "UPDATES" | "PAYMENT" | "PROFILE";
export type CaregiverTab = "TODAY" | "TASKS" | "ELDER" | "LOGS" | "MESSAGES";
export type OperationsTab =
  "DASHBOARD" | "CASES" | "MATCHING" | "ACTIVE_CARE" | "ALERTS";

interface NavTabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface MobileBottomNavProps {
  portal: "FAMILY" | "CAREGIVER" | "OPERATIONS";
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
  const familyTabs: NavTabItem[] = [
    { id: "HOME", label: "Home", icon: Home },
    { id: "MY_CARE", label: "My Care", icon: Heart },
    { id: "UPDATES", label: "Updates", icon: Activity },
    { id: "PAYMENT", label: "Payment", icon: CreditCard },
    { id: "PROFILE", label: "Profile", icon: User },
  ];

  const caregiverTabs = [
    { id: "TODAY", label: "Today", icon: Clock },
    { id: "TASKS", label: "Tasks", icon: CheckSquare },
    { id: "ELDER", label: "Elder", icon: User },
    { id: "LOGS", label: "Logs", icon: ClipboardList },
    { id: "MESSAGES", label: "Chat", icon: MessageSquare, badge: unreadCount },
  ];

  const opsTabs = [
    { id: "DASHBOARD", label: "Dashboard", icon: LayoutDashboard },
    { id: "CASES", label: "Cases", icon: FileText },
    { id: "MATCHING", label: "Matching", icon: Users },
    { id: "ACTIVE_CARE", label: "Active Care", icon: Activity },
    { id: "ALERTS", label: "Alerts", icon: AlertTriangle, badge: alertCount },
  ];

  const tabs =
    portal === "FAMILY"
      ? familyTabs
      : portal === "CAREGIVER"
        ? caregiverTabs
        : opsTabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 safe-bottom shadow-[0_-8px_30px_rgba(15,23,42,0.08)]">
      <div className="max-w-[440px] mx-auto h-[68px] sm:h-[74px] flex items-center justify-around px-1 sm:px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`group relative flex h-[52px] sm:h-[58px] flex-1 flex-col items-center justify-center rounded-xl sm:rounded-2xl min-w-0 transition-all duration-200 active:scale-95 ${
                isActive
                  ? "bg-teal-50 text-primary shadow-sm"
                  : "text-slate-400 hover:bg-slate-50 hover:text-teal-700"
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`h-4.5 w-4.5 sm:h-5 sm:w-5 transition-all duration-200 ${
                    isActive
                      ? "scale-110 stroke-[2.3] text-primary"
                      : "stroke-[1.8]"
                  }`}
                />
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span className="absolute -top-1 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-black text-white shadow-sm">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span
                className={`mt-0.5 sm:mt-1 text-[9px] sm:text-[10px] font-bold tracking-tight truncate max-w-full px-0.5 ${
                  isActive ? "text-primary" : "text-slate-500"
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 h-1 sm:bottom-1.5 sm:h-1.5 w-1 sm:w-1.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
