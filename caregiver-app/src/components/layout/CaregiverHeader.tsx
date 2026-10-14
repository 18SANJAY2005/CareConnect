import React, { useState } from 'react';
import { LogOut, ShieldAlert, PhoneCall } from 'lucide-react';
import { CareConnectLogo } from '../common/CareConnectLogo';
import { NetworkStatusIndicator } from '../common/NetworkStatusIndicator';
import { CaregiverKycModal } from '../profile/CaregiverKycModal';
import { SosModal } from '../today/SosModal';
import { useCaregiverAuth } from '../../context/CaregiverAuthContext';
import { useLanguage } from '../../context/LanguageContext';
import type { ShiftDetails } from '../../types';

interface CaregiverHeaderProps {
  isOnDuty: boolean;
  shiftDetails?: ShiftDetails | null;
  onNavigateToProfile?: () => void;
  onRefreshShift?: () => void;
}

export const CaregiverHeader: React.FC<CaregiverHeaderProps> = ({
  isOnDuty,
  shiftDetails,
  onNavigateToProfile,
  onRefreshShift,
}) => {
  const { user, logout } = useCaregiverAuth();
  const { t } = useLanguage();
  const [isKycOpen, setIsKycOpen] = useState<boolean>(false);
  const [isSosOpen, setIsSosOpen] = useState<boolean>(false);

  const handleProfileClick = () => {
    if (onNavigateToProfile) {
      onNavigateToProfile();
    } else {
      setIsKycOpen(true);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/98 backdrop-blur-md border-b border-slate-200/80 shadow-xs px-3 sm:px-4 py-2 pt-safe">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2">
          {/* Brand & Duty Status */}
          <div className="flex items-center gap-2 min-w-0">
            <CareConnectLogo size="sm" showWordmark={false} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs sm:text-sm tracking-tight text-slate-900 truncate">CareConnect</span>
                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 uppercase tracking-wider shrink-0">
                  Field
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                    isOnDuty ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`}
                />
                <span className="text-[10px] sm:text-[11px] font-medium text-slate-600 truncate">
                  {isOnDuty ? t('onDuty') : t('offDuty')}
                </span>
              </div>
            </div>
          </div>

          {/* Sticky SOS Button - Visible & Prominent on EVERY Screen (Requirement 7) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="sticky-sos-button"
              onClick={() => setIsSosOpen(true)}
              aria-label="Emergency SOS - Immediate assistance"
              className="min-h-[38px] px-2.5 sm:px-3 py-1 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-black text-xs rounded-xl shadow-sm border border-red-500/80 flex items-center gap-1.5 transition-all animate-pulse hover:animate-none cursor-pointer touch-action-manipulation shrink-0"
              title="Trigger Emergency SOS"
            >
              <ShieldAlert className="w-4 h-4 text-white shrink-0" />
              <span className="tracking-wider">SOS</span>
            </button>

            {/* Right Actions: Network status, Profile/Avatar trigger & Logout */}
            <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200">
              {/* Live Network connectivity status indicator */}
              <NetworkStatusIndicator />

              {/* User Avatar trigger (Requirement 11: Profile via top avatar) */}
              <button
                type="button"
                id="header-avatar-button"
                onClick={handleProfileClick}
                aria-label="View Profile & Settings"
                title="Profile & Personal Settings"
                className="flex items-center p-0.5 hover:ring-2 hover:ring-primary rounded-full transition-all group touch-action-manipulation cursor-pointer"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-teal-100 text-primary flex items-center justify-center font-bold text-xs border border-teal-300 shadow-2xs group-hover:scale-105 transition-transform">
                  {user?.fullName ? user.fullName[0].toUpperCase() : 'C'}
                </div>
              </button>

              <button
                type="button"
                onClick={logout}
                aria-label={t('logout')}
                className="p-1 min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors touch-action-manipulation"
                title={t('logout')}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* KYC Modal */}
      <CaregiverKycModal isOpen={isKycOpen} onClose={() => setIsKycOpen(false)} />

      {/* Global Sticky SOS Modal */}
      {shiftDetails && (
        <SosModal
          isOpen={isSosOpen}
          onClose={() => setIsSosOpen(false)}
          shiftDetails={shiftDetails}
          onSuccess={() => {
            setIsSosOpen(false);
            onRefreshShift?.();
          }}
        />
      )}

      {/* Fallback SOS Dialog if shiftDetails is not loaded */}
      {!shiftDetails && isSosOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-red-200 text-center space-y-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Emergency Support Hotline</h3>
              <p className="text-xs text-slate-600 mt-1">
                For immediate medical or safety emergencies, connect directly with our 24x7 Chennai Operations Desk or Emergency Services.
              </p>
            </div>
            <div className="space-y-2 pt-1">
              <a
                href="tel:112"
                className="w-full py-3 bg-red-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Call Emergency (112)</span>
              </a>
              <a
                href="tel:+919840011223"
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-2"
              >
                <PhoneCall className="w-4 h-4 text-slate-600" />
                <span>CareConnect Desk (+91 98400 11223)</span>
              </a>
            </div>
            <button
              type="button"
              onClick={() => setIsSosOpen(false)}
              className="text-xs text-slate-500 underline pt-2"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
