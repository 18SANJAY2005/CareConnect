import React, { useState, useMemo } from 'react';
import {
  Clock,
  Search,
  CheckCircle2,
  MapPin,
  ArrowLeft,
  ListChecks,
  Activity,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Phone,
  PhoneCall,
  MessageSquare,
  Send,
  Calendar,
  AlertTriangle,
  X,
  Check,
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
      const tasks =
        l.tasks && l.tasks.length > 0
          ? l.tasks
          : defaultShiftTasks.map((t) => ({ ...t, id: `${l.id}_${t.id}` }));
      return {
        ...l,
        tasks,
        tasksTotalCount: tasks.length,
        tasksCompletedCount: tasks.filter((t) => t.status === 'COMPLETED').length,
      };
    })
  );

  // Split View Tab: Arrived vs Not Yet Reached vs All
  const [arrivalTab, setArrivalTab] = useState<'ARRIVED' | 'NOT_YET_REACHED' | 'ALL'>('ARRIVED');
  const [selectedDate, setSelectedDate] = useState<'TODAY' | 'YESTERDAY' | 'ALL'>('TODAY');
  const [searchQuery, setSearchQuery] = useState('');
  const [zoneFilter, setZoneFilter] = useState<string>('ALL');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Contact Caregiver Modal State
  const [contactModalLog, setContactModalLog] = useState<ShiftAttendanceLog | null>(null);
  const [customSmsText, setCustomSmsText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
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

  // Helper check for arrived status
  const isLogArrived = (l: ShiftAttendanceLog) => {
    if (l.arrivalStatus === 'ARRIVED') return true;
    if (l.arrivalStatus === 'NOT_YET_REACHED') return false;
    if (l.status === 'EN_ROUTE' || l.status === 'DELAYED_UNACKNOWLEDGED' || l.status === 'NOT_YET_REACHED') return false;
    if (l.actualCheckIn && (l.actualCheckIn.includes('Pending') || l.actualCheckIn.includes('Not Checked'))) return false;
    return Boolean(l.isCheckInGeofenceVerified || l.actualCheckIn);
  };

  // Metrics Calculations
  const totalLogs = logs.length;
  const arrivedLogsList = logs.filter(isLogArrived);
  const notReachedLogsList = logs.filter((l) => !isLogArrived(l));

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
      // 1. Arrival Split Filter
      const arrived = isLogArrived(l);
      if (arrivalTab === 'ARRIVED' && !arrived) return false;
      if (arrivalTab === 'NOT_YET_REACHED' && arrived) return false;

      // 2. Date Filter
      if (selectedDate === 'TODAY') {
        const isToday = l.shiftDate.toLowerCase().includes('today') || l.shiftDate.includes('16 Oct');
        if (!isToday && !l.shiftDate.includes('Today')) return false;
      } else if (selectedDate === 'YESTERDAY') {
        const isYest = l.shiftDate.toLowerCase().includes('yesterday') || l.shiftDate.includes('15 Oct');
        if (!isYest) return false;
      }

      // 3. Search Filter
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === '' ||
        l.caregiverName.toLowerCase().includes(q) ||
        (l.elderName && l.elderName.toLowerCase().includes(q)) ||
        l.locality.toLowerCase().includes(q) ||
        (l.caregiverPhone && l.caregiverPhone.includes(q));

      // 4. Zone Filter
      let matchesZone = true;
      if (zoneFilter !== 'ALL') {
        matchesZone = l.locality.toLowerCase().includes(zoneFilter.toLowerCase());
      }

      return matchesSearch && matchesZone;
    });
  }, [logs, arrivalTab, selectedDate, searchQuery, zoneFilter]);

  const handleOpenContactModal = (log: ShiftAttendanceLog) => {
    setContactModalLog(log);
    setCustomSmsText(
      `Hello ${log.caregiverName}, this is CareConnect Operations. Your scheduled shift for ${log.elderName || 'Careseeker'} in ${log.locality} started at ${log.scheduledCheckIn}. Please check in via the app or reply with your current ETA.`
    );
  };

  const handleSendUrgentPing = () => {
    if (!contactModalLog) return;
    showToast(`Urgent check-in escalation sent to ${contactModalLog.caregiverName} (+SMS & App Push).`);
    setContactModalLog(null);
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
              className="px-3 py-2 rounded-2xl bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-slate-700 hover:text-teal-900 transition-all flex items-center gap-2 group text-xs font-bold shadow-2xs shrink-0 cursor-pointer"
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
            <p className="text-xs text-slate-500 mt-0.5">
              Live biometric arrival ledger, physical geofence verification, and clinical task execution.
            </p>
          </div>
        </div>

        {/* Selected Date Selector & Quick Indicators */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
            <span className="px-2.5 py-1 text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-teal-700" />
              <span>Shift Date:</span>
            </span>
            <button
              onClick={() => setSelectedDate('TODAY')}
              className={`px-3 py-1 rounded-xl transition cursor-pointer ${
                selectedDate === 'TODAY'
                  ? 'bg-white text-teal-950 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setSelectedDate('YESTERDAY')}
              className={`px-3 py-1 rounded-xl transition cursor-pointer ${
                selectedDate === 'YESTERDAY'
                  ? 'bg-white text-teal-950 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={() => setSelectedDate('ALL')}
              className={`px-3 py-1 rounded-xl transition cursor-pointer ${
                selectedDate === 'ALL'
                  ? 'bg-white text-teal-950 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Records
            </button>
          </div>
        </div>
      </div>

      {/* 4 Summary Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Arrived / On Site */}
        <div
          onClick={() => setArrivalTab('ARRIVED')}
          className={`cursor-pointer p-5 rounded-3xl bg-white border transition-all shadow-xs space-y-2.5 ${
            arrivalTab === 'ARRIVED' ? 'ring-2 ring-emerald-500 border-emerald-300' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
              Arrived / On Site
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-heading text-slate-900">
              {arrivedLogsList.length} Attendants
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Physically verified at beneficiary homes
            </p>
          </div>
        </div>

        {/* KPI 2: Not Yet Reached / Pending */}
        <div
          onClick={() => setArrivalTab('NOT_YET_REACHED')}
          className={`cursor-pointer p-5 rounded-3xl bg-white border transition-all shadow-xs space-y-2.5 ${
            arrivalTab === 'NOT_YET_REACHED' ? 'ring-2 ring-amber-500 border-amber-300' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
              Not Yet Reached
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-heading text-slate-900">
              {notReachedLogsList.length} Pending
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              En route or delayed check-in
            </p>
          </div>
        </div>

        {/* KPI 3: Geofence Verification Rate */}
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
            <p className="text-xs text-slate-500 mt-0.5">
              Within 35m beneficiary geofence
            </p>
          </div>
        </div>

        {/* KPI 4: Clinical Tasks Progress */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Clinical Tasks
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
              <ListChecks className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-heading text-slate-900">
              {overallTaskPercentage}% Done
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {completedTasksAll} of {totalTasksAll} shift tasks logged
            </p>
          </div>
        </div>
      </div>

      {/* Split Tabs: Arrived vs Not Yet Reached */}
      <div className="p-1.5 bg-slate-100 rounded-2xl flex flex-wrap items-center gap-1.5 border border-slate-200 text-xs font-bold">
        <button
          onClick={() => setArrivalTab('ARRIVED')}
          className={`flex-1 min-w-[200px] py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
            arrivalTab === 'ARRIVED'
              ? 'bg-white text-emerald-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Arrived / On Site Tab</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] border border-emerald-200">
            {arrivedLogsList.length} Attendants
          </span>
        </button>

        <button
          onClick={() => setArrivalTab('NOT_YET_REACHED')}
          className={`flex-1 min-w-[200px] py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
            arrivalTab === 'NOT_YET_REACHED'
              ? 'bg-white text-amber-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span>Not Yet Reached / Pending Tab</span>
          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] border border-amber-200">
            {notReachedLogsList.length} Pending
          </span>
        </button>

        <button
          onClick={() => setArrivalTab('ALL')}
          className={`py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
            arrivalTab === 'ALL'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Activity className="w-4 h-4 text-teal-600" />
          <span>All Attendance & Tasks</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px]">
            {logs.length}
          </span>
        </button>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search caregiver, beneficiary, phone or locality..."
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
            <option value="ALL">All Chennai Corridors</option>
            {serviceableCorridors.map((c) => (
              <option key={c.name} value={c.name.split(' ')[0]}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ========================================================
          TAB 1: ARRIVED / ON SITE
         ======================================================== */}
      {arrivalTab === 'ARRIVED' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-heading font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Arrived Caregivers – Physically Verified On-Site</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Caregivers currently on site at registered beneficiary residence with confirmed geofence check-in.
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              {filteredLogs.length} Verified On-Site
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-3.5 px-4">Caregiver</th>
                  <th className="py-3.5 px-4">Assigned Careseeker</th>
                  <th className="py-3.5 px-4">Scheduled Shift Time</th>
                  <th className="py-3.5 px-4">Verified Check-In</th>
                  <th className="py-3.5 px-4">Geofence Status</th>
                  <th className="py-3.5 px-4">Active Shift Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                      No arrived caregivers found matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
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
                        {log.caregiverPhone && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            {log.caregiverPhone}
                          </div>
                        )}
                      </td>

                      {/* Assigned Careseeker */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div
                          onClick={() => log.elderName && onSelectElderByName?.(log.elderName)}
                          className="font-bold text-slate-800 text-xs hover:text-teal-700 cursor-pointer transition"
                        >
                          {log.elderName || 'Standby Corridor Hub'}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{log.locality}</span>
                        </div>
                      </td>

                      {/* Scheduled Shift Time */}
                      <td className="py-4 px-4 whitespace-nowrap font-medium text-slate-700">
                        <div className="font-bold text-slate-900">
                          {log.scheduledCheckIn} – {log.scheduledCheckOut}
                        </div>
                        <div className="text-[10px] text-slate-500">{log.shiftType}</div>
                      </td>

                      {/* Verified Check-In Timestamp */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{log.actualCheckIn}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Scheduled: {log.scheduledCheckIn}
                        </div>
                      </td>

                      {/* Geofence Verification Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          <span>Verified On-Site</span>
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Perimeter: &lt; 35m confirmed
                        </div>
                      </td>

                      {/* Active Shift Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-pulse" />
                          <span>Active on Duty ({log.totalHoursLogged})</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => onSelectCaregiverByName?.(log.caregiverName)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-900 border border-slate-200 text-xs font-bold transition cursor-pointer"
                        >
                          View Profile
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: NOT YET REACHED / PENDING
         ======================================================== */}
      {arrivalTab === 'NOT_YET_REACHED' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-heading font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Pending Arrival & En Route Attendants</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Caregivers scheduled for today who have not yet checked in at beneficiary residence.
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              {filteredLogs.length} Pending Arrival
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-3.5 px-4">Caregiver</th>
                  <th className="py-3.5 px-4">Assigned Careseeker</th>
                  <th className="py-3.5 px-4">Scheduled Shift Time</th>
                  <th className="py-3.5 px-4">Current Status</th>
                  <th className="py-3.5 px-4">Expected Arrival</th>
                  <th className="py-3.5 px-4">Geofence Status</th>
                  <th className="py-3.5 px-4 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                      All caregivers have successfully arrived on site. Zero pending arrivals!
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const isDelayed =
                      log.status === 'DELAYED_UNACKNOWLEDGED' ||
                      log.status === 'LATE_CHECK_IN' ||
                      (log.expectedArrivalTime && log.expectedArrivalTime.includes('Delayed'));

                    return (
                      <tr key={log.id} className="hover:bg-amber-50/40 transition-colors">
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
                          <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                            <Phone className="w-2.5 h-2.5 text-slate-400" />
                            <span>{log.caregiverPhone || '+91 98400 00000'}</span>
                          </div>
                        </td>

                        {/* Assigned Careseeker */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div
                            onClick={() => log.elderName && onSelectElderByName?.(log.elderName)}
                            className="font-bold text-slate-800 text-xs hover:text-teal-700 cursor-pointer transition"
                          >
                            {log.elderName || 'Careseeker Beneficiary'}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{log.locality}</span>
                          </div>
                        </td>

                        {/* Scheduled Shift Time */}
                        <td className="py-4 px-4 whitespace-nowrap font-medium text-slate-700">
                          <div className="font-bold text-slate-900">
                            {log.scheduledCheckIn} – {log.scheduledCheckOut}
                          </div>
                          <div className="text-[10px] text-slate-500">{log.shiftType}</div>
                        </td>

                        {/* Current Status */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {isDelayed ? (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200 inline-flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                              <span>Delayed / Unacknowledged</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                              <span>En Route</span>
                            </span>
                          )}
                        </td>

                        {/* Expected Arrival */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-800 text-xs">
                            {log.expectedArrivalTime || 'Approaching within 15 mins'}
                          </div>
                          {log.distanceToSiteMeters && (
                            <div className="text-[10px] text-slate-500">
                              Approx. {log.distanceToSiteMeters}m from address
                            </div>
                          )}
                        </td>

                        {/* Geofence Status */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            Pending Check-In
                          </span>
                        </td>

                        {/* Quick Action: Contact Caregiver Button */}
                        <td className="py-4 px-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleOpenContactModal(log)}
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center gap-1.5 ml-auto shadow-sm cursor-pointer active:scale-95"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                            <span>Contact Caregiver</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: ALL ATTENDANCE & TASKS LEDGER
         ======================================================== */}
      {arrivalTab === 'ALL' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-heading font-extrabold text-sm text-slate-900">
                Complete Daily Shift & Clinical Task Ledger
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Full chronological ledger with clinical protocol compliance checklist and supervisory sign-off.
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-50 text-slate-700 border border-slate-200">
              Showing {filteredLogs.length} of {logs.length} records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-3.5 px-4">Caregiver</th>
                  <th className="py-3.5 px-4">Care Recipient & Locality</th>
                  <th className="py-3.5 px-4">Scheduled Shift</th>
                  <th className="py-3.5 px-4">Check-In</th>
                  <th className="py-3.5 px-4">Hours Logged</th>
                  <th className="py-3.5 px-4">Arrival & Geofence</th>
                  <th className="py-3.5 px-4">Clinical Tasks</th>
                  <th className="py-3.5 px-4 text-right">Supervisor Signoff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedRowId === log.id;
                  const completed = log.tasksCompletedCount || 0;
                  const total = log.tasksTotalCount || 6;
                  const taskPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
                  const arrived = isLogArrived(log);

                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div
                            onClick={() => onSelectCaregiverByName?.(log.caregiverName)}
                            className="font-bold text-slate-900 text-xs hover:text-teal-700 cursor-pointer"
                          >
                            {log.caregiverName}
                          </div>
                          <div className="text-[10px] text-teal-700 font-mono">ID: {log.caregiverId}</div>
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap">
                          <div
                            onClick={() => log.elderName && onSelectElderByName?.(log.elderName)}
                            className="font-bold text-slate-800 text-xs hover:text-teal-700 cursor-pointer"
                          >
                            {log.elderName || 'Standby Hub'}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{log.locality}</span>
                          </div>
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-900">{log.scheduledCheckIn} – {log.scheduledCheckOut}</div>
                          <div className="text-[10px] text-slate-400">{log.shiftType}</div>
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="font-bold text-slate-900">{log.actualCheckIn}</span>
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap font-medium text-slate-700">
                          {log.totalHoursLogged}
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap">
                          {arrived ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              ✓ Verified On-Site
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              ⏳ Not Yet Reached
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap">
                          <button
                            onClick={() => setExpandedRowId(isExpanded ? null : log.id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-teal-50 text-slate-800 text-xs font-bold transition border border-slate-200 cursor-pointer"
                          >
                            <span>{completed}/{total} Tasks ({taskPercent}%)</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleToggleSupervisorSignoff(log.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                              log.supervisorSignoff
                                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {log.supervisorSignoff ? '✓ Approved' : 'Sign Off'}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Task Protocol Checklist */}
                      {isExpanded && (
                        <tr className="bg-teal-50/30">
                          <td colSpan={8} className="p-4 border-t border-slate-100">
                            <div className="space-y-2">
                              <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-900 block">
                                Shift Protocol Checklist ({completed}/{total} completed)
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                {(log.tasks || []).map((task) => (
                                  <div
                                    key={task.id}
                                    onClick={() => handleToggleTaskStatus(log.id, task.id)}
                                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-start gap-2 ${
                                      task.status === 'COMPLETED'
                                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                                        : 'bg-white border-slate-200 text-slate-700 hover:border-teal-300'
                                    }`}
                                  >
                                    <div
                                      className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 mt-0.5 border ${
                                        task.status === 'COMPLETED'
                                          ? 'bg-emerald-600 border-emerald-600 text-white'
                                          : 'border-slate-300 bg-white'
                                      }`}
                                    >
                                      {task.status === 'COMPLETED' && <Check className="w-3 h-3" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="font-bold truncate">{task.title}</div>
                                      <div className="text-[10px] text-slate-500">
                                        {task.scheduledTime} {task.completedAt ? `(Done: ${task.completedAt})` : ''}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CONTACT CAREGIVER QUICK ACTION
         ======================================================== */}
      {contactModalLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-5 animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Operations Dispatch Desk
                </span>
                <h3 className="text-lg font-heading font-extrabold text-slate-900 mt-1.5 flex items-center gap-2">
                  <PhoneCall className="w-5 h-5 text-emerald-600" />
                  <span>Contact Caregiver: {contactModalLog.caregiverName}</span>
                </h3>
              </div>
              <button
                onClick={() => setContactModalLog(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Shift Context Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Assigned Careseeker:</span>
                <strong className="text-slate-900">{contactModalLog.elderName || 'Careseeker'}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Scheduled Shift:</span>
                <span className="font-semibold text-slate-800">
                  {contactModalLog.scheduledCheckIn} – {contactModalLog.scheduledCheckOut}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Destination Corridor:</span>
                <span className="font-semibold text-slate-800">{contactModalLog.locality}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Expected Arrival:</span>
                <span className="font-bold text-amber-700">
                  {contactModalLog.expectedArrivalTime || 'Pending confirmation'}
                </span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <a
                href={`tel:${contactModalLog.caregiverPhone || '+919840112233'}`}
                className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm"
              >
                <Phone className="w-4 h-4" />
                <span>Call Caregiver Directly</span>
              </a>

              <a
                href={`https://wa.me/${(contactModalLog.caregiverPhone || '+919840112233').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(customSmsText)}`}
                target="_blank"
                rel="noreferrer"
                className="py-3 px-4 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Send WhatsApp Check-In</span>
              </a>
            </div>

            {/* Dispatch Custom Alert */}
            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-700">Urgent Dispatch Message / SMS:</label>
              <textarea
                rows={3}
                value={customSmsText}
                onChange={(e) => setCustomSmsText(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Footer Actions */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                onClick={() => setContactModalLog(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSendUrgentPing}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
              >
                <Send className="w-3.5 h-3.5 text-emerald-400" />
                <span>Trigger Urgent App Push & Log Call</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
