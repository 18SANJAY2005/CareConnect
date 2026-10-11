import React, { useState } from "react";
import {
  Navigation,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ArrowRight,
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

  // Service Interest submission state for unserviceable areas
  const [interestName, setInterestName] = useState("");
  const [interestPhone, setInterestPhone] = useState("");
  const [interestEmail, setInterestEmail] = useState("");
  const [interestNotes, setInterestNotes] = useState("");
  const [isSubmittingInterest, setIsSubmittingInterest] = useState(false);
  const [interestSubmitted, setInterestSubmitted] = useState(false);
  const [interestMessage, setInterestMessage] = useState<string | null>(null);

  const handleSubmitInterest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interestName.trim() || !interestPhone.trim()) {
      setInterestMessage("Please enter your name and phone number.");
      return;
    }
    setIsSubmittingInterest(true);
    setInterestMessage(null);
    try {
      await api.submitServiceInterest({
        fullName: interestName.trim(),
        phone: interestPhone.trim(),
        email: interestEmail.trim() || undefined,
        postalCode: postalCode || undefined,
        locality: locality || undefined,
        serviceType: "ELDER_HOME_CARE",
        notes: interestNotes.trim() || undefined,
      });
      setInterestSubmitted(true);
      setInterestMessage("Thank you! Your interest has been registered. Our care team will notify you when services launch in your area.");
    } catch (err: any) {
      setInterestMessage(err.message || "Failed to submit interest. Please try again.");
    } finally {
      setIsSubmittingInterest(false);
    }
  };

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
                      `We are currently not active in PIN ${postalCode}. Join our priority waitlist to be notified when care expands to your locality.`}
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
                {!verifyResult.serviceable && (
                  <div className="mt-3 pt-3 border-t border-amber-200/80">
                    {interestSubmitted ? (
                      <div className="p-3 bg-emerald-100/80 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-medium">
                        ✓ {interestMessage}
                      </div>
                    ) : (
                      <form onSubmit={handleSubmitInterest} className="space-y-2.5">
                        <div className="text-xs font-bold text-amber-950">
                          Register Interest for Future Coverage
                        </div>
                        {interestMessage && (
                          <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 text-[11px] rounded-lg">
                            {interestMessage}
                          </div>
                        )}
                        <input
                          type="text"
                          value={interestName}
                          onChange={(e) => setInterestName(e.target.value)}
                          placeholder="Your full name *"
                          className="w-full h-10 px-3 bg-white rounded-xl border border-amber-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-teal-600"
                          required
                        />
                        <input
                          type="tel"
                          value={interestPhone}
                          onChange={(e) => setInterestPhone(e.target.value)}
                          placeholder="Contact phone number *"
                          className="w-full h-10 px-3 bg-white rounded-xl border border-amber-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-teal-600"
                          required
                        />
                        <input
                          type="email"
                          value={interestEmail}
                          onChange={(e) => setInterestEmail(e.target.value)}
                          placeholder="Email address (optional)"
                          className="w-full h-10 px-3 bg-white rounded-xl border border-amber-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-teal-600"
                        />
                        <textarea
                          value={interestNotes}
                          onChange={(e) => setInterestNotes(e.target.value)}
                          placeholder="Any specific care needs or timing? (optional)"
                          rows={2}
                          className="w-full p-2.5 bg-white rounded-xl border border-amber-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-teal-600"
                        />
                        <button
                          type="submit"
                          disabled={isSubmittingInterest}
                          className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition"
                        >
                          {isSubmittingInterest ? "Submitting..." : "Submit Interest for Waitlist"}
                        </button>
                      </form>
                    )}
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
