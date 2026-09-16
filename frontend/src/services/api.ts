import type {
  CareAssignment,
  Caregiver,
  CuratedMatchesResponse,
  IntroCall,
  PaymentOrder,
  PaymentVerifyResponse,
  SLAAcceptanceResponse,
  SLAVersion,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    let errorDetail = 'API request failed';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || JSON.stringify(errJson);
    } catch {
      errorDetail = await response.text();
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const apiService = {
  // B01: Caregivers & Matching
  getCuratedMatches: (elderId: number = 1): Promise<CuratedMatchesResponse> => {
    return request<CuratedMatchesResponse>(`/caregivers/matches?elder_id=${elderId}`);
  },

  getCaregiverProfile: (caregiverId: number): Promise<Caregiver> => {
    return request<Caregiver>(`/caregivers/${caregiverId}`);
  },

  getAllCaregivers: (filters?: { locality?: string; language?: string; skill?: string }): Promise<Caregiver[]> => {
    const params = new URLSearchParams();
    if (filters?.locality) params.append('locality', filters.locality);
    if (filters?.language) params.append('language', filters.language);
    if (filters?.skill) params.append('skill', filters.skill);
    return request<Caregiver[]>(`/caregivers/?${params.toString()}`);
  },

  // Assignment Management
  createAssignment: (payload: {
    elder_id: number;
    caregiver_id: number;
    sponsor_id: number;
    shift_type?: string;
    start_date?: string;
    notes?: string;
  }): Promise<CareAssignment> => {
    return request<CareAssignment>('/assignments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getAssignment: (assignmentId: number): Promise<CareAssignment> => {
    return request<CareAssignment>(`/assignments/${assignmentId}`);
  },

  // B02: Introductory Call (Jitsi Meet)
  scheduleIntroCall: (payload: {
    assignment_id: number;
    scheduled_at: string;
    timezone?: string;
    call_notes?: string;
  }): Promise<IntroCall> => {
    return request<IntroCall>('/intro-calls', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getIntroCall: (callId: number): Promise<IntroCall> => {
    return request<IntroCall>(`/intro-calls/${callId}`);
  },

  getIntroCallByAssignment: (assignmentId: number): Promise<IntroCall> => {
    return request<IntroCall>(`/intro-calls/by-assignment/${assignmentId}`);
  },

  updateCallStatus: (callId: number, status: string, call_notes?: string): Promise<IntroCall> => {
    return request<IntroCall>(`/intro-calls/${callId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, call_notes }),
    });
  },

  // B03: Advance Deposit & Payments (Razorpay)
  createPaymentOrder: (payload: {
    assignment_id: number;
    sponsor_id: number;
    base_tier_amount?: number;
    addon_amount?: number;
    currency?: string;
  }): Promise<PaymentOrder> => {
    return request<PaymentOrder>('/payments/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  verifyPayment: (payload: {
    assignment_id: number;
    sponsor_id: number;
    provider_order_id: string;
    provider_payment_id: string;
    signature: string;
    payment_method?: string;
  }): Promise<PaymentVerifyResponse> => {
    return request<PaymentVerifyResponse>('/payments/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // B04: SLA Acceptance
  getCurrentSLA: (): Promise<SLAVersion> => {
    return request<SLAVersion>('/sla/current');
  },

  acceptSLA: (
    assignmentId: number,
    payload: {
      sla_version_id: number;
      sponsor_id: number;
      signer_name: string;
      signer_relationship?: string;
      confirmed_conduct_terms?: boolean;
      confirmed_emergency_liability?: boolean;
      confirmed_dpdp_consent?: boolean;
    }
  ): Promise<SLAAcceptanceResponse> => {
    return request<SLAAcceptanceResponse>(`/sla/assignments/${assignmentId}/accept`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
