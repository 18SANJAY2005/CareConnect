import React from 'react';
import { X, ShieldCheck, Star, MapPin, Award, CheckCircle2, HeartHandshake } from 'lucide-react';
import type { CaregiverMatchItem } from '../../types';

interface CaregiverDetailModalProps {
  matchItem: CaregiverMatchItem;
  isOpen: boolean;
  onClose: () => void;
  onSelect: () => void;
}

export const CaregiverDetailModal: React.FC<CaregiverDetailModalProps> = ({
  matchItem,
  isOpen,
  onClose,
  onSelect,
}) => {
  if (!isOpen) return null;

  const { caregiver, match_percentage, rationale } = matchItem;

  const skills = caregiver.skills
    ? caregiver.skills
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-surface-card rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-outline-light/60 flex flex-col">
        <div className="sticky top-0 z-10 bg-surface-card px-6 py-4 border-b border-outline-light/40 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary text-white">
              {match_percentage}% Match
            </span>
            <span className="text-xs font-semibold text-tertiary bg-tertiary-light px-2.5 py-0.5 rounded-full flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Fully Vetted Profile
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1">
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-5">
            <img
              src={caregiver.photo_url}
              alt={caregiver.full_name}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover shadow-md border-2 border-primary/20"
            />

            <div className="text-center sm:text-left flex-1">
              <h2 className="text-2xl font-extrabold font-heading text-on-surface">
                {caregiver.full_name}
              </h2>

              <p className="text-sm font-semibold text-secondary mt-0.5">
                {caregiver.headline}
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2 text-xs text-on-surface-variant">
                <span className="flex items-center">
                  <MapPin className="w-4 h-4 text-primary mr-1" />
                  {caregiver.locality}, Chennai (within {caregiver.service_radius_km}km)
                </span>

                <span className="flex items-center">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500 mr-1" />
                  <strong>{caregiver.rating.toFixed(2)}</strong> ({caregiver.review_count ?? 0} verified reviews)
                </span>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-xl p-4 border border-outline-light/50">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">
              CareConnect Trust & Verification Dossier
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-surface-card border border-outline-light/30">
                <ShieldCheck className="w-5 h-5 text-tertiary mb-1.5" />
                <p className="text-xs font-bold text-on-surface">Police Verification</p>
                <p className="text-[11px] text-on-surface-variant">Cleared by Chennai City Police</p>
              </div>

              <div className="p-3 rounded-lg bg-surface-card border border-outline-light/30">
                <Award className="w-5 h-5 text-primary mb-1.5" />
                <p className="text-xs font-bold text-on-surface">Clinical Credential</p>
                <p className="text-[11px] text-on-surface-variant">Geriatric Care Certified</p>
              </div>

              <div className="p-3 rounded-lg bg-surface-card border border-outline-light/30">
                <CheckCircle2 className="w-5 h-5 text-secondary mb-1.5" />
                <p className="text-xs font-bold text-on-surface">Identity & Address</p>
                <p className="text-[11px] text-on-surface-variant">Verified & Reference Checked</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold font-heading text-on-surface mb-2">
              About & Professional Experience
            </h4>

            <p className="text-sm text-on-surface-variant leading-relaxed bg-surface/60 p-4 rounded-xl border border-outline-light/30">
              {caregiver.bio || 'Professional elder-care attendant with verified caregiving experience.'}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-bold font-heading text-on-surface mb-2">
              Core Caregiving Proficiencies
            </h4>

            <div className="flex flex-wrap gap-2">
              {skills.length > 0 ? (
                skills.map((skill, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface text-xs font-medium"
                  >
                    ✓ {skill}
                  </span>
                ))
              ) : (
                <span className="text-xs text-on-surface-variant">
                  Verified caregiving proficiencies available on request.
                </span>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-1">
              Why this caregiver fits your elder's persona:
            </h4>
            <p className="text-xs text-on-surface-variant">{rationale}</p>
          </div>
        </div>

        <div className="sticky bottom-0 bg-surface-card p-4 sm:p-6 border-t border-outline-light/40 flex items-center justify-between space-x-4">
          <div>
            <span className="text-xs text-on-surface-variant block">Deposit Shift Rate</span>

            <span className="text-xl font-extrabold text-primary font-heading">
              ₹{caregiver.daily_rate ?? 0}
              <span className="text-xs font-normal text-on-surface-variant">
                {' '}
                / 10-Hr Day
              </span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              onSelect();
              onClose();
            }}
            className="touch-target-primary px-8 rounded-xl bg-primary hover:bg-primary-container text-white font-heading font-bold text-sm sm:text-base shadow-md transition-transform active:scale-[0.98] flex items-center"
          >
            <HeartHandshake className="w-5 h-5 mr-2" />
            <span>Select for 10-Min Intro Call</span>
          </button>
        </div>
      </div>
    </div>
  );
};