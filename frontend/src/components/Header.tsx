import React, { useState, useEffect } from "react";
import { ShieldCheck, PhoneCall, Clock, Heart } from "lucide-react";

export const Header: React.FC = () => {
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const istString = now.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      setCurrentTime(istString);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-surface-card border-b border-outline-light/40 shadow-sm backdrop-blur-md bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-md">
              <Heart className="w-7 h-7 text-white fill-white/20" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-extrabold font-heading text-primary tracking-tight">
                  CareConnect
                </span>
                <span className="text-xs uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold tracking-wider">
                  Chennai
                </span>
              </div>
              <p className="text-xs text-on-surface-variant font-medium hidden sm:block">
                Curated Elder Care & Clinical Attendant Platform
              </p>
            </div>
          </div>

          {/* Trust Signals: Live Clock, DPDP Act 2023 Badge, 24/7 Hotline */}
          <div className="flex items-center space-x-3 sm:space-x-6">
            {/* Live Chennai IST Clock */}
            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-surface-container text-primary font-medium text-xs">
              <Clock className="w-4 h-4 text-primary" />
              <span>
                Chennai (IST):{" "}
                <strong className="font-semibold">
                  {currentTime || "12:00 PM"}
                </strong>
              </span>
            </div>

            {/* DPDP Act 2023 Compliance Badge */}
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-tertiary-light text-tertiary text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>DPDP Act 2023 Compliant</span>
            </div>

            {/* 24/7 Emergency Helpline */}
            <a
              href="tel:+914424908000"
              className="flex items-center space-x-2 px-3 py-2 sm:px-4 sm:py-2 rounded-lg bg-surface text-on-surface hover:bg-surface-container border border-outline-light/60 transition-colors text-xs sm:text-sm font-semibold"
            >
              <PhoneCall className="w-4 h-4 text-primary" />
              <span className="hidden lg:inline">24/7 Support:</span>
              <span className="text-primary font-bold">+91 44 2490 8000</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};
