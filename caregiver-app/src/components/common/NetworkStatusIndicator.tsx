import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle2, Wifi } from 'lucide-react';
import { offlineQueue } from '../../services/offlineQueue';

export type ConnectivityState = 'ONLINE' | 'OFFLINE' | 'RESTORED';

interface NetworkStatusIndicatorProps {
  className?: string;
  showText?: boolean;
}

export const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  className = '',
  showText = true,
}) => {
  const [networkState, setNetworkState] = useState<ConnectivityState>(() => {
    return offlineQueue.isOnline ? 'ONLINE' : 'OFFLINE';
  });
  const [pendingCount, setPendingCount] = useState<number>(() => offlineQueue.getPendingCount());

  // Track previous online state to detect offline -> online transitions
  const prevOnlineRef = useRef<boolean>(offlineQueue.isOnline);
  const restoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleStatusChange = () => {
      const currentlyOnline = offlineQueue.isOnline;
      const wasOnline = prevOnlineRef.current;
      setPendingCount(offlineQueue.getPendingCount());

      if (!currentlyOnline) {
        if (restoreTimerRef.current) {
          clearTimeout(restoreTimerRef.current);
          restoreTimerRef.current = null;
        }
        setNetworkState('OFFLINE');
      } else if (!wasOnline && currentlyOnline) {
        // Transitioned from OFFLINE to ONLINE
        setNetworkState('RESTORED');
        if (restoreTimerRef.current) {
          clearTimeout(restoreTimerRef.current);
        }
        // Show "✓ Back online" for 3.5 seconds, then transition to "● Online"
        restoreTimerRef.current = setTimeout(() => {
          setNetworkState('ONLINE');
          restoreTimerRef.current = null;
        }, 3500);
      } else if (currentlyOnline && networkState !== 'RESTORED') {
        setNetworkState('ONLINE');
      }

      prevOnlineRef.current = currentlyOnline;
    };

    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    const unsubQueue = offlineQueue.subscribe((items) => {
      const count = items.filter((i) => i.status === 'PENDING' || i.status === 'FAILED').length;
      setPendingCount(count);
      handleStatusChange();
    });

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
      unsubQueue();
      if (restoreTimerRef.current) {
        clearTimeout(restoreTimerRef.current);
      }
    };
  }, [networkState]);

  if (networkState === 'OFFLINE') {
    return (
      <div
        role="status"
        aria-live="assertive"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500 text-white border border-amber-600 shadow-sm animate-pulse transition-all ${className}`}
        title={`Offline mode active. ${pendingCount > 0 ? `${pendingCount} actions queued.` : 'Tasks will be queued locally.'}`}
      >
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-white" />
        {showText && <span>⚠ Offline</span>}
        {pendingCount > 0 && (
          <span className="ml-0.5 px-1 py-0.2 text-[9px] bg-amber-700/80 rounded font-mono">
            {pendingCount}
          </span>
        )}
      </div>
    );
  }

  if (networkState === 'RESTORED') {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-600 text-white border border-emerald-700 shadow-sm transition-all animate-bounce ${className}`}
        title="Internet connection restored. Synchronizing offline queue..."
      >
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-100" />
        {showText && <span>✓ Back online</span>}
      </div>
    );
  }

  // ONLINE STATE
  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 transition-all ${className}`}
      title="Connected to network"
    >
      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      {showText && <span>● Online</span>}
    </div>
  );
};
