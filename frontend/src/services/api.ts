import type {
  AuthResponse,
  User,
  Elder,
  ElderLocation,
  LocationVerifyResponse,
  HomeAssessment,
  CareAssignment,
  Caregiver,
  CuratedMatchesResponse,
  IntroCall,
  PaymentOrder,
  PaymentVerifyResponse,
  SLAAcceptanceResponse,
  SLAVersion,
  ReplacementRequest,
  CareFeedback,
  OperationsIssue,
  Invoice,
  PaymentIntent,
  Renewal,
  Notification,
  AuditLog,
} from "../types";

import type {
  ShiftDetails,
  LiveShiftMonitorItem,
  CareTask,
  TimelineItem,
  VitalReading,
  VitalAlertItem,
  VitalsTrendData,
  Incident,
  CareMedia,
  ChatMessage,
  OfflineQueueItem,
} from "../types/phaseC";

import { offlineQueue } from "./offlineQueue";

const API_BASE =
  import.meta.env.VITE_API_BASE || "/api";

class ApiService {
  /* =========================================================
     SHARED AUTH / REQUEST HANDLING
     ========================================================= */

  private getToken(): string | null {
    return localStorage.getItem("careconnect_token");
  }

  setToken(token: string) {
    localStorage.setItem("careconnect_token", token);
  }

  clearToken() {
    localStorage.removeItem("careconnect_token");
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });
    } catch (networkErr: any) {
      console.error(
        `Network error connecting to ${API_BASE}${endpoint}:`,
        networkErr,
      );
      throw new Error(
        `Unable to reach CareConnect backend server. Please verify the backend service is running on port 8000.`,
      );
    }

    if (!response.ok) {
      let errorMessage = `Request failed (${response.status})`;

      try {
        const errorData = await response.json();
        errorMessage =
          errorData.detail ||
          errorData.message ||
          errorMessage;
      } catch {
        // Keep default error message.
      }

      throw new Error(errorMessage);
    }

    return response.json();
  }

  /* =========================================================
     PHASE A ÔÇö AUTHENTICATION
     ========================================================= */

  async sendOtp(
    phone: string,
    channel: string = "WHATSAPP"
  ): Promise<{
    success: boolean;
    message: string;
    phone: string;
    dev_otp?: string;
  }> {
    return this.request("/auth/otp/send", {
      method: "POST",
      body: JSON.stringify({
        phone,
        channel,
      }),
    });
  }

  async verifyOtp(
    phone: string,
    otp: string,
    fullName?: string,
    email?: string
  ): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>(
      "/auth/otp/verify",
      {
        method: "POST",
        body: JSON.stringify({
          phone,
          otp,
          fullName,
          email,
        }),
      }
    );

    this.setToken(res.access_token);

    return res;
  }

  async loginWithGoogle(
    idToken: string,
    fullName?: string,
    email?: string
  ): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>(
      "/auth/google",
      {
        method: "POST",
        body: JSON.stringify({
          idToken,
          fullName,
          email,
        }),
      }
    );

    this.setToken(res.access_token);

    return res;
  }

  async getMe(): Promise<User> {
    return this.request<User>("/me");
  }

  /* =========================================================
     PHASE A ÔÇö ELDER MANAGEMENT
     ========================================================= */

  async createElder(data: {
    name: string;
    age: number;
    gender: string;
    dateOfBirth?: string | null;
  }): Promise<Elder> {
    return this.request<Elder>("/elders", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getElder(id: string): Promise<Elder> {
    return this.request<Elder>(`/elders/${id}`);
  }

  async listElders(): Promise<Elder[]> {
    return this.request<Elder[]>("/elders");
  }

  async updateElder(
    id: string,
    data: Partial<Elder>
  ): Promise<Elder> {
    return this.request<Elder>(`/elders/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  /* =========================================================
     PHASE A ÔÇö LOCATION VERIFICATION
     ========================================================= */

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
    return this.request<LocationVerifyResponse>(
      "/elder-locations/verify",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  async persistElderLocation(
    elderId: string,
    data: {
      addressLine1: string;
      addressLine2?: string;
      locality: string;
      city: string;
      state: string;
      postalCode: string;
      landmark?: string;
      latitude: number;
      longitude: number;
    }
  ): Promise<ElderLocation> {
    return this.request<ElderLocation>(
      `/elders/${elderId}/location`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    );
  }

  /* =========================================================
     PHASE A ÔÇö HOME ASSESSMENT
     ========================================================= */

  async createHomeAssessment(data: {
    elderId: string;
    preferredDate: string;
    preferredTime: string;
    notes?: string;
  }): Promise<HomeAssessment> {
    return this.request<HomeAssessment>(
      "/home-assessments",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  async getHomeAssessment(
    id: string
  ): Promise<HomeAssessment> {
    return this.request<HomeAssessment>(
      `/home-assessments/${id}`
    );
  }

  async listHomeAssessments(): Promise<HomeAssessment[]> {
    return this.request<HomeAssessment[]>(
      "/home-assessments"
    );
  }

  /* =========================================================
     PHASE B ÔÇö CAREGIVER MATCHING
     ========================================================= */

  async getCuratedMatches(
    elderId: string
  ): Promise<CuratedMatchesResponse> {
    return this.request<CuratedMatchesResponse>(
      `/caregivers/matches?elder_id=${encodeURIComponent(elderId)}`
    );
  }

  async getCaregiverProfile(
    caregiverId: number
  ): Promise<Caregiver> {
    return this.request<Caregiver>(
      `/caregivers/${caregiverId}`
    );
  }

  async getAllCaregivers(
    filters?: {
      locality?: string;
      language?: string;
      skill?: string;
    }
  ): Promise<Caregiver[]> {
    const params = new URLSearchParams();

    if (filters?.locality) {
      params.append("locality", filters.locality);
    }

    if (filters?.language) {
      params.append("language", filters.language);
    }

    if (filters?.skill) {
      params.append("skill", filters.skill);
    }

    const query = params.toString();

    return this.request<Caregiver[]>(
      `/caregivers/${query ? `?${query}` : ""}`
    );
  }

  /* =========================================================
     PHASE B ÔÇö CARE ASSIGNMENTS
     ========================================================= */

  async createAssignment(payload: {
    elder_id: string;
    caregiver_id: number;
    sponsor_id: string;
    shift_type?: string;
    start_date?: string;
    notes?: string;
  }): Promise<CareAssignment> {
    return this.request<CareAssignment>(
      "/assignments",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  }

  async getAssignment(
    assignmentId: number
  ): Promise<CareAssignment> {
    return this.request<CareAssignment>(
      `/assignments/${assignmentId}`
    );
  }

  /* =========================================================
     PHASE B ÔÇö INTRODUCTORY CALL
     ========================================================= */

  async scheduleIntroCall(payload: {
    assignment_id: number;
    scheduled_at: string;
    timezone?: string;
    call_notes?: string;
  }): Promise<IntroCall> {
    return this.request<IntroCall>(
      "/intro-calls",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  }

  async getIntroCall(
    callId: number
  ): Promise<IntroCall> {
    return this.request<IntroCall>(
      `/intro-calls/${callId}`
    );
  }

  async getIntroCallByAssignment(
    assignmentId: number
  ): Promise<IntroCall> {
    return this.request<IntroCall>(
      `/intro-calls/by-assignment/${assignmentId}`
    );
  }

  async updateCallStatus(
    callId: number,
    status: string,
    call_notes?: string
  ): Promise<IntroCall> {
    return this.request<IntroCall>(
      `/intro-calls/${callId}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({
          status,
          call_notes,
        }),
      }
    );
  }

  /* =========================================================
     PHASE B ÔÇö PAYMENTS
     ========================================================= */

  async createPaymentOrder(payload: {
    assignment_id: number;
    sponsor_id: string;
    base_tier_amount?: number;
    addon_amount?: number;
    currency?: string;
  }): Promise<PaymentOrder> {
    return this.request<PaymentOrder>(
      "/payments/orders",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  }

  async verifyPayment(payload: {
    assignment_id: number;
    sponsor_id: string;
    provider_order_id: string;
    provider_payment_id: string;
    signature: string;
    payment_method?: string;
  }): Promise<PaymentVerifyResponse> {
    return this.request<PaymentVerifyResponse>(
      "/payments/verify",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  }

  /* =========================================================
     PHASE B ÔÇö SLA
     ========================================================= */

  async getCurrentSLA(): Promise<SLAVersion> {
    return this.request<SLAVersion>("/sla/current");
  }

  async acceptSLA(
    assignmentId: number,
    payload: {
      sla_version_id: number;
      sponsor_id: string;
      signer_name: string;
      signer_relationship?: string;
      confirmed_conduct_terms?: boolean;
      confirmed_emergency_liability?: boolean;
      confirmed_dpdp_consent?: boolean;
    }
  ): Promise<SLAAcceptanceResponse> {
    return this.request<SLAAcceptanceResponse>(
      `/sla/assignments/${assignmentId}/accept`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  }

  /* =========================================================
     PHASE C: SUB-PHASES C01 - C04 ENDPOINTS
     ========================================================= */

  /* ---------------------------------------------------------
     C01 ÔÇö*/

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
    assignmentId: string | number;
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

  async assignSubstituteCaregiver(
    id: string,
    substituteCaregiverId: string | number,
    note?: string
  ): Promise<ReplacementRequest> {
    return this.request<ReplacementRequest>(`/operations/replacement-requests/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ substituteCaregiverId, note }),
    });
  }

  // ==========================================
  // --- Phase D02: Feedback & QA ---
  // ==========================================
  async submitFeedback(data: {
    assignmentId: string | number;
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
  /* ---------------------------------------------------------
     Shifts & Attendance
     --------------------------------------------------------- */

  async getCurrentCaregiverShift(): Promise<ShiftDetails> {
    return this.request<ShiftDetails>("/shifts/current");
  }

  async getElderShiftStatus(
    elderId: string
  ): Promise<any> {
    return this.request(
      `/shifts/elder/${elderId}`
    );
  }

  async getLiveShiftMonitor(): Promise<
    LiveShiftMonitorItem[]
  > {
    return this.request<LiveShiftMonitorItem[]>(
      "/shifts/monitor"
    );
  }

  async checkInShift(
    shiftId: string,
    data: {
      latitude: number;
      longitude: number;
      overrideCode?: string;
      method?: string;
    }
  ): Promise<any> {
    return this.request(
      `/shifts/${shiftId}/check-in`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  async checkOutShift(
    shiftId: string,
    data: {
      latitude?: number;
      longitude?: number;
      summary?: string;
    }
  ): Promise<any> {
    return this.request(
      `/shifts/${shiftId}/check-out`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  async supervisorOverride(
    shiftId: string,
    reason: string
  ): Promise<any> {
    return this.request(
      `/shifts/${shiftId}/supervisor-override`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      }
    );
  }


  /* ---------------------------------------------------------
     C02 ÔÇö Daily Care Tasks & ADL
     --------------------------------------------------------- */

  async getShiftTasks(
    shiftId: string
  ): Promise<CareTask[]> {
    return this.request<CareTask[]>(
      `/care-tasks/shift/${shiftId}`
    );
  }

  async updateCareTask(
    taskId: string,
    data: {
      status: string;
      details?: Record<string, any>;
      notes?: string;
      idempotencyKey?: string;
    }
  ): Promise<any> {
    // Check if currently simulated or network offline
    if (!offlineQueue.isOnline) {
      offlineQueue.enqueue(
        `/care-tasks/${taskId}`,
        "PATCH",
        data
      );

      return {
        id: taskId,
        status: data.status,
        details: data.details,
        notes: data.notes,
        isQueuedOffline: true,
        message:
          "Saved to local device. Will sync automatically upon reconnection.",
      };
    }

    try {
      return await this.request(
        `/care-tasks/${taskId}`,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        }
      );
    } catch (err) {
      // If network failure occurs, fallback to local queue
      offlineQueue.enqueue(
        `/care-tasks/${taskId}`,
        "PATCH",
        data
      );

      return {
        id: taskId,
        status: data.status,
        details: data.details,
        notes: data.notes,
        isQueuedOffline: true,
        message:
          "Connection interrupted. Activity safely queued for background sync.",
      };
    }
  }

  async batchSyncTasks(
    tasks: any[]
  ): Promise<any> {
    return this.request("/care-tasks/batch", {
      method: "POST",
      body: JSON.stringify({ tasks }),
    });
  }

  async getElderCareTimeline(
    elderId: string,
    limit: number = 30
  ): Promise<TimelineItem[]> {
    return this.request<TimelineItem[]>(
      `/care-tasks/elder/${elderId}/timeline?limit=${limit}`
    );
  }

  /* ---------------------------------------------------------
     C03 ÔÇö Vitals & Health Tracker
     --------------------------------------------------------- */

  async recordVitalReading(data: {
    elderId: string;
    shiftId?: string;
    systolicBp?: number | null;
    diastolicBp?: number | null;
    pulse?: number | null;
    bloodGlucose?: number | null;
    glucoseContext?: string;
    temperatureCelsius?: number | null;
    source?: string;
    notes?: string;
    idempotencyKey?: string;
  }): Promise<VitalReading> {
    if (!offlineQueue.isOnline) {
      offlineQueue.enqueue(
        "/vitals/",
        "POST",
        data
      );

      return {
        id: "temp_" + Date.now(),
        elderId: data.elderId,
        shiftId: data.shiftId,
        recordedById: "current",
        recordedAt: new Date().toISOString(),
        systolicBp: data.systolicBp,
        diastolicBp: data.diastolicBp,
        pulse: data.pulse,
        bloodGlucose: data.bloodGlucose,
        temperatureCelsius: data.temperatureCelsius,
        source: data.source || "MANUAL",
        isAbnormal: false,
        alertSeverity: "NORMAL",
        alertAcknowledged: false,
        notes:
          (data.notes || "") +
          " [Queued Offline]",
      };
    }

    try {
      return await this.request<VitalReading>(
        "/vitals/",
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      );
    } catch (err) {
      offlineQueue.enqueue(
        "/vitals/",
        "POST",
        data
      );

      throw err;
    }
  }

  async getElderVitalsHistory(
    elderId: string,
    limit: number = 50
  ): Promise<VitalReading[]> {
    return this.request<VitalReading[]>(
      `/vitals/elder/${elderId}?limit=${limit}`
    );
  }

  async getElderVitalsTrends(
    elderId: string
  ): Promise<VitalsTrendData> {
    return this.request<VitalsTrendData>(
      `/vitals/elder/${elderId}/trends`
    );
  }

  async getVitalAlerts(): Promise<
    VitalAlertItem[]
  > {
    return this.request<VitalAlertItem[]>(
      "/vitals/alerts"
    );
  }

  async acknowledgeVitalAlert(
    vitalId: string
  ): Promise<any> {
    return this.request(
      `/vitals/alerts/${vitalId}/acknowledge`,
      {
        method: "POST",
      }
    );
  }

  /* ---------------------------------------------------------
     C04 ÔÇö SOS & Incidents
     --------------------------------------------------------- */

  async triggerSos(data: {
    elderId: string;
    shiftId?: string;
    latitude?: number;
    longitude?: number;
    notes?: string;
  }): Promise<Incident> {
    return this.request<Incident>(
      "/incidents/sos",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  async getIncidentDesk(
    statusFilter?: string
  ): Promise<Incident[]> {
    const param = statusFilter
      ? `?status_filter=${statusFilter}`
      : "";

    return this.request<Incident[]>(
      `/incidents/desk${param}`
    );
  }

  async getElderIncidents(
    elderId: string
  ): Promise<Incident[]> {
    return this.request<Incident[]>(
      `/incidents/elder/${elderId}`
    );
  }

  async acknowledgeIncident(
    incidentId: string
  ): Promise<Incident> {
    return this.request<Incident>(
      `/incidents/${incidentId}/acknowledge`,
      {
        method: "POST",
      }
    );
  }

  async escalateIncident(
    incidentId: string,
    actionTaken: string
  ): Promise<Incident> {
    return this.request<Incident>(
      `/incidents/${incidentId}/escalate`,
      {
        method: "POST",
        body: JSON.stringify({ actionTaken }),
      }
    );
  }

  async resolveIncident(
    incidentId: string,
    resolutionNotes: string
  ): Promise<Incident> {
    return this.request<Incident>(
      `/incidents/${incidentId}/resolve`,
      {
        method: "POST",
        body: JSON.stringify({ resolutionNotes }),
      }
    );
  }

  /* ---------------------------------------------------------
     Media Updates
     --------------------------------------------------------- */

  async uploadCareMedia(data: {
    elderId: string;
    mediaUrl: string;
    mediaType?: string;
    category?: string;
    caption?: string;
    shiftId?: string;
  }): Promise<CareMedia> {
    return this.request<CareMedia>(
      "/media/upload",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  async getElderMedia(
    elderId: string
  ): Promise<CareMedia[]> {
    return this.request<CareMedia[]>(
      `/media/elder/${elderId}`
    );
  }

  /* ---------------------------------------------------------
     Coordinator Chat
     --------------------------------------------------------- */

  async sendChatMessage(data: {
    elderId: string;
    content: string;
    channel?: string;
    recipientId?: string;
  }): Promise<ChatMessage> {
    return this.request<ChatMessage>(
      "/chat/send",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  async getChatMessages(
    elderId: string,
    channel?: string
  ): Promise<ChatMessage[]> {
    const param = channel
      ? `&channel=${channel}`
      : "";

    return this.request<ChatMessage[]>(
      `/chat/messages?elder_id=${elderId}${param}`
    );
  }

  /* ---------------------------------------------------------
     Offline Synchronizer Runner
     --------------------------------------------------------- */

  async syncPendingOfflineQueue(): Promise<{
    processed: number;
    failed: number;
  }> {
    return offlineQueue.processQueue(
      async (item: OfflineQueueItem) => {
        return this.request(item.endpoint, {
          method: item.method,
          body: JSON.stringify(item.body),
        });
      }
    );
  }
}

export const api = new ApiService();

