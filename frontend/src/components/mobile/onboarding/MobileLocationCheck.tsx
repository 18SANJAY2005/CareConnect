import React, { useState } from "react";
import {
  MapPin,
  Navigation,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Map as MapIcon,
  Search,
} from "lucide-react";
import { api } from "../../../services/api";
import type { LocationVerifyResponse } from "../../../types";
import {
  PreciseLocationPicker,
  type PreciseLocationData,
} from "../../common/PreciseLocationPicker";

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
  initialPostalCode = "",
}) => {
  // Removed activeTab state

  const [postalCode, setPostalCode] = useState(initialPostalCode);
  const [locality, setLocality] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("Chennai");
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);

  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] =
    useState<LocationVerifyResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle location chosen from the precise interactive map picker
  const handlePreciseLocationSelected = async (data: PreciseLocationData) => {
    setLatitude(data.latitude);
    setLongitude(data.longitude);
    setAddressLine1(data.addressLine1);
    setLocality(data.locality);
    setCity(data.city);
    setPostalCode(data.postalCode);

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const res = await api.verifyLocation({
        latitude: data.latitude,
        longitude: data.longitude,
        postalCode: data.postalCode,
        locality: data.locality,
        city: data.city,
        addressLine1: data.addressLine1,
      });

      const isMunicipalZone = (val?: string) =>
        Boolean(val && /^zone\s*\d+/i.test(val.trim()));
      setVerifyResult(res);
      if (res.postalCode) setPostalCode(res.postalCode);
      if (res.locality && !isMunicipalZone(res.locality) && !data.locality) {
        setLocality(res.locality);
      }
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          "Couldn't verify location coverage. Please verify your address or PIN.",
      );
    } finally {
      setIsVerifying(false);
    }
  };

  // Verify directly with PIN
  const verifyWithPin = async (pin: string) => {
    if (pin.length !== 6) return;
    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const isMunicipalZone = (val?: string) =>
        Boolean(val && /^zone\s*\d+/i.test(val.trim()));
      const res = await api.verifyLocation({
        postalCode: pin,
      });

      setVerifyResult(res);
      if (res.locality && !isMunicipalZone(res.locality))
        setLocality(res.locality);
      if (res.city && !isMunicipalZone(res.city)) setCity(res.city);
      if (res.latitude) setLatitude(res.latitude);
      if (res.longitude) setLongitude(res.longitude);
    } catch (err: any) {
      setErrorMessage(err.message || "Unable to verify postal code.");
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
      addressLine1: addressLine1 || "Verified Residence",
      locality: locality || verifyResult.locality || "Care Corridor",
      city: city || verifyResult.city || "Chennai",
      postalCode: postalCode || verifyResult.postalCode || "600020",
      latitude: verifyResult.latitude ?? latitude,
      longitude: verifyResult.longitude ?? longitude,
    });
  };

  return (
    <div className="flex-1 flex flex-col justify-between px-4 py-5 animate-fadeIn text-slate-900 overflow-y-auto">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-3">
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
          Pinpoint your exact doorstep on the map to check coverage.
        </p>

      </div>

      {/* Main Content Area */}
      <div className="my-3 space-y-3">
        {/* Interactive Precise Location Picker */}
        <div className="space-y-3">
          <PreciseLocationPicker
            initialLatitude={latitude}
            initialLongitude={longitude}
            initialAddress={addressLine1}
            initialPostalCode={postalCode}
            onLocationSelect={handlePreciseLocationSelected}
            confirmButtonLabel={
              isVerifying
                ? "Verifying Serviceability..."
                : "Verify This Doorstep Pin"
            }
            compact={true}
          />
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Verification Result Card */}
        {verifyResult && (
          <div
            className={`p-4 rounded-2xl border animate-fadeIn ${
              verifyResult.serviceable
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-amber-50 border-amber-200 text-amber-900"
            }`}
          >
            <div className="flex items-start gap-3">
              {verifyResult.serviceable ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="text-xs font-extrabold flex items-center gap-1.5">
                  <span>
                    {verifyResult.serviceable
                      ? "Care Corridor Verified & Active!"
                      : "Outside Active Care Corridor"}
                  </span>
                </div>
                <div className="text-xs text-slate-700 leading-relaxed">
                  {verifyResult.serviceable
                    ? `Assigned Hub: ${verifyResult.assignedHub || "Primary Care Hub"}${
                        verifyResult.locality
                          ? ` (${verifyResult.locality})`
                          : ""
                      }. Verified healthcare attendants and supervisors are on standby for this address.`
                    : verifyResult.message ||
                      `We are currently not active in PIN ${postalCode}. You can join our priority expansion waitlist.`}
                </div>
                {verifyResult.serviceable && (
                  <div className="pt-1.5 text-[11px] font-mono text-emerald-800 flex items-center gap-2">
                    <Navigation className="w-3 h-3 text-emerald-600" />
                    <span>
                      GPS: {verifyResult.latitude ?? latitude?.toFixed(4)},{" "}
                      {verifyResult.longitude ?? longitude?.toFixed(4)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Continue Button */}
      <div className="pt-2 pb-1">
        <button
          onClick={handleProceed}
          disabled={!verifyResult || !verifyResult.serviceable}
          className="w-full min-h-[52px] bg-teal-700 hover:bg-teal-800 disabled:opacity-50 active:scale-98 text-white rounded-2xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition"
        >
          <span>Continue to Care Needs</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default MobileLocationCheck;
