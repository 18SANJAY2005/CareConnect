import React from 'react';
import {
  X,
  MapPin,
  Clock,
  Heart,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Briefcase,
  Sparkles,
} from 'lucide-react';
import type { AvailableCareJob } from '../../types';

interface JobDetailsModalProps {
  job: AvailableCareJob | null;
  isOpen: boolean;
  onClose: () => void;
  onAccept: (job: AvailableCareJob) => void;
  accepting: boolean;
}

export const JobDetailsModal: React.FC<JobDetailsModalProps> = ({
  job,
  isOpen,
  onClose,
  onAccept,
  accepting,
}) => {
  if (!isOpen || !job) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-slideUp sm:animate-zoomIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-teal-700 to-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">{job.title}</h3>
              <p className="text-[11px] text-teal-100 flex items-center gap-1">
                <span>Care Opportunity</span>
                <span>•</span>
                <span>{job.locality}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={accepting}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-slate-800">
          {/* Elder & Rate Summary Banner */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Elder</p>
              <h4 className="text-lg font-extrabold text-slate-900">{job.elderName}</h4>
              <p className="text-xs text-teal-700 font-semibold mt-0.5">{job.careType}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Pay / Shift</p>
              <p className="text-lg font-black text-emerald-700">{job.compensation}</p>
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 mt-0.5">
                Direct Payout
              </span>
            </div>
          </div>

          {/* Key Opportunity Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                <span className="font-semibold">Shift Timing</span>
              </div>
              <p className="font-bold text-slate-900 text-sm">{job.shiftDuration}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">8:00 AM – 8:00 PM</p>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <MapPin className="w-3.5 h-3.5 text-rose-600" />
                <span className="font-semibold">Location & Distance</span>
              </div>
              <p className="font-bold text-slate-900 text-sm truncate">{job.locality}</p>
              <p className="text-[11px] text-teal-700 font-semibold mt-0.5">
                ~{job.approximateDistanceKm} km from your area
              </p>
            </div>
          </div>

          {/* Start Date */}
          <div className="flex items-center gap-2 text-xs p-3 rounded-xl bg-teal-50 border border-teal-100 text-teal-900">
            <Calendar className="w-4 h-4 text-teal-700 shrink-0" />
            <span>
              <strong>Shift Start:</strong> {job.starts}
            </span>
          </div>

          {/* Care Needs */}
          <div>
            <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              <span>Elder Care Requirements</span>
            </h5>
            <div className="space-y-1.5">
              {job.careNeeds.map((need, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-150 text-xs text-slate-700"
                >
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>{need}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Privacy Note */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Privacy Protection:</strong> Exact residential address and full medical history will be unlocked upon care acceptance in accordance with CareConnect Elder Care policies.
            </p>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={accepting}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onAccept(job)}
            disabled={accepting}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {accepting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Accepting Care Work...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>Accept Care Work</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
