import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({
  onClick,
  label = 'Back',
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`inline-flex items-center gap-1.5 min-h-[44px] min-w-[44px] px-2.5 py-1.5 -ml-2 text-slate-600 hover:text-slate-900 active:text-primary rounded-xl hover:bg-slate-100/80 active:bg-slate-200/60 transition-colors font-bold text-xs cursor-pointer touch-action-manipulation shrink-0 ${className}`}
    >
      <ArrowLeft className="w-4 h-4 text-slate-700 shrink-0" />
      <span className="font-semibold text-xs">{label}</span>
    </button>
  );
};
