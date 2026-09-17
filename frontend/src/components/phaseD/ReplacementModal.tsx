import React, { useState } from 'react';
import type { CareAssignment, ReplacementReasonCode } from '../../types';
import { api } from '../../services/api';
import { 
  X, 
  ShieldAlert, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Loader2
} from 'lucide-react';

interface ReplacementModalProps {
  assignment: CareAssignment;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const REASONS: { code: ReplacementReasonCode; title: string; desc: string }[] = [
  {
    code: 'ILLNESS',
    title: 'Attendant Illness / Medical Emergency',
    desc: 'Caregiver is sick or has an urgent personal health emergency.'
  },
  {
    code: 'ABSENCE',
    title: 'Unscheduled Absence or Habitual Tardiness',
    desc: 'Caregiver missed shifts or arrives late repeatedly.'
  },
  {
    code: 'PERFORMANCE',
    title: 'Performance & Care Quality Concerns',
    desc: 'Tasks or hygiene standards not meeting expectations.'
  },
  {
    code: 'LANGUAGE_OR_CULTURE',
    title: 'Language or Cultural Mismatch',
    desc: 'Elder prefers a specific dialect (e.g. Tamil) or dietary cultural familiarity.'
  },
  {
    code: 'COMMUNICATION',
    title: 'Communication & Responsiveness Gap',
    desc: 'Difficulty communicating daily updates or vitals with family.'
  },
  {
    code: 'SAFETY_CONCERN',
    title: 'Safety or Clinical Protocol Concern',
    desc: 'Deviation from mobility assistance or medication guidelines.'
  },
  {
    code: 'CHANGED_CARE_NEEDS',
    title: "Elder's Care Requirements Changed",
    desc: 'Elder requires higher nursing support (e.g. catheter, tracheostomy, physiotherapy).'
  },
  {
    code: 'OTHER',
    title: 'Other Considerations',
    desc: 'Family personal circumstances or schedule adjustment.'
  }
];

export const ReplacementModal: React.FC<ReplacementModalProps> = ({
  assignment,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [selectedReason, setSelectedReason] = useState<ReplacementReasonCode>('LANGUAGE_OR_CULTURE');
  const [priority, setPriority] = useState<'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await api.createReplacementRequest({
        assignmentId: assignment.id,
        reasonCode: selectedReason,
        notes: notes.trim() || undefined,
        priority: priority
      });
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
        setIsSuccess(false);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit replacement request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Request Caregiver Replacement</h2>
              <p className="text-xs text-slate-500">
                Current Attendant: <strong className="text-slate-700">{assignment.caregiver?.fullName || 'Assigned Caregiver'}</strong>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {isSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Replacement Request Submitted</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Our Chennai Operations Care Manager has received your request and is matching an attendant from the vetted Buffer Pool.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Submission Notice</span>
                  {error}
                </div>
              </div>
            )}

            {/* SLA Trust Banner */}
            <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-teal-700 shrink-0" />
              <p className="leading-relaxed">
                <strong>Chennai Care Operations SLA:</strong> Requests are triaged within 2 hours. A clinical supervisor will contact you to confirm candidate preferences before any replacement is sent.
              </p>
            </div>

            {/* Reason Selection Grid */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Primary Reason for Replacement <span className="text-rose-600">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {REASONS.map(r => {
                  const isSelected = selectedReason === r.code;
                  return (
                    <button
                      key={r.code}
                      type="button"
                      onClick={() => setSelectedReason(r.code)}
                      className={`p-3 rounded-xl border text-left transition text-xs flex flex-col justify-between ${
                        isSelected 
                          ? 'border-teal-700 bg-teal-50/60 ring-2 ring-teal-700/20 text-teal-950 font-medium'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="font-bold text-slate-900 mb-1">{r.title}</span>
                      <span className="text-[11px] text-slate-500 leading-snug">{r.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Urgency / Priority Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Urgency Level
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'NORMAL', label: 'Standard (24–48 hrs)', desc: 'Regular scheduling' },
                  { value: 'HIGH', label: 'Urgent (Next Shift)', desc: 'Immediate need' },
                  { value: 'URGENT', label: 'Emergency (Same Day)', desc: 'Immediate dispatch' }
                ].map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value as any)}
                    className={`p-2.5 rounded-xl border text-center transition ${
                      priority === p.value
                        ? 'border-teal-700 bg-teal-50 text-teal-950 font-bold'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs">{p.label}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes / Details */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block flex items-center justify-between">
                <span>Additional Notes & Specific Preferences (Optional)</span>
                <span className="text-[10px] text-slate-400 font-normal">Max 500 chars</span>
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="e.g. Mother prefers a caregiver who speaks Tamil and has experience with physiotherapy walking assistance..."
                className="w-full text-xs rounded-xl border border-slate-200 p-3 focus:border-teal-700 focus:ring-1 focus:ring-teal-700 outline-none transition"
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-[48px] px-6 py-2.5 rounded-xl text-xs font-bold bg-teal-900 hover:bg-teal-800 text-white transition flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <span>Submit Replacement Request</span>
                )}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
