import React, { useState, useEffect } from 'react';
import {
  X,
  Briefcase,
  CheckCircle2,
  Calendar,
  IndianRupee,
  Clock,
  TrendingUp,
  MapPin,
  RefreshCw,
  Award,
} from 'lucide-react';
import { caregiverApi } from '../../services/api';
import type { WorkHistoryResponse } from '../../types';

interface WorkHistoryAndEarningsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkHistoryAndEarningsModal: React.FC<WorkHistoryAndEarningsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [data, setData] = useState<WorkHistoryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await caregiverApi.getWorkHistory();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch work history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90dvh] animate-slideUp sm:animate-zoomIn text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-gradient-to-r from-teal-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-emerald-300" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base truncate">My Work & Earnings</h3>
              <p className="text-[10px] sm:text-[11px] text-teal-200 truncate">Completed Care Shifts & Payout Summary</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500">
              <RefreshCw className="w-7 h-7 animate-spin text-teal-600 mb-2" />
              <p className="text-xs font-semibold">Loading earnings and completed work...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs text-center">
              {error}
            </div>
          ) : (
            <>
              {/* Earnings Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold opacity-90">Total Earned</span>
                    <IndianRupee className="w-4 h-4 opacity-80" />
                  </div>
                  <p className="text-xl sm:text-2xl font-black">₹{data?.earnings.totalEarned.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] opacity-80 mt-0.5 sm:mt-1">From {data?.earnings.shiftsCompleted} completed shift(s)</p>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold text-slate-500">Daily Rate</span>
                    <Award className="w-4 h-4 text-teal-600" />
                  </div>
                  <p className="text-xl sm:text-2xl font-black text-slate-900">
                    ₹{data?.earnings.dailyRate.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10px] text-teal-700 font-semibold mt-0.5 sm:mt-1">Direct Bank Deposit</p>
                </div>
              </div>

              {/* Active Work Card if running */}
              {data?.activeShift && (
                <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 bg-teal-100 px-2 py-0.5 rounded-full">
                      Current Active Job
                    </span>
                    <span className="text-xs font-bold text-teal-900">{data.activeShift.status}</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">{data.activeShift.elderName}</h4>
                  <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                    <span>{data.activeShift.locality}</span>
                    <span>•</span>
                    <span>{data.activeShift.shiftType}</span>
                  </p>
                </div>
              )}

              {/* Completed Work History */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-700" />
                  <span>Completed Care Shifts ({data?.completedShifts.length || 0})</span>
                </h4>

                {data?.completedShifts.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6">
                    <p className="text-xs font-semibold text-slate-600">No completed shifts yet.</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Your completed care sessions and daily earnings will appear here after shift checkout.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {data?.completedShifts.map((shift) => (
                      <div
                        key={shift.shiftId}
                        className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h5 className="font-bold text-xs text-slate-900">{shift.elderName}</h5>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{shift.date}</span>
                              <span>•</span>
                              <span>{shift.hours}</span>
                            </p>
                            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" />
                              <span>{shift.locality}</span>
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-xs font-black text-emerald-700">+₹{shift.earnings.toLocaleString('en-IN')}</p>
                          <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-0.5">
                            {shift.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 pb-safe">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors min-h-[44px]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
