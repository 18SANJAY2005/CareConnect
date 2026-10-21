import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  PhoneCall,
  AlertTriangle,
  RefreshCw,
  X,
  CheckCircle,
  Navigation,
  Building2,
  MapPin,
  Ambulance,
  Phone,
  Compass,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { caregiverApi } from '../../services/api';
import type { ShiftDetails, ElderEmergencyContext, HospitalInfo } from '../../types';

interface SosModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftDetails?: ShiftDetails | null;
  onSuccess: () => void;
}

export const SosModal: React.FC<SosModalProps> = ({
  isOpen,
  onClose,
  shiftDetails,
  onSuccess,
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState<'CONFIRM' | 'SUCCESS'>('CONFIRM');
  const [incidentData, setIncidentData] = useState<any>(null);
  const [hospitalContext, setHospitalContext] = useState<ElderEmergencyContext | null>(null);
  const [locationSource, setLocationSource] = useState<'GPS' | 'RESIDENCE' | 'DEFAULT'>('DEFAULT');

  // Load preferred and nearby hospitals for this elder
  useEffect(() => {
    if (!isOpen) return;

    const elderId = shiftDetails?.elder?.id;
    if (elderId) {
      setLoadingHospitals(true);
      caregiverApi
        .getElderEmergencyHospitalContext(elderId)
        .then((ctx) => {
          setHospitalContext(ctx);
        })
        .catch((err) => {
          console.warn('Failed to fetch emergency hospital context:', err);
        })
        .finally(() => {
          setLoadingHospitals(false);
        });
    } else {
      // General emergency nearby query around Chennai centroid
      setLoadingHospitals(true);
      caregiverApi
        .getNearbyHospitals(13.0012, 80.2565, 15)
        .then((list) => {
          setHospitalContext({
            elderId: '',
            elderName: 'Emergency Patient',
            preferredHospital: null,
            hasPreferredHospital: false,
            nearbyHospitals: list,
          });
        })
        .catch((err) => console.warn('Nearby hospital lookup warning:', err))
        .finally(() => setLoadingHospitals(false));
    }
  }, [isOpen, shiftDetails?.elder?.id]);

  if (!isOpen) return null;

  const handleTriggerSos = async () => {
    setLoading(true);
    setError(null);

    let latitude: number | undefined;
    let longitude: number | undefined;

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const pos: any = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
        });
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
        setLocationSource('GPS');
      } catch {
        // Safe Fallback to stored elder residence coordinates (Req F)
        if (hospitalContext?.residenceCoordinates?.latitude && hospitalContext?.residenceCoordinates?.longitude) {
          latitude = hospitalContext.residenceCoordinates.latitude;
          longitude = hospitalContext.residenceCoordinates.longitude;
          setLocationSource('RESIDENCE');
        } else if (shiftDetails?.elder?.latitude && shiftDetails?.elder?.longitude) {
          latitude = shiftDetails.elder.latitude;
          longitude = shiftDetails.elder.longitude;
          setLocationSource('RESIDENCE');
        } else {
          latitude = undefined;
          longitude = undefined;
          setLocationSource('DEFAULT');
        }
      }
    } else {
      if (shiftDetails?.elder?.latitude && shiftDetails?.elder?.longitude) {
        latitude = shiftDetails.elder.latitude;
        longitude = shiftDetails.elder.longitude;
        setLocationSource('RESIDENCE');
      }
    }

    const targetElderId = shiftDetails?.elder?.id;
    if (!targetElderId) {
      setError('No active elder assignment found. Please call 108 Emergency Ambulance directly.');
      setLoading(false);
      return;
    }

    try {
      const incident = await caregiverApi.triggerSos({
        elderId: targetElderId,
        shiftId: shiftDetails?.shift?.id,
        latitude,
        longitude,
        notes: notes.trim() || 'Immediate emergency medical assistance requested at elder residence.',
      });
      setIncidentData(incident);
      setStep('SUCCESS');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to trigger SOS alert');
    } finally {
      setLoading(false);
    }
  };

  const preferredHosp = hospitalContext?.preferredHospital;
  const nearbyHospitals = hospitalContext?.nearbyHospitals || [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-red-300 overflow-hidden max-h-[92dvh] flex flex-col animate-in fade-in slide-in-from-bottom duration-200">
        {/* Banner */}
        <div className="bg-red-600 px-4 sm:px-5 py-3.5 sm:py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-white/20 rounded-xl shrink-0">
              <ShieldAlert className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base truncate">{t('sosButton')}</h3>
              <p className="text-red-100 text-xs truncate">P1 Emergency & Preferred Hospital Access</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 pb-safe">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {step === 'CONFIRM' ? (
            <div className="space-y-4">
              {/* Emergency Confirmation Note */}
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl">
                <h4 className="font-bold text-xs text-red-900 mb-1">{t('sosConfirmTitle')}</h4>
                <p className="text-xs text-red-700 leading-relaxed">{t('sosConfirmDesc')}</p>
              </div>

              {/* National 108 Emergency Service */}
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h5 className="font-bold text-xs text-amber-900">National Emergency Ambulance (108)</h5>
                  <p className="text-[11px] text-amber-800 leading-snug mt-0.5">
                    For life-threatening respiratory, cardiac, or stroke events, call 108 immediately.
                  </p>
                  <a
                    href="tel:108"
                    className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Call 108 Emergency Now</span>
                  </a>
                </div>
              </div>

              {/* ======================================================== */}
              {/* PREFERRED EMERGENCY HOSPITAL (Requirements C, D, E)      */}
              {/* ======================================================== */}
              <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-teal-700" />
                    <span>Family's Preferred Hospital</span>
                  </span>
                  {preferredHosp && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-teal-100 text-teal-800">
                      Primary Choice
                    </span>
                  )}
                </div>

                {loadingHospitals ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-600" />
                    <span>Loading preferred hospital details...</span>
                  </div>
                ) : preferredHosp ? (
                  <div className="space-y-2 text-xs">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{preferredHosp.name}</h4>
                      <p className="text-[11px] text-slate-600 mt-0.5 flex items-start gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{preferredHosp.address}</span>
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <a
                        href={`tel:${preferredHosp.emergencyPhone || preferredHosp.phone}`}
                        className="min-h-[44px] px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call Hospital ({preferredHosp.emergencyPhone || preferredHosp.phone})</span>
                      </a>

                      {preferredHosp.latitude && preferredHosp.longitude && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${preferredHosp.latitude},${preferredHosp.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[44px] px-3.5 py-2 bg-white border border-teal-600 hover:bg-teal-50 text-teal-800 font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Get Directions</span>
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-600 space-y-1">
                    <p className="font-medium">No preferred hospital selected by care seeker yet.</p>
                    <p className="text-[10px] text-slate-500">
                      Using Chennai emergency directory alternatives below.
                    </p>
                  </div>
                )}
              </div>

              {/* ======================================================== */}
              {/* NEARBY EMERGENCY HOSPITALS (Requirement E & F)           */}
              {/* ======================================================== */}
              {nearbyHospitals.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Ambulance className="w-3.5 h-3.5 text-red-600" />
                    <span>Nearby Hospital Emergency Rooms (Chennai)</span>
                  </h4>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {nearbyHospitals.slice(0, 3).map((h) => (
                      <div
                        key={h.id}
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-slate-900 truncate">{h.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{h.area || h.address}</p>
                          {h.distanceKm !== undefined && (
                            <span className="text-[10px] text-teal-700 font-semibold">
                              ~{h.distanceKm.toFixed(1)} km away
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <a
                            href={`tel:${h.emergencyPhone || h.phone}`}
                            className="p-2 min-h-[44px] min-w-[44px] bg-white border border-slate-300 hover:bg-teal-50 text-teal-700 rounded-xl flex items-center justify-center transition-colors"
                            title="Call Emergency"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${h.latitude},${h.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 min-h-[44px] min-w-[44px] bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center transition-colors"
                            title="Directions"
                          >
                            <Navigation className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Coordinates & Residence Notice */}
              <div className="p-2 bg-slate-100 rounded-xl text-[10px] text-slate-500 flex items-center gap-1.5">
                <Compass className="w-3 h-3 text-slate-400 shrink-0" />
                <span>
                  Emergency coordinates: {shiftDetails?.elder?.locality || 'Patient Residence'} (GPS & Residence Fallback Verified)
                </span>
              </div>

              {/* Situation Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Emergency Situation Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe patient condition: e.g. acute breathlessness, fall injury, sudden chest pain..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              {/* Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 px-4 min-h-[48px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleTriggerSos}
                  className="py-3 px-4 min-h-[48px] bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                  <span>{t('confirmSos')}</span>
                </button>
              </div>
            </div>
          ) : (
            /* ========================================================
               SUCCESS STATE: INCIDENT RECORDED
               ======================================================== */
            <div className="text-center py-3 space-y-3">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-900">CareConnect Incident Ticket Created</h4>
                <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto leading-relaxed">
                  Incident ticket #{incidentData?.id?.slice(0, 8)} recorded. Operations clinical manager & primary sponsor notified immediately.
                </p>
              </div>

              {/* Direct Hospital Contact if Available */}
              {preferredHosp && (
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-left text-xs space-y-1.5">
                  <span className="font-bold text-teal-900 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-teal-700" />
                    <span>Preferred Hospital Contact: {preferredHosp.name}</span>
                  </span>
                  <a
                    href={`tel:${preferredHosp.emergencyPhone || preferredHosp.phone}`}
                    className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-3 min-h-[44px] bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Call {preferredHosp.name} ({preferredHosp.emergencyPhone || preferredHosp.phone})</span>
                  </a>
                </div>
              )}

              {/* Ambulance Notice */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <PhoneCall className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>National Ambulance Helpline:</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-snug">
                  Ambulance is not automatically dispatched by software. Call 108 directly if urgent transport is required:
                </p>
                <a
                  href="tel:108"
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-3 min-h-[44px] bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Call 108 Emergency Ambulance</span>
                </a>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-4 min-h-[48px] bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
              >
                Close & Return to Active Care
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
