import React, { useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Phone,
  MapPin,
  CheckCircle2,
  Send,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import type { AdminSosAlert } from '../types';
import { SupervisorDispatchModal } from '../components/SupervisorDispatchModal';

interface AdminSosPanelProps {
  alerts: AdminSosAlert[];
  onResolveAlert: (alertId: string, resolutionNotes: string) => void;
  onDispatchSupervisor: (alertId: string, supervisorName: string, notes: string) => void;
  onViewOnMap: (lat: number, lng: number) => void;
  onBackToDashboard?: () => void;
}

export const AdminSosPanel: React.FC<AdminSosPanelProps> = ({
  alerts,
  onResolveAlert,
  onDispatchSupervisor,
  onViewOnMap,
  onBackToDashboard,
}) => {
  const [selectedAlertForDispatch, setSelectedAlertForDispatch] = useState<AdminSosAlert | null>(null);
  const [resolvingAlertId, setResolvingAlertId] = useState<string | null>(null);
  const [resolutionNotesInput, setResolutionNotesInput] = useState('Attendant assisted, vitals stabilized within normal threshold.');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('ALL');

  const handleConfirmResolve = (alertId: string) => {
    onResolveAlert(alertId, resolutionNotesInput);
    setResolvingAlertId(null);
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (filterStatus === 'OPEN') return alert.status === 'OPEN' || alert.status === 'DISPATCHED';
    if (filterStatus === 'RESOLVED') return alert.status === 'RESOLVED';
    return true;
  });

  const openCount = alerts.filter((a) => a.status === 'OPEN').length;
  const dispatchedCount = alerts.filter((a) => a.status === 'DISPATCHED').length;
  const resolvedCount = alerts.filter((a) => a.status === 'RESOLVED').length;

  return (
    <div className="space-y-5 animate-fadeIn pb-12">
      {/* Top Header */}
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
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
              <h2 className="text-xl font-heading font-extrabold text-slate-900">
                Emergency SOS & Escalations Desk
              </h2>
            </div>
          </div>
        </div>

        {/* Quick Triage Badges */}
        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>{openCount} Open Critical</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-800 text-xs font-bold flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5 text-amber-600" />
            <span>{dispatchedCount} Dispatched</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{resolvedCount} Resolved</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilterStatus('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            filterStatus === 'ALL'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          All Status ({alerts.length})
        </button>
        <button
          onClick={() => setFilterStatus('OPEN')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            filterStatus === 'OPEN'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-rose-700 hover:bg-rose-50'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          <span>Active & Dispatched ({openCount + dispatchedCount})</span>
        </button>
        <button
          onClick={() => setFilterStatus('RESOLVED')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            filterStatus === 'RESOLVED'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-emerald-800 hover:bg-emerald-50'
          }`}
        >
          Resolved Archive ({resolvedCount})
        </button>
      </div>

      {/* SOS Cards Roster */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center text-slate-400 text-xs">
            <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <span className="text-sm font-bold text-slate-700 block">No Emergency Alerts Found</span>
            <span>All monitored Chennai corridors are currently operational and secure.</span>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-6 rounded-3xl border transition-all shadow-xs ${
                alert.status === 'OPEN'
                  ? 'bg-white border-rose-300 ring-2 ring-rose-500/10'
                  : alert.status === 'DISPATCHED'
                  ? 'bg-white border-amber-300'
                  : 'bg-slate-50/70 border-slate-200'
              }`}
            >
              {/* Header: Priority, Title, Timestamp */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      alert.status === 'OPEN'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : alert.status === 'DISPATCHED'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-emerald-700 text-white'
                    }`}
                  >
                    {alert.priority} • {alert.status}
                  </span>

                  <h3 className="font-heading font-extrabold text-base text-slate-900">
                    {alert.title}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{alert.triggeredAt}</span>
                </div>
              </div>

              {/* Main Content Info */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Elder Details */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Elder Demographics
                  </span>
                  <div className="font-bold text-sm text-slate-900">{alert.elderName}</div>
                  <div className="text-slate-600">
                    {alert.elderAge} years old • {alert.locality} ({alert.postalCode})
                  </div>
                  {alert.assignedCaregiver && (
                    <div className="text-teal-900 font-medium pt-1">
                      Attendant on shift: <strong className="font-bold">{alert.assignedCaregiver}</strong>
                    </div>
                  )}
                </div>

                {/* Emergency Contact */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Emergency Primary Contact
                  </span>
                  <div className="font-bold text-sm text-slate-900">{alert.emergencyContact}</div>
                  <a
                    href={`tel:${alert.emergencyPhone}`}
                    className="inline-flex items-center gap-1 text-teal-700 font-bold hover:underline pt-1 text-xs"
                  >
                    <Phone className="w-3.5 h-3.5 text-teal-600" />
                    <span>{alert.emergencyPhone}</span>
                  </a>
                </div>

                {/* Escalation Status & Supervisor */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Field Response Status
                  </span>
                  {alert.dispatchedSupervisor ? (
                    <div>
                      <div className="font-bold text-amber-900 flex items-center gap-1">
                        <Send className="w-3.5 h-3.5 text-amber-600" />
                        <span>Supervisor Dispatched</span>
                      </div>
                      <p className="text-slate-700 text-[11px] mt-0.5">{alert.dispatchedSupervisor}</p>
                    </div>
                  ) : alert.status === 'RESOLVED' ? (
                    <div>
                      <div className="font-bold text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Incident Resolved</span>
                      </div>
                      <p className="text-slate-600 text-[11px] mt-0.5">{alert.resolutionNotes}</p>
                    </div>
                  ) : (
                    <div className="text-rose-700 font-bold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Pending Corridor Dispatch</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="mt-3 p-3 rounded-2xl bg-rose-50/50 border border-rose-200/60 text-xs text-slate-700">
                <span className="font-bold text-rose-900 mr-1.5">Alert Details:</span>
                <span>{alert.description}</span>
              </div>

              {/* Resolution Form if expanding */}
              {resolvingAlertId === alert.id && (
                <div className="mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2 animate-fadeIn text-xs">
                  <label className="block font-bold text-emerald-950">
                    Enter Incident Resolution Notes:
                  </label>
                  <input
                    type="text"
                    value={resolutionNotesInput}
                    onChange={(e) => setResolutionNotesInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-emerald-300 text-xs bg-white text-slate-800"
                    placeholder="e.g. Attendant verified vitals normalized, emergency contacts informed..."
                  />
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setResolvingAlertId(null)}
                      className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleConfirmResolve(alert.id)}
                      className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow-xs"
                    >
                      Confirm Resolved
                    </button>
                  </div>
                </div>
              )}

              {/* Actions Bar */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <button
                  onClick={() => onViewOnMap(alert.latitude, alert.longitude)}
                  className="text-xs font-bold text-teal-800 hover:text-teal-950 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 transition"
                >
                  <MapPin className="w-3.5 h-3.5 text-teal-600" />
                  <span>View on Live Map</span>
                </button>

                {alert.status !== 'RESOLVED' && (
                  <div className="flex items-center gap-2">
                    {alert.status === 'OPEN' && (
                      <button
                        onClick={() => setSelectedAlertForDispatch(alert)}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition active:scale-95"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Dispatch Supervisor</span>
                      </button>
                    )}

                    <button
                      onClick={() => setResolvingAlertId(alert.id)}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition active:scale-95"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Resolved</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal for Supervisor Dispatch */}
      <SupervisorDispatchModal
        alert={selectedAlertForDispatch}
        onClose={() => setSelectedAlertForDispatch(null)}
        onConfirmDispatch={onDispatchSupervisor}
      />
    </div>
  );
};
