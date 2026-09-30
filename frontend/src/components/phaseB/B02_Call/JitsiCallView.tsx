import React, { useState, useEffect } from "react";
import {
  Video,
  Clock,
  ExternalLink,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import type { Caregiver, IntroCall } from "../../../types";

interface JitsiCallViewProps {
  introCall: IntroCall;
  caregiver: Caregiver;
  onCompleteCall: () => Promise<void>;
  onReschedule: () => void;
  isCompleting: boolean;
}

export const JitsiCallView: React.FC<JitsiCallViewProps> = ({
  introCall,
  caregiver,
  onCompleteCall,
  onReschedule,
  isCompleting,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(10 * 60); // 10:00 minutes
  const [isJoined, setIsJoined] = useState<boolean>(false);

  useEffect(() => {
    let timer: any;
    if (isJoined && secondsRemaining > 0) {
      timer = setInterval(() => {
        setSecondsRemaining((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isJoined, secondsRemaining]);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Call Header & 10-Minute Timer Badge */}
      <div className="bg-surface-card p-6 rounded-2xl border border-outline-light/50 shadow-card flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-4 text-center sm:text-left">
          <img
            src={caregiver.photo_url}
            alt={caregiver.full_name}
            className="w-14 h-14 rounded-xl object-cover border-2 border-primary/20 shadow-sm"
          />
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-tertiary animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-tertiary">
                Active Jitsi Video Room
              </span>
            </div>
            <h3 className="text-xl font-bold font-heading text-on-surface">
              Introductory Call with {caregiver.full_name}
            </h3>
            <p className="text-xs text-on-surface-variant">
              Room ID:{" "}
              <code className="bg-surface-container px-1.5 py-0.5 rounded text-[11px] font-mono">
                {introCall.room_id}
              </code>
            </p>
          </div>
        </div>

        {/* Live 10-Minute Countdown Clock */}
        <div className="bg-surface-container px-5 py-3 rounded-2xl border border-outline-light/40 flex items-center space-x-3">
          <Clock className="w-6 h-6 text-primary" />
          <div>
            <span className="text-[11px] text-on-surface-variant font-medium block">
              10-Minute Limit:
            </span>
            <span className="text-2xl font-extrabold font-heading text-primary tracking-tight">
              {formatTimer(secondsRemaining)}
            </span>
          </div>
        </div>
      </div>

      {/* Embedded Jitsi WebRTC Window */}
      <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 relative min-h-[460px] flex flex-col">
        {!isJoined ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-slate-900 to-slate-950 text-white space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-lg animate-bounce">
              <Video className="w-8 h-8 text-white" />
            </div>
            <h4 className="text-2xl font-bold font-heading">
              Ready to meet {caregiver.full_name}?
            </h4>
            <p className="text-sm text-slate-300 max-w-md">
              Your moderated Jitsi Meet video connection is configured and
              waiting. You will have 10 minutes to discuss your elder's care
              routine.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsJoined(true)}
                className="touch-target-primary px-8 rounded-xl bg-primary hover:bg-primary-container text-white font-heading font-bold text-base shadow-lg transition-transform active:scale-[0.98] flex items-center"
              >
                <Video className="w-5 h-5 mr-2" />
                <span>Join Call in Window</span>
              </button>
              <a
                href={introCall.join_url}
                target="_blank"
                rel="noreferrer"
                className="touch-target-secondary px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-600 flex items-center"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                <span>Open in Separate Tab</span>
              </a>
            </div>

            <p className="text-xs text-slate-400 flex items-center pt-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 mr-1.5" />
              End-to-end encrypted WebRTC audio/video powered by meet.jit.si
            </p>
          </div>
        ) : (
          <div className="relative w-full h-[520px]">
            <iframe
              src={`${introCall.join_url}#config.prejoinPageEnabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false`}
              title="Jitsi Meet Introductory Video Call"
              allow="camera; microphone; fullscreen; display-capture; autoplay"
              className="w-full h-full border-0"
            />
          </div>
        )}
      </div>

      {/* Post-Call Actions */}
      <div className="bg-surface-card p-6 rounded-2xl border border-outline-light/50 shadow-card flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2 text-xs text-on-surface-variant">
          <AlertCircle className="w-4 h-4 text-secondary flex-shrink-0" />
          <span>
            Satisfied with the conversation? Complete the call to unlock your
            7-day care trial advance deposit.
          </span>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={onReschedule}
            className="touch-target-secondary px-4 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            Reschedule Call
          </button>
          <button
            type="button"
            onClick={onCompleteCall}
            disabled={isCompleting}
            className="touch-target-primary flex-1 sm:flex-none px-8 rounded-xl bg-tertiary hover:bg-tertiary/90 text-white font-heading font-bold text-base shadow-md transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center"
          >
            {isCompleting ? (
              <span>Recording Completion...</span>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 mr-2" />
                <span>Complete Interview & Proceed to Payment</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
