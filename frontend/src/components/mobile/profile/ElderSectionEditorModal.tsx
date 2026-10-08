import React, { useState } from "react";
import {
  X,
  Check,
  Loader2,
  AlertCircle,
  Clock,
  Globe,
  Heart,
  FileText,
  Trash2,
} from "lucide-react";
import { api } from "../../../services/api";
import type { Elder } from "../../../types";

export type EditableSection =
  | "NAME"
  | "AGE_GENDER"
  | "LANGUAGE"
  | "REQUIREMENTS"
  | "DURATION"
  | "PREFERENCES"
  | "DETAILED_CARE";

interface ElderSectionEditorModalProps {
  section: EditableSection;
  elder: Elder;
  onSave: (updatedElder: Elder) => void;
  onClose: () => void;
  onTriggerDelete?: () => void;
}

const ALL_LANGUAGES = [
  "Bengali",
  "English",
  "Gujarati",
  "Hindi",
  "Kannada",
  "Malayalam",
  "Marathi",
  "Tamil",
  "Telugu",
];

const DURATION_OPTIONS = [
  { id: "EIGHT_HOUR_DAY", label: "8 Hours" },
  { id: "TWELVE_HOUR_DAY_NIGHT", label: "12 Hours" },
  { id: "TWENTY_FOUR_HOUR_LIVE_IN", label: "24 Hours" },
  { id: "FLEXIBLE", label: "Flexible" },
];

const MOBILITY_OPTIONS = [
  { id: "INDEPENDENT", label: "Independent" },
  { id: "CANE_WALKER", label: "Cane / Walker" },
  { id: "WHEELCHAIR", label: "Wheelchair" },
  { id: "BEDRIDDEN", label: "Bedridden" },
];

const COMMON_REQUIREMENTS = [
  "Assisted Care",
  "Mobility Support",
  "Medication Management",
  "Companionship",
  "Dementia Support",
  "Vitals Monitoring",
  "Hygiene & Bathing",
];

const COMMON_CONDITIONS = [
  "Hypertension",
  "Diabetes Type 2",
  "Mild Dementia",
  "Cardiac Care",
  "Post-Fall Care",
  "Arthritis",
  "Parkinsons",
];

export const ElderSectionEditorModal: React.FC<
  ElderSectionEditorModalProps
> = ({ section, elder, onSave, onClose, onTriggerDelete }) => {
  // Local state for Name
  const [name, setName] = useState(elder.name || "");
  const [phoneNumber, setPhoneNumber] = useState(elder.phoneNumber || "");

  // Local state for Age & Gender
  const [age, setAge] = useState(elder.age ? String(elder.age) : "70");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER">(
    elder.gender || "FEMALE",
  );

  // Local state for Language
  const [primaryLanguage, setPrimaryLanguage] = useState(
    elder.primaryLanguage || "English",
  );
  const [languages, setLanguages] = useState<string[]>(
    elder.languages && elder.languages.length > 0
      ? elder.languages
      : ["English", "Tamil"],
  );

  // Local state for Requirements & Mobility
  const [mobilityLevel, setMobilityLevel] = useState<string>(
    elder.mobilityLevel || "CANE_WALKER",
  );
  const [careRequirements, setCareRequirements] = useState<string[]>(
    elder.careRequirements && elder.careRequirements.length > 0
      ? elder.careRequirements
      : ["Assisted Care"],
  );

  // Local state for Duration & Timing
  const initialShift = elder.shiftPreference || "TWELVE_HOUR_DAY_NIGHT";
  const [shiftPreference, setShiftPreference] = useState<string>(initialShift);
  const routine = (elder.dailyRoutine as Record<string, any>) || {};
  const [startTime, setStartTime] = useState<string>(
    routine.preferredStartTime || "09:00",
  );
  const [endTime, setEndTime] = useState<string>(
    routine.preferredEndTime || "17:00",
  );

  // Local state for Preferences
  const [additionalNotes, setAdditionalNotes] = useState(
    elder.additionalNotes || "",
  );

  // Local state for Detailed Care Info
  const [medicalConditions, setMedicalConditions] = useState<string[]>(
    elder.medicalConditions || ["Hypertension"],
  );
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>(
    elder.dietaryPreferences || ["Vegetarian"],
  );

  // Async state
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getTitle = () => {
    switch (section) {
      case "NAME":
        return "Edit Full Name";
      case "AGE_GENDER":
        return "Edit Age & Gender";
      case "LANGUAGE":
        return "Edit Languages Spoken";
      case "REQUIREMENTS":
        return "Edit Care Requirements & Mobility";
      case "DURATION":
        return "Edit Care Duration & Hours";
      case "PREFERENCES":
        return "Edit Additional Preferences";
      case "DETAILED_CARE":
        return "Edit Clinical & Health Details";
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    const patchPayload: Record<string, any> = {};

    try {
      if (section === "NAME") {
        if (!name.trim()) throw new Error("Name cannot be blank.");
        patchPayload.name = name.trim();
        patchPayload.phoneNumber = phoneNumber.trim() || null;
      } else if (section === "AGE_GENDER") {
        const ageNum = parseInt(age, 10);
        if (isNaN(ageNum) || ageNum < 18 || ageNum > 125) {
          throw new Error("Please enter a valid age between 18 and 125.");
        }
        patchPayload.age = ageNum;
        patchPayload.gender = gender;
      } else if (section === "LANGUAGE") {
        if (!primaryLanguage)
          throw new Error("Please select a primary language.");
        const finalLangs = Array.from(new Set([primaryLanguage, ...languages]));
        patchPayload.primaryLanguage = primaryLanguage;
        patchPayload.primary_language = primaryLanguage;
        patchPayload.languages = finalLangs;
      } else if (section === "REQUIREMENTS") {
        patchPayload.mobilityLevel = mobilityLevel;
        patchPayload.careRequirements = careRequirements;
      } else if (section === "DURATION") {
        if (shiftPreference === "FLEXIBLE") {
          if (!startTime || !endTime) {
            throw new Error(
              "Please enter both start and end times for flexible care.",
            );
          }
          if (startTime === endTime) {
            throw new Error("Start time and end time cannot be identical.");
          }
        }
        patchPayload.shiftPreference = shiftPreference;
        const currentRoutine =
          (elder.dailyRoutine as Record<string, any>) || {};
        patchPayload.dailyRoutine = {
          ...currentRoutine,
          shiftType: shiftPreference,
          preferredStartTime:
            shiftPreference === "FLEXIBLE" ? startTime : undefined,
          preferredEndTime:
            shiftPreference === "FLEXIBLE" ? endTime : undefined,
        };
      } else if (section === "PREFERENCES") {
        patchPayload.additionalNotes = additionalNotes.trim();
      } else if (section === "DETAILED_CARE") {
        patchPayload.medicalConditions = medicalConditions;
        patchPayload.dietaryPreferences = dietaryPreferences;
      }

      const updated = await api.updateElder(elder.id, patchPayload);
      onSave(updated);
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err.message || "Failed to save changes. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 animate-fadeIn">
      <div className="w-full max-w-[440px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden text-slate-900 animate-slideUp">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Quick Edit
            </span>
            <h3 className="text-base font-bold font-heading text-slate-900 mt-0.5">
              {getTitle()}
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form
          onSubmit={handleSave}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-xs"
        >
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. NAME SECTION */}
          {section === "NAME" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. S. Ramanathan"
                  className="w-full h-12 px-3.5 bg-white rounded-xl border border-slate-300 text-slate-900 font-bold text-sm focus:border-primary focus:ring-2 focus:ring-teal-500/20 shadow-sm"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Contact Number (Optional)
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full h-12 px-3.5 bg-white rounded-xl border border-slate-300 text-slate-900 font-medium text-sm focus:border-primary focus:ring-2 focus:ring-teal-500/20 shadow-sm"
                />
              </div>

              {onTriggerDelete && (
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-rose-700 block">
                      Manage Profile
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Remove elder from account
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onTriggerDelete();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition active:scale-98"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete Elder</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 2. AGE & GENDER SECTION */}
          {section === "AGE_GENDER" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Age (Years)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={18}
                  max={125}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 74"
                  className="w-full h-12 px-3.5 bg-white rounded-xl border border-slate-300 text-slate-900 font-bold text-base focus:border-primary shadow-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Gender
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["FEMALE", "MALE", "OTHER"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`h-11 rounded-xl font-bold border text-xs transition ${
                        gender === g
                          ? "border-primary bg-primary text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {g === "FEMALE"
                        ? "Female"
                        : g === "MALE"
                          ? "Male"
                          : "Other"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3. LANGUAGE SECTION */}
          {section === "LANGUAGE" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-primary" />
                  <span>Primary Spoken Language</span>
                </label>
                <select
                  value={primaryLanguage}
                  onChange={(e) => setPrimaryLanguage(e.target.value)}
                  className="w-full h-12 px-3 bg-white rounded-xl border border-slate-300 text-slate-900 font-bold text-xs focus:border-primary shadow-sm"
                >
                  {ALL_LANGUAGES.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Additional Languages Spoken
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_LANGUAGES.map((lang) => {
                    const isSelected = languages.includes(lang);
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => {
                          setLanguages((prev) =>
                            prev.includes(lang)
                              ? prev.filter((x) => x !== lang)
                              : [...prev, lang],
                          );
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                          isSelected
                            ? "bg-teal-50 border-primary text-primary font-bold"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {lang}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 4. CARE REQUIREMENTS & MOBILITY */}
          {section === "REQUIREMENTS" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Mobility Level
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {MOBILITY_OPTIONS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMobilityLevel(m.id)}
                      className={`p-3 rounded-xl border text-left transition ${
                        mobilityLevel === m.id
                          ? "border-primary bg-teal-50/70 text-primary font-bold shadow-sm"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Care Support Needed
                </label>
                <div className="space-y-1.5">
                  {COMMON_REQUIREMENTS.map((req) => {
                    const active = careRequirements.includes(req);
                    return (
                      <button
                        key={req}
                        type="button"
                        onClick={() => {
                          setCareRequirements((prev) =>
                            prev.includes(req)
                              ? prev.filter((r) => r !== req)
                              : [...prev, req],
                          );
                        }}
                        className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition ${
                          active
                            ? "border-primary bg-teal-50/50 text-slate-900 font-bold"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span>{req}</span>
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                            active
                              ? "border-primary bg-primary text-white"
                              : "border-slate-300"
                          }`}
                        >
                          {active && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 5. CARE DURATION & FLEXIBLE TIMING */}
          {section === "DURATION" && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>Care Duration</span>
              </label>

              <div className="space-y-2">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setShiftPreference(opt.id)}
                    className={`w-full min-h-[50px] px-3.5 py-2.5 rounded-2xl border-2 text-left transition flex items-center justify-between ${
                      shiftPreference === opt.id
                        ? "border-primary bg-teal-50/70 text-slate-900 font-bold shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          shiftPreference === opt.id
                            ? "border-primary bg-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {shiftPreference === opt.id && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <span className="text-xs font-bold text-slate-800">
                        {opt.label}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {shiftPreference === "FLEXIBLE" && (
                <div className="p-3.5 bg-teal-50/60 rounded-2xl border border-teal-200/70 space-y-2.5 animate-fadeIn mt-2">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>Flexible Timing</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        From:
                      </label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full h-11 px-3 bg-white rounded-xl border border-slate-300 text-slate-900 font-bold text-xs focus:border-primary shadow-sm cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        To:
                      </label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full h-11 px-3 bg-white rounded-xl border border-slate-300 text-slate-900 font-bold text-xs focus:border-primary shadow-sm cursor-pointer"
                      />
                    </div>
                  </div>
                  {startTime && endTime && endTime < startTime && (
                    <div className="text-[10px] text-teal-800 font-medium">
                      🌙 Overnight schedule (concludes following day)
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 6. ADDITIONAL PREFERENCES */}
          {section === "PREFERENCES" && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary" />
                <span>Special Instructions & Preferences</span>
              </label>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={4}
                placeholder="e.g. Vegetarian kitchen, prefers female attendant with gentle communication style, needs daily walking support..."
                className="w-full p-3 bg-white rounded-xl border border-slate-300 text-slate-900 text-xs focus:border-primary shadow-sm"
              />
            </div>
          )}

          {/* 7. DETAILED CARE INFORMATION */}
          {section === "DETAILED_CARE" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-primary" />
                  <span>Medical Observations</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_CONDITIONS.map((cond) => {
                    const active = medicalConditions.includes(cond);
                    return (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => {
                          setMedicalConditions((prev) =>
                            prev.includes(cond)
                              ? prev.filter((c) => c !== cond)
                              : [...prev, cond],
                          );
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                          active
                            ? "bg-teal-50 border-primary text-primary font-bold"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {cond}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Dietary Preferences
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    "Vegetarian",
                    "Diabetic Diet",
                    "Low Sodium",
                    "Non-Vegetarian",
                  ].map((diet) => {
                    const active = dietaryPreferences.includes(diet);
                    return (
                      <button
                        key={diet}
                        type="button"
                        onClick={() => {
                          setDietaryPreferences((prev) =>
                            prev.includes(diet)
                              ? prev.filter((d) => d !== diet)
                              : [...prev, diet],
                          );
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-semibold transition ${
                          active
                            ? "border-primary bg-teal-50/70 text-primary font-bold"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {diet}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Modal Action Buttons */}
          <div className="pt-3 pb-safe flex items-center gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 h-12 bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 rounded-xl font-bold text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 h-12 bg-primary hover:bg-primary-hover active:scale-98 text-white rounded-xl font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
