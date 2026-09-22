import React from 'react';
import { CareConnectLogo } from '../common/CareConnectLogo';
import { AlertCircle, ChevronDown } from 'lucide-react';
import type { Elder } from '../../types';

interface MobileTopBarProps {
  activePortal?: 'FAMILY' | 'CAREGIVER' | 'OPERATIONS';
  elders?: Elder[];
  activeElder?: Elder | null;
  onSelectElder?: (elderId: string) => void;
  onOpenSos: () => void;
  title?: string;
  userName?: string;
}

export const MobileTopBar: React.FC<MobileTopBarProps> = ({
  activePortal = 'FAMILY',
  elders = [],
  activeElder,
  onSelectElder,
  onOpenSos,
  title,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 safe-top">
      <div className="px-4 h-14 flex items-center justify-between gap-3">
        {/* Logo & Context */}
        <div className="flex items-center gap-2">
          <CareConnectLogo size="sm" showWordmark />
          {title && (
            <span className="text-xs font-semibold text-slate-500 border-l border-slate-200 pl-2 max-w-[110px] truncate">
              {title}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Elder Switcher (for Family when multiple elders exist) */}
          {activePortal === 'FAMILY' && elders.length > 1 && (
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-xs font-medium text-slate-700 transition"
              >
                <span className="max-w-[75px] truncate">{activeElder?.name || 'Elder'}</span>
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50">
                  <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Select Elder
                  </div>
                  {elders.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => {
                        onSelectElder?.(e.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 transition ${
                        activeElder?.id === e.id ? 'font-bold text-primary bg-teal-50/50' : 'text-slate-700'
                      }`}
                    >
                      <span className="truncate">{e.name}</span>
                      {activeElder?.id === e.id && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Emergency SOS Button (Large Touch Target) */}
          <button
            onClick={onOpenSos}
            aria-label="Emergency SOS"
            className="flex items-center gap-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs font-bold shadow-sm transition active:scale-95 animate-pulse"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>SOS</span>
          </button>
        </div>
      </div>
    </header>
  );
};

