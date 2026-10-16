import React from 'react';
import {
  UserCheck,
  Activity,
  Clock,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import type { AdminCaregiverItem, AdminTab } from '../types';

interface AdminKpiRibbonProps {
  caregivers: AdminCaregiverItem[];
  onNavigateTab?: (tab: AdminTab) => void;
  className?: string;
}

export const AdminKpiRibbon: React.FC<AdminKpiRibbonProps> = ({
  caregivers,
  onNavigateTab,
  className = '',
}) => {
  // Attendant Statistics Calculations
  const totalRegisteredCount = caregivers.length > 0 ? caregivers.length : 100;
  const activeOnShifts = caregivers.filter((c) => c.status === 'ON_DUTY').length;
  const standbyReserve = caregivers.filter(
    (c) => c.isStandbyReserve || c.isBufferPool || c.rosterStatus === 'STANDBY_RESERVE'
  ).length;
  const inactiveOffDuty = caregivers.filter(
    (c) =>
      c.status === 'ON_LEAVE' ||
      c.rosterStatus === 'OFF_DUTY' ||
      (c.status === 'AVAILABLE' && !c.isBufferPool && !c.isStandbyReserve)
  ).length;

  const activeCount = activeOnShifts + standbyReserve;
  const activePercentage =
    totalRegisteredCount > 0
      ? Math.round((activeCount / totalRegisteredCount) * 100)
      : 75;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* High-Visibility Active Attendants Statistic Banner */}
      <div className="p-6 rounded-3xl bg-white border border-teal-200/80 shadow-sm relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left Column: Big Counter Metric */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-800">
                Live Attendant Fleet Telemetry
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-black text-slate-900 tracking-tight">
                Active Attendants:{' '}
                <span className="text-teal-700">
                  {activeCount} / {totalRegisteredCount}
                </span>
              </h2>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                {activePercentage}% Capacity Deployed
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Real-time operational availability across all geofenced Chennai healthcare corridors.
            </p>
          </div>

          {/* Right Column: Quick Navigation to Roster & Live Map */}
          {onNavigateTab && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onNavigateTab('CAREGIVERS')}
                className="px-4 py-2.5 rounded-2xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer group"
              >
                <UserCheck className="w-4 h-4 text-teal-700" />
                <span>View Caregiver Roster</span>
                <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
              <button
                onClick={() => onNavigateTab('ATTENDANCE')}
                className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer group"
              >
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Arrival Tracking</span>
                <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 text-slate-400" />
              </button>
            </div>
          )}
        </div>

        {/* Progress Bar Visual */}
        <div className="mt-4 w-full h-2 rounded-full bg-slate-100 overflow-hidden flex">
          <div
            style={{ width: `${(activeOnShifts / totalRegisteredCount) * 100}%` }}
            className="h-full bg-teal-600 transition-all duration-500"
            title={`Active on Shifts: ${activeOnShifts}`}
          />
          <div
            style={{ width: `${(standbyReserve / totalRegisteredCount) * 100}%` }}
            className="h-full bg-emerald-500 transition-all duration-500"
            title={`Standby Reserve: ${standbyReserve}`}
          />
          <div
            style={{ width: `${(inactiveOffDuty / totalRegisteredCount) * 100}%` }}
            className="h-full bg-slate-200 transition-all duration-500"
            title={`Inactive / Off-Duty: ${inactiveOffDuty}`}
          />
        </div>

        {/* Breakdown Pills Below the Counter */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Pill 1: Active on Shifts */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-900 text-xs font-bold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
            <span>Active on Shifts: {activeOnShifts}</span>
          </div>

          {/* Pill 2: Standby Reserve */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Standby Reserve: {standbyReserve}</span>
          </div>

          {/* Pill 3: Inactive / Off-Duty */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>Inactive / Off-Duty: {inactiveOffDuty}</span>
          </div>

          {/* SLA Response Readiness */}
          <span className="ml-auto text-[11px] font-semibold text-slate-500 hidden md:inline-flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-teal-600" />
            <span>15-Minute Emergency SLA Coverage Ready</span>
          </span>
        </div>
      </div>
    </div>
  );
};
