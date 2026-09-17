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
} from "../types";

const API_BASE =
  import.meta.env.VITE_API_BASE || "http://localhost:8000/api";

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

  private async request<T>(
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

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

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
     PHASE A — AUTHENTICATION
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
     PHASE A — ELDER MANAGEMENT
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
     PHASE A — LOCATION VERIFICATION
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
     PHASE A — HOME ASSESSMENT
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
     PHASE B — CAREGIVER MATCHING
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
     PHASE B — CARE ASSIGNMENTS
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
     PHASE B — INTRODUCTORY CALL
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
     PHASE B — PAYMENTS
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
     PHASE B — SLA
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
}

export const api = new ApiService();