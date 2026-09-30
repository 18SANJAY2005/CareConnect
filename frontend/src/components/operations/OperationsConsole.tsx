import React, { useState, useEffect } from "react";
import { ShieldAlert, Activity, UserCheck, RefreshCw } from "lucide-react";
import { CareConnectLogo } from "../common/CareConnectLogo";
import { api } from "../../services/api";
import type {
  LiveShiftMonitorItem,
  VitalAlertItem,
  Incident,
} from "../../types/phaseC";

export const OperationsConsole: React.FC = () => {
  const [activeSection, setActiveSection] = useState<
    "MONITOR" | "INCIDENTS" | "VITAL_ALERTS"
  >("MONITOR");
  const [shifts, setShifts] = useState<LiveShiftMonitorItem[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [vitalAlerts, setVitalAlerts] = useState<VitalAlertItem[]>([]);
  const [shiftFilter, setShiftFilter] = useState<string>("ALL");
  const [, setIsLoading] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string>("");

  // Selected incident for action
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
    null,
  );
  const [escalationAction, setEscalationAction] = useState<string>("");
  const [resolutionNotes, setResolutionNotes] = useState<string>("");

  // Override dialog
  const [overrideShiftId, setOverrideShiftId] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState<string>(
    "Family confirmed caregiver presence at door.",
  );

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [monitorData, incData, alertsData] = await Promise.all([
        api.getLiveShiftMonitor(),
        api.getIncidentDesk(),
        api.getVitalAlerts(),
      ]);
      setShifts(monitorData);
      setIncidents(incData);
      setVitalAlerts(alertsData);
      if (incData.length > 0 && !selectedIncident) {
        setSelectedIncident(incData[0]);
      }
    } catch (err: any) {
      setStatusMessage("Error loading operations data: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 10000); // 10s auto-refresh
    return () => clearInterval(interval);
  }, []);

  const handleSupervisorOverride = async () => {
    if (!overrideShiftId) return;
    try {
      await api.supervisorOverride(overrideShiftId, overrideReason);
      setStatusMessage("Supervisor override approved! Shift moved to ACTIVE.");
      setOverrideShiftId(null);
      loadAllData();
    } catch (err: any) {
      setStatusMessage("Override failed: " + err.message);
    }
  };

  const handleAcknowledgeIncident = async (incId: string) => {
    try {
      const updated = await api.acknowledgeIncident(incId);
      setStatusMessage("P1 Incident ACKNOWLEDGED. Response timer recorded.");
      setSelectedIncident(updated);
      loadAllData();
    } catch (err: any) {
      setStatusMessage("Acknowledge failed: " + err.message);
    }
  };

  const handleEscalateIncident = async () => {
    if (!selectedIncident || !escalationAction.trim()) return;
    try {
      const updated = await api.escalateIncident(
        selectedIncident.id,
        escalationAction,
      );
      setStatusMessage("Escalation action recorded in audit log.");
      setSelectedIncident(updated);
      setEscalationAction("");
      loadAllData();
    } catch (err: any) {
      setStatusMessage("Escalation failed: " + err.message);
    }
  };

  const handleResolveIncident = async () => {
    if (!selectedIncident || !resolutionNotes.trim()) return;
    try {
      const updated = await api.resolveIncident(
        selectedIncident.id,
        resolutionNotes,
      );
      setStatusMessage("Incident successfully RESOLVED and closed.");
      setSelectedIncident(updated);
      setResolutionNotes("");
      loadAllData();
    } catch (err: any) {
      setStatusMessage("Resolution failed: " + err.message);
    }
  };

  const handleAcknowledgeVital = async (vitalId: string) => {
    try {
      await api.acknowledgeVitalAlert(vitalId);
      setStatusMessage("Vital alert acknowledged.");
      loadAllData();
    } catch (err: any) {
      setStatusMessage("Failed to acknowledge vital alert: " + err.message);
    }
  };

  const filteredShifts =
    shiftFilter === "ALL"
      ? shifts
      : shifts.filter((s) => s.status === shiftFilter);

  const activeP1Count = incidents.filter(
    (i) => i.priority === "P1" && i.status !== "RESOLVED",
  ).length;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-6 text-slate-900 font-sans">
      {/* Ops Header Bar */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <CareConnectLogo size="md" variant="inverted" />
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-teal-300 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              <span>Care Operations Desk</span>
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              Active Care Command Console
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Live shift verification, P1 emergency escalation, and vital alert
              triage across active hubs.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadAllData}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => setActiveSection("MONITOR")}
          className={`p-5 rounded-2xl border text-left transition shadow-sm ${
            activeSection === "MONITOR"
              ? "bg-teal-50 border-teal-300 ring-2 ring-teal-500/20"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Live Shifts
            </span>
            <UserCheck className="w-5 h-5 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {shifts.filter((s) => s.status === "ACTIVE").length}{" "}
            <span className="text-xs font-semibold text-slate-500">
              / {shifts.length} Active
            </span>
          </div>
          <span className="text-[11px] text-teal-700 font-semibold mt-1 block">
            {shifts.filter((s) => s.status === "EXCEPTION").length} Geofence
            Exceptions
          </span>
        </button>

        <button
          onClick={() => setActiveSection("INCIDENTS")}
          className={`p-5 rounded-2xl border text-left transition shadow-sm ${
            activeSection === "INCIDENTS"
              ? "bg-red-50 border-red-300 ring-2 ring-red-500/20"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Incident Desk
            </span>
            <ShieldAlert className="w-5 h-5 text-error" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {activeP1Count}{" "}
            <span className="text-xs font-semibold text-red-600">
              Active P1 SOS
            </span>
          </div>
          <span className="text-[11px] text-red-700 font-semibold mt-1 block">
            SLA: Response under 2 mins
          </span>
        </button>

        <button
          onClick={() => setActiveSection("VITAL_ALERTS")}
          className={`p-5 rounded-2xl border text-left transition shadow-sm ${
            activeSection === "VITAL_ALERTS"
              ? "bg-amber-50 border-amber-300 ring-2 ring-amber-500/20"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Vital Alerts
            </span>
            <Activity className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {vitalAlerts.length}{" "}
            <span className="text-xs font-semibold text-amber-600">
              Pending Triage
            </span>
          </div>
          <span className="text-[11px] text-amber-700 font-semibold mt-1 block">
            Operational thresholds flagged
          </span>
        </button>
      </div>

      {statusMessage && (
        <div className="p-3 bg-teal-50 border border-teal-300 rounded-xl text-xs font-semibold text-teal-900 flex items-center justify-between">
          <span>{statusMessage}</span>
          <button
            onClick={() => setStatusMessage("")}
            className="font-bold text-teal-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* SECTION 1: LIVE SHIFT MONITOR */}
      {activeSection === "MONITOR" && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Live Shift Monitor
              </h3>
              <p className="text-xs text-slate-500">
                Real-time attendance, proximity distance, and supervisor
                overrides
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              {(
                [
                  "ALL",
                  "ACTIVE",
                  "SCHEDULED",
                  "EXCEPTION",
                  "LATE",
                  "CHECKED_OUT",
                ] as const
              ).map((st) => (
                <button
                  key={st}
                  onClick={() => setShiftFilter(st)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    shiftFilter === st
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Elder & Locality</th>
                  <th className="py-3 px-3">Caregiver</th>
                  <th className="py-3 px-3">Proximity</th>
                  <th className="py-3 px-3">Check-In Time</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredShifts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No shifts match the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredShifts.map((s) => (
                    <tr
                      key={s.shiftId}
                      className="hover:bg-slate-50 transition"
                    >
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                            s.status === "ACTIVE"
                              ? "bg-emerald-100 text-tertiary border border-emerald-300"
                              : s.status === "EXCEPTION"
                                ? "bg-amber-100 text-amber-900 border border-amber-300"
                                : s.status === "LATE"
                                  ? "bg-rose-100 text-rose-900 border border-rose-300"
                                  : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <strong className="text-slate-900 block text-xs">
                          {s.elderName}
                        </strong>
                        <span className="text-[11px] text-slate-500">
                          {s.locality}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="text-slate-800">
                          {s.caregiverName}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        {s.distanceMeters !== undefined &&
                        s.distanceMeters !== null ? (
                          <span
                            className={`font-mono text-xs ${s.distanceMeters > 200 ? "text-amber-700 font-bold" : "text-slate-700"}`}
                          >
                            {Math.round(s.distanceMeters)}m (
                            {s.verificationStatus})
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-600 text-[11px]">
                        {s.checkInTime
                          ? new Date(s.checkInTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        {s.status === "EXCEPTION" && (
                          <button
                            onClick={() => setOverrideShiftId(s.shiftId)}
                            className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] rounded-lg transition"
                          >
                            Supervisor Override
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 2: INCIDENT DESK (P1 EMERGENCY TRIAGE) */}
      {activeSection === "INCIDENTS" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Incidents List (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              Active Emergency Incidents
            </h3>
            {incidents.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                No active incidents reported. All corridors secure.
              </div>
            ) : (
              incidents.map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncident(inc)}
                  className={`p-4 rounded-2xl border cursor-pointer transition text-left space-y-2 ${
                    selectedIncident?.id === inc.id
                      ? "bg-red-50/70 border-error shadow-sm"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-error text-white font-extrabold text-[10px]">
                      {inc.priority} • {inc.status}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {new Date(inc.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {inc.title}
                  </h4>
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {inc.description}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Incident Detail & Escalation Triage (7 cols) */}
          <div className="lg:col-span-7">
            {selectedIncident ? (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
                <div className="border-b pb-4 flex items-start justify-between gap-4">
                  <div>
                    <span className="px-2.5 py-1 rounded bg-error text-white font-black text-xs uppercase">
                      {selectedIncident.priority} EMERGENCY
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-2">
                      {selectedIncident.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1">
                      {selectedIncident.description}
                    </p>
                  </div>

                  {selectedIncident.status === "OPEN" && (
                    <button
                      onClick={() =>
                        handleAcknowledgeIncident(selectedIncident.id)
                      }
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition shrink-0"
                    >
                      Acknowledge Incident
                    </button>
                  )}
                </div>

                {/* Audit Trail Timeline */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Authoritative Audit Trail
                  </h4>
                  <div className="space-y-2">
                    {selectedIncident.timeline?.map((entry, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">
                            {entry.action}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          {entry.note}
                        </p>
                        <span className="text-[10px] text-teal-700 font-semibold block mt-1">
                          Actor: {entry.actor}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Escalation Action Form */}
                {selectedIncident.status !== "RESOLVED" && (
                  <div className="pt-4 border-t space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Log Escalation Action
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={escalationAction}
                          onChange={(e) => setEscalationAction(e.target.value)}
                          placeholder="e.g. Dispatched Apollo ambulance / Contacted Dr. Ramanathan"
                          className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300"
                        />
                        <button
                          onClick={handleEscalateIncident}
                          className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl transition"
                        >
                          Log Action
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Resolution Notes (Close Incident)
                      </label>
                      <div className="flex gap-2">
                        <textarea
                          rows={2}
                          value={resolutionNotes}
                          onChange={(e) => setResolutionNotes(e.target.value)}
                          placeholder="Elder stabilized, family sponsor briefed, normal shift resumed."
                          className="flex-1 p-2 text-xs rounded-xl border border-slate-300"
                        />
                        <button
                          onClick={handleResolveIncident}
                          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition self-end"
                        >
                          Resolve & Close
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                Select an incident from the left to view triage details.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 3: VITAL ALERTS QUEUE */}
      {activeSection === "VITAL_ALERTS" && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="border-b pb-4">
            <h3 className="text-base font-bold text-slate-900">
              Abnormal Vital Operational Alerts
            </h3>
            <p className="text-xs text-slate-500">
              Readings exceeding standard operational bounds flagged for
              caregiver follow-up
            </p>
          </div>

          <div className="space-y-3">
            {vitalAlerts.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">
                No unacknowledged vital alerts in queue.
              </p>
            ) : (
              vitalAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-amber-600 text-white font-extrabold text-[10px] uppercase">
                        {alert.severity}
                      </span>
                      <strong className="text-sm text-slate-900">
                        {alert.elderName}
                      </strong>
                      <span className="text-xs text-slate-500">
                        ({alert.locality})
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 font-medium">
                      {alert.message}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span>BP: {alert.readings.bloodPressure || "—"}</span>
                      <span>•</span>
                      <span>Pulse: {alert.readings.pulse || "—"} bpm</span>
                      <span>•</span>
                      <span>
                        Glucose: {alert.readings.bloodGlucose || "—"} mg/dL
                      </span>
                      <span>•</span>
                      <span>Logged by: {alert.recordedBy}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAcknowledgeVital(alert.id)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shrink-0"
                  >
                    Acknowledge Alert
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Supervisor Override Modal */}
      {overrideShiftId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[400px] rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Authorize Supervisor Override
            </h3>
            <p className="text-xs text-slate-600">
              Caregiver checked in outside the 200m geofence radius. Confirm
              authorization to override and set status to ACTIVE.
            </p>
            <textarea
              rows={2}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              className="w-full p-2 text-xs border border-slate-300 rounded-xl"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setOverrideShiftId(null)}
                className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSupervisorOverride}
                className="flex-1 py-2 text-xs font-bold text-white bg-primary rounded-xl"
              >
                Approve Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
