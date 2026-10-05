import React, { useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import {
  MapPin,
  AlertTriangle,
  Radio,
} from 'lucide-react';
import type { AdminElderItem, AdminCaregiverItem, AdminSosAlert } from '../types';
import { serviceableCorridors } from '../mockData';

// Fix Leaflet's default icon path issues with Vite bundler
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Custom Leaflet DivIcons
const createElderIcon = (isActive: boolean) =>
  L.divIcon({
    className: 'custom-elder-marker',
    html: `<div style="
      background-color: ${isActive ? '#0d5c58' : '#64748b'};
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 11px;
    ">🧓</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });

const createCaregiverIcon = () =>
  L.divIcon({
    className: 'custom-caregiver-marker',
    html: `<div style="
      background-color: #0284c7;
      color: white;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 11px;
    ">🩺</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });

const createSosIcon = () =>
  L.divIcon({
    className: 'custom-sos-marker',
    html: `<div style="
      background-color: #e11d48;
      color: white;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 0 15px rgba(225, 29, 72, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      animation: pulse 1.2s infinite;
    ">🚨</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -19],
  });

// Map controller to fly to selected coordinates
interface MapFlyToControllerProps {
  center: [number, number] | null;
  zoom?: number;
}
const MapFlyToController: React.FC<MapFlyToControllerProps> = ({ center, zoom = 14 }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
};

// Resizer fix for Leaflet container in tabs
const MapResizeHandler = () => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

interface AdminLiveMapViewProps {
  elders: AdminElderItem[];
  caregivers: AdminCaregiverItem[];
  alerts: AdminSosAlert[];
  focusedCoordinates?: [number, number] | null;
  onSelectElder: (elder: AdminElderItem) => void;
}

export const AdminLiveMapView: React.FC<AdminLiveMapViewProps> = ({
  elders,
  caregivers,
  alerts,
  focusedCoordinates,
  onSelectElder,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'ELDERS' | 'CAREGIVERS' | 'SOS'>('ALL');
  const [showGeofences, setShowGeofences] = useState(true);
  const [mapCenter, setMapCenter] = useState<[number, number]>(
    focusedCoordinates || [13.0418, 80.24]
  );
  const [mapZoom, setMapZoom] = useState(focusedCoordinates ? 15 : 12);

  const handleCenterOn = (lat: number, lng: number) => {
    setMapCenter([lat, lng]);
    setMapZoom(15);
  };

  const visibleElders = filterType === 'ALL' || filterType === 'ELDERS' ? elders : [];
  const visibleCaregivers = filterType === 'ALL' || filterType === 'CAREGIVERS' ? caregivers.filter((c) => c.status === 'ON_DUTY') : [];
  const visibleAlerts = filterType === 'ALL' || filterType === 'SOS' ? alerts : [];

  return (
    <div className="space-y-4 animate-fadeIn pb-12">
      {/* Top Controls Bar */}
      <div className="p-4 md:p-6 bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <h2 className="text-xl font-heading font-extrabold text-slate-900">
              Live Geographic Serviceability Map
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Plotting real-time GPS locations, active elder home visits, attendant coverage, and emergency alerts across Chennai.
          </p>
        </div>

        {/* Filter Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterType === 'ALL'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Show All
          </button>
          <button
            onClick={() => setFilterType('ELDERS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              filterType === 'ELDERS'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'bg-teal-50 text-teal-800 hover:bg-teal-100'
            }`}
          >
            <span>🧓 Elders ({elders.length})</span>
          </button>
          <button
            onClick={() => setFilterType('CAREGIVERS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              filterType === 'CAREGIVERS'
                ? 'bg-sky-600 text-white shadow-2xs'
                : 'bg-sky-50 text-sky-800 hover:bg-sky-100'
            }`}
          >
            <span>🩺 Attendants ({caregivers.filter((c) => c.status === 'ON_DUTY').length})</span>
          </button>
          <button
            onClick={() => setFilterType('SOS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              filterType === 'SOS'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <span>🚨 SOS Alerts ({alerts.length})</span>
          </button>
          <button
            onClick={() => setShowGeofences(!showGeofences)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              showGeofences
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            <Radio className="w-3 h-3 text-emerald-600" />
            <span>Corridor Geofences</span>
          </button>
        </div>
      </div>

      {/* Map & Corridor Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Main Leaflet Map Viewport */}
        <div className="lg:col-span-3 h-[580px] rounded-3xl border border-slate-200 overflow-hidden shadow-xs relative bg-slate-100">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            scrollWheelZoom={true}
            className="w-full h-full z-10"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapResizeHandler />
            <MapFlyToController center={mapCenter} zoom={mapZoom} />

            {/* Service Corridor Geofence Radii (Chennai clusters) */}
            {showGeofences &&
              serviceableCorridors.map((c, i) => (
                <Circle
                  key={i}
                  center={[c.lat, c.lng]}
                  radius={2000} // 2km radius circle
                  pathOptions={{
                    color: '#0d5c58',
                    fillColor: '#14b8a6',
                    fillOpacity: 0.12,
                    weight: 1.5,
                    dashArray: '4, 4',
                  }}
                >
                  <Popup>
                    <div className="text-xs">
                      <div className="font-bold text-teal-900">{c.name}</div>
                      <div className="text-[11px] text-slate-600">PIN: {c.pin}</div>
                      <div className="text-[11px] text-emerald-700 font-semibold mt-1">
                        Status: {c.status}
                      </div>
                    </div>
                  </Popup>
                </Circle>
              ))}

            {/* Elder Markers */}
            {visibleElders.map((elder) => (
              <Marker
                key={elder.id}
                position={[elder.latitude, elder.longitude]}
                icon={createElderIcon(elder.status === 'ACTIVE')}
              >
                <Popup>
                  <div className="p-1 min-w-[200px] text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-sm text-slate-900">
                        {elder.name}
                      </span>
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-teal-100 text-teal-800">
                        {elder.status}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] mb-1">
                      {elder.locality}, Chennai ({elder.postalCode})
                    </p>
                    <div className="text-[11px] text-teal-900 font-medium mb-2">
                      Care Attendant: <strong>{elder.assignedCaregiverName || 'Unassigned'}</strong>
                    </div>
                    <button
                      onClick={() => onSelectElder(elder)}
                      className="w-full py-1.5 bg-teal-700 text-white rounded-lg text-xs font-bold hover:bg-teal-800 transition"
                    >
                      View Elder Profile
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Caregiver Attendant Markers (Blue) */}
            {visibleCaregivers.map((cg, idx) => {
              const matchedElder = elders.find((e) => e.assignedCaregiverName === cg.fullName);
              const lat = matchedElder ? matchedElder.latitude + 0.0018 : 13.0067 + idx * 0.012;
              const lng = matchedElder ? matchedElder.longitude + 0.0018 : 80.2575 + idx * 0.008;

              return (
                <Marker
                  key={cg.id}
                  position={[lat, lng]}
                  icon={createCaregiverIcon()}
                >
                  <Popup>
                    <div className="p-1 min-w-[180px] text-xs">
                      <div className="font-extrabold text-sm text-sky-900 mb-0.5">
                        {cg.fullName}
                      </div>
                      <div className="text-[11px] text-slate-600">
                        {cg.locality} Corridor • Rating: ⭐ {cg.rating}
                      </div>
                      <div className="mt-1 text-[11px] font-bold text-emerald-700">
                        Status: ON DUTY
                      </div>
                      {cg.activeElderName && (
                        <div className="mt-1 text-[10px] text-slate-500">
                          Assigned to: {cg.activeElderName}
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Emergency SOS Alerts (Pulsing Red) */}
            {visibleAlerts.map((alert) => (
              <Marker
                key={alert.id}
                position={[alert.latitude, alert.longitude]}
                icon={createSosIcon()}
              >
                <Popup>
                  <div className="p-1 min-w-[220px] text-xs">
                    <div className="flex items-center gap-1.5 text-rose-600 font-extrabold mb-1">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{alert.title}</span>
                    </div>
                    <p className="text-slate-800 font-semibold mb-1">
                      Patient: {alert.elderName} ({alert.elderAge} yrs)
                    </p>
                    <p className="text-slate-600 text-[11px] mb-2">{alert.description}</p>
                    <div className="text-[10px] text-slate-400 mb-2 font-mono">
                      Triggered: {alert.triggeredAt}
                    </div>
                    <div className="p-1.5 bg-rose-50 text-rose-800 rounded-lg text-[11px] font-bold">
                      Emergency Phone: {alert.emergencyPhone}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Quick Legend Overlay */}
          <div className="absolute bottom-4 left-4 z-20 bg-white/90 backdrop-blur-md p-3 rounded-2xl border border-slate-200 text-xs shadow-md space-y-1.5">
            <span className="font-bold text-slate-800 block text-[10px] uppercase tracking-wider">
              Map Legend
            </span>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-teal-800" />
              <span className="text-slate-700 text-[11px]">Active Elder Home</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping" />
              <span className="text-rose-700 font-bold text-[11px]">SOS Alert Triggered</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full border border-teal-600 bg-teal-100/60" />
              <span className="text-slate-700 text-[11px]">2km Corridor Geofence</span>
            </div>
          </div>
        </div>

        {/* Corridor & Elder List Sidebar */}
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-heading font-extrabold text-sm text-slate-900">
              Quick Focus Coordinates
            </h3>
            <p className="text-xs text-slate-500">
              Click to jump and zoom directly to elder coordinates on the map.
            </p>

            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {elders.map((elder) => (
                <div
                  key={elder.id}
                  onClick={() => handleCenterOn(elder.latitude, elder.longitude)}
                  className="cursor-pointer p-3 rounded-2xl bg-slate-50 hover:bg-teal-50/70 border border-slate-200/80 hover:border-teal-300 transition-all flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-teal-700" />
                      <span>{elder.name}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {elder.locality} • PIN: {elder.postalCode}
                    </p>
                  </div>

                  <span className="text-[10px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-lg">
                    Focus
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
