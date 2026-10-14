import React from 'react';
import {
  Users,
  MapPin,
  AlertTriangle,
  ShieldCheck,
  Activity,
  TrendingUp,
  ChevronRight,
  Radio,
} from 'lucide-react';
import type {
  AdminTab,
  AdminElderItem,
  AdminCaregiverItem,
  AdminSosAlert,
  AdminMetrics,
} from '../types';
import { serviceableCorridors } from '../mockData';

interface AdminOverviewViewProps {
  metrics: AdminMetrics;
  elders: AdminElderItem[];
  caregivers: AdminCaregiverItem[];
  alerts: AdminSosAlert[];
  onNavigateTab: (tab: AdminTab) => void;
  onSelectElder: (elder: AdminElderItem) => void;
}

export const AdminOverviewView: React.FC<AdminOverviewViewProps> = ({
  metrics,
  elders,
  caregivers,
  alerts,
  onNavigateTab,
  onSelectElder,
}) => {
  const openAlerts = alerts.filter((a) => a.status === 'OPEN' || a.status === 'DISPATCHED');
  const bufferCaregivers = caregivers.filter((c) => c.isBufferPool && c.status === 'AVAILABLE');

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 border border-teal-800/40 p-6 md:p-8 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/40 text-teal-300 text-xs font-bold uppercase tracking-wider mb-3 shadow-xs">
            <Radio className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
            <span>Chennai Operations Command Center</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-heading font-black tracking-tight text-white drop-shadow-xs">
            Elder Care Operations Overview
          </h2>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigateTab('MAP')}
              className="px-4 py-2 bg-white text-teal-900 hover:bg-teal-50 text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5 active:scale-95"
            >
              <MapPin className="w-3.5 h-3.5 text-teal-700" />
              <span>Launch Live Geographic Map</span>
            </button>
            <button
              onClick={() => onNavigateTab('SOS')}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5 active:scale-95"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{openAlerts.length} Active SOS Alerts</span>
            </button>
          </div>
        </div>

        {/* Subtle decorative background glow */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-teal-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Registered Elders */}
        <div
          onClick={() => onNavigateTab('ELDERS')}
          className="cursor-pointer group p-5 bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-md hover:border-teal-300 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Careseekers
            </span>
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 group-hover:bg-teal-600 group-hover:text-white transition-colors flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-heading font-black text-slate-900">
              {metrics.totalElders}
            </span>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
              <TrendingUp className="w-3.5 h-3.5" />
              +100% active
            </span>
          </div>
        </div>

        {/* Card 2: Active Care Shifts */}
        <div
          onClick={() => onNavigateTab('CAREGIVERS')}
          className="cursor-pointer group p-5 bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-md hover:border-teal-300 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Live Shifts
            </span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-heading font-black text-slate-900">
              {metrics.activeCareShifts}
            </span>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Checked-in
            </span>
          </div>
        </div>

        {/* Card 3: Serviceable Locations */}
        <div
          onClick={() => onNavigateTab('MAP')}
          className="cursor-pointer group p-5 bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-md hover:border-teal-300 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Corridor Coverage
            </span>
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-700 group-hover:bg-sky-600 group-hover:text-white transition-colors flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-heading font-black text-slate-900">
              {metrics.serviceableCorridors}
            </span>
            <span className="text-xs font-bold text-teal-700">Corridors Live</span>
          </div>
        </div>

        {/* Card 4: Open SOS Alerts */}
        <div
          onClick={() => onNavigateTab('SOS')}
          className={`cursor-pointer group p-5 rounded-3xl border shadow-xs transition-all ${
            metrics.openSosTickets > 0
              ? 'bg-rose-50/50 border-rose-200 hover:border-rose-400'
              : 'bg-white border-slate-200 hover:border-teal-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Emergency SOS
            </span>
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${
                metrics.openSosTickets > 0
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 text-slate-600 group-hover:bg-slate-800 group-hover:text-white'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-3xl font-heading font-black ${
                metrics.openSosTickets > 0 ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              {metrics.openSosTickets}
            </span>
            <span
              className={`text-xs font-bold ${
                metrics.openSosTickets > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-500'
              }`}
            >
              {metrics.openSosTickets > 0 ? 'Action Required' : 'All Clear'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Urgent Attention + Live Corridor Ticker */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Elders Ticker & Quick Management */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-extrabold text-base text-slate-900">
                  Active Careseeker Profiles
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('ELDERS')}
                className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
              >
                <span>View All Directory</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              {elders.slice(0, 4).map((elder) => (
                <div
                  key={elder.id}
                  onClick={() => onSelectElder(elder)}
                  className="cursor-pointer p-4 rounded-2xl bg-slate-50 hover:bg-teal-50/50 border border-slate-200/80 hover:border-teal-200 transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-700 text-white font-bold text-sm flex items-center justify-center">
                      {elder.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900">
                          {elder.name}
                        </span>
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            elder.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {elder.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {elder.locality} • Caregiver: <span className="font-semibold text-slate-700">{elder.assignedCaregiverName || 'Unassigned'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-teal-800 bg-teal-100/80 px-2.5 py-1 rounded-xl">
                      {elder.shiftPreference.replace(/_/g, ' ')}
                    </span>
                    {elder.lastVitals && (
                      <span className="block text-[10px] text-slate-400 mt-1 font-mono">
                        BP: {elder.lastVitals.bp}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Service Corridors Status Table */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-extrabold text-base text-slate-900">
                  Chennai Corridor Coverage Status
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('MAP')}
                className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
              >
                <span>View on Map</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {serviceableCorridors.map((c, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{c.name}</span>
                      <span className="text-[10px] font-mono text-teal-700 font-bold">{c.pin}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {c.activeElders} Elders • {c.attendants} Attendants
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px]">
                    <span className="font-bold text-emerald-700">{c.status}</span>
                    <span className="text-slate-400">100% Geofenced</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Live SOS Alerts & Emergency Ticker */}
        <div className="space-y-4">
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <h3 className="font-heading font-extrabold text-base text-slate-900">
                  Emergency Desk
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('SOS')}
                className="text-xs font-bold text-rose-600 hover:text-rose-800"
              >
                Manage
              </button>
            </div>

            {alerts.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <span>No active emergency alerts</span>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      alert.status === 'OPEN'
                        ? 'bg-rose-50/70 border-rose-300'
                        : 'bg-amber-50/70 border-amber-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                          alert.status === 'OPEN'
                            ? 'bg-rose-600 text-white'
                            : 'bg-amber-600 text-white'
                        }`}
                      >
                        {alert.priority} • {alert.status}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {alert.triggeredAt}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-slate-900 mt-2">{alert.title}</h4>
                    <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                      {alert.description}
                    </p>

                    <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{alert.elderName}</span>
                      <button
                        onClick={() => onNavigateTab('SOS')}
                        className="text-xs font-bold text-rose-700 hover:underline"
                      >
                        Respond &rarr;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Standby Reserve Attendants Card */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-heading font-extrabold text-sm text-slate-900">
                Standby Reserve Pool
              </span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                {bufferCaregivers.length} Available
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('CAREGIVERS')}
              className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              View Standby Reserve Roster
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
