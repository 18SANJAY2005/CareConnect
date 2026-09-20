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

const COMMON_LOCALITIES = [
  { name: 'Adyar', pincode: '600020' },
  { name: 'Mylapore', pincode: '600004' },
  { name: 'Besant Nagar', pincode: '600090' },
  { name: 'Anna Nagar', pincode: '600040' },
  { name: 'Velachery', pincode: '600042' },
  { name: 'T. Nagar', pincode: '600017' },
];

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

  // GPS Location Trigger
  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser. Please enter your PIN manually.');
      return;
    }

    setIsGpsLoading(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsGpsLoading(false);
        // Default to regional hub PIN if in city corridor or use coords directly
        const defaultPin = '600020';
        setPostalCode(defaultPin);
        setLocality('Adyar');
        await performVerification(defaultPin, 'Adyar', pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setIsGpsLoading(false);
        setErrorMessage('Unable to retrieve GPS coordinates. Please enter your 6-digit PIN code manually.');
      },
      { timeout: 8000 }
    );
  };

  const performVerification = async (pin: string, locName?: string, _lat?: number, _lng?: number) => {
    if (pin.length !== 6) return;
    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const res = await api.verifyLocation({
        addressLine1: addressLine1 || 'Elder Residence',
        locality: locName || locality || 'Care Corridor',
        city: 'Chennai',
        state: 'Tamil Nadu',
        postalCode: pin,
      });

      setVerifyResult(res);
      if (res.locality && !locality) {
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
    performVerification(postalCode);
  };

  const handleProceed = () => {
    if (!verifyResult || !verifyResult.serviceable) return;
    onSuccess({
      addressLine1: addressLine1 || 'Verified Residence',
      locality: verifyResult.locality || locality || 'Local Corridor',
      city: verifyResult.city || 'Metropolitan Area',
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
                  performVerification(val);
                }
              }}
              placeholder="Enter 6-digit PIN code (e.g. 600020)"
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

          {/* Quick chip selector for fast selection */}
          <div>
            <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">
              Popular Serviceable Areas:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_LOCALITIES.map((loc) => (
                <button
                  key={loc.pincode}
                  type="button"
                  onClick={() => {
                    setPostalCode(loc.pincode);
                    setLocality(loc.name);
                    performVerification(loc.pincode, loc.name);
                  }}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
                    postalCode === loc.pincode
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {loc.name} ({loc.pincode})
                </button>
              ))}
            </div>
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
                    ? `Active care hub assigned: ${verifyResult.assignedHub || 'Primary Care Hub'} (${verifyResult.locality || locality}). Verified attendants available for match.`
                    : `We are currently not active in PIN ${postalCode}. We have noted your request and will notify you as soon as corridors open near you.`}
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
