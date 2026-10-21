import {
  Bell,
  RefreshCw,
  AlertTriangle,
  Radio,
  Shield,
  LogOut,
  MapPin,
} from 'lucide-react';
import type { AdminTab, AdminMetrics, OperatingSectorScope, OpsRole } from '../types';

interface AdminHeaderProps {
  activeTab: AdminTab;
  metrics: AdminMetrics;
  isRefreshing: boolean;
  onRefresh: () => void;
  onLogout: () => void;
  onNavigateTab: (tab: AdminTab) => void;
  activeSectorScope?: OperatingSectorScope;
  onSectorScopeChange?: (scope: OperatingSectorScope) => void;
  activeRole?: OpsRole;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  activeTab,
  metrics,
  isRefreshing,
  onRefresh,
  onLogout,
  onNavigateTab,
  activeSectorScope = 'ALL',
  onSectorScopeChange,
  activeRole = 'SUPER_ADMIN',
}) => {
  const getTabTitle = () => {
    switch (activeTab) {
      case 'OVERVIEW':
        return 'Operations Command Desk';
      case 'ELDERS':
        return 'Careseekers Directory';
      case 'CAREGIVERS':
        return 'Caregiver Network & Standby Reserve';
      case 'ATTENDANCE':
        return 'Shift Attendance & Task Monitoring';
      case 'PAYOUTS':
        return 'Attendant Payout History & Disbursals';
      case 'SERVICES_PRICING':
      case 'SERVICES':
      case 'PRICING':
      case 'CARE_PLANS':
        return 'Services Catalog';
      case 'REPORTS':
        return 'Operational & Clinical Reports';
      case 'MAP':
        return 'Corridor Serviceability & Live Map';
      case 'SOS':
        return 'Emergency SOS Incident Desk';
      case 'HOSPITALS':
        return 'Hospital & Emergency Facilities Catalog';
      case 'SETTINGS':
      case 'SETTINGS_ACCESS':
        return 'Access Control & Governance Settings';
      default:
        return 'Admin Portal';
    }
  };

  const getRoleDisplayName = (role: OpsRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Super Admin';
      case 'REGIONAL_SUPERVISOR':
        return 'Ops Supervisor';
      case 'CLINICAL_AUDITOR':
        return 'Clinical Auditor';
      case 'BILLING_SPECIALIST':
        return 'Billing Specialist';
    }
  };

  return (
    <header className="sticky top-0 z-20 h-16 w-full max-w-full bg-white/95 backdrop-blur border-b border-slate-200 px-3 md:px-6 flex items-center justify-between gap-2 md:gap-3 shadow-xs overflow-hidden shrink-0">
      {/* View Title & Breadcrumb */}
      <div className="flex items-center gap-2.5 min-w-0 shrink-0">
        <div className="min-w-0">
          <h1 className="text-sm md:text-base lg:text-lg font-heading font-extrabold text-slate-900 leading-tight truncate">
            {getTabTitle()}
          </h1>
        </div>
      </div>

      {/* Center: Geographic Location Scoping Selector */}
      {onSectorScopeChange && (
        <div className="hidden 2xl:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sector:</span>
          <select
            value={activeSectorScope}
            onChange={(e) => onSectorScopeChange(e.target.value as OperatingSectorScope)}
            className="bg-transparent font-bold text-slate-800 text-xs focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">All Chennai Sectors (Global)</option>
            <option value="SOUTH_CHENNAI">South Chennai Corridor (Adyar, Besant Nagar)</option>
            <option value="ANNA_NAGAR">Anna Nagar Central Zone</option>
            <option value="MYLAPORE">Mylapore Heritage Ward</option>
            <option value="ADYAR_BESANT">Adyar-Besant Nagar Sector</option>
            <option value="VELACHERY">Velachery Tech Corridor</option>
            <option value="T_NAGAR">T. Nagar Commercial Ward</option>
            <option value="OMR">OMR Expressway Sector</option>
          </select>
        </div>
      )}

      {/* Quick Operations Telemetry Badges */}
      <div className="hidden xl:flex items-center gap-2 shrink-0">
        {/* Active Shifts Indicator */}
        <button
          onClick={() => onNavigateTab('CAREGIVERS')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200/80 text-xs font-bold text-teal-800 hover:bg-teal-100/70 transition cursor-pointer"
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
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
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
              : 'SOS Desk Clear'}
          </span>
        </button>

        {/* Chennai Corridors Coverage */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600">
          <Radio className="w-3 h-3 text-emerald-600" />
          <span>{metrics.serviceableCorridors} Corridors</span>
        </div>
      </div>

      {/* Right Actions: Refresh, Notification, Admin Badge, Logout */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Refresh */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
          title="Refresh Telemetry Data"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-teal-600' : ''}`} />
        </button>

        {/* Notification Bell */}
        <button
          onClick={() => onNavigateTab('SOS')}
          className="relative p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
          title="Alerts and Notifications"
        >
          <Bell className="w-4 h-4" />
          {metrics.openSosTickets > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white shadow-xs">
              {metrics.openSosTickets}
            </span>
          )}
        </button>

        {/* Admin Profile & Role Badge */}
        <button
          onClick={() => onNavigateTab('SETTINGS_ACCESS')}
          className="flex items-center gap-2 pl-2 border-l border-slate-200 hover:bg-slate-50 p-1.5 rounded-xl transition cursor-pointer"
          title="Manage Role & Authorization Settings"
        >
          <div className="w-8 h-8 rounded-full bg-teal-700 text-white font-bold text-xs flex items-center justify-center shadow-xs">
            {activeRole === 'SUPER_ADMIN' ? 'SA' : activeRole === 'REGIONAL_SUPERVISOR' ? 'RS' : activeRole === 'CLINICAL_AUDITOR' ? 'CA' : 'BS'}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
              <span>{getRoleDisplayName(activeRole)}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="text-[10px] text-slate-400 font-medium">Chennai HQ</div>
          </div>
        </button>

        {/* Admin Logout */}
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200 text-xs font-bold text-slate-700 transition shadow-2xs cursor-pointer"
          title="Sign Out of Operations Console"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};
