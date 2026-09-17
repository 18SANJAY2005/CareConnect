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
  /*
   * Phase B fields
   */
  id: string | number;
  full_name?: string;
  headline?: string;
  photo_url?: string;
  experience_years?: number;
  locality: string;
  service_radius_km?: number;
  primary_language?: string;
  languages: string | string[];
  skills?: string;
  specializations: string | string[];
  shift_types?: string;
  hourly_rate?: number;
  daily_rate?: number;
  review_count?: number;
  is_police_verified?: boolean;
  is_clinical_certified?: boolean;
  is_identity_verified?: boolean;
  bio?: string;

  /*
   * Phase D fields
   */
  fullName?: string;
  phone?: string;
  gender?: string;
  rating: number;
  experienceYears?: number;
  isBufferPool?: boolean;
  status?: "AVAILABLE" | "ON_DUTY" | "ON_LEAVE";
  avatarUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
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
  /*
   * IDs are string | number because Phase B used numeric
   * assignment/caregiver IDs while Phase D API responses
   * expose them as strings.
   */
  id: string | number;

  elder_id?: string;
  caregiver_id?: string | number;
  sponsor_id?: string;
  shift_type?: string;
  start_date?: string;
  status: string;
  notes?: string;
  created_at?: string;

  /*
   * Phase D API shape
   */
  elderId?: string;
  caregiverId?: string | number;
  familyUserId?: string;
  shiftType?: string;
  startDate?: string;
  endDate?: string | null;
  monthlyRate?: number;
  caregiver?: Caregiver | null;
  createdAt?: string;
  updatedAt?: string;
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

/* =========================================================
   Phase D01 — Replacement Request
   ========================================================= */

export type ReplacementReasonCode =
  | "ILLNESS"
  | "ABSENCE"
  | "PERFORMANCE"
  | "COMMUNICATION"
  | "LANGUAGE_OR_CULTURE"
  | "SAFETY_CONCERN"
  | "CHANGED_CARE_NEEDS"
  | "OTHER";

export type ReplacementStatus =
  | "SUBMITTED"
  | "ACKNOWLEDGED"
  | "UNDER_REVIEW"
  | "REPLACEMENT_SEARCH"
  | "ASSIGNED"
  | "SCHEDULED"
  | "RESOLVED"
  | "REJECTED"
  | "CANCELLED";

export interface ReplacementStatusHistory {
  id: string;
  replacementRequestId: string;
  oldStatus?: string | null;
  newStatus: string;
  changedByUserId?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface ReplacementRequest {
  id: string;
  assignmentId: string;
  familyUserId: string;
  elderId: string;
  currentCaregiverId: string;
  substituteCaregiverId?: string | null;
  reasonCode: ReplacementReasonCode;
  notes?: string | null;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  requestedStartAt?: string | null;
  status: ReplacementStatus;
  assignedOperationsUserId?: string | null;
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  currentCaregiver?: Caregiver | null;
  substituteCaregiver?: Caregiver | null;
  history: ReplacementStatusHistory[];
}

/* =========================================================
   Phase D02 — Feedback & QA
   ========================================================= */

export interface CareFeedback {
  id: string;
  assignmentId: string;
  familyUserId: string;
  caregiverId: string;
  elderId: string;
  caregiverRating: number;
  serviceRating: number;
  tags: string[];
  comment?: string | null;
  seniorFeedback?: string | null;
  visibility: string;
  createdAt: string;
  updatedAt: string;
}

export interface OperationsIssue {
  id: string;
  sourceType: string;
  sourceId: string;
  priority: string;
  status:
    | "OPEN"
    | "IN_PROGRESS"
    | "WAITING_FOR_FAMILY"
    | "WAITING_FOR_OPERATIONS"
    | "RESOLVED"
    | "CLOSED";
  ownerUserId?: string | null;
  summary: string;
  resolutionNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
}

/* =========================================================
   Phase D03 — Billing & Invoices
   ========================================================= */

export interface InvoiceLineItem {
  id: string;
  itemType:
    | "BASE_CAREGIVER"
    | "AGENCY_FEE"
    | "ADDON_PHYSIOTHERAPY"
    | "ADDON_CONSUMABLES"
    | "TAX"
    | "DISCOUNT";
  description: string;
  quantity: number;
  unitAmount: number;
  amount: number;
  itemMetadata?: Record<string, any> | null;
}

export interface PaymentTransaction {
  id: string;
  invoiceId: string;
  provider: string;
  providerPaymentId?: string | null;
  amount: number;
  currency: string;
  status: "INITIATED" | "PENDING" | "SUCCESS" | "FAILED";
  failureReason?: string | null;
  paidAt?: string | null;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  familyUserId: string;
  elderId: string;
  assignmentId?: string | null;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  subtotal: number;
  agencyFee: number;
  addonsAmount: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  dueDate: string;
  status:
    | "DRAFT"
    | "ISSUED"
    | "PENDING"
    | "PAID"
    | "OVERDUE"
    | "FAILED"
    | "CANCELLED";
  providerReference?: string | null;
  createdAt: string;
  updatedAt: string;
  lineItems: InvoiceLineItem[];
  transactions: PaymentTransaction[];
}

export interface PaymentIntent {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  invoiceId: string;
}

/* =========================================================
   Phase D04 — Renewals & Auto-Debit
   ========================================================= */

export interface Renewal {
  id: string;
  familyUserId: string;
  elderId: string;
  assignmentId: string;
  currentPeriodEnd: string;
  requestedPeriodStart: string;
  requestedPeriodEnd: string;
  amount: number;
  currency: string;
  status:
    | "PENDING"
    | "CONFIRMED"
    | "PAYMENT_PENDING"
    | "ACTIVE"
    | "FAILED"
    | "CANCELLED"
    | "EXPIRED";
  autoDebitEnabled: boolean;
  autoDebitMandateId?: string | null;
  mandateStatus:
    | "NOT_CONFIGURED"
    | "PENDING"
    | "ACTIVE"
    | "FAILED";
  notes?: string | null;
  paymentTransactionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

/* =========================================================
   Cross-Cutting — Notifications & Audit
   ========================================================= */

export interface Notification {
  id: string;
  recipientUserId: string;
  eventType: string;
  referenceType: string;
  referenceId: string;
  title: string;
  message: string;
  readAt?: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorUserId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  oldValue?: string | null;
  newValue?: string | null;
  auditMetadata?: Record<string, any> | null;
  createdAt: string;
}