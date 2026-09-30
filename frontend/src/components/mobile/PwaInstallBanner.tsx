import React, { useState, useEffect } from "react";
import {
  Download,
  X,
  Share2,
  PlusSquare,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const PwaInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isHttps, setIsHttps] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 1. If already installed/running as standalone PWA, do not display
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;

    if (isStandalone) {
      return;
    }

    // 2. Check if user recently dismissed the banner
    const isDismissed = localStorage.getItem("careconnect_pwa_dismissed");
    if (isDismissed) {
      return;
    }

    // 3. Detect platform and protocol
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    const isMobile = isIosDevice || isAndroidDevice || window.innerWidth <= 768;

    const httpsActive =
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    setIsHttps(httpsActive);
    setIsIos(isIosDevice);

    // Show banner on any mobile device if not standalone
    if (isMobile) {
      setIsVisible(true);
    }

    // 4. Capture Chromium/Android beforeinstallprompt event if fired
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    // If native prompt is ready, trigger it
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsVisible(false);
        setDeferredPrompt(null);
      }
      return;
    }

    // Otherwise toggle instructions guide
    setShowGuide(!showGuide);
  };

  const handleSwitchToHttps = () => {
    const httpsUrl = window.location.href.replace("http:", "https:");
    window.location.href = httpsUrl;
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("careconnect_pwa_dismissed", "true");
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-teal-800 to-teal-900 text-white px-3.5 py-2.5 shadow-md flex flex-col gap-2 transition-all duration-200 text-xs z-50">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src="/icons/icon-192.png"
            alt="CareConnect"
            className="w-8 h-8 rounded-lg shadow-sm shrink-0 border border-teal-600/50"
          />
          <div className="min-w-0">
            <div className="font-bold text-white leading-tight truncate">
              Install CareConnect App
            </div>
            <div className="text-[11px] text-teal-200 truncate">
              {deferredPrompt
                ? "1-Tap home screen install"
                : "Add to home screen for full app"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInstallClick}
            className="px-2.5 py-1 bg-white text-teal-950 font-bold rounded-lg shadow-sm hover:bg-teal-50 active:scale-95 transition flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5 text-teal-800" />
            <span>Install</span>
          </button>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss install banner"
            className="p-1 text-teal-300 hover:text-white rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Helper guide dropdown when clicked or if plain HTTP on mobile */}
      {showGuide && (
        <div className="mt-1 p-2.5 bg-teal-950/90 rounded-xl border border-teal-700/60 text-[11px] text-teal-100 flex flex-col gap-2">
          {!isHttps && (
            <div className="p-2 bg-amber-950/60 border border-amber-500/40 rounded-lg text-amber-200 space-y-1.5">
              <div className="font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Notice: Chrome requires HTTPS for 1-Tap Install</span>
              </div>
              <p className="text-[10px] text-amber-100 leading-relaxed">
                You are currently on plain HTTP. Vite is equipped with HTTPS
                support. Tap below to switch to HTTPS (accept the dev
                certificate when prompted):
              </p>
              <button
                onClick={handleSwitchToHttps}
                className="mt-1 w-full py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs flex items-center justify-center gap-1"
              >
                <span>Switch to HTTPS (Secure Context)</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}

          {isIos ? (
            <div className="space-y-1 text-slate-200">
              <div className="font-semibold text-white">
                To install on iPhone (Safari):
              </div>
              <div className="flex items-center gap-1.5">
                <span>1. Tap Share</span>
                <Share2 className="w-3.5 h-3.5 text-teal-300 inline" />
                <span>at the bottom</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>2. Select "Add to Home Screen"</span>
                <PlusSquare className="w-3.5 h-3.5 text-teal-300 inline" />
              </div>
            </div>
          ) : (
            <div className="space-y-1 text-slate-200">
              <div className="font-semibold text-white">
                To install on Android:
              </div>
              <div>
                1. Tap Chrome's menu <strong>(3 vertical dots ⋮)</strong> in top
                right.
              </div>
              <div>
                2. Tap <strong>"Install app"</strong> or{" "}
                <strong>"Add to Home screen"</strong>.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
