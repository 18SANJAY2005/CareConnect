export type AdminTab =
  | 'OVERVIEW'
  | 'ELDERS'
  | 'CAREGIVERS'
  | 'CARE_PLANS'
  | 'MAP'
  | 'SOS';

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

export interface CaregiverShiftSchedule {
  shiftType: string;
  workingDays: string;
  lastCheckIn?: string;
  hoursLoggedThisMonth: number;
  nextShiftTime?: string;
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
  primaryLanguage: string;
  languages: string[];
  skills: string[];
  specializations: string[];
  isBufferPool: boolean;
  isPoliceVerified: boolean;
  isClinicalCertified: boolean;
  isIdentityVerified: boolean;
  status: 'AVAILABLE' | 'ON_DUTY' | 'ON_LEAVE';
  activeElderName?: string;
  activeElderId?: string;
  hourlyRate?: number;
  dailyRate?: number;
  personalInfo?: CaregiverPersonalInfo;
  certifications?: CaregiverCertification[];
  clinicalCompetencies?: string[];
  shiftSchedule?: CaregiverShiftSchedule;
  performanceMetrics?: CaregiverPerformanceMetrics;
  emergencyContact?: CaregiverEmergencyContact;
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

export interface AdminMetrics {
  totalElders: number;
  activeCareShifts: number;
  serviceableCorridors: number;
  openSosTickets: number;
  verifiedCaregivers: number;
  bufferPoolAvailable: number;
}
