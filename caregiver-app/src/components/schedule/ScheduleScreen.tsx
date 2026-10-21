import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, List, Clock, MapPin, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, RefreshCw, Sparkles, AlertTriangle, Eye } from 'lucide-react';
import { BackButton } from '../common/BackButton';
import { caregiverApi } from '../../services/api';
import type { ScheduleItem } from '../../types';

interface ScheduleScreenProps {
  onBack?: () => void;
}

export const ScheduleScreen: React.FC<ScheduleScreenProps> = ({ onBack }) => {
  const [viewMode, setViewMode] = useState<'CALENDAR' | 'LIST'>('CALENDAR');
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const items = await caregiverApi.getSchedule();
      setScheduleItems(items);
    } catch (err) {
      console.error('Failed to load schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  // Compute 7-day week array starting from selected week's Monday
  const getWeekDates = (baseDate: Date) => {
    const current = new Date(baseDate);
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    const monday = new Date(current.setDate(diff));

    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      week.push(d);
    }
    return week;
  };

  const weekDates = getWeekDates(selectedDate);

  const formatDateKey = (d: Date) => d.toISOString().split('T')[0];

  const selectedDateKey = formatDateKey(selectedDate);

  // Group items by date string (YYYY-MM-DD)
  const itemsByDate: Record<string, ScheduleItem[]> = {};
  scheduleItems.forEach((item) => {
    const key = item.date.slice(0, 10);
    if (!itemsByDate[key]) {
      itemsByDate[key] = [];
    }
    itemsByDate[key].push(item);
  });

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'ACTIVE' || s === 'CHECKED_IN') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Active / Checked-In
        </span>
      );
    }
    if (s === 'SCHEDULED' || s === 'SERVICE_CONFIRMED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-300">
          ● Confirmed
        </span>
      );
    }
    if (s === 'CHECKED_OUT' || s === 'COMPLETED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
          ✓ Completed
        </span>
      );
    }
    if (s === 'DECLINED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-300">
          ✕ Declined
        </span>
      );
    }
    if (s === 'EXPIRED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-300">
          ⚠ Expired
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
        {status}
      </span>
    );
  };

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const filteredListItems = scheduleItems.filter((it) => {
    if (statusFilter === 'ALL') return true;
    return it.status.toUpperCase() === statusFilter;
  });

  const selectedDayItems = itemsByDate[selectedDateKey] || [];

  return (
    <div className="px-3 sm:px-4 py-3 sm:py-4 space-y-4 max-w-md mx-auto pb-28 animate-fadeIn">
      {/* Header & View Switcher */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-200 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {onBack && <BackButton onClick={onBack} label="Back" />}
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight">Care Schedule</h1>
            <p className="text-xs text-slate-500 mt-0.5">Assigned shifts & visit calendar</p>
          </div>
        </div>

        {/* View Switch: Calendar vs List */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setViewMode('CALENDAR')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'CALENDAR'
                ? 'bg-white text-primary shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Calendar</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('LIST')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'LIST'
                ? 'bg-white text-primary shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>List</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mb-2" />
          <p className="text-xs font-semibold">Loading schedule slots...</p>
        </div>
      ) : viewMode === 'CALENDAR' ? (
        /* ============================================================ */
        /* 1. WEEKLY CALENDAR VIEW (Default)                            */
        /* ============================================================ */
        <div className="space-y-3.5">
          {/* Week Navigation Header */}
          <div className="bg-white rounded-2xl p-3 shadow-xs border border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                const prev = new Date(selectedDate);
                prev.setDate(prev.getDate() - 7);
                setSelectedDate(prev);
              }}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
              title="Previous Week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-extrabold text-xs sm:text-sm text-slate-800">
              {weekDates[0].toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} –{' '}
              {weekDates[6].toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <button
              type="button"
              onClick={() => {
                const next = new Date(selectedDate);
                next.setDate(next.getDate() + 7);
                setSelectedDate(next);
              }}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
              title="Next Week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 7-Day Day Selector Pills */}
          <div className="grid grid-cols-7 gap-1 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
            {weekDates.map((d, index) => {
              const dKey = formatDateKey(d);
              const isSelected = dKey === selectedDateKey;
              const isToday = formatDateKey(new Date()) === dKey;
              const hasItems = !!itemsByDate[dKey] && itemsByDate[dKey].length > 0;
              const count = itemsByDate[dKey]?.length || 0;

              return (
                <button
                  key={dKey}
                  type="button"
                  onClick={() => setSelectedDate(d)}
                  className={`flex flex-col items-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-primary text-white font-black shadow-xs'
                      : isToday
                      ? 'bg-teal-50 text-teal-900 border border-teal-200'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-teal-100' : 'text-slate-400'}`}>
                    {dayNames[index]}
                  </span>
                  <span className="text-sm font-black mt-0.5">{d.getDate()}</span>
                  {hasItems && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full mt-1 ${
                        isSelected ? 'bg-amber-300' : 'bg-primary'
                      }`}
                      title={`${count} assignment slot(s)`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Read-Oriented Information Notice (Requirement 9) */}
          <div className="bg-teal-50/80 border border-teal-200/90 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-teal-800">
            <Eye className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-teal-950 font-bold">Read-Oriented Schedule:</strong> Slots display your scheduled care seekers. Task completion, GPS check-in, and verification are authorized solely from <strong>Today</strong>.
            </p>
          </div>

          {/* Slots for Selected Day (Supports Multiple Assignments on Same Day) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {selectedDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h2>
              <span className="text-xs font-semibold text-slate-600">
                {selectedDayItems.length} Slot{selectedDayItems.length === 1 ? '' : 's'}
              </span>
            </div>

            {selectedDayItems.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-slate-300 text-slate-500 space-y-2">
                <CalendarIcon className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-semibold">No care assignments scheduled for this day.</p>
                <button
                  type="button"
                  onClick={() => setSelectedDate(new Date())}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Jump to Today
                </button>
              </div>
            ) : (
              selectedDayItems.map((slot) => (
                <div
                  key={`${slot.type}-${slot.id}`}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3 transition-all hover:border-teal-300"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 block">
                        {slot.shiftType}
                      </span>
                      <h3 className="text-base font-black text-slate-900 tracking-tight mt-0.5">
                        {slot.elderName}
                      </h3>
                    </div>
                    {getStatusBadge(slot.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{slot.startTime} – {slot.endTime}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{slot.locality}</span>
                    </div>
                  </div>

                  {slot.address && (
                    <p className="text-[11px] text-slate-500 truncate bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                      📍 {slot.address}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* ============================================================ */
        /* 2. LIST VIEW                                                 */
        /* ============================================================ */
        <div className="space-y-3.5">
          {/* Status Filter Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
            {['ALL', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'DECLINED', 'EXPIRED'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  statusFilter === s
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {s === 'ALL' ? 'All Slots' : s}
              </button>
            ))}
          </div>

          {filteredListItems.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-slate-300 text-slate-500">
              <List className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold">No schedule items match the selected filter.</p>
            </div>
          ) : (
            filteredListItems.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      {item.date} • {item.shiftType}
                    </span>
                    <h3 className="text-base font-black text-slate-900 mt-0.5">{item.elderName}</h3>
                  </div>
                  {getStatusBadge(item.status)}
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-600">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{item.startTime} – {item.endTime}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{item.locality}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
