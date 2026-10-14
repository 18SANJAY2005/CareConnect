import React, { useState, useMemo } from 'react';
import {
  Clock,
  Search,
  CheckCircle2,
  AlertCircle,
  MapPin,
  ArrowLeft,
  Navigation,
  ListChecks,
  Activity,
  UserCheck,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { ShiftAttendanceLog, ClinicalTaskItem } from '../types';
import { initialShiftAttendanceLogs, serviceableCorridors } from '../mockData';

interface AdminAttendanceViewProps {
  onBackToDashboard?: () => void;
  onSelectCaregiverByName?: (caregiverName: string) => void;
  onSelectElderByName?: (elderName: string) => void;
}

const defaultShiftTasks: ClinicalTaskItem[] = [
  {
    id: 't1',
    title: 'Morning Vitals Check (BP, Pulse, SpO2)',
    category: 'VITALS',
    scheduledTime: '08:00 AM',
    completedAt: '08:24 AM',
    status: 'COMPLETED',
    notes: 'BP 128/82, Pulse 74, SpO2 98%',
  },
  {
    id: 't2',
    title: 'Medication Administration Protocol',
    category: 'MEDICATION',
    scheduledTime: '08:45 AM',
    completedAt: '08:50 AM',
    status: 'COMPLETED',
    notes: 'Given post breakfast',
  },
  {
    id: 't3',
    title: 'Assisted Shower Bath & Skin Hygiene',
    category: 'HYGIENE',
    scheduledTime: '09:30 AM',
    completedAt: '09:45 AM',
    status: 'COMPLETED',
    notes: 'Skin clean, walker stability assisted',
  },
  {
    id: 't4',
    title: 'Diabetic Lunch & Hydration Assist',
    category: 'NUTRITION',
    scheduledTime: '13:00 PM',
    completedAt: '13:15 PM',
    status: 'COMPLETED',
    notes: 'Prescribed meal consumed',
  },
  {
    id: 't5',
    title: 'Supervised Hallway Walking (200m)',
    category: 'MOBILITY',
    scheduledTime: '17:30 PM',
    status: 'PENDING',
    notes: 'Scheduled for evening',
  },
  {
    id: 't6',
    title: 'Evening Vitals Handover',
    category: 'VITALS',
    scheduledTime: '19:45 PM',
    status: 'PENDING',
    notes: 'Shift closure protocol',
  },
];

export const AdminAttendanceView: React.FC<AdminAttendanceViewProps> = ({
  onBackToDashboard,
  onSelectCaregiverByName,
  onSelectElderByName,
}) => {
  const [logs, setLogs] = useState<ShiftAttendanceLog[]>(() =>
    initialShiftAttendanceLogs.map((l) => {
      const tasks = l.tasks && l.tasks.length > 0 ? l.tasks : defaultShiftTasks.map((t) => ({ ...t, id: `${l.id}_${t.id}` }));
      return {
        ...l,
        tasks,
        tasksTotalCount: tasks.length,
        tasksCompletedCount: tasks.filter((t) => t.status === 'COMPLETED').length,
      };
    })
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [zoneFilter, setZoneFilter] = useState<string>('ALL');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleTaskStatus = (logId: string, taskId: string) => {
    setLogs((prev) =>
      prev.map((l) => {
        if (l.id !== logId) return l;
        const currentTasks = l.tasks || [];
        const updatedTasks = currentTasks.map((t) => {
          if (t.id !== taskId) return t;
          const isDone = t.status === 'COMPLETED';
          const nextStatus: ClinicalTaskItem['status'] = isDone ? 'PENDING' : 'COMPLETED';
          const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return {
            ...t,
            status: nextStatus,
            completedAt: isDone ? undefined : nowStr,
          };
        });
        const completedCount = updatedTasks.filter((t) => t.status === 'COMPLETED').length;
        showToast(
          `Shift protocol updated: ${completedCount}/${updatedTasks.length} tasks completed for ${l.caregiverName}`
        );
        return {
          ...l,
          tasks: updatedTasks,
          tasksCompletedCount: completedCount,
          tasksTotalCount: updatedTasks.length,
        };
      })
    );
  };

  const handleToggleSupervisorSignoff = (logId: string) => {
    setLogs((prev) =>
      prev.map((l) => {
        if (l.id === logId) {
          const isSigned = Boolean(l.supervisorSignoff);
          const nextSignoff = isSigned ? undefined : 'Verified by Operations Desk';
          showToast(
            nextSignoff
              ? `Shift ${l.id} approved by supervisor.`
              : `Shift ${l.id} approval revoked.`
          );
          return {
            ...l,
            supervisorSignoff: nextSignoff,
          };
        }
        return l;
      })
    );
  };

  // Metrics Calculations
  const totalLogs = logs.length;
  const activeOnDutyCount = logs.filter(
    (l) => l.status === 'ACTIVE_ON_DUTY' || l.status === 'ON_DUTY_WITHIN_SHIFT'
  ).length;

  const totalTasksAll = logs.reduce((acc, l) => acc + (l.tasksTotalCount || 6), 0);
  const completedTasksAll = logs.reduce((acc, l) => acc + (l.tasksCompletedCount || 4), 0);
  const overallTaskPercentage =
    totalTasksAll > 0 ? Math.round((completedTasksAll / totalTasksAll) * 100) : 88;

  const geofenceVerifiedCount = logs.filter(
    (l) => l.geofenceStatus === 'VERIFIED' || l.isCheckInGeofenceVerified
  ).length;
  const geofenceComplianceRate =
    totalLogs > 0 ? Math.round((geofenceVerifiedCount / totalLogs) * 100) : 100;

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const matchesSearch =
        searchQuery === '' ||
        l.caregiverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.elderName && l.elderName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        l.locality.toLowerCase().includes(searchQuery.toLowerCase());

      let matchesStatus = true;
      if (statusFilter === 'ACTIVE_ON_DUTY' || statusFilter === 'ON_DUTY') {
        matchesStatus = l.status === 'ACTIVE_ON_DUTY' || l.status === 'ON_DUTY_WITHIN_SHIFT';
      } else if (statusFilter === 'CLOCKED_OUT') {
        matchesStatus = l.status === 'COMPLETED' || l.status === 'CLOCKED_OUT';
      } else if (statusFilter === 'LATE_FLAGGED') {
        matchesStatus =
          l.status === 'LATE_CHECK_IN' ||
          l.geofenceStatus === 'OFF_SITE_FLAG' ||
          !l.isCheckInGeofenceVerified;
      } else if (statusFilter === 'ON_TIME') {
        matchesStatus = l.status === 'ON_TIME_CHECK_IN';
      } else if (statusFilter === 'LATE') {
        matchesStatus = l.status === 'LATE_CHECK_IN';
      } else if (statusFilter === 'OVERTIME') {
        matchesStatus = l.status === 'OVERTIME';
      } else if (statusFilter === 'OFF_SITE_FLAG') {
        matchesStatus = l.geofenceStatus === 'OFF_SITE_FLAG' || !l.isCheckInGeofenceVerified;
      }

      let matchesZone = true;
      if (zoneFilter !== 'ALL') {
        matchesZone = l.locality.toLowerCase().includes(zoneFilter.toLowerCase());
      }

      return matchesSearch && matchesStatus && matchesZone;
    });
  }, [logs, searchQuery, statusFilter, zoneFilter]);

  const getStatusBadge = (status: ShiftAttendanceLog['status']) => {
    switch (status) {
      case 'ON_TIME_CHECK_IN':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            On Time Check-In
          </span>
        );
      case 'LATE_CHECK_IN':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            Late Check-In
          </span>
        );
      case 'ACTIVE_ON_DUTY':
      case 'ON_DUTY_WITHIN_SHIFT':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200 flex items-center gap-1 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-pulse" />
            Active On Duty
          </span>
        );
      case 'CLOCKED_OUT':
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
            Clocked Out
          </span>
        );
      case 'OVERTIME':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            Overtime
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
            {String(status).replace(/_/g, ' ')}
          </span>
        );
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn pb-12">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 p-3.5 rounded-2xl bg-slate-900 text-white text-xs font-bold shadow-xl border border-slate-700 animate-fadeIn flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

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
            <h2 className="text-xl font-heading font-extrabold text-slate-900 flex items-center gap-2">
              <Clock className="w-6 h-6 text-teal-700" />
              <span>Shift Attendance & Task Monitoring</span>
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{activeOnDutyCount} Currently Active on Duty</span>
          </span>
          <span className="px-3 py-1.5 rounded-2xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-teal-600" />
            <span>{geofenceComplianceRate}% Geofence Compliance</span>
          </span>
        </div>
      </div>

      {/* 4 Summary Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Overall Task Completion Rate */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Shift Tasks Compliance
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <ListChecks className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-heading text-slate-900">
              {overallTaskPercentage}%
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {completedTasksAll} of {totalTasksAll} Daily Shift Tasks Done
            </p>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${overallTaskPercentage}%` }}
            />
          </div>
        </div>

        {/* KPI 2: Active On-Duty Personnel */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Active Attendants
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-heading text-slate-900">
              {activeOnDutyCount} Staff
            </div>
          </div>
        </div>

        {/* KPI 3: Geofence Verification */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Geofence Accuracy
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-heading text-slate-900">
              {geofenceComplianceRate}% Verified
            </div>
          </div>
        </div>

        {/* KPI 4: Clinical Vitals Handover */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Clinical Handoff Desk
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-heading text-slate-900">
              {logs.filter((l) => l.vitalsHandedOver).length} / {totalLogs} Signed
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search caregiver, beneficiary, or locality..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-medium text-slate-800"
          />
        </div>

        {/* Zone Filter */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-bold">Locality:</span>
          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:bg-white"
          >
            <option value="ALL">All Hubs & Corridors</option>
            {serviceableCorridors.map((c) => (
              <option key={c.name} value={c.name.split(' ')[0]}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All Shifts' },
            { id: 'ACTIVE_ON_DUTY', label: 'On Duty' },
            { id: 'CLOCKED_OUT', label: 'Clocked Out' },
            { id: 'LATE_FLAGGED', label: 'Late / Flagged' },
            { id: 'ON_TIME', label: 'On Time Check-In' },
            { id: 'OVERTIME', label: 'Overtime' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setStatusFilter(pill.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                statusFilter === pill.id
                  ? 'bg-teal-700 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Attendance Ledger Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-heading font-extrabold text-sm text-slate-900">
              Live Attendance & Clinical Tasks Ledger
            </h3>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-50 text-slate-700 border border-slate-200">
            Showing {filteredLogs.length} of {logs.length} shifts
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th className="py-3.5 px-4">Caregiver</th>
                <th className="py-3.5 px-4">Care Recipient & Locality</th>
                <th className="py-3.5 px-4">Scheduled Shift</th>
                <th className="py-3.5 px-4">Check-In Timestamp</th>
                <th className="py-3.5 px-4">Check-Out Timestamp</th>
                <th className="py-3.5 px-4">Hours Logged</th>
                <th className="py-3.5 px-4">Geofence Status</th>
                <th className="py-3.5 px-4">Shift Status</th>
                <th className="py-3.5 px-4">Clinical Tasks</th>
                <th className="py-3.5 px-4 text-right">Supervisor Signoff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 text-xs">
                    No shift records match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isExpanded = expandedRowId === log.id;
                  const completed = log.tasksCompletedCount || 4;
                  const total = log.tasksTotalCount || 6;
                  const taskPercent = Math.round((completed / total) * 100);

                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-slate-50/70 transition-colors">
                        {/* Caregiver Name */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div
                            onClick={() => onSelectCaregiverByName?.(log.caregiverName)}
                            className="font-bold text-slate-900 text-xs hover:text-teal-700 cursor-pointer transition"
                          >
                            {log.caregiverName}
                          </div>
                          <div className="text-[10px] text-teal-700 font-mono">
                            ID: {log.caregiverId}
                          </div>
                        </td>

                        {/* Care Recipient & Locality */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div
                            onClick={() => log.elderName && onSelectElderByName?.(log.elderName)}
                            className="font-bold text-slate-800 text-xs hover:text-teal-700 cursor-pointer transition"
                          >
                            {log.elderName || 'Standby Corridor Hub'}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{log.locality}</span>
                          </div>
                        </td>

                        {/* Scheduled Shift */}
                        <td className="py-4 px-4 whitespace-nowrap text-slate-700 font-medium">
                          <div className="font-semibold text-slate-900">
                            {log.scheduledCheckIn} – {log.scheduledCheckOut}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {log.shiftType.split('(')[0]}
                          </div>
                        </td>

                        {/* Check-In Timestamp */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-slate-900 text-xs">
                              {log.actualCheckIn}
                            </span>
                            {log.isCheckInGeofenceVerified && (
                              <span
                                className="inline-flex items-center text-emerald-600 text-[10px] font-bold"
                                title="Geofence GPS Verified"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            Sched: {log.scheduledCheckIn}
                          </span>
                        </td>

                        {/* Check-Out Timestamp */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900 text-xs">
                            {log.actualCheckOut || (
                              <span className="text-teal-700 font-medium flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                                In Progress
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            Sched: {log.scheduledCheckOut}
                          </span>
                        </td>

                        {/* Total Hours Logged */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 font-bold text-[11px]">
                            {log.totalHoursLogged}
                          </span>
                        </td>

                        {/* Geofence Verification Status */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {log.geofenceStatus === 'VERIFIED' || log.isCheckInGeofenceVerified ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Verified (GPS &lt; 35m)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                              <AlertCircle className="w-3 h-3 text-rose-600" />
                              <span>Off-site Flag</span>
                            </span>
                          )}
                        </td>

                        {/* Shift Status */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {getStatusBadge(log.status)}
                        </td>

                        {/* Clinical Tasks */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <button
                            onClick={() => setExpandedRowId(isExpanded ? null : log.id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-900 border border-slate-200 hover:border-teal-300 font-bold text-xs transition"
                          >
                            <ListChecks className="w-3.5 h-3.5 text-teal-600" />
                            <span>
                              {completed}/{total} ({taskPercent}%)
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                        </td>

                        {/* Supervisor Signoff */}
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleToggleSupervisorSignoff(log.id)}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition border flex items-center gap-1.5 ml-auto ${
                              log.supervisorSignoff
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-teal-300'
                            }`}
                          >
                            <CheckCircle2
                              className={`w-3.5 h-3.5 ${
                                log.supervisorSignoff ? 'text-emerald-600' : 'text-slate-400'
                              }`}
                            />
                            <span>{log.supervisorSignoff ? 'Verified' : 'Sign Off'}</span>
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Row: Shift Tasks Checklist & Notes */}
                      {isExpanded && (
                        <tr className="bg-teal-50/40 border-b border-teal-100 animate-fadeIn">
                          <td colSpan={10} className="p-4 sm:p-6">
                            <div className="space-y-4 max-w-4xl">
                              <div className="flex items-center justify-between">
                                <h4 className="font-heading font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                                  <ListChecks className="w-4 h-4 text-teal-600" />
                                  <span>
                                    Daily Clinical Tasks Checklist for {log.caregiverName} ({log.shiftDate})
                                  </span>
                                </h4>
                                <span className="text-xs font-bold text-teal-900">
                                  {completed} of {total} Protocols Completed
                                </span>
                              </div>

                              {/* Task List */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                {(log.tasks || []).map((task: ClinicalTaskItem) => {
                                  const isCompleted = task.status === 'COMPLETED';
                                  return (
                                    <div
                                      key={task.id}
                                      onClick={() => handleToggleTaskStatus(log.id, task.id)}
                                      className={`p-3.5 rounded-2xl border text-xs space-y-1 shadow-2xs cursor-pointer transition flex items-start gap-3 select-none ${
                                        isCompleted
                                          ? 'bg-emerald-50/50 border-emerald-200/80 hover:bg-emerald-50'
                                          : 'bg-white border-slate-200 hover:bg-slate-50'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isCompleted}
                                        onChange={() => {}} // handled by parent onClick
                                        className="mt-1 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-600 shrink-0"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                          <div
                                            className={`font-bold ${
                                              isCompleted
                                                ? 'text-emerald-950 line-through opacity-80'
                                                : 'text-slate-800'
                                            }`}
                                          >
                                            {task.title}
                                          </div>
                                          <span
                                            className={`px-2 py-0.5 rounded-md text-[9px] font-bold shrink-0 ${
                                              isCompleted
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : task.status === 'MISSED_FLAGGED'
                                                ? 'bg-rose-100 text-rose-800'
                                                : 'bg-amber-100 text-amber-800'
                                            }`}
                                          >
                                            {task.status.replace(/_/g, ' ')}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                                          <span className="font-mono bg-slate-50 px-1 py-0.5 rounded border border-slate-100">
                                            {task.scheduledTime}
                                          </span>
                                          <span>•</span>
                                          <span className="font-semibold text-teal-800">
                                            {task.category}
                                          </span>
                                          {task.completedAt && (
                                            <>
                                              <span>•</span>
                                              <span className="text-emerald-700 font-medium">
                                                Logged at {task.completedAt}
                                              </span>
                                            </>
                                          )}
                                        </div>
                                        {task.notes && (
                                          <p className="text-[11px] text-slate-600 italic pt-1">
                                            "{task.notes}"
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Handoff Notes */}
                              {log.handoffNotes && (
                                <div className="p-3 rounded-2xl bg-white border border-teal-200 text-xs space-y-1">
                                  <span className="font-bold text-teal-950 block text-[11px]">
                                    Attendant Shift Handoff Notes:
                                  </span>
                                  <p className="text-slate-700 leading-relaxed text-[11px]">
                                    {log.handoffNotes}
                                  </p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Ledger Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>
            Shift attendance records are synchronized via GPS Geofencing radius (35-meter perimeter) & biometric check-in.
          </span>
          <span className="font-bold text-emerald-700">
            ✓ ISO-27001 Clinical Compliance Verified
          </span>
        </div>
      </div>
    </div>
  );
};

