import React, { useState, useEffect } from 'react';
import { IndianRupee, TrendingUp, Clock, CheckCircle2, ShieldCheck, AlertCircle, RefreshCw, Calendar, ArrowUpRight, Filter, FileText, User } from 'lucide-react';
import { caregiverApi } from '../../services/api';
import type { PayoutSummary, ShiftEarningItem, ElderEarningGroup, PayoutHistoryItem } from '../../types';

export const PayoutScreen: React.FC = () => {
  const [period, setPeriod] = useState<string>('this_month');
  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [shiftEarnings, setShiftEarnings] = useState<ShiftEarningItem[]>([]);
  const [elderEarnings, setElderEarnings] = useState<ElderEarningGroup[]>([]);
  const [payoutHistory, setPayoutHistory] = useState<PayoutHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'SHIFTS' | 'ELDERS' | 'HISTORY'>('SHIFTS');

  const loadFinancialData = async () => {
    setLoading(true);
    try {
      const [sumRes, shiftsRes, eldersRes, histRes] = await Promise.all([
        caregiverApi.getPayoutSummary(period),
        caregiverApi.getShiftEarnings(period),
        caregiverApi.getEarningsByElder(),
        caregiverApi.getPayoutHistory(),
      ]);
      setSummary(sumRes);
      setShiftEarnings(shiftsRes);
      setElderEarnings(eldersRes);
      setPayoutHistory(histRes);
    } catch (err) {
      console.error('Failed to load financial data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinancialData();
  }, [period]);

  const periodOptions = [
    { id: 'this_week', label: 'This Week' },
    { id: 'this_month', label: 'This Month' },
    { id: 'last_month', label: 'Last Month' },
    { id: 'all', label: 'All Time' },
  ];

  return (
    <div className="px-3 sm:px-4 py-3 sm:py-4 space-y-4 max-w-md mx-auto pb-28 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-200 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-black text-slate-900 tracking-tight">Earnings & Payouts</h1>
          <p className="text-xs text-slate-500 mt-0.5">Auditable financial ledger</p>
        </div>
        <div className="p-2 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-200">
          <IndianRupee className="w-5 h-5 text-emerald-600" />
        </div>
      </div>

      {/* Selectable Period Filter Pills (Requirement 6) */}
      <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 overflow-x-auto text-xs">
        {periodOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setPeriod(opt.id)}
            className={`flex-1 min-w-[75px] py-1.5 px-2.5 rounded-xl font-bold transition-all text-center whitespace-nowrap cursor-pointer ${
              period === opt.id
                ? 'bg-white text-primary shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mb-2" />
          <p className="text-xs font-semibold">Reconciling financial records...</p>
        </div>
      ) : (
        <>
          {/* Main Total Balance Card */}
          <div className="bg-gradient-to-br from-primary via-teal-800 to-teal-900 text-white rounded-3xl p-5 shadow-md space-y-4">
            <div className="flex items-center justify-between text-teal-200 text-xs">
              <span className="font-bold uppercase tracking-wider">Gross Total Earned</span>
              <span className="bg-teal-700/60 px-2 py-0.5 rounded-full text-[10px] font-extrabold text-teal-100">
                {summary?.shiftsCount || 0} Shift{(summary?.shiftsCount || 0) === 1 ? '' : 's'}
              </span>
            </div>
            <div>
              <div className="text-3xl font-black tracking-tight flex items-baseline gap-1">
                <span className="text-xl text-teal-300">₹</span>
                <span>{summary?.totalEarned?.toLocaleString('en-IN') || '0'}</span>
              </div>
              <p className="text-[11px] text-teal-200 mt-1">Authoritative persisted ledger • Direct deposit</p>
            </div>

            {/* 3 Metric Breakdown Cards (Earned, Pending, Paid) */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-teal-700/60 text-center">
              <div className="bg-teal-800/40 p-2 rounded-xl">
                <span className="text-[10px] text-teal-300 block font-semibold">Pending</span>
                <span className="text-xs font-extrabold text-amber-300">
                  ₹{summary?.pendingPayout?.toLocaleString('en-IN') || '0'}
                </span>
              </div>
              <div className="bg-teal-800/40 p-2 rounded-xl">
                <span className="text-[10px] text-teal-300 block font-semibold">Approved</span>
                <span className="text-xs font-extrabold text-teal-100">
                  ₹{summary?.approvedPayout?.toLocaleString('en-IN') || '0'}
                </span>
              </div>
              <div className="bg-teal-800/40 p-2 rounded-xl">
                <span className="text-[10px] text-teal-300 block font-semibold">Paid Out</span>
                <span className="text-xs font-extrabold text-emerald-300">
                  ₹{summary?.paidPayout?.toLocaleString('en-IN') || '0'}
                </span>
              </div>
            </div>
          </div>

          {/* Sub-tabs: Shifts vs Care Seekers vs Payout History */}
          <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab('SHIFTS')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'SHIFTS' ? 'bg-teal-50 text-primary border border-teal-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              By Shift ({shiftEarnings.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ELDERS')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ELDERS' ? 'bg-teal-50 text-primary border border-teal-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              By Care Seeker ({elderEarnings.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('HISTORY')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'HISTORY' ? 'bg-teal-50 text-primary border border-teal-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              History ({payoutHistory.length})
            </button>
          </div>

          {/* Section 1: By Completed Shift */}
          {activeTab === 'SHIFTS' && (
            <div className="space-y-2.5">
              {shiftEarnings.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-slate-300 text-slate-500">
                  <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-semibold">No shift earnings recorded for the selected period.</p>
                </div>
              ) : (
                shiftEarnings.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-sm text-slate-900 truncate">{item.elderName}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 shrink-0">
                          {item.hoursWorked}h
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">{item.shiftDate}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-slate-900 block">
                        +₹{item.earnedAmount.toLocaleString('en-IN')}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold inline-block mt-0.5 ${
                          item.status === 'PAID'
                            ? 'text-emerald-700'
                            : item.status === 'INCLUDED_IN_PAYOUT'
                            ? 'text-teal-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {item.status === 'PAID' ? '✓ Paid' : item.status === 'INCLUDED_IN_PAYOUT' ? '● In Batch' : '● Accrued'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Section 2: Grouped by Care Seeker / Elder */}
          {activeTab === 'ELDERS' && (
            <div className="space-y-2.5">
              {elderEarnings.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-slate-300 text-slate-500">
                  <User className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-semibold">No care seeker earnings recorded.</p>
                </div>
              ) : (
                elderEarnings.map((group) => (
                  <div
                    key={group.elderId}
                    className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between gap-3"
                  >
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">{group.elderName}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {group.locality || 'Chennai'} • {group.shiftsCompleted} completed shift{group.shiftsCompleted === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-base font-black text-slate-900 block">
                        ₹{group.totalEarned.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500">Total compensation</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Section 3: Payout History & Auditable Dates */}
          {activeTab === 'HISTORY' && (
            <div className="space-y-2.5">
              {payoutHistory.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-slate-300 text-slate-500">
                  <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-semibold">No historical payout batches generated yet.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Payout batches are generated weekly by Operations.</p>
                </div>
              ) : (
                payoutHistory.map((hist) => (
                  <div
                    key={hist.id}
                    className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs font-extrabold text-slate-900 block">
                          {hist.payoutNumber}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {hist.periodStart} – {hist.periodEnd}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                          hist.status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-teal-50 text-teal-800 border-teal-300'
                        }`}
                      >
                        {hist.status}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Net Payout:</span>
                        <span className="font-black text-slate-900">₹{hist.netPayoutAmount.toLocaleString('en-IN')}</span>
                      </div>
                      {hist.deductionsAmount > 0 && (
                        <div className="text-right">
                          <span className="text-slate-500 block text-[10px]">Deductions (TDS):</span>
                          <span className="font-semibold text-rose-600">-₹{hist.deductionsAmount.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                    </div>

                    {hist.providerReference && (
                      <p className="text-[10px] font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100 truncate">
                        Bank UTR / Ref: {hist.providerReference}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
