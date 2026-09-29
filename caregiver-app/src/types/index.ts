export type ShiftStatus = 
  | 'SCHEDULED' 
  | 'CHECKED_IN' 
  | 'ACTIVE' 
  | 'LATE' 
  | 'MISSED' 
  | 'EXCEPTION' 
  | 'CHECKED_OUT';

export type AttendanceVerificationStatus = 
  | 'VERIFIED' 
  | 'OUT_OF_RANGE' 
  | 'SUPERVISOR_OVERRIDE' 
  | 'OTP_OVERRIDE';

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
  } | null;
  latestAttendance?: AttendanceLog | null;
  message?: string;
}

export type TimeOfDay = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';

export interface CareTask {
  id: string;
  shiftId: string;
  elderId: string;
  caregiverId: string;
  timeOfDay: TimeOfDay;
  category: string;
  taskName: string;
  status: 'PENDING' | 'COMPLETED' | 'SKIPPED';
  details: Record<string, any>;
  notes?: string;
  recordedAt?: string;
}

export interface OfflineQueueItem {
  id: string;
  endpoint: string;
  method: 'POST' | 'PATCH' | 'PUT';
  body: any;
  idempotencyKey: string;
  timestamp: number;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  retryCount: number;
  error?: string;
}

export interface User {
  id: string;
  role: string;
  fullName: string;
  phone?: string;
  email?: string;
  authProvider: string;
}

export interface VitalReading {
  id: string;
  elderId: string;
  recordedById: string;
  shiftId?: string;
  systolicBp?: number;
  diastolicBp?: number;
  pulse?: number;
  bloodGlucose?: number;
  glucoseContext?: string;
  temperatureCelsius?: number;
  isAbnormal: boolean;
  alertSeverity: 'NORMAL' | 'WARNING' | 'CRITICAL';
  alertMessage?: string;
  recordedAt: string;
}

export type SupportedLanguage = 'ta' | 'en' | 'te';
