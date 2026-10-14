import React, { useState } from 'react';
import { ShieldAlert, PhoneCall, AlertTriangle, RefreshCw, X, CheckCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { caregiverApi } from '../../services/api';
import type { ShiftDetails } from '../../types';

interface SosModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftDetails: ShiftDetails;
  onSuccess: () => void;
}

export const SosModal: React.FC<SosModalProps> = ({
  isOpen,
  onClose,
  shiftDetails,
  onSuccess,
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState<'CONFIRM' | 'SUCCESS'>('CONFIRM');
  const [incidentData, setIncidentData] = useState<any>(null);

  if (!isOpen || !shiftDetails.elder) return null;

  const handleTriggerSos = async () => {
    setLoading(true);
    setError(null);

    let latitude: number | undefined;
    let longitude: number | undefined;

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const pos: any = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
        });
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } catch {
        // Fallback to elder coordinates
        latitude = shiftDetails.elder?.latitude;
        longitude = shiftDetails.elder?.longitude;
      }
    }

    if (!shiftDetails.elder) {
      setError('No elder profile assigned to create incident.');
      setLoading(false);
      return;
    }

    try {
      const incident = await caregiverApi.triggerSos({
        elderId: shiftDetails.elder.id,
        shiftId: shiftDetails.shift?.id,
        latitude,
        longitude,
        notes: notes.trim() || 'Immediate assistance requested by caregiver at patient residence.',
      });
      setIncidentData(incident);
      setStep('SUCCESS');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to trigger SOS alert');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-red-300 overflow-hidden max-h-[90dvh] flex flex-col animate-in fade-in slide-in-from-bottom duration-200">
        {/* Banner */}
        <div className="bg-red-600 px-4 sm:px-5 py-3.5 sm:py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-white/20 rounded-xl shrink-0">
              <ShieldAlert className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base truncate">{t('sosButton')}</h3>
              <p className="text-red-100 text-xs truncate">Priority 1 Emergency Escalation</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 pb-safe">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {step === 'CONFIRM' ? (
            <div className="space-y-4">
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl">
                <h4 className="font-bold text-xs text-red-900 mb-1">{t('sosConfirmTitle')}</h4>
                <p className="text-xs text-red-700 leading-relaxed">{t('sosConfirmDesc')}</p>
              </div>

              {/* Direct 108 Ambulance Hotline Notice */}
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-amber-900">Direct Emergency Ambulance (108)</h5>
                  <p className="text-[11px] text-amber-800 leading-snug mt-0.5">
                    {t('sosHotlineNote')}
                  </p>
                  <a
                    href="tel:108"
                    className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Call 108 Now</span>
                  </a>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Emergency Situation Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe patient condition: e.g. severe breathlessness, fall injury, sudden chest pain..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 px-4 min-h-[48px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors touch-action-manipulation"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleTriggerSos}
                  className="py-3 px-4 min-h-[48px] bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 touch-action-manipulation"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                  <span>{t('confirmSos')}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-3 space-y-3">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-900">CareConnect Incident Created</h4>
                <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto leading-relaxed">
                  Incident ticket #{incidentData?.id?.slice(0, 8)} recorded in CareConnect. Operations desk & family sponsor alerted.
                </p>
              </div>

              {/* Explicit ambulance notice */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <PhoneCall className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Ambulance Hotline Note:</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-snug">
                  Emergency ambulance is <strong>not</strong> automatically dispatched. If life-saving emergency medical assistance is needed immediately, call the national ambulance service now:
                </p>
                <a
                  href="tel:108"
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-3 min-h-[44px] bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors touch-action-manipulation"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Call 108 Emergency Ambulance</span>
                </a>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Elder:</span>
                  <span className="font-semibold text-slate-800">{shiftDetails.elder.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Priority:</span>
                  <span className="font-bold text-red-600">P1 Emergency</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Operations Status:</span>
                  <span className="font-semibold text-amber-700">Triage Escalation Open</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-4 min-h-[48px] bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md transition-colors touch-action-manipulation"
              >
                Close & Return to Shift
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
