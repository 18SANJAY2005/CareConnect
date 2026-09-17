import React, { useState } from 'react';
import { Filter, UserCheck, Sparkles, MapPin, Activity, ArrowRight } from 'lucide-react';
import type { CaregiverMatchItem, CuratedMatchesResponse } from '../../types';
import { CaregiverCard } from './CaregiverCard';
import { CaregiverDetailModal } from './CaregiverDetailModal';

interface CaregiverDiscoveryProps {
  matchesData: CuratedMatchesResponse;
  selectedMatch: CaregiverMatchItem | null;
  onSelectMatch: (match: CaregiverMatchItem) => void;
  onProceedToCall: () => void;
}

export const CaregiverDiscovery: React.FC<CaregiverDiscoveryProps> = ({
  matchesData,
  selectedMatch,
  onSelectMatch,
  onProceedToCall,
}) => {
  const [activeLocality, setActiveLocality] = useState<string>('all');
  const [activeLanguage, setActiveLanguage] = useState<string>('all');
  const [activeModalItem, setActiveModalItem] = useState<CaregiverMatchItem | null>(null);

  const localities = ['all', 'Adyar', 'Mylapore', 'Besant Nagar', 'Anna Nagar'];
  const languages = ['all', 'Tamil', 'English', 'Telugu'];

  const getLanguages = (value: string | string[]): string[] => {
    if (Array.isArray(value)) {
      return value;
    }

    return value
      .split(',')
      .map((language) => language.trim())
      .filter(Boolean);
  };

  const filteredMatches = matchesData.matches.filter((item) => {
    const locMatch =
      activeLocality === 'all' ||
      item.caregiver.locality.toLowerCase().includes(activeLocality.toLowerCase());

    const caregiverLanguages = getLanguages(item.caregiver.languages);

    const langMatch =
      activeLanguage === 'all' ||
      caregiverLanguages.some(
        (language) =>
          language.toLowerCase().includes(activeLanguage.toLowerCase()),
      );

    return locMatch && langMatch;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="bg-gradient-to-r from-primary to-primary-container text-white rounded-2xl p-6 sm:p-8 shadow-elevated">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold tracking-wide uppercase mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Phase A Persona Synchronized</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold font-heading">
              Curated Matches for {matchesData.elder_name}
            </h2>

            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-white/90">
              <span className="flex items-center bg-white/10 px-2.5 py-1 rounded-lg">
                <MapPin className="w-4 h-4 mr-1 text-white/80" />
                {matchesData.elder_locality}, Chennai
              </span>

              <span className="flex items-center bg-white/10 px-2.5 py-1 rounded-lg">
                <Activity className="w-4 h-4 mr-1 text-white/80" />
                {matchesData.required_care_tier}
              </span>

              <span className="bg-white/10 px-2.5 py-1 rounded-lg">
                Age 78 • Assisted Walking • Mild Memory Care
              </span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 text-center min-w-[150px]">
            <span className="text-xs font-semibold uppercase text-white/80 block">
              Vetted Pool
            </span>

            <span className="text-2xl font-extrabold font-heading text-white">
              {filteredMatches.length} Candidates
            </span>

            <span className="text-[11px] text-white/70 block">
              Ranked by Persona Fit
            </span>
          </div>
        </div>
      </div>

      <div className="bg-surface-card p-4 rounded-xl border border-outline-light/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-2 text-xs font-bold text-on-surface uppercase tracking-wide">
          <Filter className="w-4 h-4 text-primary" />
          <span>Filters:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs text-on-surface-variant font-medium mr-1">
              Locality:
            </span>

            {localities.map((loc) => (
              <button
                key={loc}
                onClick={() => setActiveLocality(loc)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  activeLocality === loc
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-highest'
                }`}
              >
                {loc === 'all' ? 'All Chennai' : loc}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-on-surface-variant font-medium mr-1">
              Language:
            </span>

            {languages.map((lang) => (
              <button
                key={lang}
                onClick={() => setActiveLanguage(lang)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  activeLanguage === lang
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-highest'
                }`}
              >
                {lang === 'all' ? 'Any' : lang}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMatches.map((item) => (
          <CaregiverCard
            key={item.caregiver.id}
            matchItem={item}
            isSelected={selectedMatch?.caregiver.id === item.caregiver.id}
            onSelect={() => onSelectMatch(item)}
            onViewDetails={() => setActiveModalItem(item)}
          />
        ))}
      </div>

      {filteredMatches.length === 0 && (
        <div className="p-12 text-center bg-surface-card rounded-2xl border border-dashed border-outline-light">
          <UserCheck className="w-12 h-12 text-on-surface-variant mx-auto mb-3" />

          <h3 className="text-lg font-bold text-on-surface">
            No matching caregivers found
          </h3>

          <p className="text-sm text-on-surface-variant mt-1">
            Try adjusting your locality or language filters to view more candidates.
          </p>

          <button
            onClick={() => {
              setActiveLocality('all');
              setActiveLanguage('all');
            }}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold"
          >
            Reset All Filters
          </button>
        </div>
      )}

      {selectedMatch && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-outline-light/60 p-4 shadow-elevated">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <img
                src={selectedMatch.caregiver.photo_url}
                alt={selectedMatch.caregiver.full_name}
                className="w-12 h-12 rounded-xl object-cover border border-primary"
              />

              <div>
                <p className="text-xs text-on-surface-variant font-medium">
                  Selected for Care Trial:
                </p>

                <h4 className="text-base font-bold font-heading text-on-surface">
                  {selectedMatch.caregiver.full_name} ({selectedMatch.match_percentage}% Match)
                </h4>
              </div>
            </div>

            <button
              onClick={onProceedToCall}
              className="touch-target-primary w-full sm:w-auto px-8 rounded-xl bg-primary hover:bg-primary-container text-white font-heading font-bold text-base shadow-lg transition-transform active:scale-[0.98] flex items-center justify-center"
            >
              <span>Proceed to Step 2: 10-Min Intro Call</span>
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      )}

      {activeModalItem && (
        <CaregiverDetailModal
          matchItem={activeModalItem}
          isOpen={!!activeModalItem}
          onClose={() => setActiveModalItem(null)}
          onSelect={() => onSelectMatch(activeModalItem)}
        />
      )}
    </div>
  );
};