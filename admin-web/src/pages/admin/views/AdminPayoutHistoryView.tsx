import React, { useState, useMemo } from 'react';
import {
  Search,
  Wallet,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Users,
  Check,
  ChevronRight,
  ShieldCheck,
  FileText,
  TrendingUp,
  Stethoscope,
  Activity,
  HeartPulse,
  Pill,
  Eye,
  Calendar,
} from 'lucide-react';
import type { AttendantPayoutRecord } from '../types';
import { initialAttendantPayouts } from '../mockData';

interface AdminPayoutHistoryViewProps {
  onBack?: () => void;
  onSelectCaregiverByName?: (cgName: string) => void;
  onSelectElderByName?: (elderName: string) => void;
}

export const AdminPayoutHistoryView: React.FC<AdminPayoutHistoryViewProps> = ({
  onBack,
  onSelectCaregiverByName,
  onSelectElderByName,
}) => {
  const [payouts, setPayouts] = useState<AttendantPayoutRecord[]>(initialAttendantPayouts);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'PAID' | 'PROCESSING' | 'PENDING'>('ALL');
  const [selectedElderFilter, setSelectedElderFilter] = useState<string>('ALL');
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<string>('ALL');
  const [selectedPayoutForModal, setSelectedPayoutForModal] = useState<AttendantPayoutRecord | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);

  // Distinct careseeker names for search / filter (fulfills requirement 1.3 & 2.6)
  const distinctElders = useMemo(() => {
    const names = Array.from(new Set(payouts.map((p) => p.elderName)));
    return names.sort();
  }, [payouts]);

  // Distinct service types
  const distinctServices = useMemo(() => {
    const services = Array.from(new Set(payouts.map((p) => p.serviceName)));
    return services.sort();
  }, [payouts]);

  // Filtered Payouts based on search and filters
  const filteredPayouts = useMemo(() => {
    return payouts.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        p.payoutNumber.toLowerCase().includes(q) ||
        p.caregiverName.toLowerCase().includes(q) ||
        p.caregiverId.toLowerCase().includes(q) ||
        p.elderName.toLowerCase().includes(q) ||
        p.serviceName.toLowerCase().includes(q) ||
        p.caregiverLocality.toLowerCase().includes(q) ||
        (p.providerReference && p.providerReference.toLowerCase().includes(q));

      const matchesStatus = selectedStatus === 'ALL' || p.status === selectedStatus;
      const matchesElder = selectedElderFilter === 'ALL' || p.elderName === selectedElderFilter;
      const matchesService = selectedServiceFilter === 'ALL' || p.serviceName === selectedServiceFilter;

      return matchesSearch && matchesStatus && matchesElder && matchesService;
    });
  }, [payouts, searchQuery, selectedStatus, selectedElderFilter, selectedServiceFilter]);

  // Aggregate telemetry
  const totalDisbursed = useMemo(() => {
    return payouts
      .filter((p) => p.status === 'PAID')
      .reduce((sum, p) => sum + p.netPayoutAmount, 0);
  }, [payouts]);

  const pendingDisbursal = useMemo(() => {
    return payouts
      .filter((p) => p.status === 'PENDING' || p.status === 'PROCESSING')
      .reduce((sum, p) => sum + p.netPayoutAmount, 0);
  }, [payouts]);

  const totalShiftsCount = payouts.length;
  const avgShiftPayout = Math.round(
    payouts.reduce((sum, p) => sum + p.netPayoutAmount, 0) / (payouts.length || 1)
  );

  // Handle authorizing a pending payout
  const handleAuthorizePayout = (payoutId: string) => {
    const utr = `UTR-${Math.floor(100000000000 + Math.random() * 900000000000)}`;
    const nowIso = new Date().toISOString();

    setPayouts((prev) =>
      prev.map((p) =>
        p.id === payoutId
          ? {
              ...p,
              status: 'PAID' as const,
              providerReference: utr,
              paidAt: nowIso,
              approvedBy: 'Ops Supervisor Authorized',
              approvedAt: nowIso,
              notes: `${p.notes || ''} [Approved and instantly disbursed via Admin Portal]`.trim(),
            }
          : p
      )
    );

    if (selectedPayoutForModal?.id === payoutId) {
      setSelectedPayoutForModal((prev) =>
        prev
          ? {
              ...prev,
              status: 'PAID' as const,
              providerReference: utr,
              paidAt: nowIso,
            }
          : null
      );
    }

    setActionToast(`Payout ${payoutId} authorized successfully. Disbursed via ${utr}.`);
    setTimeout(() => setActionToast(null), 4000);
  };

  // Export filtered payouts as CSV
  const handleExportCsv = () => {
    const headers = [
      'Payout ID',
      'Attendant Name',
      'Caregiver ID',
      'Careseeker Name',
      'Care Service',
      'Shift Date',
      'Hours Worked',
      'Gross Earning (INR)',
      'Deductions (INR)',
      'Net Payout (INR)',
      'Status',
      'Payment Method',
      'Bank UTR / Ref',
      'Paid Timestamp',
    ];

    const rows = filteredPayouts.map((p) => [
      p.payoutNumber,
      `"${p.caregiverName}"`,
      p.caregiverId,
      `"${p.elderName}"`,
      `"${p.serviceName}"`,
      p.shiftDate,
      p.hoursWorked,
      p.grossEarned,
      p.deductionsAmount,
      p.netPayoutAmount,
      p.status,
      p.paymentMethod,
      p.providerReference || 'N/A',
      p.paidAt || 'PENDING',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `attendant_payouts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getServiceIcon = (code: string) => {
    switch (code) {
      case 'SVC-MOBILITY':
        return Activity;
      case 'SVC-MEDICAL':
        return HeartPulse;
      case 'SVC-MEDICATION':
        return Pill;
      case 'SVC-MONITORING':
        return Eye;
      default:
        return Stethoscope;
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn pb-16">
      {/* Top Banner & Header */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-slate-600 hover:text-teal-900 transition flex items-center justify-center shrink-0 shadow-2xs cursor-pointer group"
              title="Back"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 text-slate-500 group-hover:text-teal-700" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-heading font-extrabold text-slate-900">
                Attendant Payout History
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                Audited Disbursal Ledger
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Search historical shift payouts, filter by care seeker, track direct attendant take-home, and verify bank UTRs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
            title="Download CSV report of current payout view"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export CSV</span>
          </button>
          <div className="px-3 py-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>TDS 1% Compliant</span>
          </div>
        </div>
      </div>

      {/* Action Toast Notification */}
      {actionToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionToast}</span>
          </div>
          <button
            onClick={() => setActionToast(null)}
            className="text-emerald-700 hover:text-emerald-900 text-sm font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Telemetry KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Total Disbursed (Paid)</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1 font-heading">
            ₹{totalDisbursed.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-emerald-700 font-semibold mt-1">
            Cleared to attendant bank accounts
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Pending & Processing</span>
          </div>
          <div className="text-2xl font-black text-amber-900 mt-1 font-heading">
            ₹{pendingDisbursal.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-amber-700 font-semibold mt-1">
            Awaiting shift sign-off or bank gateway
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-teal-600" />
            <span>Total Shifts Logged</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1 font-heading">
            {totalShiftsCount} Shifts
          </div>
          <div className="text-[10px] text-slate-500 font-semibold mt-1">
            Across 4 core daily care types
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
            <span>Avg Take-Home / Shift</span>
          </div>
          <div className="text-2xl font-black text-teal-900 mt-1 font-heading">
            ₹{avgShiftPayout.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-teal-700 font-semibold mt-1">
            Net attendant earnings post-TDS
          </div>
        </div>
      </div>

      {/* Filter and Search Bar (Section 1.3 & 2.6 Requirements) */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Universal Search Bar */}
          <div className="flex-1 min-w-[280px] relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by attendant, care seeker, payout ID, UTR number, or corridor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-medium text-slate-800 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: 'All Payouts', count: payouts.length },
              { id: 'PAID', label: 'Paid / Disbursed', count: payouts.filter((p) => p.status === 'PAID').length },
              { id: 'PROCESSING', label: 'Processing', count: payouts.filter((p) => p.status === 'PROCESSING').length },
              { id: 'PENDING', label: 'Pending Audit', count: payouts.filter((p) => p.status === 'PENDING').length },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedStatus(cat.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  selectedStatus === cat.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    selectedStatus === cat.id
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Dropdown Filters: Careseeker Search & Care Type Filter */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter by Care Seeker (Requirement 2.6) */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-bold flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-teal-600" />
                <span>Care Seeker:</span>
              </span>
              <select
                value={selectedElderFilter}
                onChange={(e) => setSelectedElderFilter(e.target.value)}
                className="py-1 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
              >
                <option value="ALL">All Care Seekers ({distinctElders.length})</option>
                {distinctElders.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by 4 Care Types */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-bold flex items-center gap-1">
                <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                <span>Care Service:</span>
              </span>
              <select
                value={selectedServiceFilter}
                onChange={(e) => setSelectedServiceFilter(e.target.value)}
                className="py-1 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
              >
                <option value="ALL">All Care Services</option>
                {distinctServices.map((srv) => (
                  <option key={srv} value={srv}>
                    {srv}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(searchQuery || selectedStatus !== 'ALL' || selectedElderFilter !== 'ALL' || selectedServiceFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedStatus('ALL');
                setSelectedElderFilter('ALL');
                setSelectedServiceFilter('ALL');
              }}
              className="text-teal-700 hover:text-teal-900 font-bold text-[11px] underline cursor-pointer"
            >
              Reset all filters
            </button>
          )}
        </div>
      </div>

      {/* Payout History Ledger Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="w-full max-w-full overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Payout ID & Method</th>
                <th className="py-3 px-4">Attendant</th>
                <th className="py-3 px-4">Care Seeker Served</th>
                <th className="py-3 px-4">Care Service Provided</th>
                <th className="py-3 px-4">Shift & Date</th>
                <th className="py-3 px-4 text-right">Net Payout</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredPayouts.map((record) => {
                const ServiceIconComp = getServiceIcon(record.serviceCode);

                return (
                  <tr
                    key={record.id}
                    className="hover:bg-slate-50/80 transition group"
                  >
                    {/* Payout ID & Method */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      <div>{record.payoutNumber}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] font-sans font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/80">
                          {record.paymentMethod.replace('_', ' ')}
                        </span>
                        {record.providerReference && (
                          <span
                            className="text-[10px] text-slate-400 font-mono truncate max-w-[100px]"
                            title={record.providerReference}
                          >
                            {record.providerReference}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Attendant Details */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-xs shrink-0">
                          {record.caregiverName
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')}
                        </div>
                        <div>
                          <button
                            onClick={() => onSelectCaregiverByName && onSelectCaregiverByName(record.caregiverName)}
                            className="font-extrabold text-slate-900 hover:text-teal-700 text-left transition flex items-center gap-1 group/btn cursor-pointer"
                          >
                            <span>{record.caregiverName}</span>
                          </button>
                          <div className="text-[10px] text-slate-400 font-medium">
                            {record.caregiverLocality}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Care Seeker Served */}
                    <td className="py-3.5 px-4">
                      <div>
                        <button
                          onClick={() => onSelectElderByName && onSelectElderByName(record.elderName)}
                          className="font-extrabold text-slate-800 hover:text-teal-700 text-left transition cursor-pointer"
                        >
                          {record.elderName}
                        </button>
                        <div className="text-[10px] text-slate-400">
                          {record.elderLocality || 'Residential Home'}
                        </div>
                      </div>
                    </td>

                    {/* Care Service Provided */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 border border-slate-200 text-[11px] font-bold">
                        <ServiceIconComp className="w-3.5 h-3.5 text-teal-600" />
                        <span>{record.serviceName}</span>
                      </span>
                    </td>

                    {/* Shift & Date */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{record.shiftDate}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                        {record.shiftDuration} ({record.hoursWorked}h)
                      </div>
                    </td>

                    {/* Net Payout */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-heading font-extrabold text-sm text-emerald-800">
                        ₹{record.netPayoutAmount.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Gross: ₹{record.grossEarned} (TDS -₹{record.deductionsAmount})
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-center">
                      {record.status === 'PAID' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>PAID</span>
                        </span>
                      )}
                      {record.status === 'PROCESSING' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>PROCESSING</span>
                        </span>
                      )}
                      {record.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          <AlertCircle className="w-3 h-3 text-slate-500" />
                          <span>PENDING AUDIT</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {record.status === 'PENDING' && (
                          <button
                            onClick={() => handleAuthorizePayout(record.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition shadow-2xs cursor-pointer flex items-center gap-1"
                            title="Approve and disburse payout"
                          >
                            <span>Authorize</span>
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedPayoutForModal(record)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-teal-900 border border-slate-200 text-slate-700 font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
                          title="View Payout Voucher"
                        >
                          <span>Receipt</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty Search State */}
        {filteredPayouts.length === 0 && (
          <div className="p-12 text-center">
            <Wallet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="font-heading font-extrabold text-slate-800 text-base">
              No payout records matched
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              We couldn't find any payout records matching your search query or selected care seeker.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedStatus('ALL');
                setSelectedElderFilter('ALL');
                setSelectedServiceFilter('ALL');
              }}
              className="mt-3 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              Clear Search & Filters
            </button>
          </div>
        )}
      </div>

      {/* Itemized Payout Voucher & Receipt Modal */}
      {selectedPayoutForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 font-bold">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-teal-300">
                      {selectedPayoutForModal.payoutNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        selectedPayoutForModal.status === 'PAID'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : selectedPayoutForModal.status === 'PROCESSING'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {selectedPayoutForModal.status}
                    </span>
                  </div>
                  <h3 className="font-heading font-extrabold text-base text-white mt-1">
                    Attendant Shift Disbursal Voucher
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedPayoutForModal(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700">
              {/* Payment Summary Header */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    Net Take-Home Disbursal
                  </div>
                  <div className="text-2xl font-black text-emerald-950 font-heading mt-0.5">
                    ₹{selectedPayoutForModal.netPayoutAmount.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-emerald-700 mt-0.5">
                    Disbursed via {selectedPayoutForModal.paymentMethod.replace('_', ' ')}
                  </div>
                </div>

                {selectedPayoutForModal.providerReference && (
                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Bank Reference / UTR
                    </div>
                    <div className="font-mono font-bold text-xs text-slate-800 mt-0.5">
                      {selectedPayoutForModal.providerReference}
                    </div>
                    {selectedPayoutForModal.paidAt && (
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(selectedPayoutForModal.paidAt).toLocaleString('en-IN')}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Attendant & Careseeker Breakdown */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Attendant Details
                  </div>
                  <div className="font-extrabold text-slate-900 text-xs">
                    {selectedPayoutForModal.caregiverName}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    ID: {selectedPayoutForModal.caregiverId}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {selectedPayoutForModal.caregiverLocality}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Care Seeker & Location
                  </div>
                  <div className="font-extrabold text-slate-900 text-xs">
                    {selectedPayoutForModal.elderName}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    ID: {selectedPayoutForModal.elderId}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {selectedPayoutForModal.elderLocality || 'Residential Address'}
                  </div>
                </div>
              </div>

              {/* Shift Information */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Shift Information
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Care Type Provided:</span>
                  <span className="font-bold text-slate-900">
                    {selectedPayoutForModal.serviceName} ({selectedPayoutForModal.serviceCode})
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Shift Date:</span>
                  <span className="font-bold text-slate-900">{selectedPayoutForModal.shiftDate}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Duration & Hours:</span>
                  <span className="font-bold text-slate-900">
                    {selectedPayoutForModal.shiftDuration} ({selectedPayoutForModal.hoursWorked} hours)
                  </span>
                </div>
              </div>

              {/* Deductions and Net Calculation */}
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Itemized Financial Reconciliation
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Gross Attendant Shift Earnings:</span>
                  <span className="font-bold text-slate-900">
                    ₹{selectedPayoutForModal.grossEarned.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-rose-700">
                  <span>TDS Withholding (1%) & Operational Insurance:</span>
                  <span>-₹{selectedPayoutForModal.deductionsAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-900">Net Attendant Take-Home:</span>
                  <span className="font-black text-sm text-emerald-800 font-heading">
                    ₹{selectedPayoutForModal.netPayoutAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Supervisor Notes */}
              {selectedPayoutForModal.notes && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600">
                  <span className="font-bold text-slate-700">Audit Notes:</span> {selectedPayoutForModal.notes}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              {selectedPayoutForModal.status === 'PENDING' ? (
                <button
                  onClick={() => handleAuthorizePayout(selectedPayoutForModal.id)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Authorize & Disburse Now</span>
                </button>
              ) : (
                <span className="text-[11px] text-emerald-800 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Audit Verified & Cleared</span>
                </span>
              )}

              <button
                onClick={() => setSelectedPayoutForModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition cursor-pointer"
              >
                Close Voucher
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
