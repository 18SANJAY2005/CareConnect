import React, { useState, useEffect } from "react";
import {
  User,
  MapPin,
  Phone,
  ShieldCheck,
  Edit2,
  Calendar,
  Clock,
  CheckCircle2,
  Heart,
  Activity,
  FileText,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Navigation,
} from "lucide-react";
import type { Elder } from "../../../types";
import { api } from "../../../services/api";
import { ElderSectionEditorModal } from "../profile/ElderSectionEditorModal";
import type { EditableSection } from "../profile/ElderSectionEditorModal";

interface FamilyMyCareScreenProps {
  elder: Elder;
  onUpdateElder?: (updatedElder: Elder) => void;
  onDeleteElder?: (elderId: string) => void;
  onEditProfile?: () => void;
  editingSection?: EditableSection | null;
  onEditingSectionChange?: (section: EditableSection | null) => void;
  isDeleteModalOpen?: boolean;
  onDeleteModalOpenChange?: (open: boolean) => void;
}

export const FamilyMyCareScreen: React.FC<FamilyMyCareScreenProps> = ({
  elder,
  onUpdateElder,
  onDeleteElder,
  editingSection: controlledEditingSection,
  onEditingSectionChange,
  isDeleteModalOpen: controlledIsDeleteModalOpen,
  onDeleteModalOpenChange,
}) => {
  const [currentElder, setCurrentElder] = useState<Elder>(elder);
  const [localEditingSection, setLocalEditingSection] =
    useState<EditableSection | null>(null);
  const [localIsDeleteModalOpen, setLocalIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const editingSection =
    controlledEditingSection !== undefined
      ? controlledEditingSection
      : localEditingSection;
  const setEditingSection = (sec: EditableSection | null) => {
    if (onEditingSectionChange) {
      onEditingSectionChange(sec);
    } else {
      setLocalEditingSection(sec);
    }
  };

  const isDeleteModalOpen =
    controlledIsDeleteModalOpen !== undefined
      ? controlledIsDeleteModalOpen
      : localIsDeleteModalOpen;
  const setIsDeleteModalOpen = (open: boolean) => {
    if (onDeleteModalOpenChange) {
      onDeleteModalOpenChange(open);
    } else {
      setLocalIsDeleteModalOpen(open);
    }
  };

  useEffect(() => {
    setCurrentElder(elder);
  }, [elder]);

  const handleSaved = (updated: Elder) => {
    setCurrentElder(updated);
    onUpdateElder?.(updated);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteElder(currentElder.id);
      setIsDeleteModalOpen(false);
      onDeleteElder?.(currentElder.id);
    } catch (err: any) {
      setDeleteError(
        err.message || "Failed to delete elder. Please try again.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const getShiftLabel = (pref?: string) => {
    switch (pref) {
      case "EIGHT_HOUR_DAY":
        return "Standard 8-Hour Day Care";
      case "TWENTY_FOUR_HOUR_LIVE_IN":
        return "24-Hour Live-in Care Companion";
      case "FLEXIBLE":
        return "Flexible Care Schedule";
      case "TWELVE_HOUR_DAY_NIGHT":
      default:
        return "Standard 12-Hour Day/Night Care";
    }
  };

  const getShiftTime = () => {
    const routine = (currentElder.dailyRoutine as Record<string, any>) || {};
    if (
      (currentElder.shiftPreference as string) === "FLEXIBLE" &&
      routine.preferredStartTime &&
      routine.preferredEndTime
    ) {
      return `${routine.preferredStartTime} – ${routine.preferredEndTime}`;
    }
    if ((currentElder.shiftPreference as string) === "EIGHT_HOUR_DAY") {
      return "09:00 AM – 05:00 PM";
    }
    if (
      (currentElder.shiftPreference as string) === "TWENTY_FOUR_HOUR_LIVE_IN"
    ) {
      return "24/7 Continuous Support";
    }
    return "08:00 AM – 08:00 PM";
  };

  return (
    <div className="space-y-4 px-4 py-4 pb-safe-nav animate-fadeIn text-slate-900">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-heading text-slate-900">
            My Care Plan
          </h2>
          <p className="text-xs text-slate-500">
            Active services & profile overview
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditingSection("NAME")}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-teal-50 hover:bg-teal-100 text-xs font-bold text-primary transition"
        >
          <Edit2 className="w-3 h-3" />
          <span>Edit Profile</span>
        </button>
      </div>

      {/* 1. Care Duration & Timing Plan */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-primary flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">
                {getShiftLabel(currentElder.shiftPreference)}
              </div>
              <div className="text-[11px] text-emerald-600 font-semibold">
                Active & Supervised
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditingSection("DURATION")}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-primary transition"
            title="Edit Care Duration"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold">{getShiftTime()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>30-Day Cycle</span>
          </div>
        </div>
      </div>

      {/* 2. Core Profile Details */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-primary" />
            <span>Elder Profile & Demographics</span>
          </div>
        </div>

        {/* Name section */}
        <div className="flex items-center justify-between py-1">
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">
              Full Name
            </span>
            <span className="font-bold text-slate-900 text-xs">
              {currentElder.name}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setEditingSection("NAME")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-100 text-[11px] font-semibold text-primary transition"
          >
            <Edit2 className="w-3 h-3" />
            <span>Edit</span>
          </button>
        </div>

        {/* Age & Gender section */}
        <div className="flex items-center justify-between py-1 border-t border-slate-100/80">
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">
              Age & Gender
            </span>
            <span className="font-bold text-slate-900 text-xs">
              {currentElder.age} yrs • {currentElder.gender}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setEditingSection("AGE_GENDER")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-100 text-[11px] font-semibold text-primary transition"
          >
            <Edit2 className="w-3 h-3" />
            <span>Edit</span>
          </button>
        </div>

        {/* Language section */}
        <div className="flex items-center justify-between py-1 border-t border-slate-100/80">
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">
              Languages
            </span>
            <span className="font-bold text-slate-900 text-xs">
              {currentElder.primaryLanguage || "English"}
              {currentElder.languages && currentElder.languages.length > 1 && (
                <span className="font-normal text-slate-500">
                  {" "}
                  (
                  {currentElder.languages
                    .filter((l) => l !== currentElder.primaryLanguage)
                    .join(", ")}
                  )
                </span>
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setEditingSection("LANGUAGE")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-100 text-[11px] font-semibold text-primary transition"
          >
            <Edit2 className="w-3 h-3" />
            <span>Edit</span>
          </button>
        </div>

        {/* Phone Number section */}
        <div className="flex items-center justify-between py-1 border-t border-slate-100/80">
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">
              Contact Number
            </span>
            <span className="font-bold text-slate-900 text-xs">
              {currentElder.phoneNumber ? (
                currentElder.phoneNumber
              ) : (
                <span className="text-slate-400 font-normal">Not provided</span>
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setEditingSection("NAME")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-100 text-[11px] font-semibold text-primary transition"
          >
            <Edit2 className="w-3 h-3" />
            <span>Edit</span>
          </button>
        </div>

        {/* Manage / Delete Elder Option */}
        <div className="flex items-center justify-between py-2 border-t border-slate-100/80">
          <div>
            <span className="text-[10px] text-rose-500 block font-semibold uppercase tracking-wider">
              Manage Profile
            </span>
            <span className="font-bold text-slate-800 text-xs">
              Elder Account Removal
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setDeleteError(null);
              setIsDeleteModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-[11px] font-bold text-rose-700 transition active:scale-98"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Delete Elder</span>
          </button>
        </div>
      </div>

      {/* 3. Care Requirements & Mobility */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-primary" />
            <span>Care Needs & Mobility</span>
          </div>
          <button
            type="button"
            onClick={() => setEditingSection("REQUIREMENTS")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-100 text-[11px] font-semibold text-primary transition"
          >
            <Edit2 className="w-3 h-3" />
            <span>Edit</span>
          </button>
        </div>

        <div className="space-y-2 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">
              Mobility Status
            </span>
            <span className="font-bold text-slate-800">
              {currentElder.mobilityLevel === "INDEPENDENT"
                ? "Independent"
                : currentElder.mobilityLevel === "CANE_WALKER"
                  ? "Assisted Walking (Cane/Walker)"
                  : currentElder.mobilityLevel === "WHEELCHAIR"
                    ? "Wheelchair Assisted"
                    : "Bedridden / Maximum Support"}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block font-medium mb-1">
              Required Care Support
            </span>
            <div className="flex flex-wrap gap-1.5">
              {currentElder.careRequirements &&
              currentElder.careRequirements.length > 0 ? (
                currentElder.careRequirements.map((r, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 text-[10px] font-semibold border border-teal-200/60"
                  >
                    {r}
                  </span>
                ))
              ) : (
                <span className="text-slate-400 text-xs">
                  General elder support
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Health Observations & Clinical Information */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-primary" />
            <span>Health Observations</span>
          </div>
          <button
            type="button"
            onClick={() => setEditingSection("DETAILED_CARE")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-100 text-[11px] font-semibold text-primary transition"
          >
            <Edit2 className="w-3 h-3" />
            <span>Edit</span>
          </button>
        </div>

        {currentElder.medicalConditions &&
        currentElder.medicalConditions.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {currentElder.medicalConditions.map((c, i) => (
              <span
                key={i}
                className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-semibold border border-slate-200"
              >
                {c}
              </span>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-400">
            No medical conditions reported.
          </div>
        )}
      </div>

      {/* 5. Special Instructions & Preferences */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-primary" />
            <span>Additional Preferences & Routine</span>
          </div>
          <button
            type="button"
            onClick={() => setEditingSection("PREFERENCES")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-100 text-[11px] font-semibold text-primary transition"
          >
            <Edit2 className="w-3 h-3" />
            <span>Edit</span>
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed italic">
          {currentElder.additionalNotes || "No special instructions provided."}
        </p>
      </div>

      {/* 6. Verified Location */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2">
        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          <span>Service Location</span>
        </div>
        <div className="text-xs text-slate-700 leading-relaxed">
          {currentElder.location?.addressLine1 || "Elder Residence"},{" "}
          {currentElder.location?.locality || "Corridor"}
          <br />
          PIN:{" "}
          <span className="font-mono font-bold">
            {currentElder.location?.postalCode || "600020"}
          </span>
        </div>
        <div className="pt-1 text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Within active primary care corridor</span>
        </div>
        {currentElder.location && (
          <a
            href={
              currentElder.location.latitude && currentElder.location.longitude
                ? `https://www.google.com/maps/dir/?api=1&destination=${currentElder.location.latitude},${currentElder.location.longitude}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${currentElder.location.addressLine1 || ''}, ${currentElder.location.locality || ''}, Chennai`)}`
            }
            target="_blank"
            rel="noreferrer"
            className="mt-2 w-full py-2 bg-slate-50 hover:bg-slate-100 text-primary border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Open in Google Maps</span>
          </a>
        )}
      </div>

      {/* 7. Care Coordination Contact */}
      <div className="p-4 rounded-3xl bg-teal-50 border border-teal-200/80 text-teal-900 space-y-2.5">
        <div className="text-xs font-bold">24/7 Care Coordinator Desk</div>
        <div className="text-xs text-teal-800/90 leading-relaxed">
          Need an immediate attendant replacement or clinical escalation?
        </div>
        <a
          href="tel:+914448552200"
          className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-sm"
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Call Care Manager (+91 44 4855 2200)</span>
        </a>
      </div>

      {/* Section Editor Modal */}
      {editingSection && (
        <ElderSectionEditorModal
          section={editingSection}
          elder={currentElder}
          onSave={handleSaved}
          onClose={() => setEditingSection(null)}
          onTriggerDelete={() => {
            setDeleteError(null);
            setIsDeleteModalOpen(true);
          }}
        />
      )}

      {/* Delete Elder Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 animate-fadeIn">
          <div className="w-full max-w-[420px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-4 animate-slideUp text-slate-900">
            {/* Modal Header */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold font-heading text-slate-900">
                  Delete this elder?
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Are you sure you want to delete this elder? This action may
                  remove the elder from your active CareConnect profile.
                </p>
              </div>
            </div>

            {/* Error Message Display if Active Care blocks deletion */}
            {deleteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 leading-relaxed flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="flex-1 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 h-11 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Elder</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
