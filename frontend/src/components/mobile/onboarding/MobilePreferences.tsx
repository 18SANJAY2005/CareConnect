import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Sparkles, Clock, Globe } from 'lucide-react';

export type CareDuration =
  | 'EIGHT_HOUR_DAY'
  | 'TWELVE_HOUR_DAY_NIGHT'
  | 'TWENTY_FOUR_HOUR_LIVE_IN'
  | 'FLEXIBLE';

export interface PreferenceData {
  languages: string[];
  primaryLanguage: string;
  careDuration: CareDuration;
  preferredStartTime?: string;
  preferredEndTime?: string;
  additionalPreferences: string;
}

interface MobilePreferencesProps {
  onProceedToMatches: (preferences: PreferenceData) => void;
  onWantDetailedIntake: (currentPreferences?: PreferenceData) => void;
  onBack: () => void;
  initialPreferences?: {
    languages?: string[];
    primaryLanguage?: string;
    careDuration?: CareDuration;
    shiftDuration?: string;
    preferredStartTime?: string;
    preferredEndTime?: string;
    startTime?: string;
    endTime?: string;
    additionalPreferences?: string;
  };
}

// Alphabetical language options
const ALL_LANGUAGES = [
  'Bengali',
  'English',
  'Gujarati',
  'Hindi',
  'Kannada',
  'Malayalam',
  'Marathi',
  'Tamil',
  'Telugu',
  'Other',
];

export const DURATION_OPTIONS: { id: CareDuration; label: string }[] = [
  { id: 'EIGHT_HOUR_DAY', label: '8 Hours' },
  { id: 'TWELVE_HOUR_DAY_NIGHT', label: '12 Hours' },
  { id: 'TWENTY_FOUR_HOUR_LIVE_IN', label: '24 Hours' },
  { id: 'FLEXIBLE', label: 'Flexible' },
];

export const MobilePreferences: React.FC<MobilePreferencesProps> = ({
  onProceedToMatches,
  onWantDetailedIntake,
  onBack,
  initialPreferences,
}) => {
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(
    initialPreferences?.languages || ['Tamil', 'English']
  );
  const [otherLanguageText, setOtherLanguageText] = useState('');
  const [hasOther, setHasOther] = useState(false);

  // Normalize initial duration
  const resolveInitialDuration = (): CareDuration => {
    if (initialPreferences?.careDuration) return initialPreferences.careDuration;
    if (initialPreferences?.shiftDuration === '8_HOURS' || initialPreferences?.shiftDuration === 'EIGHT_HOUR_DAY') return 'EIGHT_HOUR_DAY';
    if (initialPreferences?.shiftDuration === '24_HOURS' || initialPreferences?.shiftDuration === 'TWENTY_FOUR_HOUR_LIVE_IN') return 'TWENTY_FOUR_HOUR_LIVE_IN';
    if (initialPreferences?.shiftDuration === 'FLEXIBLE') return 'FLEXIBLE';
    return 'TWELVE_HOUR_DAY_NIGHT';
  };

  const [careDuration, setCareDuration] = useState<CareDuration>(resolveInitialDuration());
  const [preferredStartTime, setPreferredStartTime] = useState<string>(
    initialPreferences?.preferredStartTime || initialPreferences?.startTime || '09:00'
  );
  const [preferredEndTime, setPreferredEndTime] = useState<string>(
    initialPreferences?.preferredEndTime || initialPreferences?.endTime || '17:00'
  );
  const [timingError, setTimingError] = useState<string | null>(null);

  const [additionalPreferences, setAdditionalPreferences] = useState(
    initialPreferences?.additionalPreferences || ''
  );

  const toggleLanguage = (lang: string) => {
    if (lang === 'Other') {
      setHasOther(!hasOther);
      return;
    }
    setSelectedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const getCurrentPreferences = (): PreferenceData => {
    const finalLangs = [...selectedLanguages];
    if (hasOther && otherLanguageText.trim()) {
      finalLangs.push(otherLanguageText.trim());
    }
    return {
      languages: finalLangs,
      primaryLanguage: finalLangs[0] || 'English',
      careDuration,
      preferredStartTime: careDuration === 'FLEXIBLE' ? preferredStartTime : undefined,
      preferredEndTime: careDuration === 'FLEXIBLE' ? preferredEndTime : undefined,
      additionalPreferences,
    };
  };

  const handleFinish = () => {
    if (careDuration === 'FLEXIBLE') {
      if (!preferredStartTime || !preferredEndTime) {
        setTimingError('Please select both start and end times for flexible hours.');
        return;
      }
      if (preferredStartTime === preferredEndTime) {
        setTimingError('Start time and end time cannot be identical.');
        return;
      }
    }

    onProceedToMatches(getCurrentPreferences());
  };

  const handleDetailedIntakeClick = () => {
    onWantDetailedIntake(getCurrentPreferences());
  };

  return (
    <div className="flex-1 flex flex-col justify-between px-5 py-6 animate-fadeIn text-slate-900">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full">
            Preferences
          </span>
        </div>

        <h2 className="text-2xl font-extrabold font-heading text-slate-900">
          Caregiver Preferences
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Select language and shift timing preferences for the best fit.
        </p>
      </div>

      {/* Main Content Area */}
      <div className="my-auto py-3 space-y-4 max-h-[58vh] overflow-y-auto pr-1">
        {/* Languages (Alphabetical) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-primary" />
            <span>Languages Spoken (Alphabetical)</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_LANGUAGES.map((lang) => {
              const isSelected =
                lang === 'Other' ? hasOther : selectedLanguages.includes(lang);

              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleLanguage(lang)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition active:scale-95 ${
                    isSelected
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {lang}
                </button>
              );
            })}
          </div>

          {/* When Other is selected, show input */}
          {hasOther && (
            <div className="mt-2 animate-fadeIn">
              <input
                type="text"
                value={otherLanguageText}
                onChange={(e) => setOtherLanguageText(e.target.value)}
                placeholder="Enter language name..."
                className="w-full h-11 px-3.5 bg-white rounded-xl border border-slate-300 text-slate-900 text-xs focus:border-primary shadow-sm"
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Care Duration */}
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-primary" />
            <span>Care Duration</span>
          </label>

          <div className="space-y-2">
            {DURATION_OPTIONS.map((opt) => {
              const isSelected = careDuration === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setCareDuration(opt.id);
                    setTimingError(null);
                  }}
                  className={`w-full min-h-[52px] px-4 py-3 rounded-2xl border-2 text-left transition active:scale-[0.99] flex items-center justify-between ${
                    isSelected
                      ? 'border-primary bg-teal-50/70 shadow-sm ring-1 ring-primary/30'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                        isSelected ? 'border-primary bg-white' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && (
                        <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                      )}
                    </div>
                    <span className="text-sm font-bold text-slate-800">{opt.label}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Flexible Timing Controls */}
          {careDuration === 'FLEXIBLE' && (
            <div className="mt-3 p-4 bg-teal-50/70 rounded-2xl border border-teal-200/80 space-y-3 animate-fadeIn">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-primary" />
                <span>Flexible Timing</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="preferred-start-time" className="block text-xs font-bold text-slate-700 mb-1">
                    From:
                  </label>
                  <input
                    id="preferred-start-time"
                    type="time"
                    value={preferredStartTime}
                    onChange={(e) => {
                      setPreferredStartTime(e.target.value);
                      setTimingError(null);
                    }}
                    className="w-full h-12 px-3 bg-white rounded-xl border border-slate-300 text-slate-900 font-bold text-sm focus:border-primary focus:ring-2 focus:ring-teal-500/20 shadow-sm cursor-pointer"
                  />
                </div>
                <div>
                  <label htmlFor="preferred-end-time" className="block text-xs font-bold text-slate-700 mb-1">
                    To:
                  </label>
                  <input
                    id="preferred-end-time"
                    type="time"
                    value={preferredEndTime}
                    onChange={(e) => {
                      setPreferredEndTime(e.target.value);
                      setTimingError(null);
                    }}
                    className="w-full h-12 px-3 bg-white rounded-xl border border-slate-300 text-slate-900 font-bold text-sm focus:border-primary focus:ring-2 focus:ring-teal-500/20 shadow-sm cursor-pointer"
                  />
                </div>
              </div>

              {preferredStartTime && preferredEndTime && preferredEndTime < preferredStartTime && (
                <div className="text-[11px] text-teal-800 font-medium flex items-center gap-1 bg-teal-100/60 px-2.5 py-1.5 rounded-lg">
                  <span>🌙 Overnight shift (ends following day)</span>
                </div>
              )}

              {timingError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {timingError}
                </div>
              )}
            </div>
          )}

          <div className="mt-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500 leading-relaxed">
            💡 We match your duration & timing preferences with available caregivers in your area.
          </div>
        </div>

        {/* Additional Preferences */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Additional Preferences <span className="font-normal text-slate-400">(Optional)</span>
          </label>
          <textarea
            value={additionalPreferences}
            onChange={(e) => setAdditionalPreferences(e.target.value)}
            rows={2}
            placeholder="e.g. Attendant who is patient with gentle walking, calm temperament, vegetarian kitchen..."
            className="w-full p-3 bg-white rounded-2xl border border-slate-300 text-slate-900 text-xs focus:border-primary shadow-sm"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="pt-3 space-y-2.5">
        <button
          onClick={handleFinish}
          className="w-full min-h-[56px] bg-primary hover:bg-primary-hover active:scale-98 text-white rounded-2xl font-bold text-base shadow-md flex items-center justify-center gap-2 transition"
        >
          <Sparkles className="w-5 h-5 text-amber-300" />
          <span>Find Suitable Care</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={handleDetailedIntakeClick}
          className="w-full py-2 text-xs font-semibold text-primary hover:underline text-center"
        >
          + Add more medical details for an even closer match
        </button>
      </div>
    </div>
  );
};
