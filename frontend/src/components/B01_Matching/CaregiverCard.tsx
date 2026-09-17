import React from 'react';
import { ShieldCheck, Star, MapPin, Languages, Check, ArrowRight, Award } from 'lucide-react';
import type { CaregiverMatchItem } from '../../types';

interface CaregiverCardProps {
  matchItem: CaregiverMatchItem;
  isSelected: boolean;
  onSelect: () => void;
  onViewDetails: () => void;
}

export const CaregiverCard: React.FC<CaregiverCardProps> = ({
  matchItem,
  isSelected,
  onSelect,
  onViewDetails,
}) => {
  const { caregiver, match_percentage, rationale, matching_skills } = matchItem;

  return (
    <div
      className={`bg-surface-card rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-card ${
        isSelected
          ? 'border-primary ring-2 ring-primary shadow-elevated'
          : 'border-outline-light/50 hover:border-primary/50 hover:shadow-elevated'
      }`}
    >
      {/* Top Banner: Match Score + Verified Pill */}
      <div className="bg-surface-container/60 px-5 py-3 border-b border-outline-light/30 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-primary text-white shadow-sm">
            {match_percentage}% Persona Match
          </span>
          {matchItem.locality_match && (
            <span className="inline-flex items-center text-xs font-semibold text-secondary px-2 py-0.5 rounded-full bg-secondary-light">
              <MapPin className="w-3 h-3 mr-1" />
              Local in {caregiver.locality}
            </span>
          )}
        </div>
        <div className="flex items-center text-xs text-on-surface-variant">
          <Star className="w-4 h-4 text-amber-500 fill-amber-500 mr-1" />
          <strong className="font-bold text-on-surface">{caregiver.rating.toFixed(2)}</strong>
          <span className="ml-1">({caregiver.review_count} reviews)</span>
        </div>
      </div>

      {/* Main Profile Info */}
      <div className="p-5 sm:p-6 flex-1 flex flex-col">
        <div className="flex items-start space-x-4 mb-4">
          <img
            src={caregiver.photo_url || 'https://images.unsplash.com/photo-1594824813629-65313364f9f7?w=300&auto=format&fit=crop&q=80'}
            alt={caregiver.full_name}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border border-outline-light/60 shadow-sm"
          />
          <div className="flex-1">
            <h3 className="text-lg sm:text-xl font-bold font-heading text-on-surface">
              {caregiver.full_name}
            </h3>
            <p className="text-xs sm:text-sm text-secondary font-medium mt-0.5">
              {caregiver.headline}
            </p>
            <div className="flex flex-wrap gap-y-1 gap-x-3 mt-2 text-xs text-on-surface-variant">
              <span className="flex items-center">
                <Award className="w-3.5 h-3.5 text-primary mr-1" />
                {caregiver.experience_years} Years Experience
              </span>
              <span className="flex items-center">
                <Languages className="w-3.5 h-3.5 text-primary mr-1" />
                {caregiver.languages}
              </span>
            </div>
          </div>
        </div>

        {/* Verification Badges (Privacy-Safe - No confidential document numbers exposed) */}
        <div className="flex flex-wrap gap-1.5 py-2.5 my-2 border-y border-outline-light/30">
          <span className="inline-flex items-center text-[11px] font-semibold text-tertiary px-2 py-0.5 rounded-full bg-tertiary-light">
            <ShieldCheck className="w-3 h-3 mr-1" /> Police Verified
          </span>
          <span className="inline-flex items-center text-[11px] font-semibold text-primary px-2 py-0.5 rounded-full bg-primary/10">
            <ShieldCheck className="w-3 h-3 mr-1" /> Clinical Certified
          </span>
          <span className="inline-flex items-center text-[11px] font-semibold text-secondary px-2 py-0.5 rounded-full bg-secondary-light">
            <ShieldCheck className="w-3 h-3 mr-1" /> ID & Address Checked
          </span>
        </div>

        {/* Persona Matching Rationale */}
        <div className="mt-2 text-xs text-on-surface-variant bg-surface rounded-lg p-3 border border-outline-light/40">
          <strong className="text-primary font-semibold block mb-1">Matching Rationale:</strong>
          <p className="line-clamp-2">{rationale}</p>
        </div>

        {/* Matching Skills Tags */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {matching_skills.slice(0, 3).map((skill, i) => (
            <span
              key={i}
              className="text-[11px] px-2.5 py-1 rounded-md bg-surface-container text-on-surface font-medium"
            >
              ✓ {skill}
            </span>
          ))}
        </div>

        {/* Pricing & Transparency */}
        <div className="mt-auto pt-4 flex items-center justify-between border-t border-outline-light/20">
          <div>
            <span className="text-xs text-on-surface-variant block">Standard Shift Rate</span>
            <div className="flex items-baseline">
              <span className="text-xl font-extrabold text-primary font-heading">
                ₹{caregiver.daily_rate}
              </span>
              <span className="text-xs text-on-surface-variant ml-1">/ 10-Hr Day</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onViewDetails}
            className="text-xs font-semibold text-secondary hover:underline py-1"
          >
            View Full Bio & Certs →
          </button>
        </div>
      </div>

      {/* Action Footer: 56px Touch Target Button */}
      <div className="p-4 bg-surface-container/30 border-t border-outline-light/30">
        <button
          type="button"
          onClick={onSelect}
          className={`w-full touch-target-primary rounded-xl font-heading font-bold text-sm sm:text-base transition-all duration-200 active:scale-[0.98] ${
            isSelected
              ? 'bg-tertiary text-white shadow-md'
              : 'bg-primary text-white hover:bg-primary-container shadow-sm'
          }`}
        >
          {isSelected ? (
            <>
              <Check className="w-5 h-5 mr-2" />
              Selected for Care Trial
            </>
          ) : (
            <>
              <span>Select for 10-Min Intro Call</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
