import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Sparkles, Clock, Globe } from 'lucide-react';

interface MobilePreferencesProps {
  onProceedToMatches: (preferences: {
    languages: string[];
    primaryLanguage: string;
    shiftDuration: string;
    startTime: string;
    additionalPreferences: string;
  }) => void;
  onWantDetailedIntake: () => void;
  onBack: () => void;
  initialPreferences?: {
    languages?: string[];
    primaryLanguage?: string;
    shiftDuration?: string;
    startTime?: string;
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

  const [shiftDuration, setShiftDuration] = useState(
    initialPreferences?.shiftDuration || '12_HOURS_DAY'
  );
  const [startTime] = useState(
    initialPreferences?.startTime || '08:00 AM'
  );
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

  const handleFinish = () => {
    const finalLangs = [...selectedLanguages];
    if (hasOther && otherLanguageText.trim()) {
      finalLangs.push(otherLanguageText.trim());
    }

    onProceedToMatches({
      languages: finalLangs,
      primaryLanguage: finalLangs[0] || 'English',
      shiftDuration,
      startTime,
      additionalPreferences,
    });
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

        {/* Care Timing */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>Care Duration & Timing</span>
          </label>

          <div className="grid grid-cols-2 gap-2">
            {[
              { id: '12_HOURS_DAY', label: '12-Hr Day Care', time: '8 AM – 8 PM' },
              { id: '12_HOURS_NIGHT', label: '12-Hr Night Care', time: '8 PM – 8 AM' },
              { id: '24_HOURS_LIVE_IN', label: '24-Hr Live-in', time: 'Continuous' },
              { id: 'FLEXIBLE_HOURS', label: 'Flexible Support', time: 'Custom hours' },
            ].map((timing) => (
              <button
                key={timing.id}
                type="button"
                onClick={() => setShiftDuration(timing.id)}
                className={`p-3 rounded-2xl border text-left transition ${
                  shiftDuration === timing.id
                    ? 'border-primary bg-teal-50/60 shadow-sm'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-bold text-slate-800">{timing.label}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{timing.time}</div>
              </button>
            ))}
          </div>

          <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500 leading-relaxed">
            💡 We will do our best to match your timing preferences with available care corridors.
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
          onClick={onWantDetailedIntake}
          className="w-full py-2 text-xs font-semibold text-primary hover:underline text-center"
        >
          + Add more medical details for an even closer match
        </button>
      </div>
    </div>
  );
};
