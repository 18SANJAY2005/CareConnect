import {
  LayoutDashboard,
  Users,
  UserCheck,
  ClipboardList,
  MapPin,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import type { AdminTab } from '../types';

interface AdminSidebarProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  openSosCount: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onSelectTab,
  openSosCount,
  isCollapsed,
  onToggleCollapse,
}) => {
  const navItems: Array<{
    id: AdminTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeColor?: string;
  }> = [
    {
      id: 'OVERVIEW',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'ELDERS',
      label: 'Elders & Families',
      icon: Users,
    },
    {
      id: 'CAREGIVERS',
      label: 'Caregivers Roster',
      icon: UserCheck,
    },
    {
      id: 'CARE_PLANS',
      label: 'Care Plans',
      icon: ClipboardList,
    },
    {
      id: 'MAP',
      label: 'Serviceability & Map',
      icon: MapPin,
    },
    {
      id: 'SOS',
      label: 'SOS Alerts',
      icon: AlertTriangle,
      badge: openSosCount,
      badgeColor: openSosCount > 0 ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-200 text-slate-700',
    },
  ];

  return (
    <aside
      className={`fixed top-0 bottom-0 left-0 z-30 flex flex-col bg-slate-900 border-r border-slate-800 text-slate-300 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-3.5 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0 overflow-hidden shrink-0">
          <div className="w-9 h-9 rounded-xl bg-teal-600/20 border border-teal-500/40 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-teal-400" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex flex-col justify-center">
              <span className="font-heading font-extrabold text-sm text-white tracking-tight flex items-center gap-1.5 whitespace-nowrap">
                CareConnect
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Admin
                </span>
              </span>
              <p className="text-[10px] text-slate-400 truncate font-medium">Central Operations</p>
            </div>
          )}
        </div>

        {/* Toggle Collapse */}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition shrink-0 ml-1"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {!isCollapsed && (
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Main Operations
          </div>
        )}
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all ${
                isActive
                  ? 'bg-teal-600 text-white font-semibold shadow-sm shadow-teal-900/40'
                  : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {!isCollapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
              {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    item.badgeColor || 'bg-slate-700 text-white'
                  }`}
                >
                  {item.badge}
                </span>
              )}
              {isCollapsed && item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Corridor Coverage Quick Card */}
      {!isCollapsed && (
        <div className="mx-3 my-2 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-[11px]">
          <div className="flex items-center gap-2 text-teal-400 font-bold mb-1">
            <Building2 className="w-3.5 h-3.5" />
            <span>Chennai Corridors</span>
          </div>
          <p className="text-slate-400 text-[10px] leading-relaxed">
            6 zones live (Adyar, Besant Nagar, T. Nagar, Anna Nagar, Mylapore, Velachery).
          </p>
        </div>
      )}

      {/* Footer / System Status */}
      <div className="p-3 border-t border-slate-800">
        {!isCollapsed ? (
          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              <span>Operations Active</span>
            </span>
            <span className="font-mono text-slate-400">v2.4</span>
          </div>
        ) : (
          <div className="flex justify-center" title="Operations Active">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
          </div>
        )}
      </div>
    </aside>
  );
};
