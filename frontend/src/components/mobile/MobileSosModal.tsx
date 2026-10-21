import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  Phone,
  X,
  ShieldAlert,
  CheckCircle2,
  Loader2,
  Building2,
  Navigation,
} from "lucide-react";
import { api } from "../../services/api";
import { offlineQueue } from "../../services/offlineQueue";
import type { ElderEmergencyContext } from "../../types";

interface MobileSosModalProps {
  isOpen: boolean;
  onClose: () => void;
  elderId?: string;
  elderName?: string;
}

export const MobileSosModal: React.FC<MobileSosModalProps> = ({
  isOpen,
  onClose,
  elderId,
  elderName,
}) => {
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Hospital & Emergency Context (Requirement F)
  const [emergencyContext, setEmergencyContext] = useState<ElderEmergencyContext | null>(null);
  const [loadingContext, setLoadingContext] = useState(false);

  useEffect(() => {
    if (isOpen && elderId) {
      setLoadingContext(true);
      api
        .getElderEmergencyHospitalContext(elderId)
        .then((ctx) => {
          setEmergencyContext(ctx);
        })
        .catch((err) => {
          console.error("Failed to load elder emergency context:", err);
        })
        .finally(() => setLoadingContext(false));
    }
  }, [isOpen, elderId]);

  if (!isOpen) return null;

  const handleTriggerOnlineSos = async () => {
    if (!elderId) {
      // If no elder profile is attached yet, trigger direct native call
      window.location.href = "tel:112";
      return;
    }

    setIsSending(true);
    setStatusMessage(null);

    try {
      // Attempt geolocation if available; fallback to stored residence coordinates
      let lat: number | undefined = emergencyContext?.residenceLatitude ?? undefined;
      let lng: number | undefined = emergencyContext?.residenceLongitude ?? undefined;
      let locationSource = emergencyContext?.residenceLatitude ? "STORED_RESIDENCE" : "COORDINATES_UNAVAILABLE";

      if (navigator.geolocation) {
        try {
          const pos: GeolocationPosition = await new Promise(
            (resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 3000,
                enableHighAccuracy: true,
              });
            },
          );
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
          locationSource = "DEVICE_GPS";
        } catch {
          // Keep stored residence fallback (or undefined if not stored)
        }
      }

      await api.triggerSos({
        elderId,
        latitude: lat,
        longitude: lng,
        notes: `Emergency SOS triggered from mobile app for ${elderName || "Elder"} (${locationSource}).`,
      });

      setIsSent(true);
      setStatusMessage(
        "🚨 Emergency SOS broadcasted! Operations Care Desk and assigned caregiver have been alerted.",
      );
    } catch (err: any) {
      offlineQueue.enqueue("/incidents/sos", "POST", {
        elder_id: elderId,
        incident_type: "EMERGENCY_SOS",
        severity: "P1_CRITICAL",
        notes: "Offline SOS triggered from mobile device.",
      });

      setStatusMessage(
        "Offline fallback: Request queued. Dialing 112 Emergency Medical Services directly...",
      );
      setTimeout(() => {
        window.location.href = "tel:112";
      }, 1200);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-[420px] bg-white rounded-3xl p-6 shadow-2xl border border-rose-100 flex flex-col space-y-5 animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-rose-600">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                Emergency SOS
              </h2>
              <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">
                Priority 1 Assistance
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {statusMessage && (
          <div
            className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 ${
              isSent
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            {isSent ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed font-medium">{statusMessage}</span>
          </div>
        )}

        {/* Preferred & Nearby Hospitals (Requirement F) */}
        {loadingContext ? (
          <div className="flex items-center justify-center p-3 gap-2 bg-slate-50 rounded-2xl text-xs text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>Locating emergency hospitals...</span>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {emergencyContext?.preferredHospital && (
              <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-rose-600" />
                    <span>Family Preferred Emergency ER</span>
                  </span>
                  <span className="px-1.5 py-0.2 bg-rose-200/70 text-rose-900 rounded text-[9px] font-bold">
                    Primary Choice
                  </span>
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-xs">
                    {emergencyContext.preferredHospital.name}
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-tight mt-0.5">
                    {emergencyContext.preferredHospital.address}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-rose-200/60">
                  <a
                    href={`tel:${emergencyContext.preferredHospital.contactNumber}`}
                    className="font-bold text-rose-800 hover:underline flex items-center gap-1 text-xs"
                  >
                    <Phone className="w-3 h-3 text-rose-600" />
                    <span>{emergencyContext.preferredHospital.contactNumber}</span>
                  </a>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${emergencyContext.preferredHospital.latitude},${emergencyContext.preferredHospital.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1 text-xs"
                  >
                    <Navigation className="w-3 h-3 text-slate-500" />
                    <span>Navigate</span>
                  </a>
                </div>
              </div>
            )}

            {emergencyContext?.nearbyHospitals && emergencyContext.nearbyHospitals.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block px-1">
                  Nearby Emergency Rooms (~10km)
                </span>
                {emergencyContext.nearbyHospitals
                  .filter((h) => h.id !== emergencyContext.preferredHospital?.id)
                  .slice(0, 3)
                  .map((h) => (
                    <div
                      key={h.id}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <h5 className="font-extrabold text-slate-900 text-xs truncate">
                          {h.name}
                        </h5>
                        <p className="text-[10px] text-slate-500 truncate">
                          {h.address}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {h.distanceKm !== undefined && (
                          <span className="text-[10px] font-bold text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            {h.distanceKm.toFixed(1)} km
                          </span>
                        )}
                        <a
                          href={`tel:${h.contactNumber}`}
                          className="p-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg border border-rose-200"
                          title="Call Emergency"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Big Action Buttons */}
        <div className="space-y-3 pt-1">
          <button
            onClick={handleTriggerOnlineSos}
            disabled={isSending}
            className="w-full min-h-[56px] bg-rose-600 hover:bg-rose-700 active:scale-98 text-white rounded-2xl font-bold text-sm shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2.5 transition"
          >
            {isSending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Broadcasting SOS to Operations...</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5" />
                <span>Alert CareConnect Desk & Attendant</span>
              </>
            )}
          </button>

          {/* Direct Phone Fallback */}
          <a
            href="tel:112"
            className="w-full min-h-[52px] bg-slate-900 hover:bg-slate-800 active:scale-98 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 transition"
          >
            <Phone className="w-4 h-4 text-rose-400" />
            <span>Direct Call National EMS (112)</span>
          </a>

          {/* Call Coordinator */}
          <a
            href="tel:+914448552200"
            className="w-full min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 transition"
          >
            <Phone className="w-3.5 h-3.5 text-slate-500" />
            <span>Call 24/7 Care Coordinator Desk</span>
          </a>
        </div>

        {/* 3-Point Clarification / Disclaimer */}
        <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 text-[11px] text-slate-500 space-y-1.5">
          <div className="font-bold text-slate-700">
            Important Safety Information:
          </div>
          <div className="flex items-start gap-1.5">
            <span>•</span>
            <span>
              CareConnect provides managed home monitoring, not clinical
              hospital ambulances.
            </span>
          </div>
          <div className="flex items-start gap-1.5">
            <span>•</span>
            <span>
              For acute life-threatening emergencies, always dial 112
              immediately.
            </span>
          </div>
          <div className="flex items-start gap-1.5">
            <span>•</span>
            <span>
              Alerts automatically notify your on-duty caregiver and operations
              supervisor.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
