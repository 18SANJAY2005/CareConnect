import React, { useState, useEffect } from "react";
import type { Renewal } from "../../types";
import { api } from "../../services/api";
import {
  RefreshCw,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";

export const RenewalCard: React.FC = () => {
  const [renewal, setRenewal] = useState<Renewal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isTogglingMandate, setIsTogglingMandate] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<
    "CHANGE_PLAN" | "CANCEL_SERVICE"
  >("CHANGE_PLAN");
  const [modalReason, setModalReason] = useState("TWELVE_HOUR_DAY_NIGHT");
  const [preferredPlan, setPreferredPlan] = useState("TWELVE_HOUR_DAY_NIGHT");
  const [isSubmittingChange, setIsSubmittingChange] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRenewal = async () => {
    try {
      setIsLoading(true);
      const data = await api.getUpcomingRenewal();
      setRenewal(data);
    } catch (err: any) {
      setError(err.message || "Failed to load upcoming renewal.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRenewal();
  }, []);

  const handleConfirmRenewal = async () => {
    setIsConfirming(true);
    setError(null);
    try {
      const updated = await api.confirmRenewal(
        "Family confirmed continuous care service.",
      );
      setRenewal(updated);
      setSuccessMessage("Renewal confirmed for the next billing cycle!");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to confirm renewal.");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleToggleMandate = async () => {
    if (!renewal) return;
    setIsTogglingMandate(true);
    setError(null);
    try {
      const nextState = !renewal.autoDebitEnabled;
      const updated = await api.toggleAutoDebitMandate(nextState);
      setRenewal(updated);
      setSuccessMessage(
        nextState
          ? "Recurring auto-debit mandate activated!"
          : "Auto-debit mandate paused.",
      );
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to toggle auto-debit mandate.");
    } finally {
      setIsTogglingMandate(false);
    }
  };

  const handleChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingChange(true);
    setError(null);
    try {
      const updated = await api.requestRenewalChange({
        action: modalAction,
        reason: modalReason,
        preferredPlan:
          modalAction === "CHANGE_PLAN" ? preferredPlan : undefined,
      });
      setRenewal(updated);
      setIsModalOpen(false);
      setSuccessMessage(
        modalAction === "CANCEL_SERVICE"
          ? "Cancellation request recorded."
          : "Plan change request submitted to Operations.",
      );
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to submit change request.");
    } finally {
      setIsSubmittingChange(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-teal-700" />
        <span className="text-xs">Checking upcoming renewal...</span>
      </div>
    );
  }

  if (!renewal) {
    return (
      <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center text-xs text-slate-400">
        No upcoming renewal schedule found for this assignment.
      </div>
    );
  }

  const periodEnd = new Date(renewal.currentPeriodEnd);
  const daysLeft = Math.max(
    0,
    Math.ceil((periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Service Plan Renewal
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  renewal.status === "CONFIRMED" || renewal.status === "ACTIVE"
                    ? "bg-emerald-100 text-emerald-800"
                    : renewal.status === "CANCELLED"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-amber-100 text-amber-900"
                }`}
              >
                {renewal.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Service cycle ends on{" "}
              <strong className="text-slate-800">
                {periodEnd.toLocaleDateString([], { dateStyle: "medium" })}
              </strong>
            </p>
          </div>
        </div>

        {/* Days Left Chip */}
        <div className="px-3.5 py-1.5 rounded-xl bg-teal-50 text-teal-900 text-xs font-semibold border border-teal-200 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-teal-700" />
          <span>{daysLeft} days remaining</span>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Renewal Info Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Next Period Summary */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
          <span className="font-bold text-slate-700 uppercase tracking-wider block">
            Upcoming Cycle (30 Days)
          </span>
          <div className="text-sm font-bold text-slate-900">
            {new Date(renewal.requestedPeriodStart).toLocaleDateString([], {
              month: "short",
              day: "numeric",
            })}{" "}
            –{" "}
            {new Date(renewal.requestedPeriodEnd).toLocaleDateString([], {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
          <div className="text-slate-600">
            Estimated Renewal Charge:{" "}
            <strong className="text-slate-900 font-mono">
              ₹{renewal.amount.toLocaleString("en-IN")}
            </strong>{" "}
            (incl. 18% GST)
          </div>
        </div>

        {/* Auto-Debit Mandate Toggle */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="font-bold text-slate-700 uppercase tracking-wider block">
                Razorpay Auto-Debit Mandate
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Automatically debit monthly retainer on due date. No disruption
                in care.
              </p>
            </div>

            {/* Toggle Switch */}
            <button
              onClick={handleToggleMandate}
              disabled={isTogglingMandate}
              className={`w-12 h-6 rounded-full transition-colors relative shrink-0 p-0.5 focus:outline-none ${
                renewal.autoDebitEnabled ? "bg-teal-700" : "bg-slate-300"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  renewal.autoDebitEnabled ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
            <span>Mandate Status:</span>
            <span
              className={
                renewal.autoDebitEnabled ? "text-emerald-700" : "text-slate-500"
              }
            >
              {renewal.mandateStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Actions Row */}
      <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => {
            setModalAction("CHANGE_PLAN");
            setIsModalOpen(true);
          }}
          className="text-xs text-slate-600 hover:text-slate-900 font-semibold px-3 py-2 rounded-lg hover:bg-slate-100 transition border border-slate-200"
        >
          Change Plan or Request Cancellation
        </button>

        {renewal.status !== "CONFIRMED" && renewal.status !== "ACTIVE" && (
          <button
            onClick={handleConfirmRenewal}
            disabled={isConfirming}
            className="min-h-[48px] px-6 py-2.5 bg-teal-900 hover:bg-teal-800 text-white text-xs font-bold rounded-xl transition shadow flex items-center gap-2"
          >
            {isConfirming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Confirming...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-teal-300" />
                <span>Confirm Renewal for Next Month</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Plan Change / Cancellation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">
                Modify Upcoming Service Plan
              </h4>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleChangeRequest} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setModalAction("CHANGE_PLAN")}
                  className={`p-2.5 rounded-xl border text-center font-semibold ${
                    modalAction === "CHANGE_PLAN"
                      ? "border-teal-700 bg-teal-50 text-teal-950 font-bold"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  Change Plan Shift
                </button>
                <button
                  type="button"
                  onClick={() => setModalAction("CANCEL_SERVICE")}
                  className={`p-2.5 rounded-xl border text-center font-semibold ${
                    modalAction === "CANCEL_SERVICE"
                      ? "border-rose-600 bg-rose-50 text-rose-950 font-bold"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  Cancel / Non-Renewal
                </button>
              </div>

              {modalAction === "CHANGE_PLAN" && (
                <div className="space-y-1">
                  <label className="text-slate-700 font-bold">
                    Select New Shift Preference
                  </label>
                  <select
                    value={preferredPlan}
                    onChange={(e) => setPreferredPlan(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-teal-700"
                  >
                    <option value="EIGHT_HOUR_DAY">
                      8-Hour Day Shift (Standard)
                    </option>
                    <option value="TWELVE_HOUR_DAY_NIGHT">
                      12-Hour Day / Night Shift
                    </option>
                    <option value="TWENTY_FOUR_HOUR_LIVE_IN">
                      24-Hour Live-in Caregiver
                    </option>
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-slate-700 font-bold">
                  Reason / Details
                </label>
                <textarea
                  value={modalReason}
                  onChange={(e) => setModalReason(e.target.value)}
                  required
                  rows={3}
                  placeholder={
                    modalAction === "CANCEL_SERVICE"
                      ? "Tell us why you wish to cancel..."
                      : "Reason for changing shift schedule..."
                  }
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-teal-700"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Dismiss
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingChange}
                  className="px-5 py-2.5 bg-teal-900 hover:bg-teal-800 text-white font-bold rounded-xl transition"
                >
                  {isSubmittingChange ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
