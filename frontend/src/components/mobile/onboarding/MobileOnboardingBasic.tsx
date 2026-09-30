import React, { useState } from "react";
import { ArrowLeft, ArrowRight, AlertCircle, Calendar } from "lucide-react";

interface MobileOnboardingBasicProps {
  recipient: "ME" | "SOMEONE_ELSE";
  onNext: (data: {
    name: string;
    age: number;
    gender: "FEMALE" | "MALE" | "OTHER";
    dob?: string;
    phone?: string;
  }) => void;
  onBack: () => void;
  initialData?: {
    name?: string;
    age?: number;
    gender?: "FEMALE" | "MALE" | "OTHER";
    dob?: string;
    phone?: string;
  };
}

export const MobileOnboardingBasic: React.FC<MobileOnboardingBasicProps> = ({
  recipient,
  onNext,
  onBack,
  initialData,
}) => {
  const isSelf = recipient === "ME";

  const [name, setName] = useState(initialData?.name || "");
  const [ageStr, setAgeStr] = useState(
    initialData?.age ? String(initialData.age) : "",
  );
  const [gender, setGender] = useState<"FEMALE" | "MALE" | "OTHER" | null>(
    initialData?.gender || null,
  );
  const [showDob, setShowDob] = useState(Boolean(initialData?.dob));
  const [dob, setDob] = useState(initialData?.dob || "");
  const [phone, setPhone] = useState(initialData?.phone || "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      setErrorMessage(
        isSelf ? "Please enter your name." : "Please enter the elder's name.",
      );
      return;
    }

    const ageNum = parseInt(ageStr, 10);
    if (isNaN(ageNum) || ageNum < 18 || ageNum > 120) {
      setErrorMessage("Please enter a valid age between 18 and 120.");
      return;
    }

    if (!gender) {
      setErrorMessage("Please select a gender.");
      return;
    }

    setErrorMessage(null);
    onNext({
      name: name.trim(),
      age: ageNum,
      gender,
      dob: dob || undefined,
      phone: !isSelf ? phone.trim() : undefined,
    });
  };

  return (
    <div className="flex-1 flex flex-col justify-between px-5 py-6 animate-fadeIn text-slate-900">
      {/* Step Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full">
            Step 2 of 4
          </span>
        </div>

        <h2 className="text-2xl font-extrabold font-heading text-slate-900">
          {isSelf ? "Tell us about yourself" : "Who will be receiving care?"}
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {isSelf
            ? "We will use your name and age to organize your care plan."
            : "Enter basic details to personalize the caregiver match."}
        </p>
      </div>

      {/* Inputs Form */}
      <form onSubmit={handleSubmit} className="my-auto py-4 space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            {isSelf ? "Full Name" : "Elder's Full Name"}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isSelf ? "e.g. S. Ramanathan" : "e.g. Meenakshi Ammal"}
            className="w-full h-14 px-4 bg-white rounded-2xl border border-slate-300 text-slate-900 font-bold text-base focus:border-primary focus:ring-2 focus:ring-teal-500/20 shadow-sm"
            required
            autoFocus
          />
        </div>

        {/* Elder's Phone Number (Only if SOMEONE_ELSE) */}
        {!isSelf && (
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Elder's Phone Number{" "}
              <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="w-full h-14 px-4 bg-white rounded-2xl border border-slate-300 text-slate-900 font-bold text-base focus:border-primary focus:ring-2 focus:ring-teal-500/20 shadow-sm"
            />
          </div>
        )}

        {/* Age (Numeric Keypad on Mobile) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Age <span className="text-slate-400 font-normal">(Years)</span>
          </label>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            min={18}
            max={120}
            value={ageStr}
            onChange={(e) => setAgeStr(e.target.value)}
            placeholder="e.g. 74"
            className="w-full h-14 px-4 bg-white rounded-2xl border border-slate-300 text-slate-900 font-bold text-lg focus:border-primary focus:ring-2 focus:ring-teal-500/20 shadow-sm"
            required
          />
        </div>

        {/* Gender Selection */}
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
                className={`py-3 rounded-2xl text-xs font-bold border transition ${
                  gender === g
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                {g === "FEMALE" ? "Female" : g === "MALE" ? "Male" : "Other"}
              </button>
            ))}
          </div>
        </div>

        {/* Optional DOB Toggle */}
        <div className="pt-1">
          {!showDob ? (
            <button
              type="button"
              onClick={() => setShowDob(true)}
              className="text-xs font-semibold text-primary flex items-center gap-1.5 hover:underline"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Add exact date of birth (optional)</span>
            </button>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Date of Birth{" "}
                <span className="font-normal text-slate-400">(Optional)</span>
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full h-12 px-4 bg-white rounded-2xl border border-slate-300 text-slate-800 text-sm focus:border-primary shadow-sm"
              />
            </div>
          )}
        </div>
      </form>

      {/* Primary Continue Button */}
      <div className="pt-4">
        <button
          onClick={() => handleSubmit()}
          disabled={!name.trim() || !ageStr.trim()}
          className="w-full min-h-[56px] bg-primary hover:bg-primary-hover disabled:opacity-50 active:scale-98 text-white rounded-2xl font-bold text-base shadow-md flex items-center justify-center gap-2 transition"
        >
          <span>Check Serviceability</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
