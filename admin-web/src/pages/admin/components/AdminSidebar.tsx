import React from 'react';
import {
  Users,
  UserCheck,
  Stethoscope,
  MapPin,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Sliders,
  Clock,
  BarChart3,
  Building2,
  CreditCard,
} from 'lucide-react';
import type { AdminTab } from '../types';

interface AdminSidebarProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  openSosCount: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  className?: string;
}

interface NavSection {
  title: string;
  items: Array<{
    id: AdminTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeColor?: string;
  }>;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onSelectTab,
  openSosCount,
  isCollapsed,
  onToggleCollapse,
  className,
}) => {
  const navSections: NavSection[] = [
    {
      title: 'DAILY OPERATIONS',
      items: [
        {
          id: 'MAP',
          label: 'Live Map & Corridors',
          icon: MapPin,
        },
        {
          id: 'SOS',
          label: 'Emergency SOS Desk',
          icon: AlertTriangle,
          badge: openSosCount,
          badgeColor: openSosCount > 0 ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-700 text-slate-300',
        },
        {
          id: 'ELDERS',
          label: 'Careseekers & Families',
          icon: Users,
        },
        {
          id: 'CAREGIVERS',
          label: 'Caregiver Roster',
          icon: UserCheck,
        },
        {
          id: 'ATTENDANCE',
          label: 'Shift Attendance & Tasks',
          icon: Clock,
        },
        {
          id: 'HOSPITALS',
          label: 'Hospital Catalog & ER',
          icon: Building2,
        },
      ],
    },
    {
      title: 'BUSINESS & INTELLIGENCE',
      items: [
        {
          id: 'SERVICES_PRICING',
          label: 'Services Catalog',
          icon: Stethoscope,
        },
        {
          id: 'PAYOUTS',
          label: 'Attendant Payout History',
          icon: CreditCard,
        },
        {
          id: 'REPORTS',
          label: 'Operations Reports',
          icon: BarChart3,
        },
      ],
    },
    {
      title: 'SYSTEM & ACCESS',
      items: [
        {
          id: 'SETTINGS',
          label: 'Platform Settings',
          icon: Sliders,
        },
      ],
    },
  ];

  const isItemActive = (id: AdminTab) => {
    if (activeTab === id) return true;
    if (id === 'SERVICES_PRICING' && (activeTab === 'SERVICES' || activeTab === 'PRICING' || activeTab === 'CARE_PLANS')) {
      return true;
    }
    if (id === 'SETTINGS' && activeTab === 'SETTINGS_ACCESS') {
      return true;
    }
    return false;
  };

  return (
    <aside
      className={`h-full flex-shrink-0 flex flex-col bg-slate-900 border-r border-slate-800 text-slate-300 transition-all duration-300 ease-in-out select-none ${
        isCollapsed ? 'w-20' : 'w-64'
      } ${className || ''}`}
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
                  HQ
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Toggle Collapse */}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition shrink-0 ml-1 cursor-pointer"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 py-3 px-3 space-y-4 overflow-y-auto">
        {navSections.map((section, sIdx) => (
          <div key={section.title} className={sIdx > 0 ? 'pt-2' : ''}>
            {!isCollapsed ? (
              <div className="px-3 pb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                {section.title}
              </div>
            ) : (
              sIdx > 0 && <div className="my-2 border-t border-slate-800 mx-2" />
            )}

            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item.id);

                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all cursor-pointer relative ${
                      active
                        ? 'bg-teal-600 text-white font-semibold shadow-sm shadow-teal-900/40'
                        : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
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
            </div>
          </div>
        ))}
      </nav>

      {/* Footer / System Status */}
      <div className="p-3 border-t border-slate-800">
        {!isCollapsed ? (
          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              <span>Operations Active</span>
            </span>
            <span className="font-mono text-slate-400">v2.8</span>
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
