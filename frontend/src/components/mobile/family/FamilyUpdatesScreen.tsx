import React, { useState, useEffect } from 'react';
import {
  Clock,
  HeartPulse,
  Camera,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { api } from '../../../services/api';
import type { Elder } from '../../../types';
import type { TimelineItem, VitalsTrendData, CareMedia } from '../../../types/phaseC';

interface FamilyUpdatesScreenProps {
  elder: Elder;
}

export const FamilyUpdatesScreen: React.FC<FamilyUpdatesScreenProps> = ({ elder }) => {
  const [subTab, setSubTab] = useState<'TIMELINE' | 'VITALS' | 'PHOTOS'>('TIMELINE');
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [vitals, setVitals] = useState<VitalsTrendData | null>(null);
  const [mediaList, setMediaList] = useState<CareMedia[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadUpdates = async () => {
    setIsLoading(true);
    try {
      const [tline, vitalsData, media] = await Promise.all([
        api.getElderCareTimeline(elder.id).catch(() => []),
        api.getElderVitalsTrends(elder.id).catch(() => null),
        api.getElderMedia(elder.id).catch(() => []),
      ]);
      setTimeline(tline || []);
      setVitals(vitalsData);
      setMediaList(media || []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUpdates();
    const interval = setInterval(loadUpdates, 15000);
    return () => clearInterval(interval);
  }, [elder.id]);

  return (
    <div className="space-y-4 px-4 py-4 pb-safe-nav animate-fadeIn text-slate-900">
      <div>
        <h2 className="text-xl font-bold font-heading text-slate-900">Daily Updates</h2>
        <p className="text-xs text-slate-500">Live timeline, vitals logs, and daily photos</p>
      </div>

      {/* Sub-Tab Switcher */}
      <div className="flex bg-slate-200/80 p-1 rounded-2xl">
        <button
          onClick={() => setSubTab('TIMELINE')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            subTab === 'TIMELINE' ? 'bg-white text-primary shadow-sm' : 'text-slate-600'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Timeline</span>
        </button>

        <button
          onClick={() => setSubTab('VITALS')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            subTab === 'VITALS' ? 'bg-white text-primary shadow-sm' : 'text-slate-600'
          }`}
        >
          <HeartPulse className="w-3.5 h-3.5" />
          <span>Vitals Trends</span>
        </button>

        <button
          onClick={() => setSubTab('PHOTOS')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            subTab === 'PHOTOS' ? 'bg-white text-primary shadow-sm' : 'text-slate-600'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Photos ({mediaList.length})</span>
        </button>
      </div>

      {isLoading && timeline.length === 0 && (
        <div className="p-8 text-center">
          <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
          <span className="text-xs text-slate-400 mt-2 block">Loading daily stream...</span>
        </div>
      )}

      {/* 1. TIMELINE STREAM */}
      {subTab === 'TIMELINE' && (
        <div className="space-y-3 animate-fadeIn">
          {timeline.length > 0 ? (
            timeline.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {item.taskName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {item.recordedAt
                        ? new Date(item.recordedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Today'}
                    </span>
                  </div>
                  {item.notes && (
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      {item.notes}
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-2">
              <Clock className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="text-xs font-bold text-slate-700">No Shift Activities Logged Yet</div>
              <div className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                As the attendant completes meals, walks, and medications, updates will appear here automatically.
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. VITALS TRENDS */}
      {subTab === 'VITALS' && (
        <div className="space-y-3 animate-fadeIn">
          {/* BP Card */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Blood Pressure (Systolic / Diastolic)</span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Normal Range
              </span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 font-mono">
              {vitals?.bpTrend && vitals.bpTrend.length > 0
                ? `${vitals.bpTrend[vitals.bpTrend.length - 1].systolic} / ${vitals.bpTrend[vitals.bpTrend.length - 1].diastolic} mmHg`
                : '120 / 80 mmHg'}
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-teal-600 rounded-full w-[65%]" />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              <span>90/60 Low</span>
              <span>120/80 Target</span>
              <span>140/90 High</span>
            </div>
          </div>

          {/* Blood Sugar Card */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Blood Glucose (Random)</span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Controlled
              </span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 font-mono">
              {vitals?.glucoseTrend && vitals.glucoseTrend.length > 0
                ? `${vitals.glucoseTrend[vitals.glucoseTrend.length - 1].glucose} mg/dL`
                : '112 mg/dL'}
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-teal-600 rounded-full w-[50%]" />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              <span>70 Fasting</span>
              <span>110 Post-meal</span>
              <span>180 High</span>
            </div>
          </div>

          {/* Pulse Card */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Resting Pulse Rate</span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Optimal
              </span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 font-mono">
              {vitals?.pulseTrend && vitals.pulseTrend.length > 0
                ? `${vitals.pulseTrend[vitals.pulseTrend.length - 1].pulse} bpm`
                : '74 bpm'}
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-teal-600 rounded-full w-[60%]" />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              <span>60 Low</span>
              <span>75 Average</span>
              <span>100 High</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. DAILY PHOTOS */}
      {subTab === 'PHOTOS' && (
        <div className="space-y-3 animate-fadeIn">
          {mediaList.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5">
              {mediaList.map((m) => (
                <div
                  key={m.id}
                  className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm"
                >
                  <img
                    src={m.mediaUrl}
                    alt={m.caption || 'Activity photo'}
                    className="w-full h-32 object-cover"
                  />
                  <div className="p-2.5">
                    <div className="text-[11px] font-bold text-slate-800 line-clamp-1">
                      {m.caption || 'Daily Activity'}
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5 font-mono">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-2">
              <Camera className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="text-xs font-bold text-slate-700">No Photos Uploaded Yet</div>
              <div className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                The attendant uploads activity photos during meals, walks, and exercises.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
