import React, { useState, useMemo } from 'react';
import {
  Search,
  Star,
  Layers,
  MapPin,
  ArrowLeft,
  ArrowRight,
  Clock,
  CheckCircle2,
  BadgeCheck,
  ShieldCheck,
  Phone,
} from 'lucide-react';
import type { AdminCaregiverItem, ShiftAttendanceLog } from '../types';
import { CaregiverDetailDrawer } from '../components/CaregiverDetailDrawer';
import { initialShiftAttendanceLogs } from '../mockData';

export type CaregiverStatusFilter = 'ALL' | 'KYC_PENDING' | 'AVAILABLE' | 'ON_DUTY' | 'STANDBY' | 'ON_HANDOFF';

interface AdminCaregiversViewProps {
  caregivers: AdminCaregiverItem[];
  onSelectCaregiver?: (caregiver: AdminCaregiverItem) => void;
  onBackToDashboard?: () => void;
  onStatusChange?: (caregiverId: string, newStatus: 'AVAILABLE' | 'ON_DUTY' | 'ON_LEAVE' | 'ON_HANDOFF') => void;
  onKycStatusChange?: (caregiverId: string, newStatus: 'VERIFIED' | 'REJECTED', rejectionReason?: string) => Promise<any>;
}

export const AdminCaregiversView: React.FC<AdminCaregiversViewProps> = ({
  caregivers,
  onSelectCaregiver,
  onBackToDashboard,
  onStatusChange,
  onKycStatusChange,
}) => {
  const [localSelectedCaregiver, setLocalSelectedCaregiver] = useState<AdminCaregiverItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CaregiverStatusFilter>('ALL');
  const [activeSubView, setActiveSubView] = useState<'ROSTER' | 'ATTENDANCE'>('ROSTER');
  const [attendanceLogs] = useState<ShiftAttendanceLog[]>(initialShiftAttendanceLogs);

  const filteredCaregivers = useMemo(() => {
    return caregivers.filter((c) => {
      const matchesSearch =
        searchQuery === '' ||
        c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.locality.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesStatus = true;
      if (statusFilter === 'KYC_PENDING') {
        matchesStatus = c.kycStatus === 'PENDING' || (!c.isIdentityVerified && c.kycStatus !== 'VERIFIED');
      } else if (statusFilter === 'AVAILABLE') {
        matchesStatus = c.status === 'AVAILABLE';
      } else if (statusFilter === 'ON_DUTY') {
        matchesStatus = c.status === 'ON_DUTY';
      } else if (statusFilter === 'STANDBY') {
        matchesStatus = Boolean((c.isBufferPool || c.isStandbyReserve) && c.status === 'AVAILABLE');
      } else if (statusFilter === 'ON_HANDOFF') {
        matchesStatus = c.status === 'ON_HANDOFF';
      }

      return matchesSearch && matchesStatus;
    });
  }, [caregivers, searchQuery, statusFilter]);

  const onDutyCount = caregivers.filter((c) => c.status === 'ON_DUTY').length;
  const standbyCount = caregivers.filter((c) => (c.isBufferPool || c.isStandbyReserve) && c.status === 'AVAILABLE').length;
  const kycPendingCount = caregivers.filter((c) => c.kycStatus === 'PENDING' || (!c.isIdentityVerified && c.kycStatus !== 'VERIFIED')).length;

  const handleCardClick = (cg: AdminCaregiverItem) => {
    if (onSelectCaregiver) {
      onSelectCaregiver(cg);
    } else {
      setLocalSelectedCaregiver(cg);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn pb-12">
      {/* Header */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="px-3 py-2 rounded-2xl bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-slate-700 hover:text-teal-900 transition-all flex items-center gap-2 group text-xs font-bold shadow-2xs shrink-0"
              title="Return to Dashboard Overview"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 text-slate-500 group-hover:text-teal-700" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </button>
          )}
          <div>
            <h2 className="text-xl font-heading font-extrabold text-slate-900">
              Caregiver Network & Standby Reserve
            </h2>
          </div>
        </div>
        {/* View Mode Toggle & Telemetry */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Sub-view toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setActiveSubView('ROSTER')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeSubView === 'ROSTER'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Roster Grid
            </button>
            <button
              onClick={() => setActiveSubView('ATTENDANCE')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeSubView === 'ATTENDANCE'
                  ? 'bg-white text-teal-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-teal-600" />
              <span>Shift Attendance & Handoffs</span>
            </button>
          </div>

          {/* Quick Summary Badges */}
          {kycPendingCount > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter('KYC_PENDING')}
              className="px-3 py-1.5 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>{kycPendingCount} KYC Review Pending</span>
            </button>
          )}

          <div className="px-3 py-1.5 rounded-2xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            <span>{onDutyCount} Active Shifts</span>
          </div>
          <div className="px-3 py-1.5 rounded-2xl bg-sky-50 border border-sky-200 text-sky-800 text-xs font-bold flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-sky-600" />
            <span>{standbyCount} Standby Reserve</span>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search caregiver name, skill, specialization, or corridor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-medium text-slate-800"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All Status' },
            { id: 'KYC_PENDING', label: `KYC Pending (${kycPendingCount})` },
            { id: 'AVAILABLE', label: 'Available' },
            { id: 'ON_DUTY', label: 'Active Shift' },
            { id: 'STANDBY', label: 'Standby Reserve' },
            { id: 'ON_HANDOFF', label: 'On Handoff' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id as CaregiverStatusFilter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                statusFilter === s.id
                  ? 'bg-teal-700 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN VIEW 1: ROSTER GRID */}
      {activeSubView === 'ROSTER' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCaregivers.map((cg) => {
            const cgInitials = (cg.fullName || 'CA')
              .trim()
              .split(/\s+/)
              .filter(Boolean)
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase() || 'CA';

            const cgSkills = Array.isArray(cg.skills)
              ? cg.skills
              : typeof cg.skills === 'string'
              ? (cg.skills as string).split(',').map((s) => s.trim()).filter(Boolean)
              : [];

            const cgTasks = Array.isArray(cg.currentTasks) ? cg.currentTasks : [];
            const completedTasksCount = cgTasks.length > 0 ? cgTasks.filter((t) => t.status === 'COMPLETED').length : 4;
            const totalTasksCount = cgTasks.length > 0 ? cgTasks.length : 6;
            const taskPercentage = Math.round((completedTasksCount / totalTasksCount) * 100);

            return (
              <div
                key={cg.id}
                onClick={() => handleCardClick(cg)}
                className="p-5 rounded-3xl bg-white border border-slate-200 hover:border-teal-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group space-y-3.5"
              >
                {/* Header: Avatar, Name, Rating */}
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-800 font-extrabold text-base flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                    {cgInitials}
                  </div>

                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="font-heading font-extrabold text-slate-900 text-sm truncate group-hover:text-teal-900 transition">
                        {cg.fullName}
                      </h3>
                      <div className="flex items-center gap-1 shrink-0 text-amber-500 font-bold text-xs">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{cg.rating}</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{cg.locality}</span>
                    </div>

                    {cg.phone && (
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Phone className="w-2.5 h-2.5 text-teal-600" />
                        <span>{cg.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Verification Badges (Aadhaar, Police clearance, Clinical cert, KYC review) */}
                <div className="flex flex-wrap items-center gap-1 text-[10px]">
                  {cg.kycStatus === 'PENDING' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-950 font-bold border border-amber-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      <span>KYC Review Required</span>
                    </span>
                  ) : (cg.isIdentityVerified || cg.kycStatus === 'VERIFIED') ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200/80">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Aadhaar KYC</span>
                    </span>
                  ) : null}
                  {cg.isPoliceVerified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 font-semibold border border-teal-200/80">
                      <BadgeCheck className="w-3 h-3 text-teal-600" />
                      <span>Police Clearance</span>
                    </span>
                  )}
                  {cg.isClinicalCertified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 font-semibold border border-sky-200/80">
                      <CheckCircle2 className="w-3 h-3 text-sky-600" />
                      <span>Clinical Certified</span>
                    </span>
                  )}
                </div>

                {/* Status and Shift Badge */}
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-xs">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      cg.status === 'ON_DUTY'
                        ? 'bg-emerald-100 text-emerald-800'
                        : cg.status === 'ON_HANDOFF'
                        ? 'bg-amber-100 text-amber-800'
                        : cg.status === 'AVAILABLE'
                        ? 'bg-teal-100 text-teal-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {cg.status === 'ON_DUTY'
                      ? 'Active Shift'
                      : cg.status === 'ON_HANDOFF'
                      ? 'On Handoff'
                      : cg.status === 'AVAILABLE'
                      ? 'Standby Reserve'
                      : 'Off-Duty'}
                  </span>

                  <div className="text-[10px] text-slate-500 font-bold">
                    {cg.activeElderName ? (
                      <span className="text-teal-800 truncate block max-w-[150px]">
                        With: {cg.activeElderName}
                      </span>
                    ) : (
                      <span>Standby Ready</span>
                    )}
                  </div>
                </div>

                {/* Skills Tags */}
                <div className="flex flex-wrap gap-1">
                  {cgSkills.slice(0, 3).map((skill, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-medium truncate"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                {/* Task Compliance Indicator */}
                <div className="flex items-center justify-between text-[11px] bg-slate-50/80 p-2 rounded-xl border border-slate-200/70">
                  <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      Tasks: {completedTasksCount}/{totalTasksCount} Completed
                    </span>
                  </div>
                  <span className="text-[10px] font-extrabold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200/60 font-mono">
                    {taskPercentage}%
                  </span>
                </div>

                {/* Footer: Phone, Check-In, Drawer arrow */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-teal-600" />
                    <span className="truncate font-medium">
                      {cg.shiftSchedule?.lastCheckIn
                        ? cg.shiftSchedule.lastCheckIn.split('(')[0]
                        : '08:00 AM Check-In'}
                    </span>
                  </div>

                  <span className="text-teal-700 font-bold text-xs flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>View Profile</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MAIN VIEW 2: LIVE SHIFT ATTENDANCE & HANDOFFS TABLE */}
      {activeSubView === 'ATTENDANCE' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-heading font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-600" />
                <span>Real-Time Biometric & Geofenced Attendance Ledger</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                GPS perimeter verification confirms caregiver arrival within 35 meters of beneficiary residential address.
              </p>
            </div>

            <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              100% Geofence Accuracy
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-3.5 px-4">Caregiver</th>
                  <th className="py-3.5 px-4">Care Recipient & Locality</th>
                  <th className="py-3.5 px-4">Shift Type</th>
                  <th className="py-3.5 px-4">Check-In (Entry)</th>
                  <th className="py-3.5 px-4">Check-Out (Exit)</th>
                  <th className="py-3.5 px-4">Hours Logged</th>
                  <th className="py-3.5 px-4">Shift Status</th>
                  <th className="py-3.5 px-4">Clinical Handoff & Signoff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendanceLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Caregiver */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900 text-xs">{log.caregiverName}</div>
                      <div className="text-[10px] text-teal-700 font-mono">ID: {log.caregiverId}</div>
                    </td>

                    {/* Care Recipient & Locality */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-800 text-xs">
                        {log.elderName || 'Standby Corridor Hub'}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{log.locality}</span>
                      </div>
                    </td>

                    {/* Shift Type */}
                    <td className="py-4 px-4 whitespace-nowrap text-slate-700 font-medium">
                      {log.shiftType}
                    </td>

                    {/* Check-In */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-slate-900 text-xs">{log.actualCheckIn}</span>
                        {log.isCheckInGeofenceVerified && (
                          <span
                            className="inline-flex items-center text-emerald-600 text-[10px] font-bold"
                            title="Geofence GPS Verified"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">Sched: {log.scheduledCheckIn}</span>
                    </td>

                    {/* Check-Out */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900 text-xs">
                        {log.actualCheckOut || <span className="text-teal-700 font-medium">In Shift</span>}
                      </div>
                      <span className="text-[10px] text-slate-400">Sched: {log.scheduledCheckOut}</span>
                    </td>

                    {/* Hours Logged */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 font-bold text-[11px]">
                        {log.totalHoursLogged}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          log.status === 'ON_DUTY_WITHIN_SHIFT'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.status === 'COMPLETED'
                            ? 'bg-slate-100 text-slate-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {log.status.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Handoff Notes */}
                    <td className="py-4 px-4">
                      <div className="max-w-xs space-y-0.5">
                        <p className="text-[11px] text-slate-700 line-clamp-1">
                          {log.handoffNotes}
                        </p>
                        <span className="text-[10px] text-emerald-700 font-bold block">
                          ✓ {log.supervisorSignoff || 'Verified by Operations Desk'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Local Drawer if not managed by parent */}
      {!onSelectCaregiver && localSelectedCaregiver && (
        <CaregiverDetailDrawer
          caregiver={localSelectedCaregiver}
          isOpen={Boolean(localSelectedCaregiver)}
          onClose={() => setLocalSelectedCaregiver(null)}
          onStatusChange={onStatusChange}
          onKycStatusChange={onKycStatusChange}
        />
      )}

    </div>
  );
};
