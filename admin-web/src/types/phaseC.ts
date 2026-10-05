export type ShiftStatus =
  | "SCHEDULED"
  | "CHECKED_IN"
  | "ACTIVE"
  | "LATE"
  | "MISSED"
  | "EXCEPTION"
  | "CHECKED_OUT";

export type AttendanceVerificationStatus =
  "VERIFIED" | "OUT_OF_RANGE" | "SUPERVISOR_OVERRIDE" | "OTP_OVERRIDE";

export interface Shift {
  id: string;
  elderId: string;
  caregiverId: string;
  shiftType: string;
  status: ShiftStatus;
  scheduledStart: string;
  scheduledEnd: string;
  geofenceRadiusMeters: number;
  supervisorNotes?: string;
}

export interface AttendanceLog {
  id?: string;
  checkInTime?: string;
  checkOutTime?: string;
  distanceMeters?: number;
  verificationStatus?: AttendanceVerificationStatus;
  checkInMethod?: string;
}

export interface ShiftDetails {
  shift: Shift | null;
  elder: {
    id: string;
    name: string;
    age: number;
    gender: string;
    mobilityLevel: string;
    primaryLanguage: string;
    locality: string;
    addressLine1: string;
    latitude: number;
    longitude: number;
  };
  latestAttendance?: AttendanceLog | null;
  message?: string;
}

export interface LiveShiftMonitorItem {
  shiftId: string;
  status: ShiftStatus;
  shiftType: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  elderId: string;
  elderName: string;
  locality: string;
  caregiverId: string;
  caregiverName: string;
  checkInTime?: string;
  distanceMeters?: number;
  verificationStatus?: string;
  supervisorNotes?: string;
}

export type TimeOfDay = "MORNING" | "AFTERNOON" | "EVENING" | "NIGHT";

export interface CareTask {
  id: string;
  shiftId: string;
  elderId: string;
  caregiverId: string;
  timeOfDay: TimeOfDay;
  category: string;
  taskName: string;
  status: "PENDING" | "COMPLETED" | "SKIPPED";
  details: Record<string, any>;
  notes?: string;
  recordedAt?: string;
}

export interface TimelineItem {
  id: string;
  category: string;
  taskName: string;
  timeOfDay: string;
  details: Record<string, any>;
  notes?: string;
  recordedAt: string;
  caregiverName: string;
}

export type VitalAlertSeverity = "NORMAL" | "WARNING" | "CRITICAL";

export interface VitalReading {
  id: string;
  elderId: string;
  shiftId?: string;
  recordedById: string;
  recordedAt: string;
  systolicBp?: number | null;
  diastolicBp?: number | null;
  pulse?: number | null;
  bloodGlucose?: number | null;
  glucoseContext?: "FASTING" | "POST_PRANDIAL" | "RANDOM" | string;
  temperatureCelsius?: number | null;
  source: "MANUAL" | "DEVICE_SYNC" | string;
  isAbnormal: boolean;
  alertSeverity: VitalAlertSeverity;
  alertMessage?: string;
  alertAcknowledged: boolean;
  notes?: string;
}

export interface VitalAlertItem {
  id: string;
  elderId: string;
  elderName: string;
  locality: string;
  recordedAt: string;
  severity: VitalAlertSeverity;
  message?: string;
  readings: {
    bloodPressure?: string | null;
    pulse?: number | null;
    bloodGlucose?: number | null;
    glucoseContext?: string | null;
    temperature?: number | null;
  };
  recordedBy: string;
}

export interface VitalsTrendData {
  bpTrend: Array<{
    timestamp: string;
    systolic: number;
    diastolic: number;
    isAbnormal: boolean;
  }>;
  glucoseTrend: Array<{
    timestamp: string;
    glucose: number;
    context?: string;
    isAbnormal: boolean;
  }>;
  pulseTrend: Array<{
    timestamp: string;
    pulse: number;
    isAbnormal: boolean;
  }>;
  temperatureTrend: Array<{
    timestamp: string;
    temperature: number;
    isAbnormal: boolean;
  }>;
  latestReading?: {
    systolicBp?: number | null;
    diastolicBp?: number | null;
    pulse?: number | null;
    bloodGlucose?: number | null;
    glucoseContext?: string | null;
    temperatureCelsius?: number | null;
    isAbnormal: boolean;
    alertSeverity: VitalAlertSeverity;
    alertMessage?: string;
    recordedAt?: string;
  } | null;
}

export type IncidentStatus =
  "OPEN" | "ACKNOWLEDGED" | "ESCALATING" | "RESOLVED";
export type IncidentPriority = "P1" | "P2" | "P3";

export interface Incident {
  id: string;
  elderId: string;
  shiftId?: string;
  reportedById: string;
  reportedBy?: string;
  elderName?: string;
  locality?: string;
  priority: IncidentPriority;
  incidentType: string;
  status: IncidentStatus;
  title: string;
  description: string;
  locationCoordinates?: { latitude?: number; longitude?: number };
  timeline: Array<{
    timestamp: string;
    actor: string;
    action: string;
    note?: string;
  }>;
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

export interface CareMedia {
  id: string;
  elderId: string;
  shiftId?: string;
  uploadedById: string;
  mediaUrl: string;
  mediaType: "PHOTO" | "VIDEO" | string;
  category: string;
  caption?: string;
  status: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  elderId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  channel: "FAMILY_COORDINATOR" | "CAREGIVER_COORDINATOR" | string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface OfflineQueueItem {
  id: string;
  endpoint: string;
  method: "POST" | "PATCH" | "PUT";
  body: any;
  idempotencyKey: string;
  timestamp: number;
  status: "PENDING" | "SYNCING" | "FAILED";
  retryCount: number;
}
