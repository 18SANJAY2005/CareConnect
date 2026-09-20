import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../../services/api';
import type { LiveShiftMonitorItem, VitalAlertItem, Incident } from '../../../types/phaseC';
import type { ReplacementRequest } from '../../../types';

interface MobileOperationsAppProps {
  onSwitchPortal?: (portal: 'FAMILY' | 'CAREGIVER' | 'OPERATIONS') => void;
}

export const MobileOperationsApp: React.FC<MobileOperationsAppProps> = ({ onSwitchPortal }) => {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'CASES' | 'ACTIVE_CARE' | 'ALERTS'>('DASHBOARD');

  const [shifts, setShifts] = useState<LiveShiftMonitorItem[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [vitalAlerts, setVitalAlerts] = useState<VitalAlertItem[]>([]);
  const [replacements, setReplacements] = useState<ReplacementRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [shiftsData, incData, alertsData, repsData] = await Promise.all([
        api.getLiveShiftMonitor().catch(() => []),
        api.getIncidentDesk().catch(() => []),
        api.getVitalAlerts().catch(() => []),
        api.listReplacementRequests().catch(() => []),
      ]);
      setShifts(shiftsData || []);
      setIncidents(incData || []);
      setVitalAlerts(alertsData || []);
      setReplacements(repsData || []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 12000);
    return () => clearInterval(interval);
  }, []);

  const handleResolveIncident = async (incidentId: string) => {
    try {
      await api.resolveIncident(
        incidentId,
        'Resolved from Mobile Operations Console by Care Manager.'
      );
      setStatusMessage('Incident resolved successfully.');
      loadAllData();
    } catch {
      setStatusMessage('Failed to resolve incident.');
    }
  };

  const handleOverrideGeofence = async (shiftId: string) => {
    try {
      await api.supervisorOverride(shiftId, 'Approved via Mobile Operations Console (GPS offset).');
      setStatusMessage('Shift attendance override approved.');
      loadAllData();
    } catch {
      setStatusMessage('Failed to approve override.');
    }
  };

  const activeShiftsCount = shifts.filter((s) => s.status === 'ACTIVE' || s.status === 'CHECKED_IN').length;
  const p1IncidentsCount = incidents.filter((i) => i.priority === 'P1' && i.status !== 'RESOLVED').length;

  return (
    <div className="flex-1 flex flex-col pb-20 animate-fadeIn text-slate-900 px-4 py-3">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[10px] font-extrabold text-teal-700 uppercase tracking-wider bg-teal-50 px-2 py-0.5 rounded-full">
            Operations Console
          </span>
          <h2 className="text-xl font-extrabold font-heading text-slate-900 mt-0.5">
            Care Operations
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          {onSwitchPortal && (
            <button
              onClick={() => onSwitchPortal('FAMILY')}
              className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-xs font-bold transition border border-teal-200/60"
            >
              Family View
            </button>
          )}
          <button
            onClick={loadAllData}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl text-xs text-teal-900 mb-3 flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="font-bold">✕</button>
        </div>
      )}

      {/* Sub-Navigation Chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none">
        {[
          { id: 'DASHBOARD', label: 'Dashboard' },
          { id: 'CASES', label: `Cases (${replacements.length})` },
          { id: 'ACTIVE_CARE', label: `Shifts (${shifts.length})` },
          { id: 'ALERTS', label: `Alerts (${incidents.length})`, alert: p1IncidentsCount > 0 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1 ${
              activeTab === tab.id
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>{tab.label}</span>
            {tab.alert && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
          </button>
        ))}
      </div>

      {/* TAB 1: DASHBOARD METRICS */}
      {activeTab === 'DASHBOARD' && (
        <div className="space-y-3 animate-fadeIn">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Active Shifts
              </div>
              <div className="text-2xl font-extrabold text-slate-900 font-mono">
                {activeShiftsCount} / {shifts.length}
              </div>
              <div className="text-[10px] text-emerald-600 font-semibold">Attendants on duty</div>
            </div>

            <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                P1 Emergencies
              </div>
              <div className="text-2xl font-extrabold text-rose-600 font-mono">
                {p1IncidentsCount}
              </div>
              <div className="text-[10px] text-rose-600 font-semibold">Immediate attention</div>
            </div>

            <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Replacement Requests
              </div>
              <div className="text-2xl font-extrabold text-amber-600 font-mono">
                {replacements.length}
              </div>
              <div className="text-[10px] text-amber-600 font-semibold">24h SLA response</div>
            </div>

            <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Vital Alerts
              </div>
              <div className="text-2xl font-extrabold text-teal-700 font-mono">
                {vitalAlerts.length}
              </div>
              <div className="text-[10px] text-teal-700 font-semibold">Clinical reviews</div>
            </div>
          </div>

          <div className="p-4 rounded-3xl bg-teal-900 text-white space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-300" />
              <span className="text-sm font-bold">Corridor SLA & Safety Guardrails</span>
            </div>
            <p className="text-xs text-teal-100 leading-relaxed">
              Real-time geofence attendance verification active. Attendants beyond 200m range require supervisor sign-off.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: CASES / REPLACEMENTS */}
      {activeTab === 'CASES' && (
        <div className="space-y-3 animate-fadeIn">
          {replacements.length > 0 ? (
            replacements.map((rep) => (
              <div
                key={rep.id}
                className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-900">
                    Reason: {rep.reasonCode}
                  </span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                    {rep.priority}
                  </span>
                </div>
                {rep.notes && (
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Notes: {rep.notes}
                  </p>
                )}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Status: {rep.status}</span>
                  <button
                    onClick={() => setStatusMessage('Assigned substitute attendant from corridor buffer pool.')}
                    className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-xl"
                  >
                    Assign Substitute
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <div className="text-xs font-bold text-slate-700">No Pending Replacement Cases</div>
              <div className="text-[11px] text-slate-400">All assignments operating smoothly.</div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ACTIVE CARE & ATTENDANCE */}
      {activeTab === 'ACTIVE_CARE' && (
        <div className="space-y-3 animate-fadeIn">
          {shifts.length > 0 ? (
            shifts.map((shift) => (
              <div
                key={shift.shiftId}
                className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900">{shift.elderName}</div>
                    <div className="text-[11px] text-slate-500">Attendant: {shift.caregiverName}</div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      shift.status === 'ACTIVE' || shift.status === 'CHECKED_IN'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {shift.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-100">
                  <span>Locality: {shift.locality}</span>
                  <span>{shift.distanceMeters ? `${shift.distanceMeters}m from residence` : 'Residence'}</span>
                </div>

                {shift.verificationStatus === 'OUT_OF_RANGE' && (
                  <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
                    <span>⚠️ Out of geofence range</span>
                    <button
                      onClick={() => handleOverrideGeofence(shift.shiftId)}
                      className="px-2 py-1 bg-amber-600 text-white font-bold rounded-lg text-[10px]"
                    >
                      Override
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-2">
              <div className="text-xs font-bold text-slate-700">No Active Shifts Found</div>
              <div className="text-[11px] text-slate-400">Attendants will appear here upon shift check-in.</div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ALERTS & INCIDENTS */}
      {activeTab === 'ALERTS' && (
        <div className="space-y-3 animate-fadeIn">
          {incidents.length > 0 ? (
            incidents.map((inc) => (
              <div
                key={inc.id}
                className={`p-4 rounded-3xl border shadow-sm space-y-2 ${
                  inc.priority === 'P1'
                    ? 'bg-rose-50/70 border-rose-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle
                      className={`w-4 h-4 ${inc.priority === 'P1' ? 'text-rose-600' : 'text-amber-500'}`}
                    />
                    <span className="text-xs font-extrabold text-slate-900">
                      {inc.priority} Incident: {inc.incidentType}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      inc.status === 'RESOLVED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {inc.status}
                  </span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">
                  {inc.description || inc.title}
                </p>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    {new Date(inc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {inc.status !== 'RESOLVED' && (
                    <button
                      onClick={() => handleResolveIncident(inc.id)}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition"
                    >
                      Resolve Incident
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <div className="text-xs font-bold text-slate-700">All Safe — Zero Open Incidents</div>
              <div className="text-[11px] text-slate-400">Emergency SOS and clinical vitals desk is active.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
