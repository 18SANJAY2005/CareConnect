import React, { useState } from "react";
import {
  Calendar,
  Clock,
  Globe,
  Shield,
  Video,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import type { Caregiver } from "../../../types";

interface IntroCallSchedulerProps {
  caregiver: Caregiver;
  elderName: string;
  onSchedule: (
    scheduledAt: string,
    timezone: string,
    notes: string,
  ) => Promise<void>;
  isSubmitting: boolean;
}

export const IntroCallScheduler: React.FC<IntroCallSchedulerProps> = ({
  caregiver,
  elderName,
  onSchedule,
  isSubmitting,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split("T")[0],
  );
  const [selectedTime, setSelectedTime] = useState<string>("16:30");
  const [selectedTimezone, setSelectedTimezone] =
    useState<string>("Asia/Kolkata");
  const [callNotes, setCallNotes] = useState<string>(
    "Discuss daily walking assistance, evening vitals logging, and food preferences.",
  );

  const availableSlots = [
    { time: "10:00", label: "10:00 AM" },
    { time: "11:30", label: "11:30 AM" },
    { time: "14:00", label: "02:00 PM" },
    { time: "16:30", label: "04:30 PM (Recommended)" },
    { time: "18:00", label: "06:00 PM" },
    { time: "19:30", label: "07:30 PM" },
  ];

  const timezones = [
    { id: "Asia/Kolkata", label: "IST — India Standard Time" },
    { id: "Asia/Singapore", label: "SGT — Singapore Time" },
    { id: "America/New_York", label: "EST — US Eastern Time" },
    { id: "America/Los_Angeles", label: "PST — US Pacific Time" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const scheduledDateTime = `${selectedDate}T${selectedTime}:00Z`;
    onSchedule(scheduledDateTime, selectedTimezone, callNotes);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
      {/* Overview Banner */}
      <div className="bg-surface-card p-6 sm:p-8 rounded-2xl border border-outline-light/50 shadow-card">
        <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-5">
          <img
            src={caregiver.photo_url}
            alt={caregiver.full_name}
            className="w-20 h-20 rounded-2xl object-cover border-2 border-primary/20 shadow-sm"
          />
          <div className="flex-1 text-center sm:text-left">
            <span className="inline-flex items-center text-xs font-bold text-secondary bg-secondary-light px-2.5 py-0.5 rounded-full mb-1">
              <Video className="w-3.5 h-3.5 mr-1" /> Sub-Phase B02: Introductory
              Call
            </span>
            <h2 className="text-2xl font-extrabold font-heading text-on-surface">
              Schedule 10-Min Video Call with {caregiver.full_name}
            </h2>
            <p className="text-sm text-on-surface-variant mt-1">
              A 10-minute moderated introductory conversation to introduce your
              elder ({elderName}) and verify personality comfort before
              committing to the trial.
            </p>
          </div>
        </div>

        {/* 3 Call Agenda Principles */}
        <div className="mt-6 pt-5 border-t border-outline-light/40 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-surface border border-outline-light/30">
            <CheckCircle2 className="w-4 h-4 text-tertiary mb-1" />
            <p className="text-xs font-bold text-on-surface">
              1. Elder Routine
            </p>
            <p className="text-[11px] text-on-surface-variant">
              Review wake-up, walk, and vitals schedules.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-surface border border-outline-light/30">
            <CheckCircle2 className="w-4 h-4 text-primary mb-1" />
            <p className="text-xs font-bold text-on-surface">
              2. Language & Tone
            </p>
            <p className="text-[11px] text-on-surface-variant">
              Verify Tamil conversational comfort.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-surface border border-outline-light/30">
            <CheckCircle2 className="w-4 h-4 text-secondary mb-1" />
            <p className="text-xs font-bold text-on-surface">
              3. Zero Cost / Zero Risk
            </p>
            <p className="text-[11px] text-on-surface-variant">
              Deposit is only paid after call comfort.
            </p>
          </div>
        </div>
      </div>

      {/* Scheduling Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-surface-card p-6 sm:p-8 rounded-2xl border border-outline-light/50 shadow-card space-y-6"
      >
        {/* Date Selection */}
        <div>
          <label className="block text-sm font-bold text-on-surface font-heading mb-2 flex items-center">
            <Calendar className="w-4 h-4 text-primary mr-1.5" />
            Select Call Date
          </label>
          <input
            type="date"
            value={selectedDate}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setSelectedDate(e.target.value)}
            required
            className="w-full h-14 px-4 rounded-xl border border-outline-light focus:border-primary focus:ring-2 focus:ring-primary/20 bg-surface font-medium text-on-surface outline-none"
          />
        </div>

        {/* Timezone Selector (For NRI Sponsors) */}
        <div>
          <label className="block text-sm font-bold text-on-surface font-heading mb-2 flex items-center">
            <Globe className="w-4 h-4 text-primary mr-1.5" />
            Your Timezone (Sponsor Location)
          </label>
          <select
            value={selectedTimezone}
            onChange={(e) => setSelectedTimezone(e.target.value)}
            className="w-full h-14 px-4 rounded-xl border border-outline-light focus:border-primary focus:ring-2 focus:ring-primary/20 bg-surface font-medium text-on-surface outline-none"
          >
            {timezones.map((tz) => (
              <option key={tz.id} value={tz.id}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        {/* 10-Minute Time Slot Pills */}
        <div>
          <label className="block text-sm font-bold text-on-surface font-heading mb-2 flex items-center">
            <Clock className="w-4 h-4 text-primary mr-1.5" />
            Available 10-Minute Introductory Windows
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {availableSlots.map((slot) => (
              <button
                type="button"
                key={slot.time}
                onClick={() => setSelectedTime(slot.time)}
                className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-semibold border transition-all text-center ${
                  selectedTime === slot.time
                    ? "bg-primary text-white border-primary shadow-sm ring-2 ring-primary/30"
                    : "bg-surface hover:bg-surface-container border-outline-light/60 text-on-surface"
                }`}
              >
                {slot.label}
              </button>
            ))}
          </div>
        </div>

        {/* Agenda / Custom Notes */}
        <div>
          <label className="block text-sm font-bold text-on-surface font-heading mb-2">
            Topics for Caregiver (Optional)
          </label>
          <textarea
            value={callNotes}
            onChange={(e) => setCallNotes(e.target.value)}
            rows={2}
            className="w-full p-4 rounded-xl border border-outline-light focus:border-primary focus:ring-2 focus:ring-primary/20 bg-surface font-normal text-sm text-on-surface outline-none"
            placeholder="Any specific questions regarding medication or mobility assistance..."
          />
        </div>

        {/* Provider Guarantee Pill */}
        <div className="flex items-center space-x-2 text-xs text-on-surface-variant bg-surface-container/50 p-3 rounded-xl border border-outline-light/30">
          <Shield className="w-4 h-4 text-tertiary flex-shrink-0" />
          <span>
            Powered by <strong>Jitsi Meet WebRTC</strong>. No external software
            or login required. Works directly in browser.
          </span>
        </div>

        {/* 56px Primary Action Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full touch-target-primary rounded-xl bg-primary hover:bg-primary-container text-white font-heading font-bold text-base shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {isSubmitting ? (
            <span>Generating Secure Jitsi Meeting Room...</span>
          ) : (
            <span className="flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-amber-300" />
              Confirm & Generate 10-Min Jitsi Video Room
            </span>
          )}
        </button>
      </form>
    </div>
  );
};
