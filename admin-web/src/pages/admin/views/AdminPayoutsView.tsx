import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Download,
  Printer,
  FileText,
  Check,
  X,
  TrendingUp,
} from 'lucide-react';
import type { AdminPayoutRecord } from '../types';
import { initialAdminPayouts } from '../mockData';

interface AdminPayoutsViewProps {
  onBackToDashboard?: () => void;
  onSelectCaregiverByName?: (name: string) => void;
}

export const AdminPayoutsView: React.FC<AdminPayoutsViewProps> = ({
  onBackToDashboard,
  onSelectCaregiverByName,
}) => {
  const [payouts, setPayouts] = useState<AdminPayoutRecord[]>(initialAdminPayouts);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Processed' | 'Pending' | 'Disputed'>('ALL');
  const [dateRangeFilter, setDateRangeFilter] = useState<'ALL' | 'THIS_WEEK' | 'THIS_MONTH' | 'OCTOBER_2026'>('ALL');

  // Selected Receipt Modal State
  const [selectedReceipt, setSelectedReceipt] = useState<AdminPayoutRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filtered Payouts
  const filteredPayouts = useMemo(() => {
    return payouts.filter((p) => {
      // 1. Status Filter
      if (statusFilter !== 'ALL' && p.status !== statusFilter) {
        return false;
      }

      // 2. Search Query (Caregiver Name, Careseeker Name, Transaction / Payout Reference ID)
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === '' ||
        p.id.toLowerCase().includes(q) ||
        p.caregiverName.toLowerCase().includes(q) ||
        p.careseekerName.toLowerCase().includes(q) ||
        (p.bankReference && p.bankReference.toLowerCase().includes(q)) ||
        (p.receiptNumber && p.receiptNumber.toLowerCase().includes(q)) ||
        p.shiftDate.toLowerCase().includes(q);

      // 3. Date Range Filter
      if (dateRangeFilter === 'OCTOBER_2026') {
        if (!p.shiftDate.includes('Oct 2026')) return false;
      } else if (dateRangeFilter === 'THIS_WEEK') {
        const isRecent =
          p.shiftDate.includes('14 Oct') ||
          p.shiftDate.includes('15 Oct') ||
          p.shiftDate.includes('16 Oct');
        if (!isRecent) return false;
      }

      return matchesSearch;
    });
  }, [payouts, statusFilter, searchQuery, dateRangeFilter]);

  // Aggregate Metrics
  const totalDisbursed = payouts
    .filter((p) => p.status === 'Processed')
    .reduce((acc, p) => acc + p.payoutAmount, 0);

  const pendingDisbursements = payouts
    .filter((p) => p.status === 'Pending')
    .reduce((acc, p) => acc + p.payoutAmount, 0);

  const disputedCount = payouts.filter((p) => p.status === 'Disputed').length;

  const handleApproveDisbursement = (payoutId: string) => {
    setPayouts((prev) =>
      prev.map((p) =>
        p.id === payoutId
          ? {
              ...p,
              status: 'Processed' as const,
              processedAt: new Date().toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              }) + ', ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              bankReference: 'HDFC-NEFT-' + Math.floor(100000 + Math.random() * 900000),
            }
          : p
      )
    );
    if (selectedReceipt && selectedReceipt.id === payoutId) {
      setSelectedReceipt((prev) =>
        prev
          ? {
              ...prev,
              status: 'Processed' as const,
              processedAt: 'Just now',
              bankReference: 'HDFC-NEFT-994411',
            }
          : null
      );
    }
    showToast(`Payout #${payoutId} approved and scheduled for automated NEFT batch settlement.`);
  };

  const getStatusBadge = (status: AdminPayoutRecord['status']) => {
    switch (status) {
      case 'Processed':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Processed</span>
          </span>
        );
      case 'Pending':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Pending</span>
          </span>
        );
      case 'Disputed':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200 inline-flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            <span>Disputed</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
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
              <CreditCard className="w-6 h-6 text-teal-700" />
              <span>Caregiver Payout Ledger & Shift History</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Itemized compensation disbursement records, shift receipts, and banking settlement references.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => showToast('Payout ledger export initiated (CSV generated).')}
            className="px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Total Disbursed (Month)
          </span>
          <div className="text-2xl font-black font-heading text-slate-900">
            ₹{totalDisbursed.toLocaleString()}
          </div>
          <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            100% on-time bank transfers
          </p>
        </div>

        {/* KPI 2 */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Pending Settlements
          </span>
          <div className="text-2xl font-black font-heading text-amber-900">
            ₹{pendingDisbursements.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500">
            {payouts.filter((p) => p.status === 'Pending').length} shifts awaiting end-of-day batch
          </p>
        </div>

        {/* KPI 3 */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Settlement SLA
          </span>
          <div className="text-2xl font-black font-heading text-slate-900">
            &lt; 24 Hours
          </div>
          <p className="text-xs text-teal-700 font-semibold">
            Post supervisory clinical signoff
          </p>
        </div>

        {/* KPI 4 */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Disputed Transactions
          </span>
          <div className="text-2xl font-black font-heading text-rose-800">
            {disputedCount} Flagged
          </div>
          <p className="text-xs text-slate-500">
            Requires ops desk attendance review
          </p>
        </div>
      </div>

      {/* Interactive Search & Filter Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
        {/* Real-Time Search Bar */}
        <div className="flex-1 min-w-[260px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search caregiver name, careseeker, payout ID (e.g. PAY-2026-8812), bank ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-medium text-slate-800"
          />
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-bold">Period:</span>
          <select
            value={dateRangeFilter}
            onChange={(e) => setDateRangeFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:bg-white"
          >
            <option value="ALL">All Recorded Dates</option>
            <option value="THIS_WEEK">This Week (14-16 Oct)</option>
            <option value="OCTOBER_2026">October 2026</option>
          </select>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5">
          {(['ALL', 'Processed', 'Pending', 'Disputed'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-teal-700 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {st === 'ALL' ? 'All Statuses' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Payouts Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-heading font-extrabold text-sm text-slate-900">
              Disbursement Ledger Records
            </h3>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-50 text-slate-700 border border-slate-200">
            Showing {filteredPayouts.length} of {payouts.length} transactions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th className="py-3.5 px-4">Payout ID</th>
                <th className="py-3.5 px-4">Caregiver Name & Contact</th>
                <th className="py-3.5 px-4">Associated Careseeker</th>
                <th className="py-3.5 px-4">Shift Date & Duration</th>
                <th className="py-3.5 px-4">Payout Amount</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayouts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No payout records found matching your search criteria.
                  </td>
                </tr>
              ) : (
                filteredPayouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Payout ID */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-teal-800 text-xs">
                        {payout.id}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {payout.receiptNumber || 'RCPT-ONLINE'}
                      </div>
                    </td>

                    {/* Caregiver Name & Contact */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div
                        onClick={() => onSelectCaregiverByName?.(payout.caregiverName)}
                        className="font-bold text-slate-900 text-xs hover:text-teal-700 cursor-pointer transition"
                      >
                        {payout.caregiverName}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {payout.caregiverPhone}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {payout.caregiverCorridor}
                      </div>
                    </td>

                    {/* Associated Careseeker */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-800 text-xs">
                        {payout.careseekerName}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {payout.careseekerLocality}
                      </div>
                      <div className="text-[10px] text-teal-700 font-medium mt-0.5">
                        {payout.serviceType}
                      </div>
                    </td>

                    {/* Shift Date & Duration */}
                    <td className="py-4 px-4 whitespace-nowrap font-medium text-slate-700">
                      <div className="font-semibold text-slate-900">{payout.shiftDate}</div>
                      <div className="text-[10px] text-slate-500">{payout.shiftDuration}</div>
                      <div className="text-[10px] text-emerald-700 font-bold">
                        {payout.shiftHours} hrs logged
                      </div>
                    </td>

                    {/* Payout Amount */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="text-sm font-black font-heading text-slate-900">
                        ₹{payout.payoutAmount.toLocaleString()}
                      </div>
                      {payout.allowance && (
                        <div className="text-[10px] text-emerald-700">
                          incl. ₹{payout.allowance} allowance
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      {getStatusBadge(payout.status)}
                      {payout.bankReference && (
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {payout.bankReference}
                        </div>
                      )}
                    </td>

                    {/* Action: View Shift Receipt */}
                    <td className="py-4 px-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => setSelectedReceipt(payout)}
                        className="px-3.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 text-xs font-bold transition flex items-center gap-1.5 ml-auto shadow-2xs cursor-pointer active:scale-95"
                      >
                        <FileText className="w-3.5 h-3.5 text-teal-700" />
                        <span>View Shift Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================
          MODAL: VIEW SHIFT RECEIPT
         ======================================================== */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-xl rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 animate-scaleUp max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                    CareConnect Platform Disbursement Voucher
                  </span>
                  {getStatusBadge(selectedReceipt.status)}
                </div>
                <h3 className="text-xl font-heading font-black text-slate-900 mt-1.5 flex items-center gap-2">
                  <span>Shift Receipt: {selectedReceipt.receiptNumber || selectedReceipt.id}</span>
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Authorization Code: AUTH-CC-{selectedReceipt.id.replace('PAY-', '')}-TN
                </p>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Caregiver Block */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  Beneficiary Attendant
                </span>
                <div className="font-extrabold text-slate-900 text-sm">
                  {selectedReceipt.caregiverName}
                </div>
                <div className="text-slate-600 font-mono">{selectedReceipt.caregiverPhone}</div>
                <div className="text-slate-500">{selectedReceipt.caregiverCorridor}</div>
              </div>

              {/* Careseeker Block */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  Assigned Careseeker
                </span>
                <div className="font-extrabold text-slate-900 text-sm">
                  {selectedReceipt.careseekerName}
                </div>
                <div className="text-slate-600">{selectedReceipt.careseekerLocality}</div>
                <div className="text-teal-700 font-semibold">{selectedReceipt.serviceType}</div>
              </div>
            </div>

            {/* Shift Audit Table */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Shift Telemetry & Geofence Verification
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-700">
                <div>
                  <span className="text-[10px] text-slate-400 block">Shift Date</span>
                  <strong className="text-slate-900">{selectedReceipt.shiftDate}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Shift Hours</span>
                  <strong className="text-slate-900">{selectedReceipt.shiftHours} Hours Logged</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Geofence</span>
                  <strong className="text-emerald-700">✓ 100% Verified</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Disbursed Via</span>
                  <strong className="text-slate-900">{selectedReceipt.bankReference || 'NEFT Transfer'}</strong>
                </div>
              </div>
            </div>

            {/* Itemized Compensation Breakdown */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
              <div className="p-3 bg-slate-100 font-bold text-slate-800 border-b border-slate-200">
                Itemized Compensation Breakdown
              </div>
              <div className="divide-y divide-slate-100 p-4 space-y-2">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Shift Base Remuneration ({selectedReceipt.shiftHours} hours):</span>
                  <span className="font-semibold text-slate-900">
                    ₹{(selectedReceipt.payoutAmount - (selectedReceipt.allowance || 0)).toLocaleString()}
                  </span>
                </div>
                {selectedReceipt.allowance && (
                  <div className="flex items-center justify-between text-slate-600 pt-2">
                    <span>Emergency / Standby Readiness Allowance:</span>
                    <span className="font-semibold text-emerald-700">+₹{selectedReceipt.allowance}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-slate-600 pt-2">
                  <span>Platform Processing & TDS Withholding:</span>
                  <span className="font-semibold text-slate-500">₹0 (Zero Deduction)</span>
                </div>
                <div className="flex items-center justify-between font-black text-sm text-slate-900 pt-3 border-t border-slate-200">
                  <span>Net Attendant Settlement Payout:</span>
                  <span className="text-teal-800 text-base">₹{selectedReceipt.payoutAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Dispute Warning if any */}
            {selectedReceipt.disputeReason && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs space-y-1">
                <span className="font-bold text-rose-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Operations Dispute Audit Flag:</span>
                </span>
                <p className="text-rose-800 leading-relaxed">{selectedReceipt.disputeReason}</p>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>Print Receipt</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {selectedReceipt.status !== 'Processed' && (
                  <button
                    onClick={() => handleApproveDisbursement(selectedReceipt.id)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve & Settle Payout</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
                >
                  Close Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
