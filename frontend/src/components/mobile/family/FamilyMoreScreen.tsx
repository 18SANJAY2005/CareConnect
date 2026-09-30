import React, { useState, useEffect } from "react";
import {
  UserCheck,
  Star,
  Shield,
  ChevronRight,
  CheckCircle2,
  ReceiptIndianRupee,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { api } from "../../../services/api";
import type { Elder } from "../../../types";

interface FamilyMoreScreenProps {
  elder: Elder;
  activeModal?: "REPLACEMENT" | "FEEDBACK" | "BILLING" | null;
  onActiveModalChange?: (
    modal: "REPLACEMENT" | "FEEDBACK" | "BILLING" | null,
  ) => void;
}

export const FamilyMoreScreen: React.FC<FamilyMoreScreenProps> = ({
  elder,
  activeModal: controlledActiveModal,
  onActiveModalChange,
}) => {
  const { logout } = useAuth();

  const [assignmentId, setAssignmentId] = useState<string | number>(1);
  const [localActiveModal, setLocalActiveModal] = useState<
    "REPLACEMENT" | "FEEDBACK" | "BILLING" | null
  >(null);
  const [replacementReason, setReplacementReason] =
    useState("SCHEDULE_MISMATCH");
  const [replacementNotes, setReplacementNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const activeModal =
    controlledActiveModal !== undefined
      ? controlledActiveModal
      : localActiveModal;
  const setActiveModal = (
    modal: "REPLACEMENT" | "FEEDBACK" | "BILLING" | null,
  ) => {
    if (onActiveModalChange) {
      onActiveModalChange(modal);
    } else {
      setLocalActiveModal(modal);
    }
  };

  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState("");

  useEffect(() => {
    api
      .getActiveAssignment(elder.id)
      .then((asg) => {
        if (asg?.id) setAssignmentId(asg.id);
      })
      .catch(() => {});
  }, [elder.id]);

  const handleRequestReplacement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      await api.createReplacementRequest({
        assignmentId,
        reasonCode: replacementReason,
        notes: replacementNotes,
        priority: "NORMAL",
      });
      setStatusMessage(
        "Replacement request submitted! Care Manager will assign a substitute within 24 hours.",
      );
      setActiveModal(null);
    } catch (err: any) {
      setStatusMessage("Failed to submit request: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      await api.submitFeedback({
        assignmentId,
        caregiverRating: feedbackRating,
        serviceRating: feedbackRating,
        tags: ["AttendantCare", "Punctuality"],
        comment: feedbackComment,
      });
      setStatusMessage("Thank you for your rating! Feedback recorded.");
      setActiveModal(null);
    } catch (err: any) {
      setStatusMessage("Failed to submit feedback: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 px-4 py-4 pb-safe-nav animate-fadeIn text-slate-900">
      <div>
        <h2 className="text-xl font-bold font-heading text-slate-900">
          Account & Services
        </h2>
        <p className="text-xs text-slate-500">
          Service management, billing, and settings
        </p>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Menu Options */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
        {/* Request Caregiver Replacement */}
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
                Guaranteed 24-hour substitute arrangement
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* Rate Today's Care */}
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
                Rate Care & Feedback
              </div>
              <div className="text-[11px] text-slate-400">
                Help improve your attendant's care quality
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* Billing & Invoices */}
        <button
          onClick={() => setActiveModal("BILLING")}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-primary flex items-center justify-center">
              <ReceiptIndianRupee className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">
                Invoices & Receipts
              </div>
              <div className="text-[11px] text-slate-400">
                Download GST tax invoices & renewal dates
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* 3-Point Plain Language Disclaimer */}
      <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-2 text-[11px] text-slate-600">
        <div className="font-bold text-slate-800 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-primary" />
          <span>CareConnect 3-Point Service Commitment</span>
        </div>
        <div className="space-y-1 leading-relaxed">
          <div>
            • <strong>Non-Hospital Care:</strong> We provide supervised home
            assistance and health tracking; we do not replace hospital emergency
            medical services.
          </div>
          <div>
            • <strong>Verified Personnel:</strong> Every attendant undergoes
            identity verification, police verification, and hospital-grade
            training.
          </div>
          <div>
            • <strong>Data Privacy:</strong> All elder health data is stored
            strictly in accordance with India's Digital Personal Data Protection
            (DPDP) Act 2023.
          </div>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        className="w-full min-h-[50px] p-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center transition"
      >
        Sign Out of CareConnect
      </button>

      {/* MODAL: Replacement Request */}
      {activeModal === "REPLACEMENT" && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-[420px] bg-white rounded-3xl p-5 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Request Caregiver Replacement
            </h3>
            <p className="text-xs text-slate-500">
              We arrange a new verified attendant within 24 hours under your
              active plan.
            </p>

            <form onSubmit={handleRequestReplacement} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason
                </label>
                <select
                  value={replacementReason}
                  onChange={(e) => setReplacementReason(e.target.value)}
                  className="w-full h-11 px-3 bg-white rounded-xl border border-slate-300 text-xs font-semibold"
                >
                  <option value="SCHEDULE_MISMATCH">
                    Timing / Schedule Mismatch
                  </option>
                  <option value="LANGUAGE_BARRIER">
                    Language / Communication Barrier
                  </option>
                  <option value="MEDICAL_NEEDS_CHANGED">
                    Elder Medical Needs Changed
                  </option>
                  <option value="PERSONALITY_FIT">
                    Personality / Temperament Fit
                  </option>
                  <option value="ATTENDANT_LEAVE">
                    Attendant Unplanned Absence
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Additional Details
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

      {/* MODAL: Feedback */}
      {activeModal === "FEEDBACK" && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-[420px] bg-white rounded-3xl p-5 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Rate Care Service
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

      {/* MODAL: Invoices & Receipts */}
      {activeModal === "BILLING" && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-[420px] bg-white rounded-3xl p-5 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Invoices & Receipts
            </h3>
            <div className="p-3 bg-slate-50 rounded-2xl space-y-1 text-xs">
              <div className="flex justify-between font-bold text-slate-800">
                <span>Invoice #INV-2026-0042</span>
                <span className="text-emerald-700">PAID</span>
              </div>
              <div className="text-[11px] text-slate-500">
                Standard 12-Hour Care Plan (30 Days)
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                <span>Date: 19 Sep 2026</span>
                <span className="font-extrabold text-slate-800">₹18,000</span>
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
