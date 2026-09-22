import React, { useState, useEffect } from 'react';
import { Download, X, Share2, PlusSquare } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PwaInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 1. If already installed/running as standalone PWA, do not display
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      return;
    }

    // 2. Check if user recently dismissed the banner
    const isDismissed = localStorage.getItem('careconnect_pwa_dismissed');
    if (isDismissed) {
      return;
    }

    // 3. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent);

    if (isIosDevice && isSafari) {
      setIsIos(true);
      setIsVisible(true);
      return;
    }

    // 4. Capture Chromium/Android beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(!showIosGuide);
      return;
    }

    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('careconnect_pwa_dismissed', 'true');
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-teal-800 to-teal-900 text-white px-3.5 py-2.5 shadow-md flex flex-col gap-2 transition-all duration-200 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src="/icons/icon-192.png"
            alt="CareConnect"
            className="w-8 h-8 rounded-lg shadow-sm shrink-0 border border-teal-600/50"
          />
          <div className="min-w-0">
            <div className="font-bold text-white leading-tight truncate">Install CareConnect App</div>
            <div className="text-[11px] text-teal-200 truncate">Fast access & offline monitoring</div>
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

      {/* iOS Safari Home Screen instructions tooltip */}
      {isIos && showIosGuide && (
        <div className="mt-1 p-2 bg-teal-950/80 rounded-lg border border-teal-700/60 text-[11px] text-teal-100 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 font-semibold text-white">
            <span>To install on iOS:</span>
          </div>
          <div className="flex items-center gap-1 text-slate-200">
            <span>1. Tap Share</span>
            <Share2 className="w-3.5 h-3.5 text-teal-300 inline" />
            <span>in your Safari toolbar</span>
          </div>
          <div className="flex items-center gap-1 text-slate-200">
            <span>2. Select "Add to Home Screen"</span>
            <PlusSquare className="w-3.5 h-3.5 text-teal-300 inline" />
          </div>
        </div>
      )}
    </div>
  );
};

