import React from "react";
import type { CareAssignment } from "../../types";
import {
  UserCheck,
  Star,
  Clock,
  MapPin,
  Languages,
  ShieldAlert,
  MessageSquareHeart,
  ReceiptIndianRupee,
  RefreshCw,
  PhoneCall,
} from "lucide-react";

interface ActiveCareCardProps {
  assignment: CareAssignment;
  onRequestReplacement: () => void;
  onGiveFeedback: () => void;
  onViewBilling: () => void;
  onViewRenewal: () => void;
  hasActiveReplacement?: boolean;
}

export const ActiveCareCard: React.FC<ActiveCareCardProps> = ({
  assignment,
  onRequestReplacement,
  onGiveFeedback,
  onViewBilling,
  onViewRenewal,
  hasActiveReplacement = false,
}) => {
  const cg = assignment.caregiver;

  const languages = cg?.languages
    ? Array.isArray(cg.languages)
      ? cg.languages
      : cg.languages
          .split(",")
          .map((language) => language.trim())
          .filter(Boolean)
    : [];

  const specializations = cg?.specializations
    ? Array.isArray(cg.specializations)
      ? cg.specializations
      : cg.specializations
          .split(",")
          .map((specialization) => specialization.trim())
          .filter(Boolean)
    : [];

  const monthlyRate = assignment.monthlyRate ?? 0;
  const shiftType = assignment.shiftType ?? "EIGHT_HOUR_DAY";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-teal-900 to-teal-800 text-white p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-700/80 border border-teal-500/30 flex items-center justify-center text-teal-200">
            <UserCheck className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                Active Caregiver Assignment
              </h2>

              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                {assignment.status}
              </span>
            </div>

            <p className="text-xs text-teal-200/80">
              Metropolitan Care Network • Verified & Background Checked
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-teal-200 font-medium">
            Monthly Compensation
          </div>

          <div className="text-lg font-bold text-white font-mono">
            ₹{monthlyRate.toLocaleString("en-IN")}
            <span className="text-xs font-normal text-teal-300">/mo</span>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="flex flex-col sm:flex-row items-start gap-5 pb-6 border-b border-slate-100">
          <div className="relative">
            <img
              src={
                cg?.avatarUrl ||
                "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=150"
              }
              alt={cg?.fullName || "Caregiver"}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-teal-100 shadow-sm"
            />

            <div className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-1 rounded-full border-2 border-white shadow">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {cg?.fullName || "Assigned Attendant"}
                </h3>

                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1 font-semibold text-amber-600">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {cg?.rating || 4.9} / 5.0
                  </span>

                  <span>•</span>

                  <span>{cg?.experienceYears || 5}+ Years Experience</span>

                  <span>•</span>

                  <span className="flex items-center gap-1 text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-teal-600" />
                    {cg?.locality || "Care Zone"}
                  </span>
                </div>
              </div>

              {cg?.phone && (
                <a
                  href={`tel:${cg.phone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-teal-700" />
                  Direct Call
                </a>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-teal-50 text-teal-900 border border-teal-200">
                <Clock className="w-3 h-3 text-teal-700" />
                {shiftType === "EIGHT_HOUR_DAY"
                  ? "8-Hour Day Shift"
                  : shiftType.replace(/_/g, " ")}
              </span>

              {languages.map((lang: string) => (
                <span
                  key={lang}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
                >
                  <Languages className="w-3 h-3 text-slate-500" />
                  {lang}
                </span>
              ))}
            </div>

            {specializations.length > 0 && (
              <div className="text-xs text-slate-600 pt-1">
                <span className="font-semibold text-slate-800">
                  Specializations:{" "}
                </span>
                {specializations.join(" • ")}
              </div>
            )}
          </div>
        </div>

        <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={onRequestReplacement}
            className={`min-h-[56px] px-4 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm border ${
              hasActiveReplacement
                ? "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
                : "bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100"
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-rose-700" />
            <span>
              {hasActiveReplacement
                ? "Track Replacement Request"
                : "Request Replacement"}
            </span>
          </button>

          <button
            onClick={onGiveFeedback}
            className="min-h-[56px] px-4 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 bg-slate-50 text-slate-800 border border-slate-200 hover:bg-slate-100 transition shadow-sm"
          >
            <MessageSquareHeart className="w-4 h-4 text-teal-700" />
            <span>Attendant Feedback</span>
          </button>

          <button
            onClick={onViewBilling}
            className="min-h-[56px] px-4 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 bg-slate-50 text-slate-800 border border-slate-200 hover:bg-slate-100 transition shadow-sm"
          >
            <ReceiptIndianRupee className="w-4 h-4 text-teal-700" />
            <span>Monthly Invoices</span>
          </button>

          <button
            onClick={onViewRenewal}
            className="min-h-[56px] px-4 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 bg-teal-900 text-white hover:bg-teal-800 transition shadow-sm"
          >
            <RefreshCw className="w-4 h-4 text-teal-300" />
            <span>Service Renewal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
