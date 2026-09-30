import React, { useState } from "react";
import {
  AlertCircle,
  Phone,
  X,
  ShieldAlert,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { api } from "../../services/api";
import { offlineQueue } from "../../services/offlineQueue";

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
      // Attempt geolocation if available
      let lat = 13.0012;
      let lng = 80.2565;
      if (navigator.geolocation) {
        try {
          const pos: GeolocationPosition = await new Promise(
            (resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 3000,
              });
            },
          );
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          // Continue with default fallback coords
        }
      }

      await api.triggerSos({
        elderId,
        latitude: lat,
        longitude: lng,
        notes: `Emergency SOS triggered from mobile app for ${elderName || "Elder"}.`,
      });

      setIsSent(true);
      setStatusMessage(
        "🚨 Emergency SOS broadcasted! Operations Care Desk has been alerted.",
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
