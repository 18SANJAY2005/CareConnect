import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Clock,
  Phone,
  MapPin,
  CheckCircle2,
  Send,
  ShieldCheck,
  ArrowLeft,
  Building2,
  Ambulance,
  PhoneCall,
  Navigation,
  Copy,
  Check,
  X,
  Search,
  Star,
  ExternalLink,
} from 'lucide-react';
import type { AdminSosAlert, NearbyHospital, AdminElderItem } from '../types';
import { SupervisorDispatchModal } from '../components/SupervisorDispatchModal';
import { standardChennaiHospitals, initialAdminElders, getHospitalsForLocality } from '../mockData';

interface AdminSosPanelProps {
  alerts: AdminSosAlert[];
  elders?: AdminElderItem[];
  onResolveAlert: (alertId: string, resolutionNotes: string) => void;
  onDispatchSupervisor: (alertId: string, supervisorName: string, notes: string) => void;
  onViewOnMap: (lat: number, lng: number) => void;
  onBack?: () => void;
}

export const AdminSosPanel: React.FC<AdminSosPanelProps> = ({
  alerts,
  elders = initialAdminElders,
  onResolveAlert,
  onDispatchSupervisor,
  onViewOnMap,
  onBack,
}) => {
  const [localAlerts, setLocalAlerts] = useState<AdminSosAlert[]>(alerts);
  const [selectedAlertId, setSelectedAlertId] = useState<string>(alerts[0]?.id || '');
  const [selectedAlertForDispatch, setSelectedAlertForDispatch] = useState<AdminSosAlert | null>(null);
  const [selectedHospitalForHotline, setSelectedHospitalForHotline] = useState<NearbyHospital | null>(null);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [resolvingAlertId, setResolvingAlertId] = useState<string | null>(null);
  const [resolutionNotesInput, setResolutionNotesInput] = useState(
    'Attendant arrived at bedside, emergency triage administered, vitals stabilized within safe thresholds.'
  );
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Synchronize local alerts if parent updates
  useEffect(() => {
    setLocalAlerts(alerts);
  }, [alerts]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredAlerts = localAlerts.filter((alert) => {
    const matchesFilter =
      filterStatus === 'ALL'
        ? true
        : filterStatus === 'OPEN'
        ? alert.status === 'OPEN' || alert.status === 'DISPATCHED'
        : alert.status === 'RESOLVED';

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      searchQuery === '' ||
      alert.elderName.toLowerCase().includes(q) ||
      alert.title.toLowerCase().includes(q) ||
      alert.locality.toLowerCase().includes(q) ||
      alert.description.toLowerCase().includes(q);

    return matchesFilter && matchesSearch;
  });

  // Ensure active alert is selected
  const activeAlert =
    filteredAlerts.find((a) => a.id === selectedAlertId) ||
    filteredAlerts[0] ||
    null;

  const openCount = localAlerts.filter((a) => a.status === 'OPEN').length;
  const dispatchedCount = localAlerts.filter((a) => a.status === 'DISPATCHED').length;
  const resolvedCount = localAlerts.filter((a) => a.status === 'RESOLVED').length;

  const getEmergencyFacilityForAlert = (locality: string): NearbyHospital => {
    const loc = locality.toUpperCase();
    if (loc.includes('ADYAR')) return standardChennaiHospitals.ADYAR[0];
    if (loc.includes('BESANT')) return standardChennaiHospitals.BESANT_NAGAR[0];
    if (loc.includes('ANNA')) return standardChennaiHospitals.ANNA_NAGAR[0];
    if (loc.includes('MYLAPORE')) return standardChennaiHospitals.MYLAPORE[0];
    if (loc.includes('VELACHERY')) return standardChennaiHospitals.VELACHERY[0];
    if (loc.includes('T. NAGAR') || loc.includes('T NAGAR')) return standardChennaiHospitals.T_NAGAR[0];
    return standardChennaiHospitals.ADYAR[0];
  };

  const handleAcknowledge = (alertId: string) => {
    setLocalAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: 'DISPATCHED' as const } : a))
    );
    showToast(`Emergency incident #${alertId} acknowledged by Operations Desk.`);
  };

  const handleConfirmResolve = (alertId: string) => {
    onResolveAlert(alertId, resolutionNotesInput);
    setLocalAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? { ...a, status: 'RESOLVED' as const, resolutionNotes: resolutionNotesInput }
          : a
      )
    );
    setResolvingAlertId(null);
    showToast(`Emergency incident #${alertId} successfully marked as resolved.`);
  };

  const handleCopyHotline = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  return (
    <div className="space-y-5 animate-fadeIn pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 p-3.5 rounded-2xl bg-slate-900 text-white text-xs font-bold shadow-xl border border-slate-700 animate-fadeIn flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-slate-600 hover:text-teal-900 transition flex items-center justify-center shrink-0 shadow-2xs cursor-pointer group"
              title="Back"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 text-slate-500 group-hover:text-teal-700" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
              <h2 className="text-xl font-heading font-extrabold text-slate-900">
                Emergency SOS & Escalations Desk
              </h2>
            </div>
          </div>
        </div>

        {/* Quick Triage Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>{openCount} Open Critical</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-800 text-xs font-bold flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5 text-amber-600" />
            <span>{dispatchedCount} Dispatched</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{resolvedCount} Resolved</span>
          </div>
        </div>
      </div>

      {/* Master-Detail Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Incidents Queue & Selector (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {/* Search & Filter Bar */}
          <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search alert by careseeker or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-medium text-slate-800"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setFilterStatus('ALL')}
                className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
                  filterStatus === 'ALL'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All ({localAlerts.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('OPEN')}
                className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
                  filterStatus === 'OPEN'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-rose-700 hover:text-rose-900'
                }`}
              >
                Active ({openCount + dispatchedCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('RESOLVED')}
                className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
                  filterStatus === 'RESOLVED'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'text-emerald-700 hover:text-emerald-900'
                }`}
              >
                Resolved ({resolvedCount})
              </button>
            </div>
          </div>

          {/* Incident Queue Cards List */}
          <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {filteredAlerts.length === 0 ? (
              <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center text-slate-400 text-xs">
                <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <span className="font-bold text-slate-700 block">No Emergency Alerts</span>
                <span>All monitored Chennai corridors are currently operational.</span>
              </div>
            ) : (
              filteredAlerts.map((alert) => {
                const isSelected = activeAlert?.id === alert.id;
                return (
                  <div
                    key={alert.id}
                    onClick={() => setSelectedAlertId(alert.id)}
                    className={`p-4 rounded-3xl border transition cursor-pointer text-left space-y-2 ${
                      isSelected
                        ? 'bg-rose-50/70 border-rose-400 ring-2 ring-rose-400/30 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            alert.status === 'OPEN'
                              ? 'bg-rose-600 text-white animate-pulse'
                              : alert.status === 'DISPATCHED'
                              ? 'bg-amber-500 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {alert.priority} • {alert.status}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {alert.triggeredAt}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">
                        {alert.id}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-heading font-extrabold text-sm text-slate-900">
                        {alert.elderName}
                      </h4>
                      <p className="text-xs text-rose-950 font-semibold line-clamp-1 mt-0.5">
                        {alert.title}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-1 truncate max-w-[200px]">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{alert.locality}</span>
                      </div>
                      <span className="font-semibold text-teal-800 shrink-0">
                        {alert.assignedCaregiver || 'Corridor Standby'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Incident Triage & Hospital Routing (7 cols) */}
        <div className="lg:col-span-7">
          {activeAlert ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
              {/* Incident Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        activeAlert.status === 'OPEN'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : activeAlert.status === 'DISPATCHED'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-emerald-700 text-white'
                      }`}
                    >
                      {activeAlert.priority} • {activeAlert.status}
                    </span>
                    <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Triggered {activeAlert.triggeredAt}
                    </span>
                  </div>
                  <h3 className="font-heading font-extrabold text-lg text-slate-900 mt-1.5">
                    {activeAlert.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onViewOnMap(activeAlert.latitude, activeAlert.longitude)}
                    className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-teal-200"
                  >
                    <MapPin className="w-3.5 h-3.5 text-teal-600" />
                    <span>View on Live Map</span>
                  </button>
                </div>
              </div>

              {/* Demographics & Beneficiary Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Beneficiary Demographics
                  </span>
                  <div className="font-bold text-sm text-slate-900">{activeAlert.elderName}</div>
                  <div className="text-slate-600">
                    {activeAlert.elderAge} years old • {activeAlert.locality} ({activeAlert.postalCode})
                  </div>
                  {activeAlert.assignedCaregiver && (
                    <div className="text-teal-900 font-medium pt-1">
                      Attendant on shift: <strong className="font-bold">{activeAlert.assignedCaregiver}</strong>
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Emergency Family Contact
                  </span>
                  <div className="font-bold text-sm text-slate-900">{activeAlert.emergencyContact}</div>
                  <a
                    href={`tel:${activeAlert.emergencyPhone}`}
                    className="inline-flex items-center gap-1.5 text-teal-700 font-bold hover:underline pt-1 text-xs"
                  >
                    <Phone className="w-3.5 h-3.5 text-teal-600" />
                    <span>{activeAlert.emergencyPhone}</span>
                  </a>
                  <div className="text-[10px] text-slate-400 pt-0.5">
                    Family notified via automated SMS & WhatsApp
                  </div>
                </div>
              </div>

              {/* Alert Clinical Synopsis & Description */}
              <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/80 space-y-1.5 text-xs text-slate-800">
                <span className="font-extrabold text-rose-950 uppercase tracking-wider text-[10px] block">
                  Incident Vitals & Telemetry
                </span>
                <p className="leading-relaxed">{activeAlert.description}</p>
              </div>

              {/* Emergency Hospital Ambulance Triage & Routing */}
              {(() => {
                const activeElder = elders.find(
                  (e) => e.id === activeAlert.elderId || e.name.toLowerCase() === activeAlert.elderName.toLowerCase()
                );
                const defaultFallback = getEmergencyFacilityForAlert(activeAlert.locality);
                const preferredHospital: NearbyHospital = activeElder?.preferredHospital || defaultFallback;

                const alertLat = activeElder?.latitude || activeAlert.latitude;
                const alertLon = activeElder?.longitude || activeAlert.longitude;
                const nearbyList = getHospitalsForLocality(activeAlert.locality, alertLat, alertLon);

                const otherNearby = nearbyList.filter((h) => h.name !== preferredHospital.name);

                return (
                  <div className="p-5 rounded-3xl bg-rose-50/90 border border-rose-200 space-y-4 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-black uppercase tracking-wider text-rose-900 text-xs">
                        <Ambulance className="w-4 h-4 text-rose-600" />
                        <span>Platform Emergency Triage & Hospital Routing</span>
                      </div>
                      <span className="text-[11px] font-bold text-rose-800 bg-white px-3 py-1 rounded-full border border-rose-200 shadow-2xs">
                        {preferredHospital.distanceKm} km • {preferredHospital.etaMins || 5}m ETA
                      </span>
                    </div>

                    {/* Caregiver Emergency Dispatch Linkage Notice */}
                    <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <PhoneCall className="w-4 h-4 text-amber-700 shrink-0" />
                        <span className="text-[11px]">
                          Caregiver Link: <strong>{activeAlert.assignedCaregiver || 'Assigned Attendant'}</strong> is authorized to contact careseeker's preferred hospital immediately.
                        </span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full shrink-0">
                        Rapid ER Escalation
                      </span>
                    </div>

                    {/* Primary Preferred Hospital Card */}
                    <div className="p-4 rounded-2xl bg-white border-2 border-rose-300 shadow-2xs space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-extrabold uppercase tracking-wider mb-1">
                            <Star className="w-3 h-3 fill-rose-600 text-rose-600" />
                            <span>Careseeker's Preferred Hospital</span>
                          </div>
                          <div className="font-extrabold text-slate-900 text-base flex items-center gap-1.5 mt-0.5">
                            <Building2 className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>{preferredHospital.name}</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 flex items-start gap-1 leading-snug">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                            <span>{preferredHospital.address}</span>
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200">
                            {preferredHospital.distanceKm} km away
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-rose-700 font-semibold pt-1 border-t border-rose-100 flex items-center justify-between">
                        <span>{preferredHospital.traumaLevel || '24/7 Comprehensive Emergency Center'}</span>
                        <span className="text-[11px] font-mono font-bold text-slate-800">
                          ER: {preferredHospital.emergencyPhone}
                        </span>
                      </div>

                      {/* Interactive Hotline & Action Buttons for Preferred Hospital */}
                      <div className="flex flex-wrap items-center gap-2.5 pt-1">
                        <button
                          onClick={() => setSelectedHospitalForHotline(preferredHospital)}
                          className="flex-1 py-2.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                        >
                          <PhoneCall className="w-4 h-4" />
                          <span>Contact Preferred Hospital ({preferredHospital.emergencyPhone})</span>
                        </button>

                        <a
                          href={alertLat && alertLon && preferredHospital.latitude && preferredHospital.longitude
                            ? `https://www.google.com/maps/dir/?api=1&origin=${alertLat},${alertLon}&destination=${preferredHospital.latitude},${preferredHospital.longitude}&travelmode=driving`
                            : preferredHospital.googleMapsUrl || `https://maps.google.com/?q=${encodeURIComponent(preferredHospital.name + ' Chennai')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2.5 px-3.5 rounded-2xl bg-teal-800 hover:bg-teal-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                          title="Open Ambulance Driving Route on Google Maps"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Ambulance Route</span>
                        </a>

                        <button
                          onClick={() => onViewOnMap(preferredHospital.latitude || activeAlert.latitude, preferredHospital.longitude || activeAlert.longitude)}
                          className="py-2.5 px-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                        >
                          <Navigation className="w-4 h-4 text-teal-400" />
                          <span>Map</span>
                        </button>
                      </div>
                    </div>

                    {/* Secondary List of Nearby Hospitals in Sector */}
                    {otherNearby.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-rose-200/60">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-900 block">
                          Other Nearby Emergency Hospitals for {activeAlert.locality} ({otherNearby.length}):
                        </span>

                        <div className="space-y-2">
                          {otherNearby.map((hosp) => (
                            <div
                              key={hosp.id}
                              className="p-3 rounded-2xl bg-white/90 border border-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-rose-200 transition"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-xs text-slate-900 truncate">
                                    {hosp.name}
                                  </span>
                                  <span className="text-[10px] font-semibold text-slate-500">
                                    • {hosp.distanceKm} km ({hosp.etaMins || 6}m ETA)
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-600 truncate mt-0.5">{hosp.address}</p>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setSelectedHospitalForHotline(hosp)}
                                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                >
                                  <PhoneCall className="w-3 h-3" />
                                  <span>Dial Hotline</span>
                                </button>
                                <a
                                  href={alertLat && alertLon && hosp.latitude && hosp.longitude
                                    ? `https://www.google.com/maps/dir/?api=1&origin=${alertLat},${alertLon}&destination=${hosp.latitude},${hosp.longitude}&travelmode=driving`
                                    : hosp.googleMapsUrl || `https://maps.google.com/?q=${encodeURIComponent(hosp.name + ' Chennai')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-900 border border-slate-200 text-xs font-medium transition flex items-center gap-1"
                                  title="Directions on Google Maps"
                                >
                                  <ExternalLink className="w-3 h-3 text-slate-500" />
                                  <span className="hidden md:inline">Google Maps</span>
                                </a>
                                <button
                                  type="button"
                                  onClick={() => onViewOnMap(hosp.latitude || activeAlert.latitude, hosp.longitude || activeAlert.longitude)}
                                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition cursor-pointer"
                                  title="View on Map"
                                >
                                  <Navigation className="w-3 h-3 text-slate-500" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Status & Resolution Box */}
              {activeAlert.status === 'RESOLVED' ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Incident Resolved</span>
                  </div>
                  <p className="text-slate-700 mt-1">{activeAlert.resolutionNotes}</p>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  {/* Resolution Input Box if resolving */}
                  {resolvingAlertId === activeAlert.id && (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2.5 text-xs animate-fadeIn">
                      <label className="block font-bold text-emerald-950">
                        Enter Incident Resolution & Triage Notes:
                      </label>
                      <input
                        type="text"
                        value={resolutionNotesInput}
                        onChange={(e) => setResolutionNotesInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-emerald-300 text-xs bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
                        placeholder="e.g. Attendant verified vitals stabilized, medical notes logged..."
                      />
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => setResolvingAlertId(null)}
                          className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleConfirmResolve(activeAlert.id)}
                          className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                        >
                          Confirm Resolved
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      {activeAlert.status === 'OPEN' && (
                        <button
                          onClick={() => handleAcknowledge(activeAlert.id)}
                          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-2xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4 text-teal-400" />
                          <span>Acknowledge Incident</span>
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedAlertForDispatch(activeAlert)}
                        className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-2xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        <span>Dispatch Supervisor</span>
                      </button>
                    </div>

                    <button
                      onClick={() => setResolvingAlertId(activeAlert.id)}
                      className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-2xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Resolve Alert</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-16 bg-white rounded-3xl border border-slate-200 text-center text-slate-400 text-xs">
              <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="font-heading font-extrabold text-base text-slate-800">
                No Incident Selected
              </h3>
            </div>
          )}
        </div>
      </div>

      {/* Dial Hospital Hotline Modal */}
      {selectedHospitalForHotline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-5 animate-scaleUp">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                  <PhoneCall className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-base text-slate-900">
                    Emergency Hospital Hotline
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedHospitalForHotline(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-1.5 text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-800">
                {selectedHospitalForHotline.name}
              </span>
              <div className="text-2xl font-black font-mono text-rose-900 tracking-wider">
                {selectedHospitalForHotline.emergencyPhone}
              </div>
              <p className="text-xs text-slate-600">
                {selectedHospitalForHotline.address}
              </p>
              <div className="text-[10px] font-semibold text-rose-700 pt-1">
                {selectedHospitalForHotline.traumaLevel}
              </div>
            </div>

            <div className="space-y-2">
              <a
                href={`tel:${selectedHospitalForHotline.emergencyPhone}`}
                className="w-full py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Call Emergency Hotline Now</span>
              </a>

              <button
                onClick={() => handleCopyHotline(selectedHospitalForHotline.emergencyPhone)}
                className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedPhone ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Copied Phone to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span>Copy Phone Number</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supervisor Dispatch Modal */}
      <SupervisorDispatchModal
        alert={selectedAlertForDispatch}
        onClose={() => setSelectedAlertForDispatch(null)}
        onConfirmDispatch={onDispatchSupervisor}
      />
    </div>
  );
};
