import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  UserCheck,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { caregiverApi } from '../../services/api';
import { useCaregiverAuth } from '../../context/CaregiverAuthContext';
import type { CaregiverKyc, KycDocumentType, KycVerificationStatus } from '../../types';

interface CaregiverKycModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DOCUMENT_TYPES: { value: KycDocumentType; label: string; placeholder: string; helper: string }[] = [
  {
    value: 'AADHAAR',
    label: 'Aadhaar (UIDAI)',
    placeholder: '12-digit number (e.g. 541278963214)',
    helper: '12 numeric digits without spaces or hyphens.',
  },
  {
    value: 'PAN',
    label: 'PAN Card (Income Tax)',
    placeholder: '10 characters (e.g. ABCDE1234F)',
    helper: '10 characters in format ABCDE1234F.',
  },
  {
    value: 'PASSPORT',
    label: 'Passport',
    placeholder: 'Passport number (e.g. A1234567)',
    helper: '6-12 alphanumeric characters.',
  },
  {
    value: 'DRIVING_LICENCE',
    label: 'Driving Licence',
    placeholder: 'DL number (e.g. TN0720190012345)',
    helper: '8-20 alphanumeric characters.',
  },
  {
    value: 'VOTER_ID',
    label: 'Voter ID (EPIC)',
    placeholder: 'Voter ID (e.g. ABC1234567)',
    helper: '8-16 alphanumeric characters.',
  },
  {
    value: 'OTHER',
    label: 'Other Government Photo ID',
    placeholder: 'Official ID number',
    helper: 'Official government document number.',
  },
];

export const CaregiverKycModal: React.FC<CaregiverKycModalProps> = ({ isOpen, onClose }) => {
  const { user } = useCaregiverAuth();

  const [kyc, setKyc] = useState<CaregiverKyc | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [documentType, setDocumentType] = useState<KycDocumentType>('AADHAAR');
  const [documentNumber, setDocumentNumber] = useState<string>('');
  const [mobileNumber, setMobileNumber] = useState<string>(user?.phone || '');
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSizeErr, setFileSizeErr] = useState<string | null>(null);

  // Consent & Disclosures states (Requirement 3)
  const [termsAccepted, setTermsAccepted] = useState<boolean>(true);
  const [serviceConsent, setServiceConsent] = useState<boolean>(true);
  const [promotionalConsent, setPromotionalConsent] = useState<boolean>(false);
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);

  // Admin/Ops verification state
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [showRejectInput, setShowRejectInput] = useState<boolean>(false);

  const fetchKyc = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await caregiverApi.getMyKyc();
      setKyc(data);
      if (data) {
        setDocumentType(data.document_type);
      }
    } catch (err: any) {
      // 404 is normal if no KYC has been submitted yet
      if (!err.message?.includes('404') && !err.message?.includes('No KYC')) {
        setError(err.message || 'Failed to fetch KYC records.');
      } else {
        setKyc(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchKyc();
      if (user?.phone) {
        setMobileNumber(user.phone);
      }
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const selectedDocConfig = DOCUMENT_TYPES.find((d) => d.value === documentType) || DOCUMENT_TYPES[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileSizeErr(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      setFileSizeErr('File size exceeds 5MB limit. Please choose a smaller file.');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setFileSizeErr('Only JPEG, PNG, WebP or PDF files are accepted.');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setFileBase64(reader.result as string);
    };
    reader.onerror = () => {
      setFileSizeErr('Error reading file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const validateDocInput = (): string | null => {
    const cleaned = documentNumber.replace(/[\s\-]/g, '');
    if (!cleaned) return 'Please enter the document number.';

    if (documentType === 'AADHAAR') {
      if (!/^\d{12}$/.test(cleaned)) {
        return 'Aadhaar must be exactly 12 numeric digits.';
      }
    } else if (documentType === 'PAN') {
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(cleaned)) {
        return 'PAN must be 10 characters in format ABCDE1234F.';
      }
    } else if (cleaned.length < 4) {
      return 'Document number must be at least 4 characters.';
    }

    if (!mobileNumber || mobileNumber.trim().length < 8) {
      return 'Please enter a valid mobile number.';
    }

    if (!termsAccepted) {
      return 'You must review and accept the Terms & Conditions before submitting KYC.';
    }

    if (!serviceConsent) {
      return 'Required service-related communication consent must be granted.';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const validationErr = validateDocInput();
    if (validationErr) {
      setError(validationErr);
      return;
    }

    setSubmitting(true);
    try {
      const res = await caregiverApi.submitMyKyc({
        document_type: documentType,
        document_number: documentNumber.trim(),
        mobile_number: mobileNumber.trim(),
        document_storage_reference: fileBase64 || undefined,
        terms_accepted: termsAccepted,
        service_consent: serviceConsent,
        promotional_consent: promotionalConsent,
      });

      // Record consent versioning in backend
      await caregiverApi.recordConsent({
        phone: mobileNumber.trim(),
        consents: [
          {
            consentType: 'SERVICE_COMMUNICATIONS',
            granted: serviceConsent,
            version: '2026.1',
            purpose: 'Required shift assignments, emergency alerts, operational SMS',
            userAction: 'KYC_SUBMIT_GRANT',
          },
          {
            consentType: 'TERMS_AND_CONDITIONS',
            granted: termsAccepted,
            version: '2026.1',
            purpose: 'Caregiver partner service agreement acceptance',
            userAction: 'KYC_SUBMIT_AGREE',
          },
          {
            consentType: 'PROMOTIONAL_COMMUNICATIONS',
            granted: promotionalConsent,
            version: '2026.1',
            purpose: 'Optional partner perks, updates and offers',
            userAction: promotionalConsent ? 'KYC_SUBMIT_GRANT' : 'KYC_SUBMIT_DECLINE',
          },
        ],
      }).catch((e) => console.warn('Consent recording background warning:', e));

      setKyc(res);
      setSuccessMsg('KYC documents submitted. Status remains PENDING until verified by an Administrator or Operations Manager.');
      setDocumentNumber('');
      setFileBase64(null);
      setFileName(null);
    } catch (err: any) {
      setError(err.message || 'Failed to submit KYC documents.');
    } finally {
      setSubmitting(false);
    }
  };

  // Operations/Admin Status Action
  const handleUpdateStatus = async (status: 'VERIFIED' | 'REJECTED') => {
    if (!kyc || !user) return;
    setIsVerifying(true);
    setError(null);
    try {
      const res = await caregiverApi.updateCaregiverKycStatus(kyc.caregiver_id, {
        verification_status: status,
        rejection_reason: status === 'REJECTED' ? rejectionReason || 'Document illegible or invalid' : undefined,
      });
      setKyc(res);
      setSuccessMsg(`KYC record marked as ${status}.`);
      setShowRejectInput(false);
      setRejectionReason('');
    } catch (err: any) {
      setError(err.message || 'Failed to update verification status.');
    } finally {
      setIsVerifying(false);
    }
  };

  const isOpsOrAdmin = user?.role === 'OPS_MANAGER' || user?.role === 'ADMIN';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 bg-primary text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 bg-teal-800/60 rounded-lg shrink-0">
              <ShieldCheck className="w-5 h-5 text-teal-200" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-sm sm:text-base tracking-tight truncate">Identity Verification & KYC</h2>
              <p className="text-teal-100 text-[11px] sm:text-xs truncate">Caregiver credentials & government verification</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-teal-100 hover:text-white hover:bg-teal-700/60 rounded-lg transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-slate-800 text-sm flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <div>{successMsg}</div>
            </div>
          )}

          {/* Basic Caregiver Information */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Caregiver Basic Information
            </span>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Full Name:</span>
                <span className="font-bold text-slate-800">{user?.fullName || 'Meenakshi Sundaram'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Phone Number:</span>
                <span className="font-bold text-slate-800 font-mono">{user?.phone || '+91 98765 00001'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">System Role:</span>
                <span className="font-semibold text-primary">{user?.role || 'CAREGIVER'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Country:</span>
                <span className="font-semibold text-slate-700">🇮🇳 India (+91)</span>
              </div>
            </div>
          </div>

          {/* Current KYC Verification Status Badge */}
          <div className="border border-slate-200 rounded-xl p-3.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Verification Status
            </span>

            {loading ? (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                <span>Checking verification records...</span>
              </div>
            ) : kyc ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {kyc.verification_status === 'VERIFIED' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ✓ Identity Verified
                      </span>
                    )}
                    {kyc.verification_status === 'PENDING' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        ● Pending Verification
                      </span>
                    )}
                    {kyc.verification_status === 'REJECTED' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                        ✕ Rejected
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Updated {new Date(kyc.updated_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Work Eligibility Rule Notice */}
                {kyc.verification_status === 'VERIFIED' ? (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>✓ KYC Verified: You are eligible to view and accept elder care assignments.</span>
                  </div>
                ) : kyc.verification_status === 'PENDING' ? (
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>● Verification Pending: Review in progress. You cannot accept care assignments until approved.</span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>✕ Verification Rejected: You cannot accept care assignments. Please submit a valid document below.</span>
                  </div>
                )}

                <div className="bg-slate-50 p-2.5 rounded-lg text-xs grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <span className="text-slate-500 block">Document Type:</span>
                    <span className="font-semibold text-slate-700">{kyc.document_type}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Document Number:</span>
                    <span className="font-mono font-bold text-slate-800">{kyc.masked_document_number}</span>
                  </div>
                  {kyc.document_storage_reference && (
                    <div className="col-span-2 flex items-center gap-1.5 text-teal-700 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                      <span>Document uploaded securely</span>
                    </div>
                  )}
                  {kyc.rejection_reason && (
                    <div className="col-span-2 p-2 bg-red-50 text-red-700 rounded border border-red-200">
                      <span className="font-bold block">Rejection Reason:</span>
                      <span>{kyc.rejection_reason}</span>
                    </div>
                  )}
                </div>

                {/* Operations Review Controls */}
                {isOpsOrAdmin && (
                  <div className="pt-2 border-t border-slate-200 mt-3 space-y-2">
                    <span className="text-[11px] font-bold text-slate-600 uppercase">
                      Operations Management Actions
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={isVerifying || kyc.verification_status === 'VERIFIED'}
                        onClick={() => handleUpdateStatus('VERIFIED')}
                        className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Verify Identity</span>
                      </button>
                      <button
                        type="button"
                        disabled={isVerifying}
                        onClick={() => setShowRejectInput(!showRejectInput)}
                        className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs rounded-xl transition-colors"
                      >
                        Reject
                      </button>
                    </div>

                    {showRejectInput && (
                      <div className="space-y-1.5 pt-1">
                        <input
                          type="text"
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Reason for rejection (e.g. Blurry photo)"
                          className="w-full p-2 border border-red-300 rounded-lg text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus('REJECTED')}
                          className="w-full py-1.5 bg-red-600 text-white font-bold text-xs rounded-lg"
                        >
                          Confirm Rejection
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>No identity verification record found. Please submit your identity proof below.</span>
              </div>
            )}
          </div>

          {/* KYC Submission / Update Form (Shown if not yet submitted or if rejected or user wants to re-upload) */}
          {(!kyc || kyc.verification_status !== 'VERIFIED') && (
            <form onSubmit={handleSubmit} className="border border-slate-200 rounded-xl p-4 space-y-4 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary" />
                  <span>{kyc ? 'Re-upload / Update Identity Proof' : 'Identity Document Submission (Mandatory)'}</span>
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  Required for Work
                </span>
              </div>

              {/* Document Type Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Identity Document Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value as KycDocumentType)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {DOCUMENT_TYPES.map((dt) => (
                    <option key={dt.value} value={dt.value}>
                      {dt.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">{selectedDocConfig.helper}</p>
                {documentType === 'AADHAAR' && (
                  <p className="text-[11px] text-teal-800 bg-teal-50 border border-teal-200 rounded-lg p-2 mt-1.5 leading-snug">
                    <strong>Aadhaar Provider Compliance:</strong> Verification is routed strictly through authorized, licensed UIDAI verification partners. CareConnect never operates unofficial Aadhaar OTP services or logs plain Aadhaar numbers.
                  </p>
                )}
              </div>

              {/* Document Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Document Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder={selectedDocConfig.placeholder}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Mobile Number Field (Immediately After Document Number - Requirement 3) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Used for verified dispatch, assignment notifications, and critical emergency SOS contact.
                </p>
              </div>

              {/* Secure Document Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Upload Identity Document (JPEG, PNG, WebP or PDF, Max 5MB)
                </label>
                <div className="relative border-2 border-dashed border-slate-300 hover:border-primary rounded-xl p-3 bg-white text-center cursor-pointer transition-colors">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center gap-1 py-1">
                    <Upload className="w-5 h-5 text-slate-400" />
                    <span className="text-xs font-medium text-slate-600">
                      {fileName ? `Selected: ${fileName}` : 'Choose File or Drag & Drop'}
                    </span>
                    <span className="text-[10px] text-slate-400">Encrypted and securely stored</span>
                  </div>
                </div>
                {fileSizeErr && <p className="text-[11px] text-red-600 mt-1 font-medium">{fileSizeErr}</p>}
                {fileName && (
                  <p className="text-[11px] text-teal-700 mt-1 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                    <span>✓ Document ready for upload</span>
                  </p>
                )}
              </div>

              {/* Statutory Data Collection Disclosures (Requirement 3) */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-[11px] text-slate-600 leading-snug">
                <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-teal-700" />
                  <span>Data Collected & Privacy Disclosure</span>
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li><strong>Identity:</strong> Government photo ID number and cryptographic hashes for verification.</li>
                  <li><strong>Contact:</strong> Mobile phone number for shift dispatch and emergency SOS.</li>
                  <li><strong>Professional:</strong> Educational qualifications, healthcare certifications, and verified skills.</li>
                  <li><strong>Availability:</strong> Real-time work status to route matching elder care requests.</li>
                  <li><strong>Performance:</strong> Punctuality, check-in timestamps, shift completion, and family ratings.</li>
                </ul>
              </div>

              {/* Consent Checkboxes (Requirement 3: Separate service from optional promotional) */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2.5">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    required
                    checked={serviceConsent}
                    onChange={(e) => setServiceConsent(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary shrink-0"
                  />
                  <span className="text-slate-800 leading-snug">
                    <strong className="text-slate-900">[Required] Service Communications:</strong> I consent to CareConnect collecting my mobile number and sending shift assignments, elder vitals alerts, emergency SOS dispatch, and operational notices via SMS/WhatsApp/Push.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={promotionalConsent}
                    onChange={(e) => setPromotionalConsent(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary shrink-0"
                  />
                  <span className="text-slate-700 leading-snug">
                    <strong>[Optional] Promotional Communications:</strong> I consent to receiving non-critical partner perk announcements, training webinars, and platform community news.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    required
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary shrink-0"
                  />
                  <span className="text-slate-800 leading-snug">
                    <strong className="text-slate-900">[Required] Terms of Service:</strong> I have reviewed and agree to the{' '}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-primary font-bold underline hover:text-teal-800"
                    >
                      CareConnect Caregiver Terms & Conditions
                    </button>{' '}
                    and Privacy Policy.
                  </span>
                </label>
              </div>

              {/* Terms and Conditions Preview Modal */}
              {showTermsModal && (
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl space-y-2 text-xs text-teal-900">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">Applicable Terms & Conditions Summary</span>
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(false)}
                      className="text-[10px] text-teal-700 underline font-semibold"
                    >
                      Hide
                    </button>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Caregiver partners agree to maintain punctuality, deliver dignified elderly care, record accurate vitals, execute assignments safely, and uphold client confidentiality. Identity documents are subject to administrative review. Shifts and payments adhere to CareConnect operations standards.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !termsAccepted || !serviceConsent}
                className="w-full py-3 px-4 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-xl shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>{submitting ? 'Submitting Documents...' : 'Submit Identity Document for Verification'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end pb-safe shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
