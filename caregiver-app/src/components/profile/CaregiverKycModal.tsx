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
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  Briefcase,
  User,
  QrCode,
  Sparkles,
  Check,
  Edit2,
  Clock,
  Phone,
  MapPin,
  Calendar,
} from 'lucide-react';
import { caregiverApi } from '../../services/api';
import { useCaregiverAuth } from '../../context/CaregiverAuthContext';
import type { KycDocumentType, OnboardingState, DocumentScanResult } from '../../types';

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
];

const AVAILABLE_SERVICES = [
  { id: 'Elder Companion Care', name: 'Elder Companion Care', isClinical: false, desc: 'Daily accompaniment, conversation, walk assistance' },
  { id: 'Mobility Assistance', name: 'Mobility Assistance', isClinical: false, desc: 'Walker/wheelchair transfers, fall prevention' },
  { id: 'Medication Management', name: 'Medication Reminders & Logs', isClinical: false, desc: 'Oral medication schedules and sponsor logging' },
  { id: 'Vitals Monitoring', name: 'Vitals Signs Triage (BP/Sugar/Pulse)', isClinical: true, desc: 'Digital BP, pulse-oximeter, glucometer monitoring' },
  { id: 'Dementia Care', name: 'Dementia & Alzheimer Care', isClinical: true, desc: 'Memory routine support, redirection, calming techniques' },
  { id: 'Post-Stroke Recovery', name: 'Post-Stroke Rehabilitation Support', isClinical: true, desc: 'Passive range of motion exercises under physio' },
  { id: 'Bedridden Patient Care', name: 'Bedridden Patient Hygiene & Turning', isClinical: true, desc: 'Bed sponge, diaper changes, pressure ulcer prevention' },
  { id: 'Palliative Support', name: 'Palliative & Comfort Care', isClinical: true, desc: 'End-of-life comfort, compassionate assistance' },
];

const SHIFT_OPTIONS = [
  { id: 'Day 10-Hour', label: 'Day 10-Hour (8 AM – 6 PM)' },
  { id: 'Night 12-Hour', label: 'Night 12-Hour (8 PM – 8 AM)' },
  { id: 'Day 8-Hour', label: 'Day 8-Hour (9 AM – 5 PM)' },
  { id: '24/7 Live-in', label: '24/7 Live-in Companion' },
];

export const CaregiverKycModal: React.FC<CaregiverKycModalProps> = ({ isOpen, onClose }) => {
  const { user, refreshProfile } = useCaregiverAuth();

  const [activeStep, setActiveStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [extracting, setExtracting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Full onboarding state from server
  const [onboardingData, setOnboardingData] = useState<OnboardingState | null>(null);

  // Step 1: Identification & KYC
  const [documentType, setDocumentType] = useState<KycDocumentType>('AADHAAR');
  const [documentNumber, setDocumentNumber] = useState<string>('');
  const [identityFileBase64, setIdentityFileBase64] = useState<string | null>(null);
  const [identityFileName, setIdentityFileName] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState<boolean>(true);
  const [serviceConsent, setServiceConsent] = useState<boolean>(true);
  const [promotionalConsent, setPromotionalConsent] = useState<boolean>(false);
  const [extractedIdentityInfo, setExtractedIdentityInfo] = useState<Record<string, any> | null>(null);

  // Step 2: Personal Details
  const [fullName, setFullName] = useState<string>('');
  const [dob, setDob] = useState<string>('');
  const [gender, setGender] = useState<string>('FEMALE');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [locality, setLocality] = useState<string>('Adyar, Chennai');
  const [bio, setBio] = useState<string>('');

  // Step 3: Education Details
  const [institution, setInstitution] = useState<string>('');
  const [course, setCourse] = useState<string>('B.Sc Nursing');
  const [completionYear, setCompletionYear] = useState<string>('2020');
  const [credentialId, setCredentialId] = useState<string>('');
  const [certFileBase64, setCertFileBase64] = useState<string | null>(null);
  const [certFileName, setCertFileName] = useState<string | null>(null);
  const [qrScanResult, setQrScanResult] = useState<DocumentScanResult | null>(null);

  // Step 4: Services Offered & Rates
  const [selectedServices, setSelectedServices] = useState<string[]>([
    'Elder Companion Care',
    'Mobility Assistance',
    'Medication Management',
  ]);
  const [selectedShifts, setSelectedShifts] = useState<string[]>(['Day 10-Hour', 'Night 12-Hour']);
  const [preferredHours, setPreferredHours] = useState<string>('08:00 AM - 06:00 PM');
  const [dailyRate, setDailyRate] = useState<number>(2000);
  const [hourlyRate, setHourlyRate] = useState<number>(250);
  const [isAvailable, setIsAvailable] = useState<boolean>(true);

  // Review & Edit mode flag
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  // Load existing state from backend
  const loadState = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await caregiverApi.getOnboardingState();
      setOnboardingData(data);

      // Step 1 values
      if (data.step1) {
        if (data.step1.documentType) setDocumentType(data.step1.documentType);
        if (data.step1.maskedDocumentNumber) setDocumentNumber(data.step1.maskedDocumentNumber);
        if (data.step1.documentStorageReference) setIdentityFileName('Uploaded Identity Document');
      }

      // Step 2 values
      if (data.step2) {
        setFullName(data.step2.fullName || user?.fullName || '');
        setDob(data.step2.dob || user?.dob || '');
        setGender(data.step2.gender || user?.gender || 'FEMALE');
        setPhone(data.step2.phone || user?.phone || '');
        setEmail(data.step2.email || user?.email || '');
        setLocality(data.step2.locality || user?.locality || 'Adyar, Chennai');
        setBio(data.step2.bio || '');
      }

      // Step 3 values
      if (data.step3) {
        setInstitution(data.step3.institution || '');
        setCourse(data.step3.course || 'B.Sc Nursing');
        setCompletionYear(data.step3.completionYear ? String(data.step3.completionYear) : '2020');
        setCredentialId(data.step3.credentialId || '');
        if (data.step3.documentUrl) setCertFileName('Uploaded Certificate');
        if (data.step3.qrPayload) {
          setQrScanResult({
            detected: true,
            status: data.step3.verificationStatus || 'QR_DETECTED',
            rawPayload: data.step3.qrPayload,
            message: `Credential detected: ${data.step3.credentialId || 'Credential QR'}`,
            extractedFields: {},
          });
        }
      }

      // Step 4 values
      if (data.step4) {
        if (data.step4.servicesOffered?.length) setSelectedServices(data.step4.servicesOffered);
        if (data.step4.shiftPreferences?.length) setSelectedShifts(data.step4.shiftPreferences);
        if (data.step4.preferredHours) setPreferredHours(data.step4.preferredHours);
        if (data.step4.dailyRate) setDailyRate(data.step4.dailyRate);
        if (data.step4.hourlyRate) setHourlyRate(data.step4.hourlyRate);
        setIsAvailable(data.step4.isAvailable);
      }

      // Resume at currentStep or show summary if complete
      if (data.isProfileComplete && data.step1.isSubmitted) {
        setActiveStep(5); // Summary / Completed overview
      } else {
        setActiveStep(data.currentStep || 1);
      }
    } catch (err: any) {
      console.error('Failed to load onboarding state:', err);
      setError('Unable to load saved onboarding progress. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadState();
    }
  }, [isOpen]);

  // Handle Identity document upload & OCR extraction
  const handleIdentityFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Document file size exceeds 5MB limit.');
      return;
    }

    setIdentityFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setIdentityFileBase64(base64);

      // Perform OCR / Barcode extraction (Req J)
      setExtracting(true);
      try {
        const scanRes = await caregiverApi.extractDocument('IDENTITY', base64);
        if (scanRes.extractedFields) {
          setExtractedIdentityInfo(scanRes.extractedFields);
          if (scanRes.extractedFields.documentNumber) {
            setDocumentNumber(scanRes.extractedFields.documentNumber);
          }
          if (scanRes.extractedFields.gender) {
            setGender(scanRes.extractedFields.gender);
          }
          if (scanRes.extractedFields.dob) {
            setDob(scanRes.extractedFields.dob);
          }
          setSuccessMsg('Document scanned: information detected for your review.');
        }
      } catch (err: any) {
        console.warn('Document extraction warning:', err);
      } finally {
        setExtracting(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Certificate upload & QR scan (Req B & J)
  const handleCertFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Certificate file size exceeds 5MB limit.');
      return;
    }

    setCertFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setCertFileBase64(base64);

      // Trigger QR detection via backend
      setExtracting(true);
      try {
        const scanRes = await caregiverApi.extractDocument('EDUCATION', base64);
        setQrScanResult(scanRes);
        if (scanRes.extractedFields?.credentialId) {
          setCredentialId(scanRes.extractedFields.credentialId);
        }
        if (scanRes.extractedFields?.institution) {
          setInstitution(scanRes.extractedFields.institution);
        }
        if (scanRes.extractedFields?.degree) {
          setCourse(scanRes.extractedFields.degree);
        }
        setSuccessMsg(scanRes.message);
      } catch (err: any) {
        console.warn('QR scan warning:', err);
      } finally {
        setExtracting(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Step 1 Submit
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentNumber || documentNumber.length < 4) {
      setError('Please provide a valid document number.');
      return;
    }
    if (!termsAccepted || !serviceConsent) {
      setError('Mandatory service communications and terms agreement are required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await caregiverApi.saveOnboardingStep1({
        document_type: documentType,
        document_number: documentNumber,
        document_storage_reference: identityFileBase64 || onboardingData?.step1?.documentStorageReference,
        terms_accepted: termsAccepted,
        service_consent_granted: serviceConsent,
        promotional_consent_granted: promotionalConsent,
      });
      setSuccessMsg('Identification details saved.');
      setActiveStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to save identity documents.');
    } finally {
      setSaving(false);
    }
  };

  // Step 2 Submit
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !dob.trim() || !locality.trim()) {
      setError('Full name, date of birth, and locality are required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await caregiverApi.saveOnboardingStep2({
        fullName: fullName.trim(),
        dob: dob.trim(),
        gender,
        phone: phone.trim() || user?.phone,
        email: email.trim(),
        locality: locality.trim(),
        bio: bio.trim(),
      });
      setSuccessMsg('Personal details saved.');
      setActiveStep(3);
    } catch (err: any) {
      setError(err.message || 'Failed to save personal details.');
    } finally {
      setSaving(false);
    }
  };

  // Step 3 Submit
  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institution.trim() || !course.trim()) {
      setError('Educational institution and qualification name are required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await caregiverApi.saveOnboardingStep3({
        institution: institution.trim(),
        course: course.trim(),
        completionYear: completionYear ? parseInt(completionYear, 10) : undefined,
        credentialId: credentialId.trim() || undefined,
        documentUrl: certFileBase64 || onboardingData?.step3?.documentUrl,
        qrPayload: qrScanResult?.rawPayload || undefined,
        verificationMethod: qrScanResult?.detected ? 'BARCODE_QR_SCAN' : 'MANUAL_REVIEW',
      });
      setSuccessMsg('Educational credentials saved.');
      setActiveStep(4);
    } catch (err: any) {
      setError(err.message || 'Failed to save education details.');
    } finally {
      setSaving(false);
    }
  };

  // Step 4 Submit (Final Completion)
  const handleStep4Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServices.length) {
      setError('Please select at least one care service offered.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await caregiverApi.saveOnboardingStep4({
        servicesOffered: selectedServices,
        shiftPreferences: selectedShifts,
        preferredHours,
        dailyRate: Number(dailyRate),
        hourlyRate: Number(hourlyRate),
        isAvailable,
      });
      setSuccessMsg('Onboarding complete! Profile submitted.');
      if (refreshProfile) await refreshProfile();
      await loadState();
      setActiveStep(5); // Show summary overview
    } catch (err: any) {
      setError(err.message || 'Failed to save services and preferences.');
    } finally {
      setSaving(false);
    }
  };

  const toggleService = (id: string) => {
    if (selectedServices.includes(id)) {
      setSelectedServices(selectedServices.filter((s) => s !== id));
    } else {
      setSelectedServices([...selectedServices, id]);
    }
  };

  const toggleShift = (id: string) => {
    if (selectedShifts.includes(id)) {
      if (selectedShifts.length > 1) {
        setSelectedShifts(selectedShifts.filter((s) => s !== id));
      }
    } else {
      setSelectedShifts([...selectedShifts, id]);
    }
  };

  if (!isOpen) return null;

  const selectedDocConfig = DOCUMENT_TYPES.find((d) => d.value === documentType) || DOCUMENT_TYPES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl shadow-2xl border border-slate-100 overflow-hidden text-slate-800">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
              <ShieldCheck className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Caregiver Onboarding & Verification</h2>
              <p className="text-[11px] text-teal-200">
                {activeStep <= 4 ? `Step ${activeStep} of 4: ${['', 'Identification', 'Personal Details', 'Education Details', 'Services Offered'][activeStep]}` : 'Completed Profile Overview'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 4-Step Progress Indicator */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 shrink-0">
          <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-semibold">
            {[
              { num: 1, label: 'Identity', icon: ShieldCheck },
              { num: 2, label: 'Personal', icon: User },
              { num: 3, label: 'Education', icon: GraduationCap },
              { num: 4, label: 'Services', icon: Briefcase },
            ].map((step) => {
              const Icon = step.icon;
              const isCurrent = activeStep === step.num;
              const isCompleted = activeStep > step.num || (onboardingData?.currentStep || 1) > step.num;
              return (
                <button
                  key={step.num}
                  type="button"
                  onClick={() => {
                    if (isCompleted || activeStep === 5) setActiveStep(step.num);
                  }}
                  className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg transition-all ${
                    isCurrent
                      ? 'bg-teal-700 text-white shadow-sm font-bold'
                      : isCompleted
                      ? 'bg-teal-50 text-teal-800 hover:bg-teal-100'
                      : 'bg-slate-200/70 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span className="truncate">{step.label}</span>
                  {isCompleted && !isCurrent && <Check className="w-2.5 h-2.5 text-teal-600 ml-0.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mx-5 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-800">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p className="flex-1 font-medium">{error}</p>
          </div>
        )}
        {successMsg && (
          <div className="mx-5 mt-3 p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-start gap-2 text-xs text-teal-800">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <p className="flex-1 font-medium">{successMsg}</p>
          </div>
        )}

        {/* Modal Content Scroll Area */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <RefreshCw className="w-6 h-6 text-teal-600 animate-spin" />
              <p className="text-xs text-slate-500 font-medium">Loading onboarding details...</p>
            </div>
          ) : activeStep === 1 ? (
            /* ========================================================
               PAGE 1: KYC / IDENTIFICATION
               ======================================================== */
            <form onSubmit={handleStep1Submit} className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  <span>Step 1: Government Identity Verification</span>
                </h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Provide your official identification document. Extracted values will be pre-filled for your confirmation in the next step.
                </p>
              </div>

              {/* Document Type Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Document Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value as KycDocumentType)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {DOCUMENT_TYPES.map((dt) => (
                    <option key={dt.value} value={dt.value}>
                      {dt.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">{selectedDocConfig.helper}</p>
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
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Upload Document / OCR Scan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Upload or Capture Document (JPEG, PNG, WebP or PDF, Max 5MB)
                </label>
                <div className="relative border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-xl p-3.5 bg-white text-center cursor-pointer transition-colors">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleIdentityFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                    <Upload className="w-5 h-5 text-slate-400" />
                    <span className="text-xs font-medium text-slate-700">
                      {identityFileName ? `Selected: ${identityFileName}` : 'Choose File or Take Photo'}
                    </span>
                    <span className="text-[10px] text-slate-400">Automatic OCR prefill supported</span>
                  </div>
                </div>
                {extracting && (
                  <p className="text-[11px] text-teal-700 mt-1.5 font-medium flex items-center gap-1 animate-pulse">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    <span>Extracting candidate information from document...</span>
                  </p>
                )}
                {extractedIdentityInfo && (
                  <div className="mt-2 p-2.5 bg-teal-50 border border-teal-200 rounded-xl text-[11px] text-teal-900 space-y-1">
                    <p className="font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-teal-600" />
                      <span>OCR Extraction Successful — Review Values Below</span>
                    </p>
                    <p>Document Number: <strong>{documentNumber || 'Detected'}</strong></p>
                    {extractedIdentityInfo.gender && <p>Gender: <strong>{extractedIdentityInfo.gender}</strong></p>}
                    {extractedIdentityInfo.dob && <p>DOB: <strong>{extractedIdentityInfo.dob}</strong></p>}
                    <p className="text-[10px] text-teal-700">These will be prefilled in Step 2 for your confirmation.</p>
                  </div>
                )}
              </div>

              {/* Consent Disclosures */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 text-xs">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={serviceConsent}
                    onChange={(e) => setServiceConsent(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 shrink-0"
                  />
                  <span className="text-slate-800 leading-snug">
                    <strong>[Required] Service Communications:</strong> I consent to CareConnect collecting my identification and sending shift alerts and emergency SOS dispatch.
                  </span>
                </label>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 shrink-0"
                  />
                  <span className="text-slate-800 leading-snug">
                    <strong>[Required] Terms & Identity Notice:</strong> I agree to the CareConnect Terms & Verification Standards. Documents will be reviewed by operations.
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving || !termsAccepted || !serviceConsent}
                  className="min-h-[44px] px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Continue to Personal Details</span>}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : activeStep === 2 ? (
            /* ========================================================
               PAGE 2: PERSONAL DETAILS
               ======================================================== */
            <form onSubmit={handleStep2Submit} className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-teal-600" />
                  <span>Step 2: Personal Details & Contact</span>
                </h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Review and confirm your personal information. Every field is editable. Pre-populated from identity document.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Meenakshi Sundaram"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="FEMALE">Female</option>
                    <option value="MALE">Male</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Phone</label>
                  <input
                    type="tel"
                    readOnly
                    value={phone || user?.phone || ''}
                    className="w-full p-2.5 bg-slate-100 border border-slate-300 rounded-xl text-xs font-mono text-slate-600 cursor-not-allowed"
                  />
                  <span className="text-[10px] text-slate-400">Authenticated phone number</span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="caregiver@email.com"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Locality / Base Area (Chennai) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  placeholder="e.g. Adyar, Chennai"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Professional Bio / Summary</label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="e.g. 5+ years of dedicated experience in elder companionship, vitals monitoring, and stroke recovery support."
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Navigation Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Identity</span>
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-[44px] px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Continue to Education Details</span>}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : activeStep === 3 ? (
            /* ========================================================
               PAGE 3: EDUCATION DETAILS & CERTIFICATE BARCODE/QR (Req B)
               ======================================================== */
            <form onSubmit={handleStep3Submit} className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-teal-600" />
                  <span>Step 3: Educational Qualifications & Credentials</span>
                </h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Enter your formal nursing or healthcare qualifications. Certificates with QR codes or barcodes will be inspected automatically.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Educational Institution / Issuing Authority <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g. Madras Medical College / Apollo College of Nursing"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Course / Qualification Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    placeholder="e.g. B.Sc Nursing / GNM / General Duty Assistant"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Completion Year</label>
                  <input
                    type="number"
                    value={completionYear}
                    onChange={(e) => setCompletionYear(e.target.value)}
                    placeholder="e.g. 2020"
                    min="1970"
                    max="2030"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Registration / Credential Identifier
                </label>
                <input
                  type="text"
                  value={credentialId}
                  onChange={(e) => setCredentialId(e.target.value)}
                  placeholder="e.g. TNMC-2020-8912"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Certificate Upload & QR Inspection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Upload Educational Certificate (JPEG, PNG, WebP or PDF, Max 5MB)
                </label>
                <div className="relative border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-xl p-3.5 bg-white text-center cursor-pointer transition-colors">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleCertFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                    <QrCode className="w-5 h-5 text-teal-600" />
                    <span className="text-xs font-medium text-slate-700">
                      {certFileName ? `Selected: ${certFileName}` : 'Choose Certificate / QR Document'}
                    </span>
                    <span className="text-[10px] text-slate-400">Barcode & QR codes detected automatically</span>
                  </div>
                </div>

                {qrScanResult && (
                  <div className={`mt-2.5 p-3 rounded-xl border text-xs space-y-1.5 ${
                    qrScanResult.detected
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    <div className="flex items-center gap-1.5 font-bold">
                      <QrCode className="w-4 h-4 text-amber-700" />
                      <span>
                        {qrScanResult.detected ? 'QR Code Detected on Certificate' : 'No QR Code Detected'}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      {qrScanResult.message}
                    </p>
                    {qrScanResult.detected && (
                      <p className="text-[10px] text-amber-800 bg-amber-100/70 p-2 rounded-lg leading-snug">
                        <strong>Authenticity Notice:</strong> A readable QR code confirms document structure but does not constitute proof of authenticity until verified by the official state nursing council / university registry or reviewed by CareConnect Operations.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Navigation Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Personal</span>
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-[44px] px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Continue to Services Offered</span>}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : activeStep === 4 ? (
            /* ========================================================
               PAGE 4: SERVICES OFFERED & PREFERENCES
               ======================================================== */
            <form onSubmit={handleStep4Submit} className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-teal-600" />
                  <span>Step 4: Services Offered & Work Preferences</span>
                </h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Select the services you are willing and qualified to provide. Differentiates companion care from clinical requirements.
                </p>
              </div>

              {/* Service Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Select Care Services Provided <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {AVAILABLE_SERVICES.map((s) => {
                    const isChecked = selectedServices.includes(s.id);
                    return (
                      <div
                        key={s.id}
                        onClick={() => toggleService(s.id)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                          isChecked
                            ? 'bg-teal-50/80 border-teal-500 ring-1 ring-teal-500 text-teal-950'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by div click
                          className="mt-0.5 w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 shrink-0"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900">{s.name}</span>
                            {s.isClinical && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-semibold">
                                Requires Verified Qualification
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{s.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Shift Preferences */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Shift Type Preferences</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SHIFT_OPTIONS.map((st) => {
                    const isSelected = selectedShifts.includes(st.id);
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => toggleShift(st.id)}
                        className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                          isSelected
                            ? 'bg-teal-700 text-white border-teal-700 font-bold shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {st.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rate & Preferred Hours */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expected Daily Rate (₹)</label>
                  <input
                    type="number"
                    value={dailyRate}
                    onChange={(e) => setDailyRate(Number(e.target.value))}
                    min="500"
                    step="100"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expected Hourly Rate (₹)</label>
                  <input
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(Number(e.target.value))}
                    min="50"
                    step="25"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Work Availability Toggle */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900">Active Work Availability</span>
                  <p className="text-[11px] text-slate-500">Toggle on to receive care matching requests</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAvailable(!isAvailable)}
                  className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    isAvailable ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {isAvailable ? 'Available for Work' : 'Off-Duty'}
                </button>
              </div>

              {/* Navigation Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Education</span>
                </button>
                <button
                  type="submit"
                  disabled={saving || !selectedServices.length}
                  className="min-h-[44px] px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Complete Onboarding</span>
                </button>
              </div>
            </form>
          ) : (
            /* ========================================================
               SUMMARY & OVERVIEW (COMPLETED ONBOARDING STATE)
               ======================================================== */
            <div className="space-y-4">
              {/* Status Header Banner */}
              <div className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
                onboardingData?.isEligibleForWork
                  ? 'bg-teal-50 border-teal-200 text-teal-900'
                  : onboardingData?.kycStatus === 'PENDING'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {onboardingData?.isEligibleForWork ? (
                      <CheckCircle2 className="w-5 h-5 text-teal-600" />
                    ) : (
                      <Clock className="w-5 h-5 text-amber-600" />
                    )}
                    <span>
                      {onboardingData?.isEligibleForWork
                        ? 'Eligible for Work (KYC Verified)'
                        : 'Onboarding Submitted — Review Pending'}
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-white/80 border border-current">
                    {onboardingData?.kycStatus || 'PENDING'}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  {onboardingData?.message || 'Your identity and education credentials have been securely stored.'}
                </p>
                <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-200/60">
                  <strong>Minimum Invariant Enforced:</strong> Profile Complete + Required KYC Verified + Active Status = Eligible for Work
                </p>
              </div>

              {/* Section 1 Card */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-teal-700" />
                    <span>Page 1: Identity KYC</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveStep(1)}
                    className="min-h-[44px] px-3 py-1.5 text-xs text-teal-700 hover:bg-teal-50 font-bold rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </div>
                <div className="text-[11px] text-slate-600 grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl">
                  <div>Document: <strong>{documentType}</strong></div>
                  <div>Number: <strong className="font-mono">{documentNumber || 'Saved'}</strong></div>
                  <div>Status: <strong className="text-teal-700">{onboardingData?.kycStatus || 'Submitted'}</strong></div>
                </div>
              </div>

              {/* Section 2 Card */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-teal-700" />
                    <span>Page 2: Personal Details</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    className="min-h-[44px] px-3 py-1.5 text-xs text-teal-700 hover:bg-teal-50 font-bold rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </div>
                <div className="text-[11px] text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-xl">
                  <div>Name: <strong>{fullName}</strong></div>
                  <div>DOB / Gender: <strong>{dob} ({gender})</strong></div>
                  <div>Locality: <strong>{locality}</strong></div>
                </div>
              </div>

              {/* Section 3 Card */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-teal-700" />
                    <span>Page 3: Education & Certificate QR</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveStep(3)}
                    className="min-h-[44px] px-3 py-1.5 text-xs text-teal-700 hover:bg-teal-50 font-bold rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </div>
                <div className="text-[11px] text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-xl">
                  <div>Course: <strong>{course}</strong></div>
                  <div>Institution: <strong>{institution}</strong></div>
                  <div>Credential ID: <strong className="font-mono">{credentialId || 'Not specified'}</strong></div>
                  <div className="flex items-center gap-1 pt-1">
                    <span>Verification State:</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      {onboardingData?.step3?.verificationStatus || 'QR_DETECTED'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 4 Card */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-teal-700" />
                    <span>Page 4: Services Offered</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveStep(4)}
                    className="min-h-[44px] px-3 py-1.5 text-xs text-teal-700 hover:bg-teal-50 font-bold rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </div>
                <div className="text-[11px] text-slate-600 space-y-1.5 bg-slate-50 p-2.5 rounded-xl">
                  <div className="flex flex-wrap gap-1">
                    {selectedServices.map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                  <div className="pt-1 text-[10px] text-slate-500">
                    Daily Rate: <strong>₹{dailyRate}</strong> | Hourly Rate: <strong>₹{hourlyRate}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
          <div className="text-[11px] text-slate-500">
            {activeStep <= 4 ? `Step ${activeStep} of 4` : 'Profile Completed'}
          </div>
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
