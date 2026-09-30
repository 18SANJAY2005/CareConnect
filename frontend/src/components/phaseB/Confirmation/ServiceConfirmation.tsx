import React from "react";
import {
  CheckCircle2,
  ShieldCheck,
  Phone,
  Award,
  Video,
  FileText,
  Heart,
  ArrowLeft,
} from "lucide-react";
import type {
  CareAssignment,
  Caregiver,
  IntroCall,
  PaymentVerifyResponse,
  SLAAcceptanceResponse,
} from "../../../types";

interface ServiceConfirmationProps {
  assignment: CareAssignment;
  caregiver: Caregiver;
  elderName: string;
  introCall: IntroCall | null;
  paymentResult: PaymentVerifyResponse | null;
  slaResult: SLAAcceptanceResponse | null;
  onReset: () => void;
  onBackToDashboard?: () => void;
}

export const ServiceConfirmation: React.FC<ServiceConfirmationProps> = ({
  assignment,
  caregiver,
  elderName,
  introCall,
  paymentResult,
  slaResult,
  onReset,
  onBackToDashboard,
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Hero Celebration Banner */}
      <div className="bg-gradient-to-r from-tertiary to-primary text-white rounded-3xl p-8 sm:p-10 shadow-2xl text-center relative overflow-hidden">
        <div className="w-20 h-20 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-4 shadow-inner">
          <CheckCircle2 className="w-12 h-12 text-white" />
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider mb-2">
          Service Confirmed • Status: ACTIVE TRIAL
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold font-heading">
          Care Service Confirmed for {elderName}!
        </h1>
        <p className="text-sm sm:text-base text-white/90 max-w-xl mx-auto mt-2">
          Your 7-day care trial is officially booked and confirmed. Your advance
          deposit is held in CareConnect Escrow and your SLA is legally
          executed.
        </p>
      </div>

      {/* Prominent Next Step: Return to Phase A Profile & Phase C Active Care */}
      {onBackToDashboard && (
        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border-2 border-teal-500/40 rounded-3xl p-6 sm:p-8 text-center space-y-3 shadow-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-bold uppercase tracking-wide">
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
            <span>Phase B Complete • Trial Scheduled</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading">
            Return to Phase A Summary & Phase C Live Care
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
            Your caregiver assignment is confirmed. You can now return to the
            main dashboard to view your Phase A intake summary, manage care
            locations, or open the Phase C Active Care & Remote Monitoring
            dashboard.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onBackToDashboard}
              className="px-8 py-3.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center gap-2.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>← Back to Phase A & C Dashboard</span>
            </button>
          </div>
        </div>
      )}

      {/* Confirmed Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Assigned Caregiver & Trial Schedule */}
        <div className="bg-surface-card p-6 rounded-2xl border border-outline-light/50 shadow-card flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-primary block mb-3">
              Assigned Vetted Caregiver
            </span>
            <div className="flex items-center space-x-4 mb-4">
              <img
                src={caregiver.photo_url}
                alt={caregiver.full_name}
                className="w-16 h-16 rounded-xl object-cover border-2 border-primary/20 shadow-sm"
              />
              <div>
                <h3 className="text-xl font-bold font-heading text-on-surface">
                  {caregiver.full_name}
                </h3>
                <p className="text-xs text-secondary font-semibold">
                  {caregiver.headline}
                </p>
                <div className="flex items-center space-x-2 mt-1 text-xs text-on-surface-variant">
                  <span>{caregiver.locality}</span>
                  <span>•</span>
                  <span>{caregiver.languages}</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-surface rounded-xl border border-outline-light/40 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant font-medium">
                  Shift Type:
                </span>
                <span className="font-bold text-on-surface">
                  {assignment.shift_type}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant font-medium">
                  Trial Start Date:
                </span>
                <span className="font-bold text-primary">
                  Sunday, Sep 20, 2026
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant font-medium">
                  Trial Duration:
                </span>
                <span className="font-bold text-tertiary">
                  7 Days (Full Escrow Protection)
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-outline-light/30 flex items-center justify-between">
            <span className="text-xs text-tertiary font-semibold flex items-center">
              <ShieldCheck className="w-4 h-4 mr-1" /> Police & Clinically
              Cleared
            </span>
            <span className="text-xs text-on-surface-variant font-mono">
              Assignment #{assignment.id}
            </span>
          </div>
        </div>

        {/* Card 2: Payment, Jitsi Call & SLA Audit Record */}
        <div className="bg-surface-card p-6 rounded-2xl border border-outline-light/50 shadow-card flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-primary block mb-3">
              Phase B Milestone Records
            </span>

            <div className="space-y-3 text-xs">
              {/* Jitsi Milestone */}
              <div className="p-3 bg-surface rounded-xl border border-outline-light/40 flex items-start space-x-3">
                <Video className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-on-surface">
                      10-Min Introductory Call
                    </span>
                    <span className="text-[10px] font-bold text-tertiary bg-tertiary-light px-2 py-0.5 rounded-full">
                      COMPLETED
                    </span>
                  </div>
                  <p className="text-on-surface-variant mt-0.5">
                    Provider: Jitsi Meet ({introCall?.room_id || "Pending"})
                  </p>
                </div>
              </div>

              {/* Payment Milestone */}
              <div className="p-3 bg-surface rounded-xl border border-outline-light/40 flex items-start space-x-3">
                <Award className="w-5 h-5 text-tertiary flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-on-surface">
                      Advance Deposit (Razorpay)
                    </span>
                    <span className="text-[10px] font-bold text-tertiary bg-tertiary-light px-2 py-0.5 rounded-full">
                      ESCROW HELD
                    </span>
                  </div>
                  <p className="text-on-surface-variant mt-0.5">
                    Amount: ₹15,000.00 • ID:{" "}
                    {paymentResult?.provider_payment_id || "Pending"}
                  </p>
                </div>
              </div>

              {/* SLA Milestone */}
              <div className="p-3 bg-surface rounded-xl border border-outline-light/40 flex items-start space-x-3">
                <FileText className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-on-surface">
                      SLA Digital Execution
                    </span>
                    <span className="text-[10px] font-bold text-secondary bg-secondary-light px-2 py-0.5 rounded-full">
                      PRIVACY SIGNED
                    </span>
                  </div>
                  <p className="text-on-surface-variant mt-0.5">
                    Signer: {slaResult?.signer_name || "Signer Not Found"} •
                    Version {slaResult?.sla_version || "1.0"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-outline-light/30 flex items-center justify-between text-xs text-on-surface-variant">
            <span>CareConnect Privacy Registry</span>
            <span className="text-tertiary font-semibold flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Legally Enforceable
            </span>
          </div>
        </div>
      </div>

      {/* Clinical Support Team Contact */}
      <div className="bg-surface-card p-6 sm:p-8 rounded-2xl border border-outline-light/50 shadow-card flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
            <Heart className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-bold font-heading text-on-surface">
              Assigned Clinical Care Manager: Dr. Malathi Sivakumar
            </h4>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Supervises caregiver daily check-ins, geofence radius adherence,
              and daily vitals reports.
            </p>
          </div>
        </div>

        <a
          href="tel:+914424908000"
          className="touch-target-secondary px-6 rounded-xl bg-surface hover:bg-surface-container border border-outline-light font-semibold text-xs sm:text-sm text-primary flex items-center whitespace-nowrap shadow-sm"
        >
          <Phone className="w-4 h-4 mr-2 text-primary" />
          <span>Call Care Manager</span>
        </a>
      </div>

      {/* Restart & Back */}
      <div className="text-center pt-4 space-y-2">
        {onBackToDashboard && (
          <div>
            <button
              type="button"
              onClick={onBackToDashboard}
              className="text-xs font-bold text-teal-700 hover:text-teal-900 underline transition-colors"
            >
              ← Back to Phase A Summary & Elder Profile
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-semibold text-on-surface-variant hover:text-primary underline transition-colors"
        >
          Return to Matching and Select Different Caregiver
        </button>
      </div>
    </div>
  );
};
