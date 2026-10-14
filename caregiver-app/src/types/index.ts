export type ShiftStatus = 
  | 'SCHEDULED' 
  | 'CHECKED_IN' 
  | 'ACTIVE' 
  | 'LATE' 
  | 'MISSED' 
  | 'EXCEPTION' 
  | 'CHECKED_OUT';

export type AttendanceVerificationStatus = 
  | 'VERIFIED' 
  | 'OUT_OF_RANGE' 
  | 'SUPERVISOR_OVERRIDE' 
  | 'OTP_OVERRIDE';

export interface Shift {
  id: string;
  elderId: string;
  caregiverId: string;
  shiftType: string;
  status: ShiftStatus;
  scheduledStart: string;
  scheduledEnd: string;
  geofenceRadiusMeters: number;
  supervisorNotes?: string;
}

export interface AttendanceLog {
  id?: string;
  checkInTime?: string;
  checkOutTime?: string;
  distanceMeters?: number;
  verificationStatus?: AttendanceVerificationStatus;
  checkInMethod?: string;
}

export interface ShiftDetails {
  shift: Shift | null;
  elder: {
    id: string;
    name: string;
    age: number;
    gender: string;
    mobilityLevel: string;
    primaryLanguage: string;
    locality: string;
    addressLine1: string;
    latitude: number;
    longitude: number;
  } | null;
  latestAttendance?: AttendanceLog | null;
  message?: string;
}

export type TimeOfDay = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';

export interface CareTask {
  id: string;
  shiftId: string;
  elderId: string;
  caregiverId: string;
  timeOfDay: TimeOfDay;
  category: string;
  taskName: string;
  status: 'PENDING' | 'COMPLETED' | 'SKIPPED';
  details: Record<string, any>;
  notes?: string;
  recordedAt?: string;
}

export interface OfflineQueueItem {
  id: string;
  endpoint: string;
  method: 'POST' | 'PATCH' | 'PUT';
  body: any;
  idempotencyKey: string;
  timestamp: number;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  retryCount: number;
  error?: string;
}

export interface User {
  id: string;
  role: string;
  fullName: string;
  phone?: string;
  email?: string;
  dob?: string;
  gender?: string;
  locality?: string;
  avatarUrl?: string;
  authProvider: string;
  isProfileComplete?: boolean;
}

export interface VitalReading {
  id: string;
  elderId: string;
  recordedById: string;
  shiftId?: string;
  systolicBp?: number;
  diastolicBp?: number;
  pulse?: number;
  bloodGlucose?: number;
  glucoseContext?: string;
  temperatureCelsius?: number;
  isAbnormal: boolean;
  alertSeverity: 'NORMAL' | 'WARNING' | 'CRITICAL';
  alertMessage?: string;
  recordedAt: string;
}

export type SupportedLanguage = 'en';

export type KycDocumentType =
  | 'AADHAAR'
  | 'PAN'
  | 'PASSPORT'
  | 'DRIVING_LICENCE'
  | 'VOTER_ID'
  | 'OTHER';

export type KycVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface CaregiverKyc {
  id: string;
  caregiver_id: string;
  document_type: KycDocumentType;
  masked_document_number: string;
  document_storage_reference?: string | null;
  verification_status: KycVerificationStatus;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export type CaregiverEligibilityState =
  | 'PROFILE_INCOMPLETE'
  | 'KYC_REQUIRED'
  | 'KYC_PENDING'
  | 'KYC_REJECTED'
  | 'KYC_VERIFIED'
  | 'ELIGIBLE_FOR_WORK'
  | 'INACTIVE';

export interface CaregiverEligibility {
  isProfileComplete: boolean;
  kycStatus: 'NOT_SUBMITTED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  rejectionReason?: string | null;
  isAvailable: boolean;
  caregiverStatus: string;
  isEligibleForWork: boolean;
  canAcceptJobs?: boolean;
  eligibilityState: CaregiverEligibilityState;
  message: string;
}

export interface AvailableCareJob {
  id: string;
  elderId?: string;
  title: string;
  elderName: string;
  careType: string;
  shiftDuration: string;
  starts: string;
  locality: string;
  addressSnippet?: string;
  approximateDistanceKm: number;
  careNeeds: string[];
  specialRequirements?: string[];
  compensation: string;
  dailyRate: number;
  status: string;
}

export interface AcceptJobResponse {
  success: boolean;
  message: string;
  assignmentId: number;
  shiftId: string;
  shift: Shift;
  elder: NonNullable<ShiftDetails['elder']>;
}

export interface CompletedShiftItem {
  shiftId: string;
  elderName: string;
  date: string;
  hours: string;
  status: string;
  earnings: number;
  locality: string;
}

export interface EarningsSummary {
  totalEarned: number;
  shiftsCompleted: number;
  pendingPayout: number;
  dailyRate: number;
  currency: string;
}

export interface WorkHistoryResponse {
  activeShift?: {
    shiftId: string;
    status: string;
    shiftType: string;
    scheduledStart?: string | null;
    scheduledEnd?: string | null;
    elderName: string;
    locality: string;
  } | null;
  completedShifts: CompletedShiftItem[];
  earnings: EarningsSummary;
}

export interface AssignmentOffer {
  id: number;
  elderId: string;
  elderName: string;
  careRequirements: string[];
  locality: string;
  address?: string;
  shiftType: string;
  startDate: string;
  dailyRate: number;
  responseDeadline?: string | null;
  status: string;
  isExpired: boolean;
  careType?: string;
  elderAge?: number;
  elderGender?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
}

export interface ScheduleItem {
  id: string;
  type: 'SHIFT' | 'ASSIGNMENT';
  elderId: string;
  elderName: string;
  date: string;
  startTime: string;
  endTime: string;
  shiftType: string;
  status: string;
  locality: string;
  address?: string;
}

export interface FullCaregiverProfile {
  id: number;
  userId: string;
  fullName: string;
  phone?: string;
  email?: string;
  dob?: string;
  gender?: string;
  locality?: string;
  avatarUrl?: string;
  bio?: string;
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  dailyRate: number;
  status: string;
  isBufferPool?: boolean;
  qualifications?: string;
  educationalQualifications?: string;
  certifications?: string;
  previousExperience?: string;
  preferredCareTypes?: string;
  workPreferences?: string;
  preferredHours?: string;
  performanceMetrics?: string;
  kycStatus: string;
  isProfileComplete?: boolean;
}

export interface PayoutSummary {
  totalEarned: number;
  pendingPayout: number;
  approvedPayout: number;
  paidPayout: number;
  deductionsAmount: number;
  currency: string;
  period: string;
  shiftsCount: number;
}

export interface ShiftEarningItem {
  id: string;
  shiftId?: string;
  elderId: string;
  elderName: string;
  shiftDate: string;
  hoursWorked: number;
  dailyRate: number;
  earnedAmount: number;
  status: string;
  payoutId?: string | null;
  notes?: string | null;
}

export interface ElderEarningGroup {
  elderId: string;
  elderName: string;
  shiftsCompleted: number;
  totalEarned: number;
  locality?: string;
}

export interface PayoutHistoryItem {
  id: string;
  payoutNumber: string;
  periodStart: string;
  periodEnd: string;
  totalEarned: number;
  deductionsAmount: number;
  netPayoutAmount: number;
  currency: string;
  status: string;
  providerReference?: string | null;
  paidAt?: string | null;
  createdAt: string;
}


