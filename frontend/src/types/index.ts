export type UserRole =
  | "FAMILY_SPONSOR"
  | "CAREGIVER"
  | "OPS_MANAGER"
  | "ADMIN";

export interface User {
  id: string;
  role: UserRole;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  authProvider: string;
  createdAt: string;
  updatedAt: string;
}

export type MobilityLevel =
  | "INDEPENDENT"
  | "CANE_WALKER"
  | "WHEELCHAIR"
  | "BEDRIDDEN";

export type PersonaStatus =
  | "DRAFT"
  | "IN_PROGRESS"
  | "REVIEW"
  | "SAVED";

export type ShiftPreference =
  | "EIGHT_HOUR_DAY"
  | "TWELVE_HOUR_DAY_NIGHT"
  | "TWENTY_FOUR_HOUR_LIVE_IN";

export type LocationVerificationStatus =
  | "PENDING"
  | "VERIFYING"
  | "VERIFIED"
  | "NOT_SERVICEABLE"
  | "INVALID_ADDRESS"
  | "UNABLE_TO_VERIFY"
  | "PERMISSION_DENIED";

export interface ElderLocation {
  id: string;
  elderId: string;
  addressLine1: string;
  addressLine2?: string | null;
  locality: string;
  city: string;
  state: string;
  postalCode: string;
  landmark?: string | null;
  latitude: number;
  longitude: number;
  verificationStatus: LocationVerificationStatus;
  serviceable: boolean;
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Elder {
  id: string;
  familyId: string;
  name: string;
  dateOfBirth?: string | null;
  age: number;
  gender: "MALE" | "FEMALE" | "OTHER";
  locationId?: string | null;
  mobilityLevel: MobilityLevel;
  medicalConditions: string[];
  careRequirements: string[];
  medicalDevices: string[];
  dietaryPreferences: string[];
  languages: string[];
  primaryLanguage: string;
  lifestylePreferences: string[];
  dailyRoutine?: Record<string, any> | null;
  shiftPreference: ShiftPreference;
  additionalNotes?: string | null;
  personaStatus: PersonaStatus;
  createdAt: string;
  updatedAt: string;
  location?: ElderLocation | null;
}

export type AssessmentStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "CONFIRMED"
  | "FAILED"
  | "CANCELLED";

export interface HomeAssessment {
  id: string;
  elderId: string;
  requestedBy: string;
  addressSnapshot: Record<string, any>;
  preferredDate: string;
  preferredTime:
    | "MORNING_9_12"
    | "AFTERNOON_12_4"
    | "EVENING_4_7";
  notes?: string | null;
  status: AssessmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LocationVerifyResponse {
  serviceable: boolean;
  verificationStatus: LocationVerificationStatus;
  message: string;
  latitude: number;
  longitude: number;
  locality: string;
  city: string;
  postalCode: string;
  assignedHub?: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

/* =========================================================
   Phase B — Caregiver Matching, Intro Call, Payment & SLA
   ========================================================= */

export interface Caregiver {
  id: number;
  full_name: string;
  headline: string;
  photo_url?: string;
  experience_years: number;
  locality: string;
  service_radius_km: number;
  primary_language: string;
  languages: string;
  skills: string;
  specializations: string;
  shift_types: string;
  hourly_rate: number;
  daily_rate: number;
  rating: number;
  review_count: number;
  is_police_verified: boolean;
  is_clinical_certified: boolean;
  is_identity_verified: boolean;
  bio?: string;
}

export interface CaregiverMatchItem {
  caregiver: Caregiver;
  match_score: number;
  match_percentage: number;
  rationale: string;
  matching_skills: string[];
  matching_languages: string[];
  locality_match: boolean;
}

export interface CuratedMatchesResponse {
  elder_id: string;
  elder_name: string;
  elder_locality: string;
  required_care_tier: string;
  total_candidates: number;
  matches: CaregiverMatchItem[];
}

export interface CareAssignment {
  id: number;
  elder_id: string;
  caregiver_id: number;
  sponsor_id: string;
  shift_type: string;
  start_date?: string;
  status: string;
  notes?: string;
  created_at: string;
  caregiver?: Caregiver;
}

export interface IntroCall {
  id: number;
  assignment_id: number;
  provider: string;
  room_id: string;
  join_url: string;
  scheduled_at: string;
  timezone: string;
  duration_minutes: number;
  status:
    | "SCHEDULED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "CANCELLED";
  provider_reference?: string;
  call_notes?: string;
}

export interface PaymentOrder {
  order_id: number;
  provider_order_id: string;
  amount: number;
  currency: string;
  base_tier_amount: number;
  addon_amount: number;
  tax_amount: number;
  status: string;
  key_id: string;
  receipt: string;
  created_at: string;
}

export interface PaymentVerifyResponse {
  status: string;
  is_confirmed: boolean;
  payment_id: number;
  provider_payment_id: string;
  amount: number;
  currency: string;
  confirmed_at: string;
  receipt_url: string;
  assignment_status: string;
}

export interface SLAVersion {
  id: number;
  version: string;
  title: string;
  summary: string;
  code_of_conduct: string;
  notice_periods: string;
  emergency_liability: string;
  dpdp_compliance_terms: string;
  effective_from: string;
}

export interface SLAAcceptanceResponse {
  acceptance_id: number;
  assignment_id: number;
  sla_version: string;
  signer_name: string;
  status: string;
  accepted_at: string;
  message: string;
}

export type PhaseBStep =
  | "matching"
  | "call"
  | "payment"
  | "sla"
  | "confirmation";
