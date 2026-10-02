import React, { useState } from 'react';
import { 
  MapPin, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  LogOut, 
  Navigation, 
  Phone, 
  Calendar,
  Sparkles,
  RefreshCw 
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useCaregiverAuth } from '../../context/CaregiverAuthContext';
import { CheckInModal } from './CheckInModal';
import { CheckOutModal } from './CheckOutModal';
import { SosModal } from './SosModal';
import { caregiverApi } from '../../services/api';
import { getGoogleMapsNavigationUrl } from '../../utils/mapUtils';
import type { ShiftDetails } from '../../types';

interface TodayScreenProps {
  shiftDetails: ShiftDetails | null;
  loading: boolean;
  onRefresh: () => void;
  onNavigateToTasks: () => void;
  onNavigateToLogs: () => void;
}

export const TodayScreen: React.FC<TodayScreenProps> = ({
  shiftDetails,
  loading,
  onRefresh,
  onNavigateToTasks,
  onNavigateToLogs,
}) => {
  const { t } = useLanguage();
  const { user } = useCaregiverAuth();

  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [showSosModal, setShowSosModal] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const shift = shiftDetails?.shift;
  const elder = shiftDetails?.elder;
  const attendance = shiftDetails?.latestAttendance;

  const isOnDuty = shift?.status === 'ACTIVE' || shift?.status === 'CHECKED_IN';
  const isCheckedOut = shift?.status === 'CHECKED_OUT';

  const handleSeedDemo = async () => {
    setSeeding(true);
    try {
      await caregiverApi.seedDemoScenario();
      onRefresh();
    } catch (err) {
      console.error('Failed to seed demo:', err);
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-xs font-semibold">Loading today's shift assignment...</p>
      </div>
    );
  }

  // If no shift assigned
  if (!shift || !elder) {
    return (
      <div className="p-4 space-y-4 max-w-md mx-auto">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 text-center">
          <div className="w-14 h-14 bg-teal-50 text-primary rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-base text-slate-900 mb-1">No Active Shift Assigned</h3>
          <p className="text-xs text-slate-500 mb-5 leading-relaxed">
            You do not currently have an active or upcoming shift assigned. If you are scheduled for duty, please contact your CareConnect operations coordinator.
          </p>

          <button
            type="button"
            onClick={handleSeedDemo}
            disabled={seeding}
            className="w-full py-3 px-4 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            {seeding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-teal-600" />}
            <span>Seed Chennai Active Care Scenario (Meenakshi)</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto pb-24">
      {/* Shift Overview Card */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-teal-700 to-teal-500 text-white font-bold text-lg flex items-center justify-center shadow-xs">
              {elder.name.charAt(0)}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                {shift.shiftType.replace(/_/g, ' ')}
              </span>
              <h2 className="font-bold text-base text-slate-900 mt-0.5">{elder.name}</h2>
              <p className="text-xs text-slate-500">
                {elder.age} {t('years')} • {elder.gender} • {elder.primaryLanguage}
              </p>
              {shift.scheduledStart && shift.scheduledEnd && (
                <p className="text-[11px] font-medium text-teal-800 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-teal-600 inline shrink-0" />
                  <span>
                    {new Date(shift.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(shift.scheduledEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Status Badge */}
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 shadow-2xs ${
              isOnDuty
                ? 'bg-emerald-100 text-emerald-800'
                : isCheckedOut
                ? 'bg-slate-100 text-slate-700'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isOnDuty ? 'bg-emerald-500 animate-pulse' : isCheckedOut ? 'bg-slate-500' : 'bg-amber-500'
              }`}
            />
            {shift.status}
          </span>
        </div>

        {/* Residence Address & Landmark */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-start gap-2.5 text-xs text-slate-600">
          <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-slate-800">{elder.locality}, Chennai</div>
            <div className="text-slate-500 text-[11px] mt-0.5 leading-snug">{elder.addressLine1}</div>
          </div>
          <a
            href={getGoogleMapsNavigationUrl(elder)}
            target="_blank"
            rel="noreferrer"
            className="p-1.5 bg-slate-50 hover:bg-slate-100 text-primary border border-slate-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 touch-action-manipulation"
          >
            <Navigation className="w-3 h-3" />
            <span>Map</span>
          </a>
        </div>

        {/* Supervisor Note */}
        {shift.supervisorNotes && (
          <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600">
            <span className="font-bold text-slate-700">Supervisor Instructions: </span>
            {shift.supervisorNotes}
          </div>
        )}
      </div>

      {/* Attendance & Shift Actions Card */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
        <h3 className="font-bold text-xs uppercase tracking-wide text-slate-500">
          Attendance & Field Actions
        </h3>

        {/* Attendance Verification State */}
        {attendance && (
          <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-semibold text-emerald-950">Checked in at: </span>
                <span className="text-emerald-800">
                  {attendance.checkInTime ? new Date(attendance.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Verified'}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 uppercase">
              {attendance.verificationStatus || 'VERIFIED'}
            </span>
          </div>
        )}

        {/* Buttons Grid */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {!isOnDuty && !isCheckedOut ? (
            <button
              type="button"
              onClick={() => setShowCheckInModal(true)}
              className="col-span-2 py-3.5 px-4 bg-primary hover:bg-primary-hover text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{t('checkIn')}</span>
            </button>
          ) : isOnDuty ? (
            <button
              type="button"
              onClick={() => setShowCheckOutModal(true)}
              className="py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>{t('checkOut')}</span>
            </button>
          ) : (
            <div className="col-span-2 py-3 px-4 bg-slate-100 text-slate-600 text-center font-semibold text-xs rounded-xl">
              Shift completed for today. Records submitted.
            </div>
          )}

          {/* Quick shortcuts to Tasks & Logs */}
          <button
            type="button"
            onClick={onNavigateToTasks}
            className={`py-3 px-4 bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold text-xs rounded-xl border border-teal-200 transition-all flex items-center justify-center gap-2 ${
              !isOnDuty && !isCheckedOut ? 'hidden' : ''
            }`}
          >
            <span>Daily Tasks →</span>
          </button>
        </div>
      </div>

      {/* Emergency SOS Trigger Card */}
      <div className="bg-red-50/80 rounded-2xl p-4 border border-red-200">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h4 className="font-bold text-xs text-red-900">{t('sosButton')}</h4>
            <p className="text-[11px] text-red-700 leading-snug mt-0.5">
              Instant P1 emergency trigger for acute clinical distress or fall.
            </p>
          </div>
          <span className="px-2 py-0.5 bg-red-100 text-red-800 font-bold text-[10px] rounded border border-red-200">
            P1 Emergency
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowSosModal(true)}
          className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 active:scale-98 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
        >
          <ShieldAlert className="w-5 h-5 animate-pulse" />
          <span>{t('sosButton')}</span>
        </button>
      </div>

      {/* Modals */}
      {showCheckInModal && (
        <CheckInModal
          isOpen={showCheckInModal}
          onClose={() => setShowCheckInModal(false)}
          shiftDetails={shiftDetails}
          onSuccess={onRefresh}
        />
      )}

      {showCheckOutModal && (
        <CheckOutModal
          isOpen={showCheckOutModal}
          onClose={() => setShowCheckOutModal(false)}
          shiftDetails={shiftDetails}
          onSuccess={onRefresh}
        />
      )}

      {showSosModal && (
        <SosModal
          isOpen={showSosModal}
          onClose={() => setShowSosModal(false)}
          shiftDetails={shiftDetails}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
};
