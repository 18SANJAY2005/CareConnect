import {
  Bell,
  RefreshCw,
  AlertTriangle,
  Radio,
  Shield,
  LogOut,
  ArrowLeft,
} from 'lucide-react';
import type { AdminTab, AdminMetrics } from '../types';

interface AdminHeaderProps {
  activeTab: AdminTab;
  metrics: AdminMetrics;
  isRefreshing: boolean;
  onRefresh: () => void;
  onLogout: () => void;
  onNavigateTab: (tab: AdminTab) => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  activeTab,
  metrics,
  isRefreshing,
  onRefresh,
  onLogout,
  onNavigateTab,
}) => {
  const getTabTitle = () => {
    switch (activeTab) {
      case 'OVERVIEW':
        return 'Operations Dashboard';
      case 'ELDERS':
        return 'Elders & Family Directory';
      case 'CAREGIVERS':
        return 'Caregiver Network & Buffer Pool';
      case 'CARE_PLANS':
        return 'Care Plans & Daily Routines';
      case 'MAP':
        return 'Live Geographic Serviceability Map';
      case 'SOS':
        return 'Emergency SOS & Escalations';
      default:
        return 'Admin Portal';
    }
  };

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur border-b border-slate-200 px-4 md:px-6 flex items-center justify-between gap-3 shadow-xs">
      {/* View Title & Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0 shrink-0">
        {activeTab !== 'OVERVIEW' && (
          <button
            onClick={() => onNavigateTab('OVERVIEW')}
            className="p-2 rounded-xl bg-slate-100 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-slate-600 hover:text-teal-900 transition flex items-center justify-center shrink-0 group shadow-2xs"
            title="Back to Dashboard"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-teal-700 transition group-hover:-translate-x-0.5" />
          </button>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">
            {activeTab !== 'OVERVIEW' ? (
              <button
                onClick={() => onNavigateTab('OVERVIEW')}
                className="shrink-0 hover:text-teal-700 transition cursor-pointer"
              >
                CareConnect HQ
              </button>
            ) : (
              <span className="shrink-0">CareConnect HQ</span>
            )}
            <span>/</span>
            <span className="text-teal-700 font-extrabold truncate">{getTabTitle()}</span>
          </div>
          <h1 className="text-base md:text-lg font-heading font-extrabold text-slate-900 leading-tight truncate">
            {getTabTitle()}
          </h1>
        </div>
      </div>

      {/* Quick Operations Telemetry Badges */}
      <div className="hidden lg:flex items-center gap-2.5 shrink-0">
        {/* Active Shifts Indicator */}
        <button
          onClick={() => onNavigateTab('CAREGIVERS')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200/80 text-xs font-bold text-teal-800 hover:bg-teal-100/70 transition"
          title="View active shifts"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
          </span>
          <span>{metrics.activeCareShifts} Active Shifts</span>
        </button>

        {/* SOS Alert Indicator */}
        <button
          onClick={() => onNavigateTab('SOS')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition ${
            metrics.openSosTickets > 0
              ? 'bg-rose-50 border border-rose-300 text-rose-700 animate-pulse hover:bg-rose-100'
              : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200/70'
          }`}
          title="View SOS tickets"
        >
          {metrics.openSosTickets > 0 ? (
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          ) : (
            <Shield className="w-3.5 h-3.5 text-slate-500" />
          )}
          <span>
            {metrics.openSosTickets > 0
              ? `${metrics.openSosTickets} Open SOS Tickets`
              : 'SOS Desk All Clear'}
          </span>
        </button>

        {/* Chennai Corridors Coverage */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600">
          <Radio className="w-3 h-3 text-emerald-600" />
          <span>{metrics.serviceableCorridors} Corridors Monitored</span>
        </div>
      </div>

      {/* Right Actions: Refresh, Notification, Admin Badge, Logout */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Refresh */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition"
          title="Refresh Telemetry Data"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-teal-600' : ''}`} />
        </button>

        {/* Notification Bell */}
        <button
          onClick={() => onNavigateTab('SOS')}
          className="relative p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition"
          title="Alerts and Notifications"
        >
          <Bell className="w-4 h-4" />
          {metrics.openSosTickets > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white shadow-xs">
              {metrics.openSosTickets}
            </span>
          )}
        </button>

        {/* Admin Profile Badge */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-teal-700 text-white font-bold text-xs flex items-center justify-center shadow-xs">
            OP
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
              <span>Ops Admin</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="text-[10px] text-slate-400 font-medium">Chennai HQ</div>
          </div>
        </div>

        {/* Admin Logout */}
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200 text-xs font-bold text-slate-700 transition shadow-2xs"
          title="Sign Out of Operations Console"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};
