import React, { useState } from 'react';
import { LogOut, CheckCircle2, AlertTriangle, RefreshCw, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { caregiverApi } from '../../services/api';
import type { ShiftDetails } from '../../types';

interface CheckOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftDetails: ShiftDetails;
  onSuccess: () => void;
}

export const CheckOutModal: React.FC<CheckOutModalProps> = ({
  isOpen,
  onClose,
  shiftDetails,
  onSuccess,
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState(
    'All planned daily care activities completed. Vitals stable. Elder rested comfortably.'
  );

  if (!isOpen || !shiftDetails.shift) return null;

  const handleCheckOut = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let latitude: number | undefined;
    let longitude: number | undefined;

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const pos: any = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
        });
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } catch {
        // Continue even if GPS timed out
      }
    }

    if (!shiftDetails.shift) {
      setError('No active shift found to check out.');
      setLoading(false);
      return;
    }

    try {
      await caregiverApi.checkOut(shiftDetails.shift.id, {
        latitude,
        longitude,
        summary,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Check-out failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90dvh] flex flex-col animate-in fade-in slide-in-from-bottom duration-200">
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 bg-slate-200 text-slate-700 rounded-xl shrink-0">
              <LogOut className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-slate-900 truncate">{t('checkOut')}</h3>
              <p className="text-[11px] text-slate-500 truncate">
                End active duty for today's assignment
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCheckOut} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 pb-safe">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
              Shift Handover / Care Summary
            </label>
            <textarea
              required
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Summarize elder meals, medicine intake, mobility, and state for family review."
              className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:outline-none"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              This summary will be saved to the permanent family timeline.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Shift will transition to CHECKED_OUT and archive records.</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="min-h-[44px] py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              <span>{t('checkOut')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
