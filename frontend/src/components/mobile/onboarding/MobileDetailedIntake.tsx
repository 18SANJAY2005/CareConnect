import React, { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Check,
  HeartPulse,
  Stethoscope,
  Sun,
  Utensils,
} from "lucide-react";

interface MobileDetailedIntakeProps {
  onComplete: (data: {
    medicalConditions: string[];
    medicalDevices: string[];
    dietaryPreferences: string[];
    wakeTime: string;
    bedTime: string;
  }) => void;
  onSkip: () => void;
  onBack: () => void;
}

const CONDITIONS = [
  "Hypertension (BP)",
  "Type 2 Diabetes",
  "Mild Dementia / Memory Support",
  "Arthritis / Joint Pain",
  "Post-Surgery Recovery",
  "Cardiac History",
  "Parkinson’s Support",
  "None / General Age Care",
];

const DEVICES = [
  "Wheelchair",
  "Walker / Zimmer Frame",
  "Walking Stick",
  "BP Monitor",
  "Glucometer",
  "None",
];

const DIET_OPTIONS = [
  "Vegetarian",
  "Non-Vegetarian",
  "Diabetic / Low-Sodium",
  "Soft / Pureed Food",
];

export const MobileDetailedIntake: React.FC<MobileDetailedIntakeProps> = ({
  onComplete,
  onSkip,
  onBack,
}) => {
  const [selectedConditions, setSelectedConditions] = useState<string[]>([
    "Hypertension (BP)",
  ]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([
    "BP Monitor",
  ]);
  const [selectedDiets, setSelectedDiets] = useState<string[]>(["Vegetarian"]);
  const [wakeTime, setWakeTime] = useState("06:30 AM");
  const [bedTime, setBedTime] = useState("09:30 PM");

  const toggleItem = (
    list: string[],
    setList: (items: string[]) => void,
    item: string,
  ) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleFinish = () => {
    onComplete({
      medicalConditions: selectedConditions,
      medicalDevices: selectedDevices,
      dietaryPreferences: selectedDiets,
      wakeTime,
      bedTime,
    });
  };

  return (
    <div className="flex-1 flex flex-col justify-between px-5 py-6 animate-fadeIn text-slate-900">
      {/* Header with Skip */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={onSkip}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 px-3 py-1.5 rounded-full transition"
          >
            Skip to Matches →
          </button>
        </div>

        {/* Friendly Benefit Banner */}
        <div className="p-3.5 bg-teal-50/70 border border-teal-200/60 rounded-2xl mb-4 flex items-start gap-2.5">
          <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-primary">
              Want a more tailored care match?
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
              Adding a few optional details helps our clinical team match the
              attendant best suited to your routine.
            </div>
          </div>
        </div>

        <h2 className="text-xl font-extrabold font-heading text-slate-900">
          Health & Daily Routine
        </h2>
      </div>

      {/* Scrollable Form Cards */}
      <div className="my-auto py-2 space-y-4 max-h-[56vh] overflow-y-auto pr-1">
        {/* Medical Conditions */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <HeartPulse className="w-3.5 h-3.5 text-primary" />
            <span>Known Conditions (Optional)</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {CONDITIONS.map((cond) => {
              const isSelected = selectedConditions.includes(cond);
              return (
                <button
                  key={cond}
                  type="button"
                  onClick={() =>
                    toggleItem(selectedConditions, setSelectedConditions, cond)
                  }
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition active:scale-95 flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  <span>{cond}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Assistive Devices */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Stethoscope className="w-3.5 h-3.5 text-primary" />
            <span>Assistive Devices Used</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {DEVICES.map((dev) => {
              const isSelected = selectedDevices.includes(dev);
              return (
                <button
                  key={dev}
                  type="button"
                  onClick={() =>
                    toggleItem(selectedDevices, setSelectedDevices, dev)
                  }
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition active:scale-95 flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  <span>{dev}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Daily Routine */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 text-primary" />
            <span>Typical Daily Routine</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[11px] text-slate-500 block mb-1">
                Wake up around
              </span>
              <input
                type="text"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
                placeholder="e.g. 06:30 AM"
                className="w-full h-11 px-3 bg-white rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:border-primary shadow-sm"
              />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block mb-1">
                Bed time around
              </span>
              <input
                type="text"
                value={bedTime}
                onChange={(e) => setBedTime(e.target.value)}
                placeholder="e.g. 09:30 PM"
                className="w-full h-11 px-3 bg-white rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:border-primary shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Dietary Preferences */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Utensils className="w-3.5 h-3.5 text-primary" />
            <span>Dietary Preference</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {DIET_OPTIONS.map((diet) => {
              const isSelected = selectedDiets.includes(diet);
              return (
                <button
                  key={diet}
                  type="button"
                  onClick={() =>
                    toggleItem(selectedDiets, setSelectedDiets, diet)
                  }
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition active:scale-95 flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  <span>{diet}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="pt-3 space-y-2">
        <button
          onClick={handleFinish}
          className="w-full min-h-[56px] bg-primary hover:bg-primary-hover active:scale-98 text-white rounded-2xl font-bold text-base shadow-md flex items-center justify-center gap-2 transition"
        >
          <span>Save & Match Care</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={onSkip}
          className="w-full py-1 text-xs font-semibold text-slate-400 hover:text-slate-600 text-center"
        >
          Skip this step
        </button>
      </div>
    </div>
  );
};
