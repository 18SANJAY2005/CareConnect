export type AdminTab =
  | 'OVERVIEW'
  | 'MAP'
  | 'ELDERS'
  | 'CAREGIVERS'
  | 'ATTENDANCE'
  | 'SOS'
  | 'SERVICES_PRICING'
  | 'SERVICES'
  | 'PRICING'
  | 'HOSPITALS'
  | 'PAYOUTS'
  | 'REPORTS'
  | 'SETTINGS'
  | 'SETTINGS_ACCESS'
  | 'CARE_PLANS';

export interface NearbyHospital {
  id: string;
  name: string;
  locality?: string;
  distanceKm: number;
  etaMins?: number;
  emergencyPhone: string;
  contact?: string;
  address: string;
  traumaLevel?: string;
  latitude?: number;
  longitude?: number;
}

export interface HospitalFacility {
  id: string;
  name: string;
  address: string;
  area: string; // Area / Corridor
  latitude: number;
  longitude: number;
  standardPhone: string;
  emergencyPhone: string; // 24/7 Emergency / Ambulance Desk Contact
  traumaLevel?: string;
  ambulanceAvailable?: boolean;
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
    | 'EN_ROUTE'
    | 'DELAYED_UNACKNOWLEDGED'
    | 'NOT_YET_REACHED'
    | 'DELAYED'
    | 'On Time'
    | 'Late'
    | 'Active'
    | 'Completed'
    | 'Flagged';
  geofenceStatus: 'VERIFIED' | 'OFF_SITE_FLAG';
  arrivalStatus?: 'ARRIVED' | 'NOT_YET_REACHED' | 'EN_ROUTE' | 'DELAYED_UNACKNOWLEDGED';
  caregiverPhone?: string;
  expectedArrivalTime?: string;
  distanceToSiteMeters?: number;
  handoffNotes?: string;
  vitalsHandedOver?: boolean;
  supervisorSignoff?: string;
  tasksCompletedCount?: number;
  tasksTotalCount?: number;
  tasks?: ClinicalTaskItem[];
}

export interface AdminPayoutRecord {
  id: string; // e.g. "PAY-2026-8812"
  caregiverId: string;
  caregiverName: string;
  caregiverPhone: string;
  caregiverCorridor: string;
  careseekerId: string;
  careseekerName: string;
  careseekerLocality: string;
  shiftDate: string;
  shiftDuration: string;
  shiftHours: number;
  payoutAmount: number;
  status: 'Processed' | 'Pending' | 'Disputed';
  disputeReason?: string;
  processedAt?: string;
  bankReference?: string;
  receiptNumber?: string;
  serviceType: string;
  hourlyRateEquivalent?: number;
  allowance?: number;
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

export interface PlatformService {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: 'mobility' | 'medical' | 'medication' | 'monitoring';
  status: 'Active';
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
}
