import React, { useState, useEffect } from 'react';
import type {
  ReplacementRequest,
  OperationsIssue,
  Invoice,
  AuditLog,
  Caregiver,
} from '../../types';
import { api } from '../../services/api';
import {
  ShieldAlert,
  MessageSquareHeart,
  ReceiptIndianRupee,
  ScrollText,
  UserCheck,
  CheckCircle2,
  Filter,
  Star,
  Loader2,
  X,
} from 'lucide-react';

export const OperationsConsole: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'REPLACEMENTS' | 'QA_ISSUES' | 'BILLING' | 'AUDIT'
  >('REPLACEMENTS');

  // State for Replacements
  const [replacements, setReplacements] = useState<ReplacementRequest[]>([]);
  const [repStatusFilter, setRepStatusFilter] = useState<string>('');
  const [bufferCaregivers, setBufferCaregivers] = useState<Caregiver[]>([]);
  const [selectedRep, setSelectedRep] =
    useState<ReplacementRequest | null>(null);
  const [selectedSubstituteId, setSelectedSubstituteId] =
    useState<string>('');
  const [assignNote, setAssignNote] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState<boolean>(false);

  // State for QA Issues
  const [issues, setIssues] = useState<OperationsIssue[]>([]);
  const [issueStatusFilter, setIssueStatusFilter] = useState<string>('');
  const [selectedIssue, setSelectedIssue] =
    useState<OperationsIssue | null>(null);
  const [issueResolutionNotes, setIssueResolutionNotes] =
    useState<string>('');
  const [issueNewStatus, setIssueNewStatus] =
    useState<string>('RESOLVED');
  const [isResolvingIssue, setIsResolvingIssue] =
    useState<boolean>(false);

  // State for Billing
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // State for Audit Trail
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<string | null>(null);

  /**
   * Caregiver compatibility helper.
   *
   * The unified Caregiver type allows languages to come from either:
   * - the Phase B API as a string
   * - the Phase D API as an array
   *
   * Always convert to an array before rendering.
   */
  const getLanguages = (caregiver: Caregiver): string[] => {
    if (Array.isArray(caregiver.languages)) {
      return caregiver.languages;
    }

    if (typeof caregiver.languages === 'string') {
      return caregiver.languages
        .split(',')
        .map((language) => language.trim())
        .filter(Boolean);
    }

    return [];
  };

  const loadData = async () => {
    setIsLoading(true);

    try {
      if (activeTab === 'REPLACEMENTS') {
        const [reps, cgs] = await Promise.all([
          api.getOperationsReplacementQueue(
            repStatusFilter || undefined
          ),
          api.getBufferPoolCaregivers(),
        ]);

        setReplacements(reps);
        setBufferCaregivers(cgs);

        if (cgs.length > 0 && !selectedSubstituteId) {
          setSelectedSubstituteId(String(cgs[0].id));
        }
      } else if (activeTab === 'QA_ISSUES') {
        const issueList = await api.getOperationsFeedbackQueue(
          issueStatusFilter || undefined
        );

        setIssues(issueList);
      } else if (activeTab === 'BILLING') {
        const invs = await api.getOperationsInvoices();
        setInvoices(invs);
      } else if (activeTab === 'AUDIT') {
        const logs = await api.getAuditTrail();
        setAuditLogs(logs);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, repStatusFilter, issueStatusFilter]);

  const handleStatusChange = async (
    id: string,
    newStatus: string,
    note?: string
  ) => {
    try {
      await api.updateOperationsReplacementRequest(id, {
        status: newStatus,
        note,
      });

      setMessage(`Request marked as ${newStatus}`);

      setTimeout(() => setMessage(null), 3000);

      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update status.');
    }
  };

  const handleAssignSubstitute = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!selectedRep || !selectedSubstituteId) {
      return;
    }

    setIsAssigning(true);

    try {
      await api.assignSubstituteCaregiver(
        selectedRep.id,
        selectedSubstituteId,
        assignNote
      );

      setSelectedRep(null);
      setAssignNote('');

      setMessage(
        'Substitute caregiver assigned from Chennai Buffer Pool.'
      );

      setTimeout(() => setMessage(null), 3000);

      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to assign substitute.');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUpdateIssue = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!selectedIssue) {
      return;
    }

    setIsResolvingIssue(true);

    try {
      await api.updateOperationsIssue(selectedIssue.id, {
        status: issueNewStatus,
        resolutionNotes: issueResolutionNotes,
      });

      setSelectedIssue(null);
      setIssueResolutionNotes('');

      setMessage(
        'Operations issue updated successfully.'
      );

      setTimeout(() => setMessage(null), 3000);

      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update issue.');
    } finally {
      setIsResolvingIssue(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Console Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-800 text-teal-300 flex items-center justify-center font-bold">
            CC
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">
                Chennai Care Operations Console
              </h2>

              <span className="px-2 py-0.5 rounded bg-teal-900/80 border border-teal-700 text-teal-300 font-mono text-[10px] uppercase">
                Staff Hub
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Triage replacements, review feedback QA alerts,
              monitor invoices, and view audit trail.
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-800/80 rounded-xl border border-slate-700">
          <button
            onClick={() => setActiveTab('REPLACEMENTS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'REPLACEMENTS'
                ? 'bg-teal-700 text-white shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Replacements ({replacements.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('QA_ISSUES')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'QA_ISSUES'
                ? 'bg-teal-700 text-white shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <MessageSquareHeart className="w-3.5 h-3.5" />
            <span>QA Issues ({issues.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('BILLING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'BILLING'
                ? 'bg-teal-700 text-white shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <ReceiptIndianRupee className="w-3.5 h-3.5" />
            <span>Invoices</span>
          </button>

          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'AUDIT'
                ? 'bg-teal-700 text-white shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <ScrollText className="w-3.5 h-3.5" />
            <span>Audit Trail</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* TAB 1: REPLACEMENTS QUEUE */}
      {activeTab === 'REPLACEMENTS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Replacement Requests Queue
              </h3>

              <span className="text-xs text-slate-400">
                ({replacements.length} Total)
              </span>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />

              <select
                value={repStatusFilter}
                onChange={(e) =>
                  setRepStatusFilter(e.target.value)
                }
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-teal-700"
              >
                <option value="">All Statuses</option>
                <option value="SUBMITTED">
                  SUBMITTED (Pending Review)
                </option>
                <option value="UNDER_REVIEW">
                  UNDER_REVIEW
                </option>
                <option value="ASSIGNED">
                  ASSIGNED (Awaiting Family)
                </option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-teal-700" />
              <span className="text-xs">
                Loading requests...
              </span>
            </div>
          ) : replacements.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No replacement requests match the selected
              filter.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {replacements.map((rep) => (
                <div
                  key={rep.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">
                        {rep.reasonCode.replace(/_/g, ' ')}
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          rep.priority === 'URGENT'
                            ? 'bg-rose-100 text-rose-800'
                            : rep.priority === 'HIGH'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {rep.priority}
                      </span>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                        {rep.status}
                      </span>
                    </div>

                    <div className="text-slate-500">
                      Current Attendant:{' '}
                      <strong className="text-slate-700">
                        {rep.currentCaregiver?.fullName ||
                          'Assigned'}
                      </strong>

                      {rep.substituteCaregiver && (
                        <span>
                          {' '}
                          • Proposed Substitute:{' '}
                          <strong className="text-teal-800">
                            {
                              rep.substituteCaregiver
                                .fullName
                            }
                          </strong>
                        </span>
                      )}
                    </div>

                    {rep.notes && (
                      <p className="text-slate-600 bg-slate-50 p-2 rounded-lg text-[11px]">
                        "{rep.notes}"
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {rep.status === 'SUBMITTED' && (
                      <button
                        onClick={() =>
                          handleStatusChange(
                            rep.id,
                            'UNDER_REVIEW',
                            'Clinical Care Manager initiated review.'
                          )
                        }
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                      >
                        Acknowledge & Review
                      </button>
                    )}

                    {['SUBMITTED', 'UNDER_REVIEW'].includes(
                      rep.status
                    ) && (
                      <button
                        onClick={() =>
                          setSelectedRep(rep)
                        }
                        className="px-3 py-1.5 bg-teal-900 hover:bg-teal-800 text-white text-xs font-bold rounded-lg transition shadow-sm flex items-center gap-1.5"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Assign Substitute</span>
                      </button>
                    )}

                    {rep.status === 'ASSIGNED' && (
                      <span className="text-[11px] text-amber-700 font-semibold px-2 py-1 bg-amber-50 rounded-lg">
                        Waiting for family confirmation
                      </span>
                    )}

                    {rep.status === 'RESOLVED' && (
                      <span className="text-[11px] text-emerald-700 font-semibold px-2 py-1 bg-emerald-50 rounded-lg flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Resolved & Active</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: QA ISSUES QUEUE */}
      {activeTab === 'QA_ISSUES' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Quality Assurance & Negative Feedback Alerts
              </h3>

              <p className="text-xs text-slate-500">
                Auto-escalated issues from family ratings of 2
                stars or below.
              </p>
            </div>

            <select
              value={issueStatusFilter}
              onChange={(e) =>
                setIssueStatusFilter(e.target.value)
              }
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-teal-700"
            >
              <option value="">All Statuses</option>
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">
                IN_PROGRESS
              </option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-teal-700" />
              <span className="text-xs">
                Loading QA issues...
              </span>
            </div>
          ) : issues.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No escalated quality assurance alerts found.
              All active care within threshold!
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {issues.map((iss) => (
                <div
                  key={iss.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">
                        {iss.summary}
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          iss.priority === 'HIGH'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {iss.priority}
                      </span>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        {iss.status}
                      </span>
                    </div>

                    {iss.resolutionNotes && (
                      <p className="text-slate-600 bg-slate-50 p-2 rounded-lg text-[11px]">
                        Resolution: {iss.resolutionNotes}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedIssue(iss);
                      setIssueNewStatus(iss.status);
                      setIssueResolutionNotes(
                        iss.resolutionNotes || ''
                      );
                    }}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shrink-0"
                  >
                    Manage & Resolve
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BILLING OVERVIEW */}
      {activeTab === 'BILLING' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-4 border-b border-slate-100">
            Platform Monthly Billing Oversight
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Invoice Number</th>
                  <th className="p-3">Billing Period</th>
                  <th className="p-3 text-right">
                    Base Attendant
                  </th>
                  <th className="p-3 text-right">
                    Agency Fee (15%)
                  </th>
                  <th className="p-3 text-right">
                    GST (18%)
                  </th>
                  <th className="p-3 text-right">
                    Total Payable
                  </th>
                  <th className="p-3 text-center">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-slate-700">
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="p-3 font-mono font-bold text-slate-900">
                      {inv.invoiceNumber}
                    </td>

                    <td className="p-3">
                      {new Date(
                        inv.billingPeriodStart
                      ).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      –{' '}
                      {new Date(
                        inv.billingPeriodEnd
                      ).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>

                    <td className="p-3 text-right font-mono">
                      ₹
                      {inv.subtotal.toLocaleString(
                        'en-IN'
                      )}
                    </td>

                    <td className="p-3 text-right font-mono">
                      ₹
                      {inv.agencyFee.toLocaleString(
                        'en-IN'
                      )}
                    </td>

                    <td className="p-3 text-right font-mono">
                      ₹
                      {inv.taxAmount.toLocaleString(
                        'en-IN'
                      )}
                    </td>

                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      ₹
                      {inv.totalAmount.toLocaleString(
                        'en-IN'
                      )}
                    </td>

                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT TRAIL */}
      {activeTab === 'AUDIT' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-4 border-b border-slate-100">
            System Audit Trail & State Transitions
          </h3>

          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">
                      {log.action}
                    </span>

                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px]">
                      {log.entityType}
                    </span>

                    {log.oldValue && (
                      <span className="text-slate-400">
                        ({log.oldValue} → {log.newValue})
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                    Entity ID: {log.entityId}
                  </div>
                </div>

                <div className="text-[10px] font-mono text-slate-400 shrink-0">
                  {new Date(
                    log.createdAt
                  ).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Assign Substitute Caregiver */}
      {selectedRep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">
                Assign Substitute Attendant
              </h4>

              <button
                onClick={() => setSelectedRep(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleAssignSubstitute}
              className="space-y-4 text-xs"
            >
              <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-900">
                Reason:{' '}
                <strong>
                  {selectedRep.reasonCode.replace(
                    /_/g,
                    ' '
                  )}
                </strong>

                {selectedRep.notes && (
                  <div className="mt-1 text-[11px]">
                    "{selectedRep.notes}"
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-slate-700 font-bold block">
                  Select Vetted Caregiver from Chennai Buffer
                  Pool
                </label>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {bufferCaregivers.map((cg) => {
                    const caregiverId = String(cg.id);
                    const languages = getLanguages(cg);

                    return (
                      <label
                        key={caregiverId}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition ${
                          selectedSubstituteId ===
                          caregiverId
                            ? 'border-teal-700 bg-teal-50/50 ring-2 ring-teal-700/20'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="substitute"
                            value={caregiverId}
                            checked={
                              selectedSubstituteId ===
                              caregiverId
                            }
                            onChange={() =>
                              setSelectedSubstituteId(
                                caregiverId
                              )
                            }
                            className="text-teal-700 focus:ring-teal-700"
                          />

                          <div>
                            <div className="font-bold text-slate-900">
                              {cg.fullName}
                            </div>

                            <div className="text-[11px] text-slate-500">
                              {cg.experienceYears} yrs exp •{' '}
                              {cg.locality} •{' '}
                              {languages.join(', ')}
                            </div>
                          </div>
                        </div>

                        <span className="font-bold text-amber-600 flex items-center gap-1 shrink-0">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          {cg.rating}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-bold">
                  Matching Notes for Family
                </label>

                <textarea
                  value={assignNote}
                  onChange={(e) =>
                    setAssignNote(e.target.value)
                  }
                  rows={2}
                  placeholder="e.g. Matched based on South Chennai locality and Tamil fluency..."
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-teal-700"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRep(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isAssigning}
                  className="px-5 py-2.5 bg-teal-900 hover:bg-teal-800 text-white font-bold rounded-xl transition"
                >
                  {isAssigning
                    ? 'Assigning...'
                    : 'Assign & Notify Family'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Resolve QA Issue */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">
                Resolve Operations QA Alert
              </h4>

              <button
                onClick={() => setSelectedIssue(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleUpdateIssue}
              className="space-y-4 text-xs"
            >
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                {selectedIssue.summary}
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-bold">
                  Update Status
                </label>

                <select
                  value={issueNewStatus}
                  onChange={(e) =>
                    setIssueNewStatus(e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-teal-700"
                >
                  <option value="IN_PROGRESS">
                    IN_PROGRESS (Investigating)
                  </option>
                  <option value="RESOLVED">
                    RESOLVED (Corrective Action Taken)
                  </option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-bold">
                  Clinical Resolution Notes
                </label>

                <textarea
                  value={issueResolutionNotes}
                  onChange={(e) =>
                    setIssueResolutionNotes(e.target.value)
                  }
                  required
                  rows={3}
                  placeholder="Document supervisory investigation and steps taken with attendant..."
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-teal-700"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedIssue(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isResolvingIssue}
                  className="px-5 py-2.5 bg-teal-900 hover:bg-teal-800 text-white font-bold rounded-xl transition"
                >
                  {isResolvingIssue
                    ? 'Saving...'
                    : 'Save Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};