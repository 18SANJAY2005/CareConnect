import type {
  ShiftDetails,
  CareTask,
  User,
  VitalReading,
  CaregiverKyc,
  CaregiverEligibility,
  AvailableCareJob,
  AcceptJobResponse,
  WorkHistoryResponse,
  AssignmentOffer,
  ScheduleItem,
  FullCaregiverProfile,
  PayoutSummary,
  ShiftEarningItem,
  ElderEarningGroup,
  PayoutHistoryItem,
  OnboardingState,
  DocumentScanResult,
  ElderEmergencyContext,
  HospitalInfo,
} from '../types';
import { offlineQueue } from './offlineQueue';

const API_BASE = '/api';

class CaregiverApiService {
  private getToken(): string | null {
    return localStorage.getItem('careconnect_caregiver_token');
  }

  setToken(token: string) {
    localStorage.setItem('careconnect_caregiver_token', token);
  }

  clearToken() {
    localStorage.removeItem('careconnect_caregiver_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {
          // ignore
        }
        const errorMsg = errorData.detail || errorData.message || `Request failed with status ${response.status}`;
        throw new Error(errorMsg);
      }

      return (await response.json()) as T;
    } catch (err: any) {
      // If offline queue applies for mutations
      throw err;
    }
  }

  // --- Auth ---
  async sendOtp(phone: string, channel: string = 'WHATSAPP', countryCode?: string) {
    return this.request<{ success: boolean; message: string; phone: string; dev_otp?: string }>(
      '/auth/otp/send',
      {
        method: 'POST',
        body: JSON.stringify({ phone, channel, countryCode }),
      }
    );
  }

  async verifyOtp(phone: string, otp: string, countryCode?: string) {
    const res = await this.request<{ access_token: string; token_type: string; user: User }>(
      '/auth/otp/verify',
      {
        method: 'POST',
        body: JSON.stringify({ phone, otp, countryCode, role: 'CAREGIVER' }),
      }
    );
    if (res.access_token) {
      this.setToken(res.access_token);
    }
    return res;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/me', { method: 'GET' });
  }

  async updateProfile(payload: {
    fullName: string;
    dob?: string;
    gender?: string;
    email?: string;
    locality?: string;
    avatarUrl?: string;
  }): Promise<User> {
    return this.request<User>('/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  // --- Shift & Attendance ---
  async getCurrentShift(): Promise<ShiftDetails> {
    return this.request<ShiftDetails>('/shifts/current', { method: 'GET' });
  }

  async checkIn(
    shiftId: string,
    payload: {
      latitude: number;
      longitude: number;
      overrideCode?: string;
      method?: string;
    }
  ) {
    return this.request<any>(`/shifts/${shiftId}/check-in`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async checkOut(
    shiftId: string,
    payload: {
      latitude?: number;
      longitude?: number;
      summary?: string;
    }
  ) {
    return this.request<any>(`/shifts/${shiftId}/check-out`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async supervisorOverride(shiftId: string, reason: string) {
    return this.request<any>(`/shifts/${shiftId}/supervisor-override`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // --- Care Tasks ---
  async getShiftTasks(shiftId: string): Promise<CareTask[]> {
    return this.request<CareTask[]>(`/care-tasks/shift/${shiftId}`, { method: 'GET' });
  }

  async updateCareTask(
    taskId: string,
    payload: {
      status: string;
      details?: Record<string, any>;
      notes?: string;
      idempotencyKey?: string;
    }
  ): Promise<any> {
    if (!offlineQueue.isOnline) {
      offlineQueue.enqueue(`/api/care-tasks/${taskId}`, 'PATCH', payload);
      return {
        id: taskId,
        status: payload.status,
        details: payload.details,
        notes: payload.notes,
        message: 'Saved locally in offline queue. Will sync automatically.',
      };
    }

    try {
      return await this.request<any>(`/care-tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    } catch (err) {
      // If network failure, queue for retry
      offlineQueue.enqueue(`/api/care-tasks/${taskId}`, 'PATCH', payload);
      return {
        id: taskId,
        status: payload.status,
        details: payload.details,
        notes: payload.notes,
        message: 'Saved to offline queue after connection issue.',
      };
    }
  }

  async batchSyncTasks(tasks: any[]): Promise<any> {
    return this.request<any>('/care-tasks/batch', {
      method: 'POST',
      body: JSON.stringify({ tasks }),
    });
  }

  // --- Vitals ---
  async recordVitals(payload: {
    elderId: string;
    shiftId?: string;
    systolicBp?: number;
    diastolicBp?: number;
    pulse?: number;
    bloodGlucose?: number;
    glucoseContext?: string;
    temperatureCelsius?: number;
    source?: string;
    notes?: string;
    idempotencyKey?: string;
  }): Promise<VitalReading> {
    if (!offlineQueue.isOnline) {
      offlineQueue.enqueue('/api/vitals/', 'POST', payload);
      return {
        id: 'offline_' + Date.now(),
        elderId: payload.elderId,
        recordedById: 'current',
        shiftId: payload.shiftId,
        systolicBp: payload.systolicBp,
        diastolicBp: payload.diastolicBp,
        pulse: payload.pulse,
        bloodGlucose: payload.bloodGlucose,
        glucoseContext: payload.glucoseContext,
        temperatureCelsius: payload.temperatureCelsius,
        isAbnormal: false,
        alertSeverity: 'NORMAL',
        recordedAt: new Date().toISOString(),
      };
    }

    try {
      return await this.request<VitalReading>('/vitals/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (err) {
      offlineQueue.enqueue('/api/vitals/', 'POST', payload);
      throw err;
    }
  }

  // --- Media ---
  async uploadMedia(payload: {
    elderId: string;
    shiftId?: string;
    mediaUrl: string;
    mediaType?: string;
    category?: string;
    caption?: string;
  }): Promise<any> {
    return this.request<any>('/media/upload', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- Emergency SOS ---
  async triggerSos(payload: {
    elderId: string;
    shiftId?: string;
    latitude?: number;
    longitude?: number;
    notes?: string;
    idempotencyKey?: string;
  }): Promise<any> {
    return this.request<any>('/incidents/sos', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- Caregiver KYC & Identity Verification ---
  async getMyKyc(): Promise<CaregiverKyc> {
    return this.request<CaregiverKyc>('/caregivers/kyc/me', { method: 'GET' });
  }

  async submitMyKyc(payload: {
    document_type: string;
    document_number: string;
    mobile_number?: string;
    document_storage_reference?: string;
    terms_accepted?: boolean;
    service_consent?: boolean;
    promotional_consent?: boolean;
  }): Promise<CaregiverKyc> {
    return this.request<CaregiverKyc>('/caregivers/kyc/me', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async supervisorCorrectTask(taskId: string, payload: { status: string; correctionReason: string }): Promise<any> {
    return this.request<any>(`/care-tasks/${taskId}/supervisor-correction`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getCaregiverKyc(caregiverId: string): Promise<CaregiverKyc> {
    return this.request<CaregiverKyc>(`/caregivers/kyc/${caregiverId}`, {
      method: 'GET',
    });
  }

  async updateCaregiverKycStatus(
    caregiverId: string,
    payload: { verification_status: string; rejection_reason?: string }
  ): Promise<CaregiverKyc> {
    return this.request<CaregiverKyc>(`/caregivers/kyc/${caregiverId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  // --- Worker Eligibility & Available Jobs (Rapido Captain Style) ---
  async getEligibility(): Promise<CaregiverEligibility> {
    return this.request<CaregiverEligibility>('/caregivers/me/eligibility', { method: 'GET' });
  }

  async setAvailability(isAvailable: boolean): Promise<CaregiverEligibility> {
    return this.request<CaregiverEligibility>('/caregivers/me/availability', {
      method: 'PATCH',
      body: JSON.stringify({ isAvailable }),
    });
  }

  async getAvailableJobs(): Promise<AvailableCareJob[]> {
    return this.request<AvailableCareJob[]>('/caregivers/available-jobs', { method: 'GET' });
  }

  async getJobDetails(elderId: string): Promise<AvailableCareJob> {
    return this.request<AvailableCareJob>(`/caregivers/available-jobs/${elderId}`, { method: 'GET' });
  }

  async acceptJob(elderId: string): Promise<AcceptJobResponse> {
    return this.request<AcceptJobResponse>(`/caregivers/available-jobs/${elderId}/accept`, {
      method: 'POST',
    });
  }

  async getWorkHistory(): Promise<WorkHistoryResponse> {
    return this.request<WorkHistoryResponse>('/caregivers/me/work-history', { method: 'GET' });
  }

  // --- Assignment Offers Lifecycle with Deadline ---
  async getAssignmentOffers(): Promise<AssignmentOffer[]> {
    return this.request<AssignmentOffer[]>('/caregivers/assignment-offers', { method: 'GET' });
  }

  async acceptAssignmentOffer(assignmentId: number): Promise<AcceptJobResponse> {
    return this.request<AcceptJobResponse>(`/caregivers/assignments/${assignmentId}/accept`, {
      method: 'POST',
    });
  }

  async declineAssignmentOffer(assignmentId: number, reason?: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/caregivers/assignments/${assignmentId}/decline`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // --- Read-Oriented Calendar / Schedule ---
  async getSchedule(): Promise<ScheduleItem[]> {
    return this.request<ScheduleItem[]>('/caregivers/schedule', { method: 'GET' });
  }

  // --- Expanded Caregiver Profile ---
  async getFullProfile(): Promise<FullCaregiverProfile> {
    return this.request<FullCaregiverProfile>('/caregivers/me/full-profile', { method: 'GET' });
  }

  async updateFullProfile(payload: Partial<FullCaregiverProfile>): Promise<FullCaregiverProfile> {
    return this.request<FullCaregiverProfile>('/caregivers/me/full-profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  // --- Authoritative Financial Payouts ---
  async getPayoutSummary(period: string = 'this_month'): Promise<PayoutSummary> {
    return this.request<PayoutSummary>(`/payouts/caregiver/summary?period=${period}`, { method: 'GET' });
  }

  async getShiftEarnings(period: string = 'all'): Promise<ShiftEarningItem[]> {
    return this.request<ShiftEarningItem[]>(`/payouts/caregiver/shifts?period=${period}`, { method: 'GET' });
  }

  async getEarningsByElder(): Promise<ElderEarningGroup[]> {
    return this.request<ElderEarningGroup[]>('/payouts/caregiver/by-elder', { method: 'GET' });
  }

  async getPayoutHistory(search?: string, status?: string): Promise<PayoutHistoryItem[]> {
    const params = new URLSearchParams();
    if (search && search.trim()) params.append('search', search.trim());
    if (status && status.trim() && status !== 'ALL') params.append('status', status.trim());
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<PayoutHistoryItem[]>(`/payouts/caregiver/history${query}`, { method: 'GET' });
  }

  // --- 4-Step KYC Onboarding & Verification (Requirements A, B, J) ---
  async getOnboardingState(): Promise<OnboardingState> {
    return this.request<OnboardingState>('/caregivers/me/onboarding', { method: 'GET' });
  }

  async saveOnboardingStep1(payload: {
    document_type: string;
    document_number: string;
    document_storage_reference?: string | null;
    terms_accepted?: boolean;
    service_consent_granted?: boolean;
    promotional_consent_granted?: boolean;
  }): Promise<any> {
    return this.request<any>('/caregivers/me/onboarding/step1', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async saveOnboardingStep2(payload: {
    fullName: string;
    dob: string;
    gender: string;
    phone?: string;
    email?: string;
    locality: string;
    bio?: string;
  }): Promise<any> {
    return this.request<any>('/caregivers/me/onboarding/step2', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async saveOnboardingStep3(payload: {
    institution: string;
    course: string;
    completionYear?: number | null;
    credentialId?: string | null;
    documentUrl?: string | null;
    qrPayload?: string | null;
    verificationMethod?: string;
  }): Promise<any> {
    return this.request<any>('/caregivers/me/onboarding/step3', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async saveOnboardingStep4(payload: {
    servicesOffered: string[];
    shiftPreferences: string[];
    preferredHours?: string;
    dailyRate?: number;
    hourlyRate?: number;
    isAvailable?: boolean;
  }): Promise<any> {
    return this.request<any>('/caregivers/me/onboarding/step4', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async extractDocument(documentType: 'IDENTITY' | 'EDUCATION', fileData: string): Promise<DocumentScanResult> {
    return this.request<DocumentScanResult>('/caregivers/me/document/extract', {
      method: 'POST',
      body: JSON.stringify({ documentType, fileData }),
    });
  }

  // --- Emergency Hospitals (Requirements C, E, F) ---
  async getElderEmergencyHospitalContext(elderId: string): Promise<ElderEmergencyContext> {
    return this.request<ElderEmergencyContext>(`/hospitals/elder/${elderId}/emergency-context`, { method: 'GET' });
  }

  async getNearbyHospitals(lat: number, lng: number, radiusKm: number = 15): Promise<HospitalInfo[]> {
    return this.request<HospitalInfo[]>(`/hospitals/nearby?lat=${lat}&lng=${lng}&radius_km=${radiusKm}`, { method: 'GET' });
  }

  // --- Consent Disclosures ---
  async recordConsent(payload: { phone?: string; consents: Array<{ consentType: string; granted: boolean; version?: string; purpose?: string; userAction?: string }> }) {
    return this.request<any>('/auth/consent', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- Demo Seeding Helper (dev only) ---
  async seedDemoScenario() {
    return this.request<any>('/shifts/seed-demo', { method: 'POST' });
  }
}

export const caregiverApi = new CaregiverApiService();


