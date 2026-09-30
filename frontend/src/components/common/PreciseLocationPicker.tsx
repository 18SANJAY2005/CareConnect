import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import {
  Navigation,
  MapPin,
  Check,
  AlertCircle,
  Loader2,
  Compass,
  RefreshCw,
  Building,
  Home,
} from "lucide-react";

// Vite bundler fix for Leaflet missing default marker icon assets
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

export interface PreciseLocationData {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  addressLine1: string;
  addressLine2?: string;
  locality: string;
  city: string;
  state: string;
  postalCode: string;
  doorOrLandmark?: string;
}

export interface PreciseLocationPickerProps {
  initialLatitude?: number;
  initialLongitude?: number;
  initialAddress?: string;
  initialPostalCode?: string;
  onLocationSelect: (data: PreciseLocationData) => void;
  onCancel?: () => void;
  confirmButtonLabel?: string;
  compact?: boolean;
  className?: string;
}

// Sub-component to ensure Leaflet recalculates dimensions when mounted or transitioned
const MapResizer: React.FC = () => {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 300);
    const t3 = setTimeout(() => map.invalidateSize(), 600);

    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener("resize", handleResize);
    };
  }, [map]);

  return null;
};

// Sub-component to smoothly pan map center when coordinates change externally
const MapCenterController: React.FC<{
  center: [number, number];
  zoom?: number;
}> = ({ center, zoom }) => {
  const map = useMap();
  const [lat, lng] = center;

  useEffect(() => {
    map.flyTo([lat, lng], zoom ?? map.getZoom(), { duration: 1.2 });
  }, [lat, lng, zoom, map]);

  return null;
};

// Sub-component to capture map clicks and move pin
const MapClickHandler: React.FC<{
  onMapClick: (lat: number, lng: number) => void;
}> = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
};

// Default center: Chennai Care Corridor (Adyar)
const DEFAULT_LAT = 13.0012;
const DEFAULT_LNG = 80.2565;

export const PreciseLocationPicker: React.FC<PreciseLocationPickerProps> = ({
  initialLatitude,
  initialLongitude,
  initialAddress = "",
  initialPostalCode = "",
  onLocationSelect,
  onCancel,
  confirmButtonLabel = "Confirm Exact Location",
  compact = false,
  className = "",
}) => {
  // Coordinates state
  const [position, setPosition] = useState<[number, number]>(() => {
    if (
      initialLatitude &&
      initialLongitude &&
      !isNaN(initialLatitude) &&
      !isNaN(initialLongitude)
    ) {
      return [initialLatitude, initialLongitude];
    }
    return [DEFAULT_LAT, DEFAULT_LNG];
  });

  // Controlled form states
  const [street, setStreet] = useState(initialAddress);
  const [locality, setLocality] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [city, setCity] = useState("Chennai");
  const [state, setState] = useState("Tamil Nadu");
  const [pinCode, setPinCode] = useState(initialPostalCode);

  // UI status
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const markerRef = useRef<L.Marker | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync position if initialLatitude or initialLongitude change externally
  useEffect(() => {
    if (
      initialLatitude &&
      initialLongitude &&
      !isNaN(initialLatitude) &&
      !isNaN(initialLongitude)
    ) {
      setPosition([initialLatitude, initialLongitude]);
    }
  }, [initialLatitude, initialLongitude]);

  // Robust reverse geocoding handler with proper headers, extraction, and fallback
  const performReverseGeocode = useCallback(
    async (lat: number, lon: number) => {
      setIsGeocoding(true);
      setErrorMessage(null);
      setStatusMessage("Detecting address from map...");

      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;

        let data: any = null;
        try {
          const response = await fetch(url, {
            headers: {
              Accept: "application/json",
              "User-Agent": "CareConnect-ElderCare-App/1.0",
            },
          });

          if (!response.ok) {
            throw new Error(`Geocode failed: ${response.status}`);
          }
          data = await response.json();
        } catch (fetchErr: any) {
          console.warn("Nominatim fetch notice:", fetchErr.message || fetchErr);
          // Robust Fallback: Open client reverse geocode endpoint (CORS-enabled, no key required)
          try {
            const fbRes = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
            );
            if (fbRes.ok) {
              const fbData = await fbRes.json();
              data = {
                address: {
                  road:
                    fbData.localityInfo?.administrative?.find(
                      (a: any) => a.order >= 6 && a.order <= 8,
                    )?.name || "",
                  suburb: fbData.locality || "",
                  city: fbData.city || "Chennai",
                  postcode: fbData.postcode || "",
                },
              };
            }
          } catch (fallbackErr) {
            console.warn("Fallback geocoding also failed:", fallbackErr);
          }
        }

        if (data && (data.address || data.display_name)) {
          const addr = data.address || {};

          // 1. House / Flat / Building
          const houseVal =
            addr.house_number ||
            addr.building ||
            addr.amenity ||
            addr.shop ||
            addr.office ||
            "";

          // 2. Road / Street
          const roadVal =
            addr.road ||
            addr.street ||
            addr.pedestrian ||
            addr.path ||
            addr.residential ||
            addr.hamlet ||
            "";

          // 3. Locality / Suburb (Reject any administrative zone names like "Zone 5")
          let localityVal =
            (addr.suburb && !/^zone/i.test(addr.suburb) ? addr.suburb : "") ||
            (addr.neighbourhood && !/^zone/i.test(addr.neighbourhood)
              ? addr.neighbourhood
              : "") ||
            (addr.residential && !/^zone/i.test(addr.residential)
              ? addr.residential
              : "");
          if (
            !localityVal &&
            addr.city_district &&
            !/^zone/i.test(addr.city_district)
          ) {
            localityVal = addr.city_district;
          }
          if (!localityVal) {
            localityVal = addr.village || addr.town || addr.quarter || "";
          }
          if (!localityVal && addr.suburb) {
            // If only "Zone X Suburb" was returned, strip the administrative prefix
            localityVal = addr.suburb.replace(/^zone\s*\d+\s*/i, "").trim();
          }

          // Deduplication if road and locality are identical
          if (
            roadVal &&
            localityVal &&
            roadVal.trim().toLowerCase() === localityVal.trim().toLowerCase()
          ) {
            localityVal = addr.quarter || addr.city_district || "";
          }

          // 4. City
          const rawCity =
            addr.city ||
            addr.town ||
            addr.municipality ||
            addr.state_district ||
            "Chennai";
          const cityVal = /^zone/i.test(rawCity) ? "Chennai" : rawCity;

          // 5. PIN Code
          const pinVal = addr.postcode ? addr.postcode.replace(/\s+/g, "") : "";

          // Immediate Form State Update
          setStreet(roadVal);
          setLocality(localityVal);
          if (houseVal) {
            setHouseNumber(houseVal);
          }
          setCity(cityVal);
          if (pinVal) {
            setPinCode(pinVal);
          }
          if (addr.state) {
            setState(addr.state);
          }

          setStatusMessage(null);
        } else if (data?.display_name) {
          const parts = data.display_name
            .split(",")
            .map((p: string) => p.trim())
            .filter((p: string) => !/^zone\s*\d+/i.test(p));
          if (parts[0]) setStreet(parts[0]);
          if (parts[1]) setLocality(parts[1]);
          setStatusMessage(null);
        } else {
          setStatusMessage(
            "Coordinates captured. You can type your street and area name below.",
          );
        }
      } catch (err: any) {
        console.warn("Geocoding notice:", err);
        setStatusMessage(
          "Coordinates captured. You can type your street and area name below.",
        );
      } finally {
        setIsGeocoding(false);
      }
    },
    [],
  );

  // Debounced reverse geocoding caller
  const triggerReverseGeocode = useCallback(
    (lat: number, lon: number, delayMs = 0) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (delayMs > 0) {
        debounceTimerRef.current = setTimeout(() => {
          performReverseGeocode(lat, lon);
        }, delayMs);
      } else {
        performReverseGeocode(lat, lon);
      }
    },
    [performReverseGeocode],
  );

  // Perform reverse geocoding on initial mount or coordinate change
  useEffect(() => {
    if (!street) {
      triggerReverseGeocode(position[0], position[1], 150);
    }
  }, []);

  // Handle marker drag end (strictly fired on drag end, not during drag)
  const markerEventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latLng = marker.getLatLng();
          const newPos: [number, number] = [latLng.lat, latLng.lng];
          setPosition(newPos);
          // Strictly fire on dragend
          triggerReverseGeocode(latLng.lat, latLng.lng, 0);
        }
      },
    }),
    [triggerReverseGeocode],
  );

  // Handle click on the map to reposition pin
  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      const newPos: [number, number] = [lat, lng];
      setPosition(newPos);
      triggerReverseGeocode(lat, lng, 0);
    },
    [triggerReverseGeocode],
  );

  // Request browser GPS location
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage(
        "Browser geolocation is not supported on this device. You can tap or drag the pin on the map.",
      );
      return;
    }

    setIsGpsLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGpsLoading(false);
        const { latitude, longitude } = pos.coords;
        const newPos: [number, number] = [latitude, longitude];
        setPosition(newPos);
        triggerReverseGeocode(latitude, longitude, 0);
      },
      (error) => {
        setIsGpsLoading(false);
        let msg =
          "Could not access device GPS. Please pick your location by dragging or tapping the pin.";
        if (error.code === error.PERMISSION_DENIED) {
          msg =
            "Location permission was denied. Tap the map or drag the pin to set your door location manually.";
        } else if (error.code === error.TIMEOUT) {
          msg =
            "Location request timed out. Please try again or tap the pin on the map.";
        }
        setErrorMessage(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Submit selected location
  const handleConfirm = () => {
    const isMunicipalZone = (val?: string) =>
      Boolean(val && /^zone\s*\d+/i.test(val.trim()));

    const cleanDoor = !isMunicipalZone(houseNumber) ? houseNumber.trim() : "";
    const cleanStreet = !isMunicipalZone(street) ? street.trim() : "";
    const cleanLocality = !isMunicipalZone(locality) ? locality.trim() : "";
    const cleanCity = !isMunicipalZone(city) ? city.trim() : "Chennai";
    const cleanPin = pinCode && pinCode.trim() ? `PIN ${pinCode.trim()}` : "";

    const fullFormatted = [
      cleanDoor,
      cleanStreet,
      cleanLocality,
      cleanCity,
      cleanPin,
    ]
      .filter((part): part is string => Boolean(part && !isMunicipalZone(part)))
      .join(", ");

    const fullAddressLine1 =
      cleanDoor && cleanStreet
        ? `${cleanDoor}, ${cleanStreet}`
        : cleanDoor ||
          cleanStreet ||
          cleanLocality ||
          "Residential Care Location";

    onLocationSelect({
      latitude: Number(position[0].toFixed(6)),
      longitude: Number(position[1].toFixed(6)),
      formattedAddress: fullFormatted,
      addressLine1: fullAddressLine1,
      addressLine2: cleanLocality || undefined,
      locality: cleanLocality || "Care Corridor",
      city: cleanCity || "Chennai",
      state: state || "Tamil Nadu",
      postalCode: pinCode ? pinCode.trim() : "600020",
      doorOrLandmark: cleanDoor || undefined,
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Top Bar: Use Current Location Button & Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isGpsLoading}
          className="group relative flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-xl font-bold text-xs shadow-sm transition active:scale-98 disabled:opacity-75"
        >
          {isGpsLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Detecting GPS Location...</span>
            </>
          ) : (
            <>
              <Navigation className="w-4 h-4 fill-white/20 text-white transition-transform group-hover:-translate-y-0.5" />
              <span>Use Current Location (GPS)</span>
            </>
          )}
        </button>

        <div className="flex items-center justify-between sm:justify-end gap-2 text-[11px] text-slate-500 font-mono bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
          <Compass className="w-3.5 h-3.5 text-teal-600" />
          <span>
            {position[0].toFixed(4)}°N, {position[1].toFixed(4)}°E
          </span>
          {isGeocoding && (
            <Loader2 className="w-3 h-3 animate-spin text-teal-600 ml-1" />
          )}
        </div>
      </div>

      {/* Error or Notice Banner */}
      {errorMessage && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMessage}</div>
        </div>
      )}

      {statusMessage && !errorMessage && (
        <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 text-xs flex items-center gap-2 animate-fadeIn">
          <Compass className="w-3.5 h-3.5 text-teal-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Interactive Leaflet Map Container */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200 shadow-sm bg-slate-100">
        <div
          className={`w-full ${compact ? "h-52 sm:h-60" : "h-64 sm:h-72"} relative z-0`}
        >
          <MapContainer
            center={position}
            zoom={16}
            scrollWheelZoom={true}
            style={{ width: "100%", height: "100%" }}
            className="z-0"
          >
            {/* Tile Layer: OpenStreetMap */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Draggable Marker */}
            <Marker
              position={position}
              draggable={true}
              eventHandlers={markerEventHandlers}
              ref={markerRef}
            >
              <Popup>
                <div className="text-center font-sans p-1">
                  <p className="font-bold text-xs text-slate-900">
                    Care Location
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Drag to adjust your exact door
                  </p>
                </div>
              </Popup>
            </Marker>

            {/* Controllers */}
            <MapResizer />
            <MapCenterController center={position} />
            <MapClickHandler onMapClick={handleMapClick} />
          </MapContainer>
        </div>

        {/* Uber/Ola Style Floating Pin Guidance Pill */}
        <div className="absolute top-3 inset-x-0 mx-auto w-fit z-[1000] pointer-events-none">
          <div className="bg-slate-900/85 backdrop-blur-md text-white text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-lg border border-white/20 flex items-center gap-1.5 animate-fadeIn">
            <MapPin className="w-3.5 h-3.5 text-teal-400" />
            <span>Tap map or drag pin to your exact building entrance</span>
          </div>
        </div>

        {/* Map Watermark / Provider badge */}
        <div className="bg-white/95 backdrop-blur-xs px-3 py-1.5 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <Home className="w-3.5 h-3.5 text-teal-600" />
            <span>Precision Doorstep Pin</span>
          </span>
          <span className="text-teal-700 font-bold">OpenStreetMap Grid</span>
        </div>
      </div>

      {/* Address Details & Manual Refinement Form */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-teal-600" />
            <span>Detected Location Details</span>
          </h4>
          {isGeocoding && (
            <span className="text-[11px] text-teal-600 flex items-center gap-1 font-medium">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Fetching address...</span>
            </span>
          )}
        </div>

        {/* Flat / Door / House Refinement */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            House / Flat No., Floor, Apartment Name{" "}
            <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={houseNumber}
              onChange={(e) => setHouseNumber(e.target.value)}
              placeholder={
                isGeocoding
                  ? "Detecting address..."
                  : "e.g. Flat 302, Shanthi Heights, Gate #2"
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-teal-600 bg-slate-50/50"
            />
            {isGeocoding && (
              <div className="absolute right-3 top-2.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
              </div>
            )}
          </div>
        </div>

        {/* Street & Area Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-semibold text-slate-700">
                Detected Street / Road{" "}
                <span className="text-[10px] text-teal-600 font-normal">
                  (Editable)
                </span>
              </label>
            </div>
            <div className="relative">
              <input
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder={
                  isGeocoding
                    ? "Detecting street..."
                    : "e.g. 2nd Main Road, Gandhi Nagar"
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-teal-600 bg-white"
              />
              {isGeocoding && (
                <div className="absolute right-3 top-2.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-semibold text-slate-700">
                Locality / Neighborhood{" "}
                <span className="text-[10px] text-teal-600 font-normal">
                  (Editable)
                </span>
              </label>
            </div>
            <div className="relative">
              <input
                type="text"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                placeholder={
                  isGeocoding
                    ? "Detecting locality..."
                    : "e.g. Adyar / Besant Nagar"
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-teal-600 bg-white"
              />
              {isGeocoding && (
                <div className="absolute right-3 top-2.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 italic">
          💡 You can manually refine or type your exact street and locality
          above. Accurate map GPS coordinates remain locked.
        </p>

        {/* PIN Code & City Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              City
            </label>
            <div className="relative">
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={isGeocoding ? "Detecting..." : "Chennai"}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-teal-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Postal PIN Code
            </label>
            <div className="relative">
              <input
                type="text"
                maxLength={6}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ""))}
                placeholder={isGeocoding ? "Detecting..." : "e.g. 600020"}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 focus:border-teal-600"
              />
              {isGeocoding && (
                <div className="absolute right-3 top-2.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleConfirm}
          className="flex-[2] py-3.5 px-4 bg-teal-700 hover:bg-teal-800 active:scale-98 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition"
        >
          <Check className="w-4 h-4" />
          <span>{confirmButtonLabel}</span>
        </button>
      </div>
    </div>
  );
};

export default PreciseLocationPicker;
