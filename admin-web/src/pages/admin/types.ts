export type AdminTab =
  | 'OVERVIEW'
  | 'MAP'
  | 'ELDERS'
  | 'CAREGIVERS'
  | 'ATTENDANCE'
  | 'PAYOUTS'
  | 'SOS'
  | 'HOSPITALS'
  | 'SERVICES_PRICING'
  | 'SERVICES'
  | 'PRICING'
  | 'REPORTS'
  | 'SETTINGS'
  | 'SETTINGS_ACCESS'
  | 'CARE_PLANS';

export interface NearbyHospital {
  id: string;
  name: string;
  locality?: string;
  location?: string;
  distanceKm: number;
  etaMins?: number;
  emergencyPhone: string;
  emergencyContact?: string;
  contact?: string;
  contactDetails?: string;
  address: string;
  traumaLevel?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  googleMapsUrl?: string;
  status?: 'ACTIVE' | 'CLOSED';
  registeredDate?: string;
  establishedYear?: number;
}

export interface ClinicalTaskItem {
  id: string;
  title: string;
  category?: 'VITALS' | 'MEDICATION' | 'HYGIENE' | 'MOBILITY' | 'NUTRITION';
  scheduledTime: string;
  completedAt?: string;
  status: 'COMPLETED' | 'PENDING' | 'MISSED_FLAGGED' | 'Completed' | 'Pending' | 'Flagged';
  notes?: string;
  performedBy?: string;
}

export interface AdminElderItem {
  id: string;
  name: string;
  age: number;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth?: string;
  sponsorName: string;
  sponsorPhone: string;
  sponsorRelation: string;
  addressLine1: string;
  locality: string;
  city: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  assignedCaregiverId?: string;
  assignedCaregiverName?: string;
  assignedCaregiverRating?: number;
  status: 'ACTIVE' | 'PENDING' | 'INACTIVE';
  mobilityLevel: string;
  medicalConditions: string[];
  medicalDevices: string[];
  dietaryPreferences: string[];
  languages: string[];
  primaryLanguage: string;
  shiftPreference: string;
  dailyRoutine?: Record<string, any>;
  additionalNotes?: string;
  activeShiftStatus?: 'ON_DUTY' | 'SCHEDULED' | 'OFF_DUTY';
  lastVitals?: {
    bp?: string;
    pulse?: number;
    recordedAt?: string;
  };
  preferredHospital?: NearbyHospital;
  nearbyHospitals?: NearbyHospital[];
  dailyTasks?: ClinicalTaskItem[];
  appliedOffer?: CareseekerOffer;
  careRequirements?: string[];
}

export interface CareseekerOffer {
  id: string;
  code: string;
  title: string;
  discountLabel: string; // e.g., "15% OFF", "₹2,500 OFF"
  description: string;
  eligibility: string;
  validUntil?: string;
}

export interface CaregiverCertification {
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  verified: boolean;
  credentialId?: string;
}

export interface CaregiverPersonalInfo {
  dateOfBirth?: string;
  age?: number;
  bloodGroup?: string;
  languagesSpoken: string[];
  secondaryPhone?: string;
  residentialArea: string;
}

export interface ShiftAttendanceLog {
  id: string;
  caregiverId: string;
  caregiverName: string;
  elderId?: string;
  elderName?: string;
  locality: string;
  zone?: string;
  shiftDate: string;
  shiftType: string;
  scheduledCheckIn: string;
  actualCheckIn: string;
  scheduledIn?: string;
  scheduledOut?: string;
  actualIn?: string;
  actualOut?: string;
  isCheckInGeofenceVerified: boolean;
  scheduledCheckOut: string;
  actualCheckOut?: string;
  isCheckOutGeofenceVerified?: boolean;
  totalHoursLogged: string;
  status:
    | 'ON_TIME_CHECK_IN'
    | 'LATE_CHECK_IN'
    | 'ACTIVE_ON_DUTY'
    | 'CLOCKED_OUT'
    | 'OVERTIME'
    | 'ON_DUTY_WITHIN_SHIFT'
    | 'COMPLETED'
    | 'On Time'
    | 'Late'
    | 'Active'
    | 'Completed'
    | 'Flagged'
    | 'Pending';
  geofenceStatus: 'VERIFIED' | 'OFF_SITE_FLAG';
  handoffNotes?: string;
  vitalsHandedOver?: boolean;
  supervisorSignoff?: string;
  tasksCompletedCount?: number;
  tasksTotalCount?: number;
  tasks?: ClinicalTaskItem[];
}

export interface CaregiverShiftSchedule {
  shiftType: string;
  workingDays: string;
  lastCheckIn?: string;
  hoursLoggedThisMonth: number;
  nextShiftTime?: string;
  currentShiftAttendance?: ShiftAttendanceLog;
  recentAttendanceLogs?: ShiftAttendanceLog[];
}

export interface CaregiverPerformanceMetrics {
  onTimeArrivalRate: number;
  sosDrillResponseAvgMins: number;
  totalCompletedVisits: number;
  clientNpsRating: number;
  reviewCount?: number;
}

export interface CaregiverEmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface AdminCaregiverItem {
  id: string;
  fullName: string;
  phone: string;
  gender: string;
  rating: number;
  experienceYears: number;
  locality: string;
  assignedCorridor?: string;
  primaryLanguage: string;
  languages: string[];
  skills: string[];
  specializations: string[];
  isBufferPool: boolean;
  isStandbyReserve?: boolean;
  isPoliceVerified: boolean;
  isClinicalCertified: boolean;
  isIdentityVerified: boolean;
  status: 'AVAILABLE' | 'ON_DUTY' | 'ON_LEAVE' | 'ON_HANDOFF';
  rosterStatus?: 'STANDBY_RESERVE' | 'ACTIVE_SHIFT' | 'OFF_DUTY' | 'ON_HANDOFF';
  activeElderName?: string;
  activeElderId?: string;
  personalInfo?: CaregiverPersonalInfo;
  certifications?: CaregiverCertification[];
  clinicalCompetencies?: string[];
  shiftSchedule?: CaregiverShiftSchedule;
  shiftAttendance?: ShiftAttendanceLog;
  attendance?: ShiftAttendanceLog;
  attendanceHistory7Days?: ShiftAttendanceLog[];
  performanceMetrics?: CaregiverPerformanceMetrics;
  emergencyContact?: CaregiverEmergencyContact;
  currentTasks?: ClinicalTaskItem[];
  bio?: string;
  // Live KYC & Worker Onboarding Fields
  userId?: string;
  isProfileComplete?: boolean;
  kycStatus?: 'NOT_SUBMITTED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  documentType?: string;
  maskedDocumentNumber?: string;
  documentStorageReference?: string;
  rejectionReason?: string;
  kycCreatedAt?: string;
  kycUpdatedAt?: string;
}

export type Careseeker = AdminElderItem;
export type Caregiver = AdminCaregiverItem;
export type ShiftTask = ClinicalTaskItem;

export interface AdminSosAlert {
  id: string;
  elderId: string;
  elderName: string;
  elderAge: number;
  locality: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  emergencyContact: string;
  emergencyPhone: string;
  assignedCaregiver?: string;
  priority: 'P1' | 'P2' | 'P3';
  status: 'OPEN' | 'DISPATCHED' | 'ACKNOWLEDGED' | 'RESOLVED';
  title: string;
  description: string;
  triggeredAt: string;
  dispatchedSupervisor?: string;
  resolutionNotes?: string;
}

export interface AdminCarePlanItem {
  id: string;
  elderId: string;
  elderName: string;
  locality: string;
  careTier: string;
  shiftDuration: string;
  assignedCaregiver: string;
  primaryCondition: string;
  mobilityStatus: string;
  dailyRoutine: {
    morning: string;
    afternoon: string;
    evening: string;
    night: string;
  };
  keyTasks: string[];
  notes: string;
}

export interface ServicePricingTier {
  duration: string;
  hours: number;
  careseekerPrice: number;
  attendantPayout: number;
  label: string;
}

export interface PlatformServicePricing {
  baseShiftHours: number;
  careseekerPricePerShift: number;
  careseekerMonthlyPrice: number;
  hourlyRate: number;
  attendantPayoutPerShift: number;
  attendantMonthlyPayout: number;
  platformMarginPct: number;
  tiers: ServicePricingTier[];
}

export interface PlatformService {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: 'mobility' | 'medical' | 'medication' | 'monitoring';
  status: 'Active';
  pricing?: PlatformServicePricing;
}

export interface AttendantPayoutRecord {
  id: string;
  payoutNumber: string; // e.g. PAY-2026-CH-1001
  caregiverId: string;
  caregiverName: string;
  caregiverLocality: string;
  caregiverPhone?: string;
  elderId: string;
  elderName: string;
  elderLocality?: string;
  serviceCode: string; // e.g. SVC-MOBILITY
  serviceName: string; // e.g. Mobility Assistance
  shiftDate: string;
  periodStart: string;
  periodEnd: string;
  hoursWorked: number;
  shiftDuration: string;
  dailyRate: number;
  grossEarned: number;
  deductionsAmount: number; // TDS + operational insurance
  netPayoutAmount: number;
  status: 'PAID' | 'PROCESSING' | 'PENDING';
  paymentMethod: 'UPI' | 'IMPS_BANK' | 'DIRECT_CREDIT';
  providerReference?: string; // Bank UTR / RazorpayX ID
  approvedBy?: string;
  approvedAt?: string;
  paidAt?: string;
  notes?: string;
}

export interface ClinicalServiceItem {
  id: string;
  serviceCode: string;
  title: string;
  category: 'DAILY_LIVING' | 'POST_OPERATIVE' | 'DEMENTIA_PALLIATIVE' | 'NIGHT_WATCH' | 'RESPITE' | 'CRITICAL_CARE';
  careProtocol: string;
  scopeOfWork: string[];
  caregiverQualification: string;
  qualificationBadge: 'ANM' | 'GDA' | 'CGA' | 'GNM' | 'SPECIALIST';
  standardDuration: string;
  recommendedFor: string[];
  minimumCommitment: string;
  status: 'ACTIVE' | 'ARCHIVED';
  activeSubscribers: number;
}

export interface PricingTariffItem {
  id: string;
  serviceCode: string;
  serviceName: string;
  duration: string;
  careseekerShiftPrice: number;
  careseekerMonthlyPrice: number;
  caregiverPayoutPerShift: number;
  caregiverMonthlyPayout: number;
  platformMarginPct: number;
  emergencySurchargeRate: number;
  locationMultipliers: Record<string, number>;
  notes: string;
  status: 'ACTIVE' | 'PENDING_REVISION';
}

export type OpsRole =
  | 'SUPER_ADMIN'
  | 'REGIONAL_SUPERVISOR'
  | 'CLINICAL_AUDITOR'
  | 'BILLING_SPECIALIST';

export interface OpsStaffMember {
  id: string;
  name: string;
  email: string;
  role: OpsRole;
  roleTitle: string;
  assignedSector: string;
  status: 'ACTIVE' | 'SUSPENDED';
  lastLogin: string;
  phone: string;
}

export type AdminRole =
  | 'Super Admin'
  | 'Operations Dispatcher'
  | 'Triage & Support Desk'
  | 'Auditor / Compliance';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: AdminRole;
  assignedLocations: string[]; // e.g., ["All Corridors"] or ["Anna Nagar Central", "Mylapore"]
  status: 'Active' | 'Invited' | 'Suspended';
  lastActive?: string;
  createdAt: string;
}

export interface RolePermissionDefinition {
  role: OpsRole;
  title: string;
  description: string;
  permissions: {
    canViewClinicalCharts: boolean;
    canEditCarePlans: boolean;
    canDispatchStandby: boolean;
    canReassignRoster: boolean;
    canViewPricingAndTariffs: boolean;
    canEditPricingAndTariffs: boolean;
    canApprovePayouts: boolean;
    canManageOpsStaff: boolean;
  };
}

export type OperatingSectorScope =
  | 'ALL'
  | 'SOUTH_CHENNAI'
  | 'ANNA_NAGAR'
  | 'MYLAPORE'
  | 'ADYAR_BESANT'
  | 'VELACHERY'
  | 'T_NAGAR'
  | 'OMR';

export interface AdminMetrics {
  totalElders: number;
  activeCareShifts: number;
  serviceableCorridors: number;
  openSosTickets: number;
  verifiedCaregivers: number;
  bufferPoolAvailable: number;
  totalAttendants?: number;
  activeAttendants?: number;
  inactiveAttendants?: number;
}
