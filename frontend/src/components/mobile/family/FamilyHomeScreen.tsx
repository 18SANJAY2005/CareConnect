import React, { useState, useEffect } from 'react';
import {
  Clock,
  HeartPulse,
  PhoneCall,
  CheckCircle2,
  Activity,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import { api } from '../../../services/api';
import type { Elder, CareAssignment } from '../../../types';

interface FamilyHomeScreenProps {
  elder: Elder;
  onOpenTab: (tab: string) => void;
  onOpenSos: () => void;
}

export const FamilyHomeScreen: React.FC<FamilyHomeScreenProps> = ({
  elder,
  onOpenTab,
  onOpenSos,
}) => {
  const [assignment, setAssignment] = useState<CareAssignment | null>(null);
  const [shiftStatus, setShiftStatus] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [asg, shift, tline] = await Promise.all([
        api.getActiveAssignment(elder.id),
        api.getElderShiftStatus(elder.id).catch(() => null),
        api.getElderCareTimeline(elder.id).catch(() => []),
      ]);
      setAssignment(asg);
      setShiftStatus(shift);
      setTimeline(tline || []);
    } catch {
      // Fallback to active display
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [elder.id]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-3">
        <Clock className="w-6 h-6 text-primary animate-spin" />
        <span className="text-xs text-slate-500">Loading active care details...</span>
      </div>
    );
  }

  const caregiver = assignment?.caregiver;
  const isOnDuty = shiftStatus?.status === 'ACTIVE' || shiftStatus?.status === 'CHECKED_IN';

  return (
    <div className="space-y-4 px-4 py-4 pb-20 animate-fadeIn text-slate-900">
      {/* Elder Greeting Banner */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-primary to-primary-container text-white shadow-md flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold text-teal-200 uppercase tracking-wider block">
            Care Dashboard
          </span>
          <h2 className="text-xl font-bold font-heading">{elder.name}</h2>
          <div className="text-xs text-white/80 mt-0.5">
            {elder.location?.locality || 'Care Corridor'} • Age {elder.age}
          </div>
        </div>
        <button
          onClick={onOpenSos}
          className="px-3 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow flex items-center gap-1.5 animate-pulse active:scale-95"
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>SOS</span>
        </button>
      </div>

      {/* Attendant & Shift Status Card */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Today's Caregiver
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold flex items-center gap-1 ${
              isOnDuty
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isOnDuty ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'
              }`}
            />
            <span>{isOnDuty ? 'On Duty Now' : 'Shift Scheduled'}</span>
          </span>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center font-bold text-primary text-base shrink-0">
            {(caregiver?.full_name || caregiver?.fullName || 'Attendant').charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-slate-900 truncate">
              {caregiver?.full_name || caregiver?.fullName || 'Verified Attendant Assigned'}
            </div>
            <div className="text-xs text-slate-500">
              {caregiver?.experience_years ? `${caregiver.experience_years} yrs exp • ` : ''}
              {caregiver?.languages || 'Tamil, English'}
            </div>
          </div>
          <a
            href="tel:+914448552200"
            className="p-2.5 rounded-2xl bg-teal-50 hover:bg-teal-100 text-primary transition"
            title="Call Care Desk"
          >
            <PhoneCall className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Quick Action Pills */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => onOpenTab('UPDATES')}
          className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-3 text-left transition hover:border-slate-300"
        >
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-primary flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">Live Updates</div>
            <div className="text-[10px] text-slate-500">Vitals & activities</div>
          </div>
        </button>

        <button
          onClick={() => onOpenTab('MESSAGES')}
          className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-3 text-left transition hover:border-slate-300"
        >
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-primary flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">Chat Desk</div>
            <div className="text-[10px] text-slate-500">Coordinator & Attendant</div>
          </div>
        </button>
      </div>

      {/* Today's Care Highlights */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>Today's Care Timeline</span>
          </div>
          <button
            onClick={() => onOpenTab('UPDATES')}
            className="text-[11px] font-bold text-primary hover:underline"
          >
            View all →
          </button>
        </div>

        {timeline.length > 0 ? (
          <div className="space-y-2">
            {timeline.slice(0, 3).map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 text-xs"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium text-slate-800">{item.title || item.taskName}</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {item.time || 'Completed'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 bg-slate-50 rounded-2xl text-center text-xs text-slate-400">
            Shift routine starts at 8:00 AM. Updates will stream in live.
          </div>
        )}
      </div>

      {/* Quick Vitals Snapshot */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2.5">
        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <HeartPulse className="w-3.5 h-3.5 text-primary" />
          <span>Latest Health Vitals</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-2xl bg-teal-50/50 border border-teal-100 text-center">
            <div className="text-[10px] text-slate-500 font-bold">Blood Pressure</div>
            <div className="text-sm font-extrabold text-slate-900 mt-0.5">120/80</div>
            <div className="text-[9px] text-emerald-600 font-semibold">Normal</div>
          </div>

          <div className="p-2.5 rounded-2xl bg-teal-50/50 border border-teal-100 text-center">
            <div className="text-[10px] text-slate-500 font-bold">Pulse Rate</div>
            <div className="text-sm font-extrabold text-slate-900 mt-0.5">72 bpm</div>
            <div className="text-[9px] text-emerald-600 font-semibold">Steady</div>
          </div>

          <div className="p-2.5 rounded-2xl bg-teal-50/50 border border-teal-100 text-center">
            <div className="text-[10px] text-slate-500 font-bold">Blood Sugar</div>
            <div className="text-sm font-extrabold text-slate-900 mt-0.5">110 mg/dL</div>
            <div className="text-[9px] text-emerald-600 font-semibold">Normal</div>
          </div>
        </div>
      </div>
    </div>
  );
};
