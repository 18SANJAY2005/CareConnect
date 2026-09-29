import type {
  ShiftDetails,
  CareTask,
  User,
  VitalReading,
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
  async sendOtp(phone: string, channel: string = 'WHATSAPP') {
    return this.request<{ success: boolean; message: string; phone: string; dev_otp?: string }>(
      '/auth/otp/send',
      {
        method: 'POST',
        body: JSON.stringify({ phone, channel }),
      }
    );
  }

  async verifyOtp(phone: string, otp: string) {
    const res = await this.request<{ access_token: string; token_type: string; user: User }>(
      '/auth/otp/verify',
      {
        method: 'POST',
        body: JSON.stringify({ phone, otp }),
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

  // --- Demo Seeding Helper (dev only) ---
  async seedDemoScenario() {
    return this.request<any>('/shifts/seed-demo', { method: 'POST' });
  }
}

export const caregiverApi = new CaregiverApiService();
