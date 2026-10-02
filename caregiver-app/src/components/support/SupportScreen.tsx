import React, { useState, useEffect } from 'react';
import { 
  PhoneCall, 
  ShieldCheck, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle,
  LifeBuoy,
  FileCheck
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { offlineQueue } from '../../services/offlineQueue';
import { CaregiverKycModal } from '../profile/CaregiverKycModal';
import type { OfflineQueueItem } from '../../types';

export const SupportScreen: React.FC = () => {
  const { t } = useLanguage();
  const [queueItems, setQueueItems] = useState<OfflineQueueItem[]>([]);
  const [isSimulated, setIsSimulated] = useState<boolean>(offlineQueue.getSimulatedOffline());
  const [syncing, setSyncing] = useState<boolean>(false);
  const [isKycOpen, setIsKycOpen] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = offlineQueue.subscribe((items) => {
      setQueueItems(items);
      setIsSimulated(offlineQueue.getSimulatedOffline());
    });
    return unsubscribe;
  }, []);

  const handleToggleSimulatedOffline = () => {
    const nextState = !isSimulated;
    offlineQueue.setSimulatedOffline(nextState);
    setIsSimulated(nextState);
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await offlineQueue.processQueue();
    } finally {
      setSyncing(false);
    }
  };

  const handleClearQueue = () => {
    if (window.confirm('Clear all queued offline items?')) {
      offlineQueue.clearQueue();
    }
  };

  const isOnline = offlineQueue.isOnline;
  const pendingCount = queueItems.filter((i) => i.status === 'PENDING' || i.status === 'FAILED').length;

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto pb-24">
      {/* Caregiver Identity & KYC Card */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-50 text-primary rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Identity & KYC Verification</h3>
              <p className="text-[11px] text-slate-500">Government ID & verification status</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsKycOpen(true)}
            className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-xl shadow-xs hover:bg-primary-hover transition-colors touch-action-manipulation"
          >
            Manage KYC
          </button>
        </div>
      </div>

      {/* 24/7 Operations Command Hotline */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-teal-50 text-primary rounded-xl">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">{t('hotline')}</h3>
            <p className="text-[11px] text-slate-500">Chennai Operations Central Dispatch</p>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <a
            href="tel:+919876599999"
            className="w-full py-3.5 px-4 min-h-[48px] bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 touch-action-manipulation"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Call Operations Supervisor (+91 98765 99999)</span>
          </a>

          <a
            href="tel:108"
            className="w-full py-3.5 px-4 min-h-[48px] bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 touch-action-manipulation"
          >
            <PhoneCall className="w-4 h-4 text-red-600" />
            <span>Govt. Emergency Ambulance (108)</span>
          </a>
        </div>
      </div>

      {/* Offline Storage & Network Diagnostics */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`p-2 rounded-xl ${
                isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              }`}
            >
              {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Network & Offline Sync</h3>
              <p className="text-[11px] text-slate-500">
                {isOnline ? t('networkOnline') : t('networkOffline')} • {pendingCount} pending
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleSimulatedOffline}
            className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
              isSimulated
                ? 'bg-amber-500 text-white border-amber-600'
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
          >
            {isSimulated ? t('simOnline') : t('simOffline')}
          </button>
        </div>

        {/* Sync Controls */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            disabled={syncing || !isOnline || pendingCount === 0}
            onClick={handleSyncNow}
            className="flex-1 py-2 px-3 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl font-bold text-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {syncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>{t('syncNow')}</span>
          </button>

          {queueItems.length > 0 && (
            <button
              type="button"
              onClick={handleClearQueue}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl border border-slate-200 transition-colors"
              title="Clear queue"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Queued Items List */}
        {queueItems.length > 0 && (
          <div className="mt-3 border-t border-slate-100 pt-3 space-y-2 max-h-48 overflow-y-auto">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Queued Offline Operations
            </span>
            {queueItems.map((item) => (
              <div
                key={item.id}
                className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between"
              >
                <div className="truncate flex-1 mr-2">
                  <div className="font-semibold text-slate-800 truncate">
                    {item.method} {item.endpoint}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    item.status === 'SYNCED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : item.status === 'FAILED'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Professional Care Guidelines */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
        <div className="flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-sm text-slate-900">Caregiver Clinical Boundaries</h3>
        </div>

        <ul className="text-xs text-slate-600 space-y-2 list-disc pl-4 leading-relaxed">
          <li>
            <strong>Medication Observation Only:</strong> Administer prescribed oral medications per sponsor schedule. Invasive clinical procedures are strictly prohibited.
          </li>
          <li>
            <strong>Monitoring Measurements:</strong> Vitals logged are non-diagnostic physiological observations for care continuity.
          </li>
          <li>
            <strong>Patient Privacy (DPDP Act 2023):</strong> Photos and records must only be shared through the secure CareConnect platform.
          </li>
        </ul>
      </div>

      {/* KYC Modal */}
      <CaregiverKycModal isOpen={isKycOpen} onClose={() => setIsKycOpen(false)} />
    </div>
  );
};

