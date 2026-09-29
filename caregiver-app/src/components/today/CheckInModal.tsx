import React, { useState, useEffect } from 'react';
import { MapPin, ShieldAlert, KeyRound, CheckCircle2, AlertTriangle, RefreshCw, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { caregiverApi } from '../../services/api';
import type { ShiftDetails } from '../../types';

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftDetails: ShiftDetails;
  onSuccess: () => void;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({
  isOpen,
  onClose,
  shiftDetails,
  onSuccess,
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [mode, setMode] = useState<'GPS' | 'OTP' | 'SUPERVISOR'>('GPS');
  const [otpCode, setOtpCode] = useState('');
  const [supervisorReason, setSupervisorReason] = useState('');

  type GpsState = 'detecting' | 'allowed' | 'denied' | 'unavailable' | 'timeout';
  const [gpsState, setGpsState] = useState<GpsState>('detecting');

  // Calculate distance between two lat/lng coordinates (Haversine formula)
  const calculateDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const detectLocation = () => {
    setGpsState('detecting');
    setError(null);
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const currentCoords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          setCoords(currentCoords);
          setGpsState('allowed');

          if (shiftDetails.elder) {
            const d = calculateDistanceMeters(
              currentCoords.latitude,
              currentCoords.longitude,
              shiftDetails.elder.latitude,
              shiftDetails.elder.longitude
            );
            setDistance(d);
          }
        },
        (err) => {
          if (err.code === 1) {
            setGpsState('denied');
          } else if (err.code === 2) {
            setGpsState('unavailable');
          } else {
            setGpsState('timeout');
          }
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setGpsState('unavailable');
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setMode('GPS');
    setOtpCode('');
    setSupervisorReason('');
    detectLocation();
  }, [isOpen, shiftDetails]);

  if (!isOpen || !shiftDetails.shift || !shiftDetails.elder) return null;

  const isWithinGeofence = distance !== null && distance <= shiftDetails.shift.geofenceRadiusMeters;

  const handleGpsCheckIn = async () => {
    if (!coords) return;
    setLoading(true);
    setError(null);

    try {
      await caregiverApi.checkIn(shiftDetails.shift!.id, {
        latitude: coords.latitude,
        longitude: coords.longitude,
        method: 'GPS',
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Check-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coords || !otpCode) return;
    setLoading(true);
    setError(null);

    try {
      await caregiverApi.checkIn(shiftDetails.shift!.id, {
        latitude: coords.latitude,
        longitude: coords.longitude,
        overrideCode: otpCode,
        method: 'HOUSEHOLD_OTP',
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Household OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSupervisorOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supervisorReason) return;
    setLoading(true);
    setError(null);

    try {
      await caregiverApi.supervisorOverride(shiftDetails.shift!.id, supervisorReason);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Supervisor approval request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">{t('checkIn')}</h3>
              <p className="text-[11px] text-slate-500">
                {shiftDetails.elder.name} • {shiftDetails.elder.locality}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {/* Location & GPS Status Card */}
          <div className="mb-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">GPS Status</span>
              {gpsState === 'detecting' && (
                <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" /> Detecting location...
                </span>
              )}
              {gpsState === 'allowed' && distance !== null && (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    isWithinGeofence
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {isWithinGeofence ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  )}
                  {distance}m away (Radius: {shiftDetails.shift.geofenceRadiusMeters}m)
                </span>
              )}
              {gpsState === 'denied' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                  <AlertTriangle className="w-3 h-3 text-rose-600" /> GPS Denied
                </span>
              )}
              {(gpsState === 'unavailable' || gpsState === 'timeout') && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  <AlertTriangle className="w-3 h-3 text-amber-600" /> {gpsState === 'timeout' ? 'GPS Timeout' : 'GPS Unavailable'}
                </span>
              )}
            </div>

            {/* GPS Diagnostic Message if not allowed */}
            {gpsState === 'denied' && (
              <div className="mt-2 text-xs text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200">
                Location access was denied. Please allow location access in your browser settings, or use <strong>Household OTP</strong> or <strong>Supervisor Exception</strong> below.
              </div>
            )}
            {(gpsState === 'unavailable' || gpsState === 'timeout') && (
              <div className="mt-2 text-xs text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-center justify-between gap-2">
                <span>GPS coordinates cannot be acquired. Check in with Household OTP or retry.</span>
                <button
                  type="button"
                  onClick={detectLocation}
                  className="px-2 py-1 bg-white border border-amber-300 rounded font-semibold text-[11px] shrink-0 hover:bg-amber-100"
                >
                  Retry GPS
                </button>
              </div>
            )}

            <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-200/60 pt-2">
              <span>Patient Residence:</span>
              <span className="font-mono text-slate-700 font-medium">
                {shiftDetails.elder.latitude.toFixed(4)}, {shiftDetails.elder.longitude.toFixed(4)}
              </span>
            </div>
          </div>

          {/* Mode Switcher when Out of Range or GPS Not Allowed */}
          {((gpsState === 'allowed' && distance !== null && !isWithinGeofence) || gpsState === 'denied' || gpsState === 'unavailable') && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs text-amber-900 font-semibold mb-2">
                {gpsState === 'denied' || gpsState === 'unavailable'
                  ? 'Alternative Check-in Methods'
                  : `${t('locOutOfRange')} (${distance}m from elder residence)`}
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setMode('OTP')}
                  className={`py-2 px-2.5 rounded-lg font-semibold min-h-[44px] transition-all ${
                    mode === 'OTP'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white text-amber-900 border border-amber-300'
                  }`}
                >
                  {t('householdOtp')}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('SUPERVISOR')}
                  className={`py-2 px-2.5 rounded-lg font-semibold min-h-[44px] transition-all ${
                    mode === 'SUPERVISOR'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white text-amber-900 border border-amber-300'
                  }`}
                >
                  {t('supervisorOverride')}
                </button>
              </div>
            </div>
          )}

          {/* Action form according to mode */}
          {mode === 'GPS' && (
            <div className="space-y-3">
              <button
                type="button"
                disabled={loading || gpsState !== 'allowed' || !coords || (distance !== null && !isWithinGeofence)}
                onClick={handleGpsCheckIn}
                className="w-full py-3.5 px-4 min-h-[52px] bg-primary hover:bg-primary-hover text-white font-bold text-sm rounded-xl shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-action-manipulation"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
                <span>{t('checkIn')} (GPS Verified)</span>
              </button>
              {distance !== null && !isWithinGeofence && (
                <p className="text-[11px] text-center text-amber-700">
                  You are outside the geofence radius. Select <strong>Household OTP</strong> above to check in.
                </p>
              )}
            </div>
          )}

          {mode === 'OTP' && (
            <form onSubmit={handleOtpCheckIn} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Family / Household OTP
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Enter 6-digit family OTP"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-center font-mono font-bold text-base focus:ring-2 focus:ring-primary"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Ask the family member present in the home for the daily verification code.
                </p>
              </div>
              <button
                type="submit"
                disabled={loading || !otpCode}
                className="w-full py-3 px-4 min-h-[48px] bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2 touch-action-manipulation"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                <span>Verify Family OTP & Check In</span>
              </button>
            </form>
          )}

          {mode === 'SUPERVISOR' && (
            <form onSubmit={handleSupervisorOverride} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Out-of-Range Check-In
                </label>
                <textarea
                  required
                  rows={2}
                  value={supervisorReason}
                  onChange={(e) => setSupervisorReason(e.target.value)}
                  placeholder="e.g., Accompanied patient to clinic/hospital; GPS signal drift inside apartment complex."
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-primary"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !supervisorReason}
                className="w-full py-3 px-4 min-h-[48px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2 touch-action-manipulation"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                <span>Request Supervisor Exception Approval</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
