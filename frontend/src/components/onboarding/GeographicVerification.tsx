import React, { useState, useEffect } from "react";
import {
  MapPin,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Navigation,
  ArrowRight,
  Building2,
  Compass,
  Info,
} from "lucide-react";
import { api } from "../../services/api";
import { useOnboarding } from "../../context/OnboardingContext";
import type { LocationVerifyResponse } from "../../types";
import {
  PreciseLocationPicker,
  type PreciseLocationData,
} from "../common/PreciseLocationPicker";

interface LocalityOption {
  name: string;
  pincode: string;
  hub: string;
}

const SERVICEABLE_LOCALITIES: LocalityOption[] = [
  { name: "Adyar", pincode: "600020", hub: "South Care Hub" },
  { name: "Besant Nagar", pincode: "600090", hub: "South Care Hub" },
  { name: "Thiruvanmiyur", pincode: "600041", hub: "South Care Hub" },
  { name: "Velachery", pincode: "600042", hub: "South Care Hub" },
  { name: "Mylapore", pincode: "600004", hub: "Central Care Hub" },
  { name: "T. Nagar", pincode: "600017", hub: "Central Care Hub" },
  { name: "Alwarpet", pincode: "600018", hub: "Central Care Hub" },
  { name: "Nungambakkam", pincode: "600034", hub: "Central Care Hub" },
  { name: "Anna Nagar", pincode: "600040", hub: "North-West Care Hub" },
  { name: "Kilpauk", pincode: "600010", hub: "Central Care Hub" },
  { name: "Royapettah", pincode: "600014", hub: "Central Care Hub" },
  { name: "Perungudi (OMR)", pincode: "600096", hub: "OMR Care Hub" },
  { name: "Sholinganallur (OMR)", pincode: "600119", hub: "OMR Care Hub" },
  { name: "R.A. Puram", pincode: "600028", hub: "Central Care Hub" },
  { name: "Ashok Nagar", pincode: "600083", hub: "Central Care Hub" },
];

export const GeographicVerification: React.FC = () => {
  const { elders, activeElder, setCurrentStep, refreshElders } =
    useOnboarding();

  // Basic elder fields if new
  const [elderName, setElderName] = useState("");
  const [elderAge, setElderAge] = useState(0);
  const [elderGender, setElderGender] = useState<"FEMALE" | "MALE" | "OTHER">(
    "FEMALE",
  );

  // Location fields
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [locality, setLocality] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [landmark, setLandmark] = useState("");

  // Verification state
  const [verifyResult, setVerifyResult] =
    useState<LocationVerifyResponse | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Auto-fill from active elder if already set, or clear for new elder
  useEffect(() => {
    if (activeElder) {
      setElderName(activeElder.name);
      setElderAge(activeElder.age);
      setElderGender(activeElder.gender);
      if (activeElder.location) {
        const loc = activeElder.location;
        setAddressLine1(loc.addressLine1);
        setAddressLine2(loc.addressLine2 || "");
        setLocality(loc.locality);
        setCity(loc.city);
        setState(loc.state);
        setPostalCode(loc.postalCode);
        setLandmark(loc.landmark || "");
        setVerifyResult({
          serviceable: loc.serviceable,
          verificationStatus: loc.verificationStatus,
          message: "Saved address retrieved from database.",
          latitude: loc.latitude,
          longitude: loc.longitude,
          locality: loc.locality,
          city: loc.city,
          postalCode: loc.postalCode,
          assignedHub: "Primary Care Hub",
        });
      }
    } else {
      setElderName("");
      setElderAge(0);
      setElderGender("FEMALE");
      setAddressLine1("");
      setAddressLine2("");
      setLocality("");
      setCity("Chennai");
      setState("Tamil Nadu");
      setPostalCode("");
      setLandmark("");
      setVerifyResult(null);
      setErrorMessage("");
    }
  }, [activeElder]);

  const handleLocalitySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = SERVICEABLE_LOCALITIES.find(
      (l) => l.name === e.target.value,
    );
    if (selected) {
      setLocality(selected.name);
      setPostalCode(selected.pincode);
      setCity("Chennai");
      setState("Tamil Nadu");
    } else {
      setLocality(e.target.value);
    }
  };

  const handlePickerSelect = async (locData: PreciseLocationData) => {
    setAddressLine1(locData.addressLine1);
    if (locData.addressLine2) setAddressLine2(locData.addressLine2);
    setLocality(locData.locality);
    setCity(locData.city);
    setState(locData.state);
    setPostalCode(locData.postalCode);

    setErrorMessage("");
    setIsVerifying(true);
    try {
      const res = await api.verifyLocation({
        addressLine1: locData.addressLine1,
        addressLine2: locData.addressLine2,
        locality: locData.locality,
        city: locData.city,
        state: locData.state,
        postalCode: locData.postalCode,
        latitude: locData.latitude,
        longitude: locData.longitude,
      });
      const sanitized = {
        ...res,
        message: res.message
          ? res.message
              .replace(/Chennai metropolitan region/gi, "active care network")
              .replace(/in Chennai/gi, "")
              .replace(/across Chennai/gi, "across our network")
              .replace(
                /active Chennai service corridors/gi,
                "active service corridors",
              )
          : res.message,
      };
      setVerifyResult(sanitized);
    } catch (err: any) {
      setErrorMessage(err.message || "Geographic verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyLocation = async (simulateState?: string) => {
    setErrorMessage("");
    setIsVerifying(true);
    try {
      const res = await api.verifyLocation({
        addressLine1,
        addressLine2,
        locality,
        city: city || "Chennai",
        state: state || "Tamil Nadu",
        postalCode,
        landmark,
        simulateState,
      });
      const sanitized = {
        ...res,
        message: res.message
          ? res.message
              .replace(/Chennai metropolitan region/gi, "active care network")
              .replace(/in Chennai/gi, "")
              .replace(/across Chennai/gi, "across our network")
              .replace(
                /active Chennai service corridors/gi,
                "active service corridors",
              )
          : res.message,
      };
      setVerifyResult(sanitized);
    } catch (err: any) {
      setErrorMessage(err.message || "Geographic verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSaveAndProceed = async () => {
    if (!verifyResult || !verifyResult.serviceable) {
      setErrorMessage(
        "Please verify that the address is within serviceable coverage first.",
      );
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    try {
      let currentElder = activeElder;
      // 1. Create elder if not existing yet
      if (!currentElder) {
        currentElder = await api.createElder({
          name: elderName,
          age: Number(elderAge),
          gender: elderGender,
        });
      }

      // 2. Persist verified location
      await api.persistElderLocation(currentElder.id, {
        addressLine1,
        addressLine2,
        locality: locality || verifyResult.locality,
        city: city || verifyResult.city,
        state: state || "Tamil Nadu",
        postalCode: postalCode || verifyResult.postalCode,
        landmark,
        latitude: verifyResult.latitude,
        longitude: verifyResult.longitude,
      });

      // 3. Refresh elders list and select current elder
      await refreshElders(currentElder.id);
      setCurrentStep("PERSONA");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save verified address");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Step Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-700 uppercase tracking-wider mb-2">
            <span>Phase A.1</span>
            <span>•</span>
            <span>Geographic Verification</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Where will your loved one receive care?
          </h1>
          <p className="text-slate-600 mt-2 text-sm sm:text-base leading-relaxed">
            CareConnect operates dedicated clinical care corridors. We
            independently verify the elder’s residence to ensure rapid attendant
            dispatch and reliable geofenced check-ins.
          </p>
        </div>
        {elders && elders.length > 0 && (
          <button
            type="button"
            onClick={() => setCurrentStep("DASHBOARD")}
            className="self-start sm:self-auto px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition shrink-0"
          >
            ← Back to Dashboard
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>{errorMessage}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Inputs */}
        <div className="lg:col-span-7 space-y-6">
          {/* Elder Basic Info Section */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-600" />
              Elder Profile Summary
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Elder's Full Name
                </label>
                <input
                  type="text"
                  required
                  value={elderName}
                  onChange={(e) => setElderName(e.target.value)}
                  placeholder="e.g. Elder's Name"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Age
                </label>
                <input
                  type="number"
                  min="50"
                  max="120"
                  value={elderAge}
                  onChange={(e) => setElderAge(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-teal-600"
                />
              </div>
            </div>
          </div>

          {/* Address Section */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-600" />
              Residential Care Address
            </h2>
            <p className="text-xs text-slate-500 mb-3">
              The home address where attendants and clinical managers will
              report.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                House / Flat No., Apartment Name, Street{" "}
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                placeholder="e.g. Flat 3B, Shanthi Apts, 2nd Main Road"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-teal-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Sub-Area / Street 2
                </label>
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="e.g. Gandhi Nagar"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Locality / Care Zone <span className="text-rose-500">*</span>
                </label>
                <select
                  value={locality}
                  onChange={handleLocalitySelect}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-teal-600 bg-white"
                >
                  <option value="">Select Serviceable Zone</option>
                  {SERVICEABLE_LOCALITIES.map((loc) => (
                    <option key={loc.name} value={loc.name}>
                      {loc.name} ({loc.pincode})
                    </option>
                  ))}
                  <option value="Other">Other Locality</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  PIN Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="600020"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-teal-600 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Landmark (Helpful for Caregivers)
              </label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Near the bus depot"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-teal-600"
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleVerifyLocation()}
                disabled={isVerifying}
                className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl shadow-sm transition flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <span className="inline-block animate-pulse">
                    Checking Geographic Serviceability...
                  </span>
                ) : (
                  <>
                    <Compass className="w-4 h-4 text-teal-400" />
                    <span>Check Serviceability</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Verification Status & Map Preview */}
        <div className="lg:col-span-5 space-y-6">
          {/* Verification Status Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider text-slate-500">
              Serviceability Assessment
            </h3>

            {!verifyResult ? (
              <div className="text-center py-8 px-4 border-2 border-dashed border-slate-200 rounded-xl">
                <Navigation className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-600">
                  No address verified yet
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Fill in the address details and click "Check Serviceability"
                  to run verification against the coverage grid.
                </p>
              </div>
            ) : verifyResult.verificationStatus === "VERIFIED" ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="font-bold text-sm">
                    Zone Verified & Active
                  </span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  {verifyResult.message}
                </p>
                <div className="pt-2 border-t border-emerald-200/60 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-emerald-700 block font-medium">
                      Assigned Care Hub:
                    </span>
                    <span className="font-bold text-slate-800">
                      {verifyResult.assignedHub}
                    </span>
                  </div>
                  <div>
                    <span className="text-emerald-700 block font-medium">
                      GPS Coordinates:
                    </span>
                    <span className="font-mono text-slate-800">
                      {verifyResult.latitude}, {verifyResult.longitude}
                    </span>
                  </div>
                </div>
              </div>
            ) : verifyResult.verificationStatus === "NOT_SERVICEABLE" ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span className="font-bold text-sm">
                    Outside Active Service Corridor
                  </span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  {verifyResult.message}
                </p>
                <p className="text-[11px] text-amber-700">
                  CareConnect is currently deploying attendants in active
                  service zones. You can join our priority expansion waitlist.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    alert(
                      "Added to priority expansion waitlist! Our team will notify you when services expand.",
                    )
                  }
                  className="mt-2 text-xs font-semibold px-3 py-1.5 bg-amber-200/80 hover:bg-amber-200 text-amber-900 rounded-lg transition"
                >
                  Join Waitlist for {locality || city}
                </button>
              </div>
            ) : verifyResult.verificationStatus === "INVALID_ADDRESS" ? (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span className="font-bold text-sm">
                    Invalid Address Format
                  </span>
                </div>
                <p className="text-xs text-rose-800">{verifyResult.message}</p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-slate-600 shrink-0" />
                  <span className="font-bold text-sm">
                    {verifyResult.verificationStatus.replace("_", " ")}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{verifyResult.message}</p>
              </div>
            )}

            {/* Interactive Ola/Uber-Style Precise Location Picker */}
            <div className="mt-5 space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal-600" />
                <span>Precise Doorstep Pin & Map Picker</span>
              </h4>
              <PreciseLocationPicker
                initialLatitude={verifyResult?.latitude}
                initialLongitude={verifyResult?.longitude}
                initialAddress={addressLine1}
                initialPostalCode={postalCode}
                onLocationSelect={handlePickerSelect}
                confirmButtonLabel="Apply Coordinates & Check Serviceability"
                compact={true}
              />
            </div>

            {/* Proceed Action Button */}
            <div className="mt-6">
              <button
                type="button"
                onClick={handleSaveAndProceed}
                disabled={!verifyResult?.serviceable || isSaving}
                className="w-full py-3 px-4 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <span className="inline-block animate-pulse">
                    Persisting Verified Location...
                  </span>
                ) : (
                  <>
                    <span>Confirm & Proceed to Patient Persona</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <p className="text-[11px] text-center text-slate-400 mt-2">
                Phase A.2 Patient Persona intake will begin with this confirmed
                address.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
