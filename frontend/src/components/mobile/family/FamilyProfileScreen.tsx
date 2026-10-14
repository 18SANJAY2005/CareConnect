import React, { useState } from "react";
import {
  Phone,
  Mail,
  Shield,
  UserCheck,
  Star,
  ChevronRight,
  LogOut,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileCheck,
  PlusCircle,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { api } from "../../../services/api";
import type { Elder } from "../../../types";

interface FamilyProfileScreenProps {
  elder: Elder;
  onAddElder?: () => void;
}

export const FamilyProfileScreen: React.FC<FamilyProfileScreenProps> = ({
  elder,
  onAddElder,
}) => {
  const { user, logout } = useAuth();

  const [activeModal, setActiveModal] = useState<
    "REPLACEMENT" | "FEEDBACK" | "SLA" | null
  >(null);
  const [replacementReason, setReplacementReason] = useState("SCHEDULE_MISMATCH");
  const [replacementNotes, setReplacementNotes] = useState("");
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRequestReplacement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      await api.createReplacementRequest({
        assignmentId: 1,
        reasonCode: replacementReason,
        notes: replacementNotes,
        priority: "NORMAL",
      });
      setStatusMessage(
        "Replacement request submitted! Care Manager will assign an approved substitute within 24 hours.",
      );
      setActiveModal(null);
      setReplacementNotes("");
    } catch (err: any) {
      setErrorMessage("Failed to submit request: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      await api.submitFeedback({
        assignmentId: 1,
        caregiverRating: feedbackRating,
        serviceRating: feedbackRating,
        tags: ["AttendantCare", "Reliability"],
        comment: feedbackComment,
      });
      setStatusMessage("Thank you for your rating! Feedback recorded.");
      setActiveModal(null);
      setFeedbackComment("");
    } catch (err: any) {
      setErrorMessage("Failed to submit feedback: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 px-4 py-4 pb-safe-nav animate-fadeIn text-slate-900 overflow-y-auto">
      {/* Screen Title */}
      <div>
        <h2 className="text-xl font-bold font-heading text-slate-900">
          Account & Profile
        </h2>
        <p className="text-xs text-slate-500">
          Personal details, caregiver support, and care policies
        </p>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 1. Personal / User Account Card */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-13 h-13 rounded-2xl bg-teal-100 border border-teal-200 flex items-center justify-center font-extrabold text-primary text-xl">
            {user?.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-extrabold text-slate-900 truncate">
              {user?.fullName || "CareSeeker"}
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-800 px-2 py-0.5 rounded-full inline-block mt-0.5">
              {user?.role === "FAMILY_SPONSOR" ? "Family Sponsor" : user?.role || "Family Client"}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 space-y-2 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-medium">{user?.phone ? `+91 ${user.phone}` : "No phone registered"}</span>
          </div>
          {user?.email && (
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{user.email}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Active Care Recipient */}
      <div className="p-4 rounded-3xl bg-teal-50/70 border border-teal-200/60 flex items-center justify-between text-xs">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 block">
            Current Care Recipient
          </span>
          <span className="font-extrabold text-slate-900 text-sm">
            {elder.name}
          </span>
          <span className="text-slate-500 block text-[11px]">
            {elder.age} yrs • {elder.primaryLanguage || "English"}
          </span>
        </div>
        {onAddElder && (
          <button
            onClick={onAddElder}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-teal-200 text-primary text-xs font-bold hover:bg-teal-50 transition shadow-2xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Elder</span>
          </button>
        )}
      </div>

      {/* 3. Support & Service Actions (Retained from Support menu) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
        {/* Attendant Replacement */}
        <button
          onClick={() => setActiveModal("REPLACEMENT")}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-primary flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">
                Request Attendant Replacement
              </div>
              <div className="text-[11px] text-slate-400">
                Guaranteed substitute arrangement within 24 hours
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* Rate Care Service */}
        <button
          onClick={() => setActiveModal("FEEDBACK")}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-primary flex items-center justify-center">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">
                Rate Care & Attendant Feedback
              </div>
              <div className="text-[11px] text-slate-400">
                Help improve care quality and training
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* SLA Code of Conduct */}
        <button
          onClick={() => setActiveModal("SLA")}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-primary flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">
                SLA & Service Commitment
              </div>
              <div className="text-[11px] text-slate-400">
                Plain-language terms, code of conduct & guarantees
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* 24/7 Care Desk Call */}
        <a
          href="tel:+914448552200"
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">
                24/7 Care Coordinator Desk
              </div>
              <div className="text-[11px] text-slate-400">
                Call +91 44 4855 2200 for immediate assistance
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </a>
      </div>

      {/* 4. Commitment & Privacy Notice */}
      <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-2 text-[11px] text-slate-600">
        <div className="font-bold text-slate-800 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-primary" />
          <span>CareConnect Commitment & DPDP Compliance</span>
        </div>
        <p className="leading-relaxed">
          Health logs and attendance data are stored in full compliance with India's Digital Personal Data Protection (DPDP) Act 2023. Attendants are identity-checked and police-verified.
        </p>
      </div>

      {/* Sign Out Button */}
      <button
        onClick={logout}
        className="w-full min-h-[50px] p-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center gap-2 transition"
      >
        <LogOut className="w-4 h-4" />
        <span>Sign Out of CareConnect</span>
      </button>

      {/* MODAL: Replacement Request */}
      {activeModal === "REPLACEMENT" && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-4 animate-fadeIn">
          <div className="w-full max-w-[420px] bg-white rounded-3xl p-5 shadow-xl space-y-4 animate-slideUp text-slate-900">
            <h3 className="text-base font-bold font-heading">
              Request Caregiver Replacement
            </h3>
            <p className="text-xs text-slate-500">
              We arrange an approved substitute attendant within 24 hours under your active plan.
            </p>

            <form onSubmit={handleRequestReplacement} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Replacement
                </label>
                <select
                  value={replacementReason}
                  onChange={(e) => setReplacementReason(e.target.value)}
                  className="w-full h-11 px-3 bg-white rounded-xl border border-slate-300 text-xs font-semibold"
                >
                  <option value="SCHEDULE_MISMATCH">Timing / Schedule Mismatch</option>
                  <option value="LANGUAGE_BARRIER">Language / Communication Barrier</option>
                  <option value="CHANGED_CARE_NEEDS">Elder Care Needs Changed</option>
                  <option value="SAFETY_CONCERN">Safety or Protocol Concern</option>
                  <option value="ABSENCE">Attendant Unplanned Absence</option>
                  <option value="OTHER">Other Reason</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Additional Notes
                </label>
                <textarea
                  value={replacementNotes}
                  onChange={(e) => setReplacementNotes(e.target.value)}
                  rows={2}
                  placeholder="Describe your preference for the substitute attendant..."
                  className="w-full p-2.5 bg-white rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-3 bg-slate-100 rounded-xl text-xs font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold shadow"
                >
                  {isSubmitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Care Feedback */}
      {activeModal === "FEEDBACK" && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-4 animate-fadeIn">
          <div className="w-full max-w-[420px] bg-white rounded-3xl p-5 shadow-xl space-y-4 animate-slideUp text-slate-900">
            <h3 className="text-base font-bold font-heading">
              Rate Care Service & Attendant
            </h3>
            <div className="flex justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFeedbackRating(s)}
                  className="p-1"
                >
                  <Star
                    className={`w-7 h-7 ${
                      s <= feedbackRating
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-300"
                    }`}
                  />
                </button>
              ))}
            </div>

            <form onSubmit={handleSendFeedback} className="space-y-3">
              <textarea
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                rows={3}
                placeholder="Share your experience or note any praise for the attendant..."
                className="w-full p-2.5 bg-white rounded-xl border border-slate-300 text-xs"
              />
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-3 bg-slate-100 rounded-xl text-xs font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold shadow"
                >
                  {isSubmitting ? "Saving..." : "Submit Feedback"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SLA Commitment */}
      {activeModal === "SLA" && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-4 animate-fadeIn">
          <div className="w-full max-w-[420px] bg-white rounded-3xl p-5 shadow-xl space-y-4 animate-slideUp text-slate-900">
            <h3 className="text-base font-bold font-heading">
              CareConnect Service Level Agreement
            </h3>
            <div className="space-y-2 text-xs text-slate-600 max-h-60 overflow-y-auto p-3 bg-slate-50 rounded-2xl">
              <div>
                <strong>1. Verified Personnel:</strong> All attendants are identity verified and hospital trained. Geofenced attendance prevents fraudulent check-ins.
              </div>
              <div>
                <strong>2. 24-Hour Substitute Guarantee:</strong> In case of illness or unplanned absence, an approved replacement will be arranged within 24 hours.
              </div>
              <div>
                <strong>3. Non-Hospital Disclaimer:</strong> CareConnect provides supervised home care; emergency life support calls must be directed to 112.
              </div>
              <div>
                <strong>4. DPDP Act 2023 Compliance:</strong> Health records and vitals are encrypted and accessible only by authorized family members and assigned caregivers.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
