import React, { useState } from "react";
import type { ReplacementRequest } from "../../types";
import { api } from "../../services/api";
import {
  ShieldAlert,
  CheckCircle2,
  UserCheck,
  Star,
  AlertCircle,
  XCircle,
  Loader2,
} from "lucide-react";

interface ReplacementTrackerProps {
  request: ReplacementRequest;
  onUpdated: () => void;
}

const PIPELINE_STEPS = [
  { key: "SUBMITTED", label: "Submitted" },
  { key: "UNDER_REVIEW", label: "Under Review" },
  { key: "ASSIGNED", label: "Substitute Matched" },
  { key: "RESOLVED", label: "Active & Resolved" },
];

export const ReplacementTracker: React.FC<ReplacementTrackerProps> = ({
  request,
  onUpdated,
}) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const getStepIndex = (status: string) => {
    switch (status) {
      case "SUBMITTED":
      case "ACKNOWLEDGED":
        return 0;
      case "UNDER_REVIEW":
      case "REPLACEMENT_SEARCH":
        return 1;
      case "ASSIGNED":
      case "SCHEDULED":
        return 2;
      case "RESOLVED":
        return 3;
      default:
        return 0;
    }
  };

  const getLanguages = (value: string | string[]): string[] => {
    if (Array.isArray(value)) {
      return value;
    }

    return value
      .split(",")
      .map((language) => language.trim())
      .filter(Boolean);
  };

  const currentIndex = getStepIndex(request.status);
  const isTerminal = ["RESOLVED", "REJECTED", "CANCELLED"].includes(
    request.status,
  );

  const handleConfirmSubstitute = async () => {
    setIsConfirming(true);
    setActionError(null);

    try {
      await api.confirmReplacement(request.id);
      onUpdated();
    } catch (err: any) {
      setActionError(err.message || "Failed to confirm replacement.");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancelRequest = async () => {
    if (
      !window.confirm(
        "Are you sure you want to cancel this replacement request?",
      )
    ) {
      return;
    }

    setIsCancelling(true);
    setActionError(null);

    try {
      await api.cancelReplacementRequest(request.id);
      onUpdated();
    } catch (err: any) {
      setActionError(err.message || "Failed to cancel request.");
    } finally {
      setIsCancelling(false);
    }
  };

  const substituteLanguages = request.substituteCaregiver
    ? getLanguages(request.substituteCaregiver.languages)
    : [];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Caregiver Replacement Request
              </h3>

              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  request.status === "RESOLVED"
                    ? "bg-emerald-100 text-emerald-800"
                    : request.status === "CANCELLED" ||
                        request.status === "REJECTED"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-amber-100 text-amber-900 animate-pulse"
                }`}
              >
                {request.status.replace(/_/g, " ")}
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-0.5">
              Ref:{" "}
              <span className="font-mono text-slate-700 font-semibold">
                {request.id.slice(0, 8)}
              </span>{" "}
              • Priority:{" "}
              <span className="font-semibold text-slate-700">
                {request.priority}
              </span>
            </p>
          </div>
        </div>

        {!isTerminal && (
          <button
            onClick={handleCancelRequest}
            disabled={isCancelling}
            className="text-xs text-rose-700 hover:text-rose-900 font-semibold px-3 py-1.5 rounded-lg hover:bg-rose-50 transition border border-rose-200"
          >
            {isCancelling ? "Cancelling..." : "Cancel Request"}
          </button>
        )}
      </div>

      {actionError && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {!["CANCELLED", "REJECTED"].includes(request.status) ? (
        <div className="py-2">
          <div className="grid grid-cols-4 gap-2">
            {PIPELINE_STEPS.map((step, idx) => {
              const isPast = idx < currentIndex;
              const isCurrent = idx === currentIndex;

              return (
                <div key={step.key} className="space-y-2">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      isPast || isCurrent ? "bg-teal-700" : "bg-slate-200"
                    }`}
                  />

                  <div className="text-left">
                    <span
                      className={`text-[11px] block font-semibold leading-tight ${
                        isCurrent
                          ? "text-teal-900 font-bold"
                          : isPast
                            ? "text-slate-700"
                            : "text-slate-400"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-slate-100 text-slate-700 text-xs flex items-center gap-2">
          <XCircle className="w-4 h-4 text-slate-500" />
          <span>
            This request was closed with status:{" "}
            <strong>{request.status}</strong>.
          </span>
        </div>
      )}

      {request.status === "ASSIGNED" && request.substituteCaregiver && (
        <div className="p-5 rounded-2xl bg-teal-50/80 border-2 border-teal-600 space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-950 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-teal-700" />
              Proposed Substitute Attendant from Vetted Buffer Pool
            </span>

            <span className="text-[10px] px-2 py-0.5 rounded bg-teal-200/80 text-teal-950 font-bold">
              Action Required
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-start gap-4 bg-white p-4 rounded-xl border border-teal-200">
            <img
              src={
                request.substituteCaregiver.avatarUrl ||
                "https://images.unsplash.com/photo-1594824813687-849a62237078?w=150"
              }
              alt={request.substituteCaregiver.fullName}
              className="w-16 h-16 rounded-xl object-cover border border-slate-200"
            />

            <div className="flex-1 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900">
                  {request.substituteCaregiver.fullName}
                </h4>

                <span className="flex items-center gap-1 text-amber-600 font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  {request.substituteCaregiver.rating}
                </span>
              </div>

              <p className="text-slate-600">
                {request.substituteCaregiver.experienceYears ?? 0}+ years
                experience • {request.substituteCaregiver.locality}
              </p>

              <div className="flex flex-wrap gap-1 pt-1">
                {substituteLanguages.map((language: string) => (
                  <span
                    key={language}
                    className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium"
                  >
                    {language}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2">
            <p className="text-xs text-teal-800 leading-relaxed">
              Review candidate details. Click below to accept this substitute
              and update active care immediately.
            </p>

            <button
              onClick={handleConfirmSubstitute}
              disabled={isConfirming}
              className="min-h-[48px] px-5 py-2.5 bg-teal-900 hover:bg-teal-800 text-white text-xs font-bold rounded-xl transition shadow flex items-center gap-2 shrink-0"
            >
              {isConfirming ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Activating...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Activate Substitute</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {request.history && request.history.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Progress Timeline & Audit Trail
          </span>

          <div className="space-y-2">
            {request.history.map((historyItem) => (
              <div
                key={historyItem.id}
                className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs flex items-start justify-between gap-2"
              >
                <div className="space-y-0.5">
                  <span className="font-semibold text-slate-800 block">
                    {historyItem.newStatus.replace(/_/g, " ")}
                  </span>

                  {historyItem.note && (
                    <p className="text-slate-600 text-[11px]">
                      {historyItem.note}
                    </p>
                  )}
                </div>

                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                  {new Date(historyItem.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
