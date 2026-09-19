import React from 'react';
import { Users, Video, CreditCard, FileCheck, CheckCircle2 } from 'lucide-react';
import type { PhaseBStep } from '../../types';

interface StepIndicatorProps {
  currentStep: PhaseBStep;
  onSelectStep?: (step: PhaseBStep) => void;
}

interface StepItem {
  id: PhaseBStep;
  label: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  stepNumber: number;
}

const steps: StepItem[] = [
  { id: 'matching', label: 'Curated Matches', sub: 'B01 Matching', icon: Users, stepNumber: 1 },
  { id: 'call', label: '10-Min Intro Call', sub: 'B02 Video/Audio', icon: Video, stepNumber: 2 },
  { id: 'payment', label: 'Advance Deposit', sub: 'B03 Razorpay Hold', icon: CreditCard, stepNumber: 3 },
  { id: 'sla', label: 'SLA Sign-off', sub: 'B04 Privacy Terms', icon: FileCheck, stepNumber: 4 },
];

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  const getStepIndex = (step: PhaseBStep) => {
    switch (step) {
      case 'matching': return 0;
      case 'call': return 1;
      case 'payment': return 2;
      case 'sla': return 3;
      case 'confirmation': return 4;
      default: return 0;
    }
  };

  const currentIndex = getStepIndex(currentStep);

  return (
    <div className="bg-surface-card rounded-2xl shadow-card border border-outline-light/40 p-4 sm:p-6 mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, idx) => {
          const isCompleted = currentIndex > idx;
          const isActive = currentIndex === idx;
          const Icon = step.icon;

          return (
            <React.Fragment key={step.id}>
              {/* Step Icon + Label */}
              <div className="flex flex-col items-center text-center flex-1">
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCompleted
                      ? 'bg-tertiary text-white shadow-sm'
                      : isActive
                      ? 'bg-primary text-white ring-4 ring-primary/20 shadow-md scale-105'
                      : 'bg-surface-container text-on-surface-variant'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7" />
                  ) : (
                    <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                  )}
                </div>
                <div className="mt-2.5">
                  <p
                    className={`text-xs sm:text-sm font-heading font-bold ${
                      isActive ? 'text-primary' : isCompleted ? 'text-tertiary' : 'text-on-surface-variant'
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-[11px] text-on-surface-variant/75 hidden md:block">
                    {step.sub}
                  </p>
                </div>
              </div>

              {/* Connecting Line */}
              {idx < steps.length - 1 && (
                <div
                  className={`hidden sm:block flex-1 h-1 mx-2 rounded-full transition-colors duration-300 ${
                    currentIndex > idx ? 'bg-tertiary' : 'bg-surface-container'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
