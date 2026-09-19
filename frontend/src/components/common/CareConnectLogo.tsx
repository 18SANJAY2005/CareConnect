import React from 'react';
import { HeartPulse } from 'lucide-react';

interface CareConnectLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  subtitle?: string;
  variant?: 'default' | 'inverted';
  className?: string;
}

export const CareConnectLogo: React.FC<CareConnectLogoProps> = ({
  size = 'md',
  showWordmark = false,
  subtitle,
  variant = 'default',
  className = '',
}) => {
  const sizeMap = {
    sm: {
      container: 'w-8 h-8 rounded-lg',
      icon: 'w-4 h-4',
      title: 'text-base',
      sub: 'text-[10px]',
    },
    md: {
      container: 'w-10 h-10 rounded-xl',
      icon: 'w-6 h-6',
      title: 'text-lg',
      sub: 'text-[11px]',
    },
    lg: {
      container: 'w-12 h-12 rounded-2xl',
      icon: 'w-7 h-7',
      title: 'text-xl',
      sub: 'text-xs',
    },
    xl: {
      container: 'w-16 h-16 rounded-3xl',
      icon: 'w-9 h-9',
      title: 'text-2xl',
      sub: 'text-sm',
    },
  };

  const { container, icon, title, sub } = sizeMap[size];

  const titleColor = variant === 'inverted' ? 'text-white' : 'text-slate-900';
  const subColor = variant === 'inverted' ? 'text-teal-200/80' : 'text-slate-500';

  return (
    <div className={`inline-flex items-center gap-3 shrink-0 select-none ${className}`}>
      <div
        className={`${container} bg-gradient-to-tr from-teal-700 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-teal-500/20 shrink-0`}
      >
        <HeartPulse className={`${icon} stroke-[2.2]`} />
      </div>

      {showWordmark && (
        <div className="flex flex-col text-left">
          <span className={`font-bold ${title} ${titleColor} tracking-tight leading-snug`}>
            CareConnect
          </span>
          {subtitle !== undefined ? (
            subtitle ? (
              <p className={`${sub} ${subColor} leading-none mt-0.5`}>{subtitle}</p>
            ) : null
          ) : (
            <p className={`${sub} ${subColor} leading-none mt-0.5`}>Elder Care Platform</p>
          )}
        </div>
      )}
    </div>
  );
};

