import React, { useState } from 'react';
import { MapPin, Navigation, CheckCircle2, XCircle, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '../../../services/api';
import type { LocationVerifyResponse } from '../../../types';

interface MobileLocationCheckProps {
  onSuccess: (locationData: {
    addressLine1: string;
    locality: string;
    city: string;
    postalCode: string;
    latitude?: number;
    longitude?: number;
  }) => void;
  onBack: () => void;
  initialPostalCode?: string;
}

export const MobileLocationCheck: React.FC<MobileLocationCheckProps> = ({
  onSuccess,
  onBack,
  initialPostalCode = '',
}) => {
  const [postalCode, setPostalCode] = useState(initialPostalCode);
  const [locality, setLocality] = useState('');
  const [addressLine1] = useState('');
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<LocationVerifyResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // GPS Location Trigger - resolves via backend GPS serviceability check
  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setErrorMessage("Couldn't access your location. You can enter your Digital PIN manually.");
      return;
    }

    setIsGpsLoading(true);
    setErrorMessage(null);
    setVerifyResult(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsGpsLoading(false);
        const { latitude, longitude } = pos.coords;
        await verifyWithCoords(latitude, longitude);
      },
      () => {
        setIsGpsLoading(false);
        setErrorMessage("Couldn't access your location. You can enter your Digital PIN manually.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const verifyWithCoords = async (latitude: number, longitude: number) => {
    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const res = await api.verifyLocation({
        latitude,
        longitude,
      });

      setVerifyResult(res);
      if (res.postalCode) {
        setPostalCode(res.postalCode);
      }
      if (res.locality) {
        setLocality(res.locality);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Couldn't verify location. Please enter your Digital PIN manually.");
    } finally {
      setIsVerifying(false);
    }
  };

  const verifyWithPin = async (pin: string) => {
    if (pin.length !== 6) return;
    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const res = await api.verifyLocation({
        postalCode: pin,
      });

      setVerifyResult(res);
      if (res.locality) {
        setLocality(res.locality);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to verify postal code.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleManualCheck = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (postalCode.length === 6) {
      verifyWithPin(postalCode);
    }
  };

  const handleProceed = () => {
    if (!verifyResult || !verifyResult.serviceable) return;
    onSuccess({
      addressLine1: addressLine1 || 'Verified Residence',
      locality: verifyResult.locality || locality || '',
      city: verifyResult.city || '',
      postalCode: verifyResult.postalCode || postalCode,
      latitude: verifyResult.latitude,
      longitude: verifyResult.longitude,
    });
  };

  return (
    <div className="flex-1 flex flex-col justify-between px-5 py-6 animate-fadeIn text-slate-900">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full">
            Step 3 of 4
          </span>
        </div>

        <h2 className="text-2xl font-extrabold font-heading text-slate-900">
          Where is care needed?
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Check whether CareConnect is available near your home.
        </p>
      </div>

      {/* Center Actions */}
      <div className="my-auto py-4 space-y-4">
        {/* GPS Button */}
        <button
          type="button"
          onClick={handleUseGps}
          disabled={isGpsLoading || isVerifying}
          className="w-full min-h-[56px] p-4 bg-teal-50 hover:bg-teal-100 border-2 border-primary/30 rounded-2xl flex items-center justify-center gap-2.5 text-primary font-bold text-sm transition active:scale-98"
        >
          {isGpsLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Detecting your location...</span>
            </>
          ) : (
            <>
              <Navigation className="w-5 h-5 text-primary fill-primary/20" />
              <span>Use My Current Location</span>
            </>
          )}
        </button>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <div className="flex-1 h-px bg-slate-200" />
          <span>or enter PIN manually</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* PIN Input Form */}
        <form onSubmit={handleManualCheck} className="space-y-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <MapPin className="w-5 h-5" />
            </div>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={postalCode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setPostalCode(val);
                setVerifyResult(null);
                if (val.length === 6) {
                  verifyWithPin(val);
                }
              }}
              placeholder="Enter 6-digit PIN code"
              className="w-full h-14 pl-12 pr-28 bg-white rounded-2xl border border-slate-300 text-slate-900 font-bold text-base focus:border-primary focus:ring-2 focus:ring-teal-500/20 shadow-sm"
            />
            <button
              type="submit"
              disabled={isVerifying || postalCode.length < 6}
              className="absolute right-2 top-2 bottom-2 px-4 bg-primary hover:bg-primary-hover disabled:opacity-40 text-white font-bold text-xs rounded-xl transition"
            >
              {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Check'}
            </button>
          </div>
        </form>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Verification Result Card */}
        {verifyResult && (
          <div
            className={`p-4 rounded-2xl border ${
              verifyResult.serviceable
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-start gap-3">
              {verifyResult.serviceable ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="text-xs font-extrabold">
                  {verifyResult.serviceable
                    ? 'CareConnect is Available!'
                    : 'Service Not Yet Available'}
                </div>
                <div className="text-xs text-slate-700 leading-relaxed">
                  {verifyResult.serviceable
                    ? `Active care hub assigned: ${verifyResult.assignedHub || 'Primary Care Hub'}${verifyResult.locality ? ` (${verifyResult.locality})` : ''}. Verified caregivers available for match.`
                    : (verifyResult.message || `We are currently not active in PIN ${postalCode}. We have noted your request and will notify you as soon as corridors open near you.`)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Continue Button */}
      <div className="pt-4">
        <button
          onClick={handleProceed}
          disabled={!verifyResult || !verifyResult.serviceable}
          className="w-full min-h-[56px] bg-primary hover:bg-primary-hover disabled:opacity-50 active:scale-98 text-white rounded-2xl font-bold text-base shadow-md flex items-center justify-center gap-2 transition"
        >
          <span>Continue to Care Needs</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
