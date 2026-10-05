import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  Send,
  ShieldAlert,
} from 'lucide-react';
import type { AdminSosAlert } from '../types';

interface SupervisorDispatchModalProps {
  alert: AdminSosAlert | null;
  onClose: () => void;
  onConfirmDispatch: (alertId: string, supervisorName: string, notes: string) => void;
}

export const SupervisorDispatchModal: React.FC<SupervisorDispatchModalProps> = ({
  alert,
  onClose,
  onConfirmDispatch,
}) => {
  const [selectedSupervisor, setSelectedSupervisor] = useState('K. Balaji (Clinical Lead - Central)');
  const [instructions, setInstructions] = useState('Immediate dispatch for on-site triage & family liaison.');

  if (!alert) return null;

  const supervisors = [
    'K. Balaji (Clinical Lead - Central Chennai Corridor)',
    'Dr. Aruna Natarajan (Field Supervisor - South Chennai)',
    'R. Sathish (Emergency Rapid Response Attendant)',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmDispatch(alert.id, selectedSupervisor, instructions);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="bg-rose-600 text-white p-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-base font-heading font-extrabold">Dispatch Corridor Supervisor</h3>
              <p className="text-xs text-rose-100">SOS Escalation for {alert.elderName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-rose-700 text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-slate-800">
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
            <div className="font-extrabold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>{alert.title}</span>
            </div>
            <p className="text-rose-800">{alert.description}</p>
            <div className="pt-1 text-[11px] text-rose-700">
              Location: <span className="font-bold">{alert.locality} ({alert.postalCode})</span> • Contact: <span className="font-bold">{alert.emergencyPhone}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Select Field Supervisor:
            </label>
            <select
              value={selectedSupervisor}
              onChange={(e) => setSelectedSupervisor(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 font-medium focus:ring-2 focus:ring-rose-500/30"
            >
              {supervisors.map((s, idx) => (
                <option key={idx} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Escalation Directive / Instructions:
            </label>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Conduct in-person vitals check and confirm ambulance standby if pulse remains high..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-rose-500/30"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Confirm & Dispatch</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
