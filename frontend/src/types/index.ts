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
  elder_id: number;
  elder_name: string;
  elder_locality: string;
  required_care_tier: string;
  total_candidates: number;
  matches: CaregiverMatchItem[];
}

export interface CareAssignment {
  id: number;
  elder_id: number;
  caregiver_id: number;
  sponsor_id: number;
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
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
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
