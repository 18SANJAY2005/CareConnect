import React from 'react';
import {
  X,
  MapPin,
  Phone,
  User,
  Activity,
  Clock,
  ExternalLink,
} from 'lucide-react';
import type { AdminElderItem } from '../types';

interface ElderDetailDrawerProps {
  elder: AdminElderItem | null;
  onClose: () => void;
  onStatusChange?: (elderId: string, newStatus: 'ACTIVE' | 'PENDING' | 'INACTIVE') => void;
  onViewOnMap?: (elder: AdminElderItem) => void;
}

export const ElderDetailDrawer: React.FC<ElderDetailDrawerProps> = ({
  elder,
  onClose,
  onStatusChange,
  onViewOnMap,
}) => {
  if (!elder) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fadeIn">
      {/* Click outside to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Canvas */}
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 overflow-hidden animate-slideInRight">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-600/30 border border-teal-500/40 flex items-center justify-center text-teal-300 font-bold text-xl shadow-inner">
              {elder.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-heading font-extrabold text-white">{elder.name}</h2>
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    elder.status === 'ACTIVE'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : elder.status === 'PENDING'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {elder.status}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {elder.age} yrs • {elder.gender} • DOB: {elder.dateOfBirth || 'Not Specified'}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-teal-400 mt-1 font-medium">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {elder.locality}, Chennai ({elder.postalCode})
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-800">
          {/* Quick Actions Bar */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-600">
              <span className="font-bold text-slate-800">Change Status:</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onStatusChange?.(elder.id, 'ACTIVE')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                  elder.status === 'ACTIVE'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => onStatusChange?.(elder.id, 'PENDING')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                  elder.status === 'PENDING'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => onStatusChange?.(elder.id, 'INACTIVE')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                  elder.status === 'INACTIVE'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Inactive
              </button>
            </div>
          </div>

          {/* Assigned Caregiver Card */}
          <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-800">
                Assigned Care Attendant
              </span>
              {elder.activeShiftStatus === 'ON_DUTY' && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Currently On Duty
                </span>
              )}
            </div>

            {elder.assignedCaregiverName ? (
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-heading font-extrabold text-sm text-slate-900">
                    {elder.assignedCaregiverName}
                  </h4>
                  <p className="text-xs text-slate-600">
                    Verified Attendant • Rating: ⭐ {elder.assignedCaregiverRating || 4.8}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-teal-900 bg-teal-100 px-2.5 py-1 rounded-xl">
                    {elder.shiftPreference.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic">No caregiver currently assigned.</div>
            )}
          </div>

          {/* Family Sponsor Info */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
              <User className="w-4 h-4 text-teal-700" />
              <span>Primary Family Sponsor</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <span className="text-slate-400 block text-[10px]">Contact Person</span>
                <span className="font-semibold text-slate-800">{elder.sponsorName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Phone Number</span>
                <a
                  href={`tel:${elder.sponsorPhone}`}
                  className="font-semibold text-teal-700 hover:underline flex items-center gap-1"
                >
                  <Phone className="w-3 h-3" />
                  {elder.sponsorPhone}
                </a>
              </div>
            </div>
          </div>

          {/* Location & Coordinates */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <MapPin className="w-4 h-4 text-teal-700" />
                <span>Service Address & GPS Coordinates</span>
              </div>
              {onViewOnMap && (
                <button
                  onClick={() => onViewOnMap(elder)}
                  className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                >
                  <span>View on Map</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
            <p className="text-xs text-slate-700">{elder.addressLine1}</p>
            <div className="flex items-center gap-3 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl font-mono">
              <div>Lat: <span className="font-semibold text-slate-700">{elder.latitude.toFixed(4)}</span></div>
              <div>Lng: <span className="font-semibold text-slate-700">{elder.longitude.toFixed(4)}</span></div>
              <div className="ml-auto font-sans font-bold text-emerald-700">Geofenced</div>
            </div>
          </div>

          {/* Clinical Profile & Mobility */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
              <Activity className="w-4 h-4 text-teal-700" />
              <span>Clinical Profile & Mobility</span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Mobility Level
              </span>
              <span className="inline-block px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-semibold text-slate-800">
                {elder.mobilityLevel.replace(/_/g, ' ')}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Medical Conditions
              </span>
              <div className="flex flex-wrap gap-1.5">
                {elder.medicalConditions.map((cond, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium"
                  >
                    {cond}
                  </span>
                ))}
              </div>
            </div>

            {elder.medicalDevices && elder.medicalDevices.length > 0 && (
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Medical Devices
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {elder.medicalDevices.map((dev, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium"
                    >
                      {dev}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {elder.lastVitals && (
              <div className="p-2.5 rounded-xl bg-teal-50/60 border border-teal-200/60 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-teal-800 font-bold block">Latest Vitals</span>
                  <span className="font-extrabold text-teal-950">
                    BP {elder.lastVitals.bp || '120/80'} • Pulse {elder.lastVitals.pulse || 72} bpm
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">{elder.lastVitals.recordedAt}</span>
              </div>
            )}
          </div>

          {/* Daily Routine Snapshot */}
          {elder.dailyRoutine && (
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <Clock className="w-4 h-4 text-teal-700" />
                <span>Daily Care Routine</span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-600">
                {Object.entries(elder.dailyRoutine).map(([key, val]) => (
                  <div key={key} className="flex justify-between py-0.5 border-b border-slate-100 last:border-0">
                    <span className="font-medium capitalize text-slate-500">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </span>
                    <span className="text-slate-800 font-semibold text-right max-w-[60%]">{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Notes */}
          {elder.additionalNotes && (
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 text-xs space-y-1">
              <span className="font-bold text-amber-900 block">Caregiver & Dietary Notes:</span>
              <p className="text-amber-800 leading-relaxed">{elder.additionalNotes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
