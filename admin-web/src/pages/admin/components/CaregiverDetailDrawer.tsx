import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Phone,
  Activity,
  ShieldCheck,
  Star,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  MessageCircle,
  AlertCircle,
  BadgeCheck,
  Stethoscope,
  Compass,
  FileText,
  Eye,
  UserCheck,
  XCircle,
} from 'lucide-react';

import type { AdminCaregiverItem } from '../types';
import { serviceableCorridors } from '../mockData';
import { api } from '../../../services/api';

interface CaregiverDetailDrawerProps {
  caregiver: AdminCaregiverItem | null;
  onClose: () => void;
  onStatusChange?: (caregiverId: string, newStatus: 'AVAILABLE' | 'ON_DUTY' | 'ON_LEAVE') => void;
  onKycStatusChange?: (caregiverId: string, newStatus: 'VERIFIED' | 'REJECTED', rejectionReason?: string) => Promise<any>;
  onReassignCorridor?: (caregiverId: string, newCorridor: string) => void;
  onViewElder?: (elderName: string, elderId?: string) => void;
  onDispatchToSos?: (caregiver: AdminCaregiverItem) => void;
}

export const CaregiverDetailDrawer: React.FC<CaregiverDetailDrawerProps> = ({
  caregiver,
  onClose,
  onStatusChange,
  onKycStatusChange,
  onReassignCorridor,
  onViewElder,
  onDispatchToSos,
}) => {
  const [isReassigningCorridor, setIsReassigningCorridor] = useState(false);
  const [selectedCorridor, setSelectedCorridor] = useState(caregiver?.locality || 'Adyar');
  const [isFlagged, setIsFlagged] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // KYC Verification states
  const [isVerifyingKyc, setIsVerifyingKyc] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showDocModal, setShowDocModal] = useState(false);
  const [localKycStatus, setLocalKycStatus] = useState<'NOT_SUBMITTED' | 'PENDING' | 'VERIFIED' | 'REJECTED'>('PENDING');
  const [localIsVerified, setLocalIsVerified] = useState(false);
  const [localRejectionReason, setLocalRejectionReason] = useState<string | null>(null);

  // Sync corridor selection and KYC state when caregiver changes
  useEffect(() => {
    if (caregiver) {
      setSelectedCorridor(caregiver.locality);
      setIsFlagged(false);
      setShowRejectInput(false);
      setRejectReason('');
      setLocalKycStatus((caregiver.kycStatus || (caregiver.isIdentityVerified ? 'VERIFIED' : 'PENDING')) as any);
      setLocalIsVerified(Boolean(caregiver.isIdentityVerified || caregiver.kycStatus === 'VERIFIED'));
      setLocalRejectionReason(caregiver.rejectionReason || null);
    }
  }, [caregiver]);

  const handleVerifyKyc = async () => {
    if (!caregiver || isVerifyingKyc) return;
    setIsVerifyingKyc(true);
    try {
      if (onKycStatusChange) {
        await onKycStatusChange(caregiver.id, 'VERIFIED');
      } else {
        await api.updateCaregiverKycStatus(caregiver.userId || caregiver.id, {
          verification_status: 'VERIFIED',
        });
      }
      setLocalKycStatus('VERIFIED');
      setLocalIsVerified(true);
      setLocalRejectionReason(null);
      setShowRejectInput(false);
      setToastMessage('KYC verified successfully. Caregiver is now eligible for work.');
    } catch (err: any) {
      setToastMessage(`Verification failed: ${err?.message || 'Server error'}`);
    } finally {
      setIsVerifyingKyc(false);
    }
  };

  const handleRejectKyc = async () => {
    if (!caregiver || isVerifyingKyc) return;
    const reason = rejectReason.trim() || 'Document photo illegible or details mismatch.';
    setIsVerifyingKyc(true);
    try {
      if (onKycStatusChange) {
        await onKycStatusChange(caregiver.id, 'REJECTED', reason);
      } else {
        await api.updateCaregiverKycStatus(caregiver.userId || caregiver.id, {
          verification_status: 'REJECTED',
          rejection_reason: reason,
        });
      }
      setLocalKycStatus('REJECTED');
      setLocalIsVerified(false);
      setLocalRejectionReason(reason);
      setShowRejectInput(false);
      setToastMessage('KYC rejected. Rejection reason recorded.');
    } catch (err: any) {
      setToastMessage(`Rejection failed: ${err?.message || 'Server error'}`);
    } finally {
      setIsVerifyingKyc(false);
    }
  };


  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!caregiver) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleStatusClick = (newStatus: 'AVAILABLE' | 'ON_DUTY' | 'ON_LEAVE') => {
    onStatusChange?.(caregiver.id, newStatus);
    showToast(`Status updated to ${newStatus.replace('_', ' ')}`);
  };

  const handleSaveCorridor = () => {
    onReassignCorridor?.(caregiver.id, selectedCorridor);
    setIsReassigningCorridor(false);
    showToast(`Care attendant reassigned to ${selectedCorridor} Corridor`);
  };

  const handleToggleFlag = () => {
    const next = !isFlagged;
    setIsFlagged(next);
    showToast(next ? 'Profile flagged for supervisory compliance review.' : 'Profile flag cleared.');
  };

  const handleDispatch = () => {
    onDispatchToSos?.(caregiver);
    showToast(`Rapid emergency dispatch alert sent to ${caregiver.fullName}.`);
  };

  // Clinical competencies fallback
  const competencies = caregiver.clinicalCompetencies || caregiver.skills || [
    'Vital Signs Monitoring',
    'Bedside Assistance',
    'Medication Reminders',
    'Fall Prevention',
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fadeIn">
      {/* Click backdrop to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Canvas */}
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 overflow-hidden animate-slideInRight">
        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="absolute top-4 left-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold flex items-center justify-between border border-teal-500/40 animate-slideDown">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </span>
            <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Top Header Card */}
        <div className="p-6 bg-slate-900 text-white flex items-start justify-between relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start gap-4 z-10">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-teal-600/30 border-2 border-teal-400/40 flex items-center justify-center text-teal-200 font-heading font-black text-2xl shadow-inner shrink-0">
              {caregiver.fullName.substring(0, 2).toUpperCase()}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-heading font-extrabold text-white">
                  {caregiver.fullName}
                </h2>
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                    caregiver.status === 'ON_DUTY'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : caregiver.status === 'AVAILABLE'
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {caregiver.status.replace('_', ' ')}
                </span>
                {isFlagged && (
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    Flagged for Review
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                <span>{caregiver.experienceYears} Years Exp • {caregiver.gender}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{caregiver.rating.toFixed(2)}</span>
                  <span className="text-slate-400 text-[11px] font-normal">
                    ({caregiver.performanceMetrics?.reviewCount || 48} reviews)
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-teal-300 font-medium">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-teal-400" />
                <span>{caregiver.locality} Corridor, Chennai</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-300">ID: {caregiver.id}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition z-10"
            title="Close Drawer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-800 bg-slate-50/50">
          {/* Quick Status Control Bar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">
                Shift & Duty Status Override
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Click to transition live shift</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleStatusClick('ON_DUTY')}
                className={`py-2 px-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                  caregiver.status === 'ON_DUTY'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200/80'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>On Duty</span>
              </button>
              <button
                onClick={() => handleStatusClick('AVAILABLE')}
                className={`py-2 px-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                  caregiver.status === 'AVAILABLE'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200/80'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-teal-400" />
                <span>Available / Standby</span>
              </button>
              <button
                onClick={() => handleStatusClick('ON_LEAVE')}
                className={`py-2 px-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                  caregiver.status === 'ON_LEAVE'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>Off-Duty / Leave</span>
              </button>
            </div>
          </div>

          {/* Section 1: Assigned Patient & Live Deployment */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-teal-600" />
                <span>Current Deployment & Patient Assignment</span>
              </h3>
              {caregiver.isBufferPool && (
                <span className="px-2.5 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-sky-800 text-[10px] font-bold">
                  SLA Buffer Attendant
                </span>
              )}
            </div>

            {caregiver.activeElderName ? (
              <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-wider text-teal-800">
                    Active Care Recipient
                  </div>
                  <div className="text-base font-extrabold text-slate-900">
                    {caregiver.activeElderName}
                  </div>
                  <div className="text-xs text-slate-600 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-teal-700" />
                    <span>{caregiver.locality} Corridor Residence</span>
                  </div>
                  <div className="text-[11px] text-teal-800 font-medium">
                    Shift Protocol: {caregiver.shiftSchedule?.shiftType || '12-hr Day Care'}
                  </div>
                </div>

                <button
                  onClick={() => onViewElder?.(caregiver.activeElderName!, caregiver.activeElderId)}
                  className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs shrink-0"
                >
                  <span>Open Elder Profile</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200/80 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-extrabold text-sky-950 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-ping" />
                    <span>Standby Buffer Pool in {caregiver.locality}</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Stationed at Corridor Hub for instant SLA dispatch within 15 minutes.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-sky-700 px-2.5 py-1 rounded-lg bg-white border border-sky-200">
                    2km Coverage Radius
                  </span>
                </div>
              </div>
            )}

            {/* Shift & Schedule Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Working Schedule</span>
                <span className="font-bold text-slate-800 mt-0.5 block truncate">
                  {caregiver.shiftSchedule?.workingDays || 'Mon – Sat'}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Hours This Month</span>
                <span className="font-bold text-teal-800 mt-0.5 block">
                  {caregiver.shiftSchedule?.hoursLoggedThisMonth || 176} hrs logged
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Last Biometric Check-In</span>
                <span className="font-bold text-slate-800 mt-0.5 block truncate text-[11px]">
                  {caregiver.shiftSchedule?.lastCheckIn || 'Today, 08:00 AM'}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Government Identity & KYC Verification */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span>Government KYC & Identity Document Verification</span>
              </h3>
              <div>
                {localKycStatus === 'VERIFIED' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>✓ KYC Verified</span>
                  </span>
                ) : localKycStatus === 'PENDING' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>● Pending Admin Review</span>
                  </span>
                ) : localKycStatus === 'REJECTED' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>✕ KYC Rejected</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    <span>Not Submitted</span>
                  </span>
                )}
              </div>
            </div>

            {/* Worker Gate Status Banner */}
            {localKycStatus === 'VERIFIED' ? (
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>Worker Gate Unlocked:</strong> Caregiver identity is verified. They can toggle availability and accept active care shifts.</span>
              </div>
            ) : localKycStatus === 'PENDING' ? (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span><strong>Worker Gate Active:</strong> Caregiver is currently blocked from accepting care work until approved by an administrator.</span>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span><strong>Worker Gate Blocked:</strong> Verification was rejected. Caregiver cannot accept care work.</span>
              </div>
            )}

            {/* KYC Record Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Document Type</span>
                <span className="font-bold text-slate-800 text-sm">
                  {caregiver.documentType || 'Aadhaar (UIDAI)'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Document Number (Masked)</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {caregiver.maskedDocumentNumber || (localIsVerified ? 'XXXX-XXXX-****' : 'Not Provided')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Submission Date</span>
                <span className="font-medium text-slate-700">
                  {caregiver.kycCreatedAt
                    ? new Date(caregiver.kycCreatedAt).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Registered with Profile'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Document Proof</span>
                {caregiver.documentStorageReference ? (
                  <button
                    type="button"
                    onClick={() => setShowDocModal(true)}
                    className="mt-0.5 text-xs font-bold text-teal-700 hover:text-teal-900 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-teal-600" />
                    <span>View Uploaded Document</span>
                  </button>
                ) : (
                  <span className="text-slate-500 font-medium">Standard electronic verification</span>
                )}
              </div>
            </div>

            {/* Rejection Reason Display */}
            {localRejectionReason && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                <span className="font-bold block flex items-center gap-1 text-rose-900">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Recorded Rejection Reason:
                </span>
                <p>{localRejectionReason}</p>
              </div>
            )}

            {/* Admin Action Buttons */}
            <div className="space-y-2 pt-1">
              {localKycStatus === 'PENDING' ? (
                <>
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <button
                      type="button"
                      disabled={isVerifyingKyc}
                      onClick={handleVerifyKyc}
                      className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>{isVerifyingKyc ? 'Verifying...' : 'Verify & Approve KYC'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={isVerifyingKyc}
                      onClick={() => setShowRejectInput(!showRejectInput)}
                      className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject KYC</span>
                    </button>
                  </div>

                  {showRejectInput && (
                    <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2 animate-fadeIn">
                      <label className="text-[11px] font-bold text-rose-900 block">
                        Reason for KYC Rejection (communicated to caregiver):
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Document image blurry, ID number does not match name..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-rose-300 bg-white text-slate-800 focus:outline-none focus:border-rose-500"
                      />
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowRejectInput(false)}
                          className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-bold"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isVerifyingKyc}
                          onClick={handleRejectKyc}
                          className="px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-2xs cursor-pointer disabled:opacity-50"
                        >
                          {isVerifyingKyc ? 'Rejecting...' : 'Confirm Rejection'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500">
                    Status audit: <strong>{localKycStatus}</strong>
                  </span>
                  <div className="flex gap-2">
                    {localKycStatus === 'VERIFIED' ? (
                      <button
                        type="button"
                        onClick={() => setShowRejectInput(true)}
                        className="text-[11px] text-slate-500 hover:text-rose-600 font-bold underline"
                      >
                        Revoke / Re-evaluate
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleVerifyKyc}
                        disabled={isVerifyingKyc}
                        className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold underline"
                      >
                        Re-approve KYC
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Clinical Competencies & Verified Credentials */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Stethoscope className="w-4 h-4 text-teal-600" />
              <span>Clinical Competencies & Verification Credentials</span>
            </h3>

            {/* Verified Certifications Badges */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-700 block">
                Official Certifications & Background Checks:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(caregiver.certifications || [
                  {
                    name: 'BLS / CPR Certified',
                    issuer: 'American Heart Association',
                    issueDate: '2024-03-12',
                    verified: true,
                    credentialId: 'BLS-AHA-2024-88',
                  },
                  {
                    name: 'Geriatric Care Aide Level 2',
                    issuer: 'NSDC Healthcare Council',
                    issueDate: '2022-06-15',
                    verified: true,
                    credentialId: 'GCA-NSDC-TN-41',
                  },
                  {
                    name: 'Police Clearance Certificate',
                    issuer: 'Greater Chennai Police',
                    issueDate: '2026-01-10',
                    verified: true,
                    credentialId: 'PCC-CHN-2026-11',
                  },
                  {
                    name: `${caregiver.documentType || 'Aadhaar'} Identity KYC`,
                    issuer: localIsVerified ? 'UIDAI / CareConnect Verified' : 'Review Required',
                    issueDate: caregiver.kycUpdatedAt ? new Date(caregiver.kycUpdatedAt).toLocaleDateString() : 'Pending',
                    verified: localIsVerified,
                    credentialId: caregiver.maskedDocumentNumber || (localIsVerified ? 'UID-BIOMETRIC-OK' : 'PENDING-VERIFY'),
                  },
                ]).map((cert, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs"
                  >
                    <BadgeCheck className={`w-4 h-4 shrink-0 mt-0.5 ${cert.verified ? 'text-emerald-600' : 'text-amber-500'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-800 truncate">{cert.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{cert.issuer}</div>
                      <div className="text-[10px] text-teal-700 font-mono mt-0.5">
                        {cert.credentialId || 'VERIFIED'} • {cert.issueDate}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>


            {/* Clinical Competency Tags */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold text-slate-700 block">
                Clinical Skills & Protocols Mastered:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {competencies.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-xl bg-teal-50 border border-teal-200/80 text-teal-900 font-bold text-[11px] flex items-center gap-1.5 shadow-2xs"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                    <span>{skill}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Performance & Operational Reliability */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3.5">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-teal-600" />
              <span>Operational Reliability & Metrics</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">On-Time Arrival</span>
                <span className="text-lg font-heading font-extrabold text-emerald-700 block mt-0.5">
                  {caregiver.performanceMetrics?.onTimeArrivalRate || 98.4}%
                </span>
                <span className="text-[9px] text-slate-400 font-medium">GPS Geo-Fenced</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Completed Shifts</span>
                <span className="text-lg font-heading font-extrabold text-slate-900 block mt-0.5">
                  {caregiver.performanceMetrics?.totalCompletedVisits || 240}
                </span>
                <span className="text-[9px] text-slate-400 font-medium">Verified logs</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Avg SOS Response</span>
                <span className="text-lg font-heading font-extrabold text-teal-700 block mt-0.5">
                  {caregiver.performanceMetrics?.sosDrillResponseAvgMins || 7.2}m
                </span>
                <span className="text-[9px] text-slate-400 font-medium">Under 10m target</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Client NPS Score</span>
                <span className="text-lg font-heading font-extrabold text-sky-700 block mt-0.5">
                  {caregiver.performanceMetrics?.clientNpsRating || 97}/100
                </span>
                <span className="text-[9px] text-slate-400 font-medium">Family reviews</span>
              </div>
            </div>

            {caregiver.bio && (
              <p className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 leading-relaxed italic">
                "{caregiver.bio}"
              </p>
            )}
          </div>

          {/* Section 4: Contact, Payout & Logistics */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-teal-600" />
              <span>Contact, Payout & Personal Logistics</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Direct Contact Channels</span>
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${caregiver.phone}`}
                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    <Phone className="w-3.5 h-3.5 text-teal-700" />
                    <span>Call: {caregiver.phone}</span>
                  </a>
                  <a
                    href={`https://wa.me/${caregiver.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold flex items-center justify-center transition"
                    title="Open WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                  </a>
                </div>
                {caregiver.personalInfo?.secondaryPhone && (
                  <div className="text-[11px] text-slate-500">
                    Alt Phone: <strong>{caregiver.personalInfo.secondaryPhone}</strong>
                  </div>
                )}
                <div className="text-[11px] text-slate-500">
                  Residential Area: <strong>{caregiver.personalInfo?.residentialArea || 'Chennai'}</strong>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Payout & Demographics</span>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Remuneration Rate:</span>
                  <span className="font-extrabold text-teal-900">
                    ₹{caregiver.dailyRate || 1400} / day (₹{caregiver.hourlyRate || 150}/hr)
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Blood Group:</span>
                  <span className="font-bold text-slate-800">
                    {caregiver.personalInfo?.bloodGroup || 'O+'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Spoken Languages:</span>
                  <span className="font-bold text-slate-800 truncate max-w-[140px]">
                    {(caregiver.personalInfo?.languagesSpoken || caregiver.languages).join(', ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            {caregiver.emergencyContact && (
              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-amber-800 block">
                    Caregiver Emergency Contact:
                  </span>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {caregiver.emergencyContact.name} ({caregiver.emergencyContact.relationship})
                  </div>
                </div>
                <a
                  href={`tel:${caregiver.emergencyContact.phone}`}
                  className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition"
                >
                  {caregiver.emergencyContact.phone}
                </a>
              </div>
            )}
          </div>

          {/* Section 5: Emergency Supervisor Override */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3.5">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-rose-600" />
              <span>Supervisor Controls & Emergency Override</span>
            </h3>

            {/* Reassign Corridor Form Drawer */}
            {isReassigningCorridor ? (
              <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 space-y-3 text-xs animate-fadeIn">
                <span className="font-bold text-teal-900 block">
                  Select New Corridor Hub for {caregiver.fullName}:
                </span>
                <select
                  value={selectedCorridor}
                  onChange={(e) => setSelectedCorridor(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-teal-300 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {serviceableCorridors.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name} ({c.pin}) — {c.status}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2 justify-end pt-1">
                  <button
                    onClick={() => setIsReassigningCorridor(false)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCorridor}
                    className="px-4 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold"
                  >
                    Confirm Reassignment
                  </button>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <button
                onClick={() => setIsReassigningCorridor(true)}
                className="py-2.5 px-3 rounded-2xl bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-slate-700 hover:text-teal-900 font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Compass className="w-4 h-4 text-teal-700" />
                <span>Reassign Corridor</span>
              </button>

              <button
                onClick={handleDispatch}
                className="py-2.5 px-3 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 text-rose-800 font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Dispatch to SOS</span>
              </button>

              <button
                onClick={handleToggleFlag}
                className={`py-2.5 px-3 rounded-2xl border font-bold transition flex items-center justify-center gap-1.5 shadow-2xs ${
                  isFlagged
                    ? 'bg-amber-500 text-white border-amber-600'
                    : 'bg-slate-50 hover:bg-amber-50 border-slate-200 hover:border-amber-300 text-slate-700 hover:text-amber-900'
                }`}
              >
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>{isFlagged ? 'Clear Flag' : 'Flag Profile'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>CareConnect Operations Command Desk</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition"
          >
            Close Dossier
          </button>
        </div>
      </div>

      {/* Document Proof Preview Modal */}
      {showDocModal && caregiver.documentStorageReference && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                <h4 className="font-bold text-slate-900 text-sm">
                  {caregiver.documentType || 'Government ID'} Document Proof
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowDocModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-auto rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center p-2">
              {caregiver.documentStorageReference.startsWith('data:image/') ? (
                <img
                  src={caregiver.documentStorageReference}
                  alt="KYC Document Attachment"
                  className="max-h-[55vh] max-w-full object-contain rounded-xl"
                />
              ) : caregiver.documentStorageReference.startsWith('data:application/pdf') ? (
                <div className="p-8 text-center space-y-3">
                  <FileText className="w-12 h-12 text-teal-600 mx-auto" />
                  <p className="text-xs text-slate-600 font-medium">PDF Document Uploaded</p>
                  <a
                    href={caregiver.documentStorageReference}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm"
                  >
                    Open PDF in New Tab
                  </a>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-600">
                  <p className="font-mono bg-white p-3 rounded border border-slate-300 break-all">
                    {caregiver.documentStorageReference}
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowDocModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

