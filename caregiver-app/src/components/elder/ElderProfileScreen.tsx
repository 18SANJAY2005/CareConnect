import React from 'react';
import { 
  User, 
  MapPin, 
  Heart, 
  ShieldCheck, 
  Navigation, 
  Languages, 
  Activity, 
  Calendar,
  AlertCircle 
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import type { ShiftDetails } from '../../types';

interface ElderProfileScreenProps {
  shiftDetails: ShiftDetails | null;
}

export const ElderProfileScreen: React.FC<ElderProfileScreenProps> = ({ shiftDetails }) => {
  const { t } = useLanguage();
  const elder = shiftDetails?.elder;
  const shift = shiftDetails?.shift;

  if (!elder) {
    return (
      <div className="p-4 max-w-md mx-auto text-center py-12 text-slate-500">
        <User className="w-8 h-8 text-primary mx-auto mb-2" />
        <h3 className="font-bold text-sm text-slate-800">No Patient Profile Available</h3>
        <p className="text-xs mt-1">Please start or assign an active shift first.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto pb-24">
      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 text-center relative overflow-hidden">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-teal-700 to-teal-500 text-white font-bold text-2xl flex items-center justify-center mx-auto shadow-md mb-3">
          {elder.name.charAt(0)}
        </div>
        <h2 className="font-bold text-lg text-slate-900">{elder.name}</h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          {elder.age} {t('years')} • {elder.gender} • {elder.locality}, Chennai
        </p>

        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>CareConnect Verified Profile</span>
        </div>
      </div>

      {/* Demographics & Care Profile */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
        <h3 className="font-bold text-xs uppercase tracking-wide text-slate-500">
          Patient Demographics
        </h3>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block font-medium">{t('mobility')}</span>
            <span className="font-bold text-slate-800 mt-0.5 block">{elder.mobilityLevel}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block font-medium">{t('language')}</span>
            <span className="font-bold text-slate-800 mt-0.5 block">{elder.primaryLanguage}</span>
          </div>
        </div>
      </div>

      {/* Verified Residence Location */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wide text-slate-500">
            Verified Residence
          </h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
            Geofence {shift?.geofenceRadiusMeters || 200}m
          </span>
        </div>

        <div className="flex items-start gap-2.5 text-xs text-slate-700">
          <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <div className="font-bold text-slate-900">{elder.addressLine1}</div>
            <div className="text-slate-500">{elder.locality}, Chennai, Tamil Nadu</div>
            <div className="text-[11px] font-mono text-slate-400 mt-1">
              GPS: {elder.latitude.toFixed(4)}, {elder.longitude.toFixed(4)}
            </div>
          </div>
        </div>

        <a
          href={`https://www.google.com/maps/search/?api=1&query=${elder.latitude},${elder.longitude}`}
          target="_blank"
          rel="noreferrer"
          className="w-full py-3 px-3 min-h-[48px] bg-slate-50 hover:bg-slate-100 text-primary border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors touch-action-manipulation"
        >
          <Navigation className="w-4 h-4" />
          <span>Open in Google Maps Navigation</span>
        </a>
      </div>

      {/* Clinical Care Protocols & Manager Directives */}
      {shift?.supervisorNotes && (
        <div className="bg-teal-50/70 rounded-2xl p-4 border border-teal-200 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-teal-900">
            <Activity className="w-4 h-4 text-teal-700" />
            <span>Care Supervisor Instructions</span>
          </div>
          <p className="text-xs text-teal-800 leading-relaxed font-medium">
            {shift.supervisorNotes}
          </p>
        </div>
      )}
    </div>
  );
};
