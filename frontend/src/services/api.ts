import type { 
  AuthResponse, 
  User, 
  Elder, 
  ElderLocation, 
  LocationVerifyResponse, 
  HomeAssessment,
  CareAssignment,
  Caregiver,
  ReplacementRequest,
  CareFeedback,
  OperationsIssue,
  Invoice,
  PaymentIntent,
  Renewal,
  Notification,
  AuditLog
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

class ApiService {
  private getToken(): string | null {
    return localStorage.getItem('careconnect_token');
  }

  setToken(token: string) {
    localStorage.setItem('careconnect_token', token);
  }

  clearToken() {
    localStorage.removeItem('careconnect_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `Request failed (${response.status})`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        // use default error message
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // --- Auth Endpoints ---
  async sendOtp(phone: string, channel: string = 'WHATSAPP'): Promise<{ success: boolean; message: string; phone: string; dev_otp?: string }> {
    return this.request('/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ phone, channel }),
    });
  }

  async verifyOtp(phone: string, otp: string, fullName?: string, email?: string): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, otp, fullName, email }),
    });
    this.setToken(res.access_token);
    return res;
  }

  async loginWithGoogle(idToken: string, fullName?: string, email?: string): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken, fullName, email }),
    });
    this.setToken(res.access_token);
    return res;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/me');
  }

  // --- Elder Endpoints ---
  async createElder(data: { name: string; age: number; gender: string; dateOfBirth?: string | null }): Promise<Elder> {
    return this.request<Elder>('/elders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getElder(id: string): Promise<Elder> {
    return this.request<Elder>(`/elders/${id}`);
  }

  async listElders(): Promise<Elder[]> {
    return this.request<Elder[]>('/elders');
  }

  async updateElder(id: string, data: Partial<Elder>): Promise<Elder> {
    return this.request<Elder>(`/elders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // --- Location Endpoints ---
  async verifyLocation(data: {
    addressLine1: string;
    addressLine2?: string;
    locality: string;
    city: string;
    state: string;
    postalCode: string;
    landmark?: string;
    simulateState?: string;
  }): Promise<LocationVerifyResponse> {
    return this.request<LocationVerifyResponse>('/elder-locations/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async persistElderLocation(elderId: string, data: {
    addressLine1: string;
    addressLine2?: string;
    locality: string;
    city: string;
    state: string;
    postalCode: string;
    landmark?: string;
    latitude: number;
    longitude: number;
  }): Promise<ElderLocation> {
    return this.request<ElderLocation>(`/elders/${elderId}/location`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // --- Assessment Endpoints ---
  async createHomeAssessment(data: {
    elderId: string;
    preferredDate: string;
    preferredTime: string;
    notes?: string;
  }): Promise<HomeAssessment> {
    return this.request<HomeAssessment>('/home-assessments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getHomeAssessment(id: string): Promise<HomeAssessment> {
    return this.request<HomeAssessment>(`/home-assessments/${id}`);
  }

  async listHomeAssessments(): Promise<HomeAssessment[]> {
    return this.request<HomeAssessment[]>('/home-assessments');
  }

  // ==========================================
  // --- Phase D: Care Assignment & Buffer ---
  // ==========================================
  async getActiveAssignment(elderId?: string): Promise<CareAssignment | null> {
    const q = elderId ? `?elderId=${elderId}` : '';
    return this.request<CareAssignment | null>(`/assignments/active${q}`);
  }

  async getBufferPoolCaregivers(): Promise<Caregiver[]> {
    return this.request<Caregiver[]>('/caregivers/buffer-pool');
  }

  // ==========================================
  // --- Phase D01: Replacement Requests ---
  // ==========================================
  async createReplacementRequest(data: {
    assignmentId: string;
    reasonCode: string;
    notes?: string;
    priority?: string;
    requestedStartAt?: string;
  }): Promise<ReplacementRequest> {
    return this.request<ReplacementRequest>('/replacement-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listReplacementRequests(): Promise<ReplacementRequest[]> {
    return this.request<ReplacementRequest[]>('/replacement-requests');
  }

  async getReplacementRequest(id: string): Promise<ReplacementRequest> {
    return this.request<ReplacementRequest>(`/replacement-requests/${id}`);
  }

  async cancelReplacementRequest(id: string): Promise<ReplacementRequest> {
    return this.request<ReplacementRequest>(`/replacement-requests/${id}/cancel`, {
      method: 'POST',
    });
  }

  async confirmReplacement(id: string): Promise<ReplacementRequest> {
    return this.request<ReplacementRequest>(`/replacement-requests/${id}/confirm-replacement`, {
      method: 'POST',
    });
  }

  async getOperationsReplacementQueue(statusFilter?: string, priorityFilter?: string): Promise<ReplacementRequest[]> {
    const params = new URLSearchParams();
    if (statusFilter) params.append('status', statusFilter);
    if (priorityFilter) params.append('priority', priorityFilter);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<ReplacementRequest[]>(`/operations/replacement-queue${qs}`);
  }

  async updateOperationsReplacementRequest(id: string, data: { status: string; note?: string; resolutionNotes?: string }): Promise<ReplacementRequest> {
    return this.request<ReplacementRequest>(`/operations/replacement-requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async assignSubstituteCaregiver(id: string, substituteCaregiverId: string, note?: string): Promise<ReplacementRequest> {
    return this.request<ReplacementRequest>(`/operations/replacement-requests/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ substituteCaregiverId, note }),
    });
  }

  // ==========================================
  // --- Phase D02: Feedback & QA ---
  // ==========================================
  async submitFeedback(data: {
    assignmentId: string;
    caregiverRating: number;
    serviceRating: number;
    tags: string[];
    comment?: string;
    seniorFeedback?: string;
    visibility?: string;
  }): Promise<CareFeedback> {
    return this.request<CareFeedback>('/feedback', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listFeedback(): Promise<CareFeedback[]> {
    return this.request<CareFeedback[]>('/feedback');
  }

  async getOperationsFeedbackQueue(statusFilter?: string): Promise<OperationsIssue[]> {
    const qs = statusFilter ? `?status=${statusFilter}` : '';
    return this.request<OperationsIssue[]>(`/operations/feedback-queue${qs}`);
  }

  async updateOperationsIssue(id: string, data: { status: string; resolutionNotes?: string; ownerUserId?: string }): Promise<OperationsIssue> {
    return this.request<OperationsIssue>(`/operations/issues/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ==========================================
  // --- Phase D03: Billing & Invoicing ---
  // ==========================================
  async listInvoices(): Promise<Invoice[]> {
    return this.request<Invoice[]>('/invoices');
  }

  async getInvoice(id: string): Promise<Invoice> {
    return this.request<Invoice>(`/invoices/${id}`);
  }

  async initiateInvoicePayment(id: string): Promise<PaymentIntent> {
    return this.request<PaymentIntent>(`/invoices/${id}/pay`, {
      method: 'POST',
    });
  }

  async confirmInvoicePayment(id: string, data: { razorpayPaymentId: string; razorpayOrderId: string; razorpaySignature: string }): Promise<Invoice> {
    return this.request<Invoice>(`/invoices/${id}/confirm-payment`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getOperationsInvoices(statusFilter?: string): Promise<Invoice[]> {
    const qs = statusFilter ? `?status=${statusFilter}` : '';
    return this.request<Invoice[]>(`/operations/invoices${qs}`);
  }

  // ==========================================
  // --- Phase D04: Renewals & Auto-Debit ---
  // ==========================================
  async getUpcomingRenewal(): Promise<Renewal | null> {
    return this.request<Renewal | null>('/renewals/upcoming');
  }

  async confirmRenewal(notes?: string): Promise<Renewal> {
    return this.request<Renewal>('/renewals/confirm', {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  async toggleAutoDebitMandate(enable: boolean): Promise<Renewal> {
    return this.request<Renewal>('/renewals/mandate', {
      method: 'POST',
      body: JSON.stringify({ enable }),
    });
  }

  async requestRenewalChange(data: { action: 'CHANGE_PLAN' | 'CANCEL_SERVICE'; reason: string; preferredPlan?: string }): Promise<Renewal> {
    return this.request<Renewal>('/renewals/request-change', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getOperationsRenewals(): Promise<Renewal[]> {
    return this.request<Renewal[]>('/operations/renewals');
  }

  // ==========================================
  // --- Notifications & Audit ---
  // ==========================================
  async listNotifications(): Promise<Notification[]> {
    return this.request<Notification[]>('/notifications');
  }

  async markNotificationRead(id: string): Promise<Notification> {
    return this.request<Notification>(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  }

  async getAuditTrail(): Promise<AuditLog[]> {
    return this.request<AuditLog[]>('/operations/audit');
  }
}

export const api = new ApiService();
