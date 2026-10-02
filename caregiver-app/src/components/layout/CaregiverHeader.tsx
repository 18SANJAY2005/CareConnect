import React, { useState } from 'react';
import { LogOut, ShieldCheck } from 'lucide-react';
import { CareConnectLogo } from '../common/CareConnectLogo';
import { NetworkStatusIndicator } from '../common/NetworkStatusIndicator';
import { CaregiverKycModal } from '../profile/CaregiverKycModal';
import { useCaregiverAuth } from '../../context/CaregiverAuthContext';
import { useLanguage } from '../../context/LanguageContext';
import type { SupportedLanguage } from '../../types';

interface CaregiverHeaderProps {
  isOnDuty: boolean;
}

export const CaregiverHeader: React.FC<CaregiverHeaderProps> = ({ isOnDuty }) => {
  const { user, logout } = useCaregiverAuth();
  const { language, setLanguage, t } = useLanguage();
  const [isKycOpen, setIsKycOpen] = useState<boolean>(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/98 backdrop-blur-md border-b border-slate-200/80 shadow-xs px-4 py-2.5 pt-safe">
        <div className="max-w-md mx-auto flex items-center justify-between">
          {/* Brand & Duty Status */}
          <div className="flex items-center gap-2.5">
            <CareConnectLogo size="sm" showWordmark={false} />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-slate-900">CareConnect</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 uppercase tracking-wider">
                  Field
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    isOnDuty ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`}
                />
                <span className="text-[11px] font-medium text-slate-600">
                  {isOnDuty ? t('onDuty') : t('offDuty')}
                </span>
              </div>
            </div>
          </div>

          {/* Right Actions: Network status, Language selector, KYC & Logout */}
          <div className="flex items-center gap-2">
            {/* Live Network connectivity status indicator */}
            <NetworkStatusIndicator />

            {/* Vernacular Language Switcher */}
            <div 
              role="group" 
              aria-label="Language selection"
              className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs"
            >
              {(['ta', 'en', 'te'] as SupportedLanguage[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  aria-label={`Switch language to ${lang === 'ta' ? 'Tamil' : lang === 'te' ? 'Telugu' : 'English'}`}
                  aria-pressed={language === lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-2 py-1 min-h-[32px] rounded-md font-semibold text-[11px] touch-action-manipulation transition-all ${
                    language === lang
                      ? 'bg-white text-primary shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang === 'ta' ? 'த' : lang === 'te' ? 'తె' : 'EN'}
                </button>
              ))}
            </div>

            {/* User profile / KYC trigger & Logout */}
            <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
              <button
                type="button"
                onClick={() => setIsKycOpen(true)}
                title="View KYC & Identity Verification"
                className="flex items-center gap-1 p-1 hover:bg-teal-50 rounded-lg transition-colors group touch-action-manipulation"
              >
                <div className="w-7 h-7 rounded-full bg-teal-100 text-primary flex items-center justify-center font-bold text-xs border border-teal-200 group-hover:border-primary">
                  {user?.fullName ? user.fullName[0].toUpperCase() : 'C'}
                </div>
                <span className="text-xs font-medium text-slate-700 hidden sm:inline max-w-[70px] truncate">
                  {user?.fullName?.split(' ')[0]}
                </span>
              </button>

              <button
                type="button"
                onClick={logout}
                aria-label={t('logout')}
                className="p-1.5 min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors touch-action-manipulation"
                title={t('logout')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* KYC Modal */}
      <CaregiverKycModal isOpen={isKycOpen} onClose={() => setIsKycOpen(false)} />
    </>
  );
};

