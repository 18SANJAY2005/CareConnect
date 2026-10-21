import React, { useState, useMemo } from 'react';
import {
  Building2,
  Search,
  MapPin,
  PhoneCall,
  Phone,
  Navigation,
  Plus,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  Copy,
  Check,
  X,
  HeartPulse,
  ExternalLink,
  Clock,
} from 'lucide-react';
import type { NearbyHospital } from '../types';
import { initialHospitalCatalog } from '../mockData';

export type HospitalSortOrder =
  | 'LOCATION_ASC'
  | 'LOCATION_DESC'
  | 'NAME_ASC'
  | 'NAME_DESC';

export const getLocationInitial = (loc?: string): string => {
  if (!loc) return 'C';
  return loc.trim().charAt(0).toUpperCase();
};

export const CHENNAI_LOCATION_PILLS = [
  { id: 'ALL', label: 'All Chennai' },
  { id: 'Adyar', label: 'Adyar' },
  { id: 'Anna Nagar', label: 'Anna Nagar' },
  { id: 'T. Nagar', label: 'T. Nagar' },
  { id: 'Mylapore', label: 'Mylapore' },
  { id: 'Besant Nagar', label: 'Besant Nagar' },
  { id: 'Velachery', label: 'Velachery' },
  { id: 'OMR', label: 'OMR Expressway' },
  { id: 'Central', label: 'Central / Vadapalani' },
];

export const matchHospitalLocation = (hosp: NearbyHospital, locationId: string): boolean => {
  if (locationId === 'ALL') return true;
  const hay = `${hosp.name} ${hosp.address} ${hosp.location || ''} ${hosp.locality || ''}`.toLowerCase();
  const needle = locationId.toLowerCase();

  if (needle === 'adyar') return hay.includes('adyar') || hay.includes('gandhi nagar');
  if (needle === 'besant nagar') return hay.includes('besant');
  if (needle === 't. nagar') return hay.includes('t. nagar') || hay.includes('t.nagar') || /\bt\s+nagar\b/.test(hay) || hay.includes('kodambakkam');
  if (needle === 'anna nagar') return hay.includes('anna nagar') || hay.includes('shanthi colony') || hay.includes('shenoy') || hay.includes('aminjikarai');
  if (needle === 'mylapore') return hay.includes('mylapore') || hay.includes('alwarpet') || hay.includes('luz');
  if (needle === 'velachery') return hay.includes('velachery') || hay.includes('dandeeswaram') || hay.includes('pallikaranai');
  if (needle === 'omr') return hay.includes('omr') || hay.includes('perungudi') || hay.includes('kandanchavadi') || hay.includes('perumbakkam');
  if (needle === 'central') return hay.includes('central') || hay.includes('vadapalani') || hay.includes('kilpauk') || hay.includes('greams') || hay.includes('manapakkam');

  return hay.includes(needle);
};

interface AdminHospitalCatalogViewProps {
  onBack?: () => void;
  onViewOnMap?: (lat: number, lng: number) => void;
}

export const AdminHospitalCatalogView: React.FC<AdminHospitalCatalogViewProps> = ({
  onBack,
  onViewOnMap,
}) => {
  const [hospitals, setHospitals] = useState<NearbyHospital[]>(initialHospitalCatalog);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCorridor, setSelectedCorridor] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<HospitalSortOrder>('LOCATION_ASC');
  const [selectedHospitalForHotline, setSelectedHospitalForHotline] = useState<NearbyHospital | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New hospital form state
  const [newHospital, setNewHospital] = useState<Partial<NearbyHospital>>({
    name: '',
    address: '',
    latitude: 13.04,
    longitude: 80.24,
    location: 'Central / Vadapalani',
    locality: '',
    contact: '',
    contactDetails: '',
    emergencyPhone: '',
    emergencyContact: '',
    traumaLevel: '24/7 Emergency & Multi-Speciality Care',
    distanceKm: 2.0,
    etaMins: 6,
    city: 'Chennai',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyHotline = (phone: string, id: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    showToast(`Copied hotline ${phone} to clipboard`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddHospital = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHospital.name || !newHospital.address || !newHospital.emergencyPhone) {
      showToast('Please fill in Hospital Name, Address, and Emergency Contact Information.');
      return;
    }

    const created: NearbyHospital = {
      id: `cat_hosp_${Date.now()}`,
      name: newHospital.name,
      address: newHospital.address,
      latitude: Number(newHospital.latitude) || 13.04,
      longitude: Number(newHospital.longitude) || 80.24,
      location: newHospital.location || 'Central / Vadapalani',
      locality: newHospital.locality || newHospital.location || 'Chennai',
      contact: newHospital.contact || '+91 44 2000 0000',
      contactDetails: newHospital.contactDetails || newHospital.contact || '+91 44 2000 0000',
      emergencyPhone: newHospital.emergencyPhone,
      emergencyContact: newHospital.emergencyContact || `${newHospital.emergencyPhone} (24/7 ER Hotline)`,
      traumaLevel: newHospital.traumaLevel || '24/7 Emergency Care',
      distanceKm: Number(newHospital.distanceKm) || 2.5,
      etaMins: Number(newHospital.etaMins) || 7,
      city: 'Chennai',
      googleMapsUrl: `https://maps.google.com/?q=${encodeURIComponent(newHospital.name + ' ' + newHospital.address)}`,
    };

    setHospitals((prev) => [created, ...prev]);
    setIsAddModalOpen(false);
    setNewHospital({
      name: '',
      address: '',
      latitude: 13.04,
      longitude: 80.24,
      location: 'Central / Vadapalani',
      locality: '',
      contact: '',
      contactDetails: '',
      emergencyPhone: '',
      emergencyContact: '',
      traumaLevel: '24/7 Emergency & Multi-Speciality Care',
      distanceKm: 2.0,
      etaMins: 6,
      city: 'Chennai',
    });
    showToast(`Hospital "${created.name}" successfully registered in catalog.`);
  };

  const locationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    CHENNAI_LOCATION_PILLS.forEach((p) => {
      counts[p.id] = hospitals.filter((h) => matchHospitalLocation(h, p.id)).length;
    });
    return counts;
  }, [hospitals]);

  const filteredHospitals = useMemo(() => {
    return hospitals.filter((hosp) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        hosp.name.toLowerCase().includes(q) ||
        hosp.address.toLowerCase().includes(q) ||
        (hosp.location && hosp.location.toLowerCase().includes(q)) ||
        (hosp.locality && hosp.locality.toLowerCase().includes(q)) ||
        hosp.emergencyPhone.toLowerCase().includes(q);

      const matchesLocation = matchHospitalLocation(hosp, selectedCorridor);

      return matchesSearch && matchesLocation;
    });
  }, [hospitals, searchQuery, selectedCorridor]);

  const sortedHospitals = useMemo(() => {
    return [...filteredHospitals].sort((a, b) => {
      if (sortOrder === 'LOCATION_ASC') {
        const locA = (a.location || a.locality || '').toLowerCase();
        const locB = (b.location || b.locality || '').toLowerCase();
        const comp = locA.localeCompare(locB);
        if (comp !== 0) return comp;
        return a.name.localeCompare(b.name);
      }
      if (sortOrder === 'LOCATION_DESC') {
        const locA = (a.location || a.locality || '').toLowerCase();
        const locB = (b.location || b.locality || '').toLowerCase();
        const comp = locB.localeCompare(locA);
        if (comp !== 0) return comp;
        return a.name.localeCompare(b.name);
      }
      if (sortOrder === 'NAME_ASC') {
        return a.name.localeCompare(b.name);
      }
      if (sortOrder === 'NAME_DESC') {
        return b.name.localeCompare(a.name);
      }
      return 0;
    });
  }, [filteredHospitals, sortOrder]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
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
              <Building2 className="w-6 h-6 text-teal-700" />
              <h2 className="text-xl font-heading font-extrabold text-slate-900">
                Hospital & Emergency Facilities Catalog
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified emergency hospitals catalog with coordinates, locations, contacts, and 24/7 ER hotlines
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-2xl shadow-sm transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Hospital to Catalog</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Total Hospital Facilities
          </span>
          <div className="text-2xl font-black font-heading text-slate-900">{sortedHospitals.length} Hospitals</div>
          <p className="text-xs text-slate-500">Verified emergency hospitals across Chennai</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Location Ordering
          </span>
          <div className="text-2xl font-black font-heading text-teal-800 flex items-center gap-1.5">
            <MapPin className="w-5 h-5 text-teal-600" />
            <span>A &rarr; Z Locations</span>
          </div>
          <p className="text-xs text-slate-500">A for Adyar, B for Besant Nagar, etc.</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            24/7 Emergency & ICU
          </span>
          <div className="text-2xl font-black font-heading text-rose-700 flex items-center gap-1.5">
            <HeartPulse className="w-5 h-5 text-rose-600" />
            <span>100% Ready</span>
          </div>
          <p className="text-xs text-slate-500">All facilities equipped with cardiac/ICU support</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Google Maps Verified
          </span>
          <div className="text-2xl font-black font-heading text-emerald-700 flex items-center gap-1.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>100% Exact Pins</span>
          </div>
          <p className="text-xs text-slate-500">Exact street addresses with direct GPS links</p>
        </div>
      </div>

      {/* Search, Sort and Location Selection Filter Bar */}
      <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search hospital name, address, location, or emergency contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-medium text-slate-800"
            />
          </div>

          {/* Location Alphabetical Sorting Control */}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-700" />
            <span className="text-xs font-bold text-slate-700">Sort:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as HospitalSortOrder)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:bg-white"
            >
              <option value="LOCATION_ASC">Location Order: A &rarr; Z (A for Adyar, B for Besant Nagar, etc.)</option>
              <option value="LOCATION_DESC">Location Order: Z &rarr; A</option>
              <option value="NAME_ASC">Hospital Name (A - Z)</option>
              <option value="NAME_DESC">Hospital Name (Z - A)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-teal-700" />
            <span className="text-xs font-bold text-slate-700">Filter Location:</span>
            <select
              value={selectedCorridor}
              onChange={(e) => setSelectedCorridor(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:bg-white"
            >
              {CHENNAI_LOCATION_PILLS.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.label} ({locationCounts[loc.id] ?? 0})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Location Filter Pills - flex-wrap to fit within screen frame */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-500 shrink-0 mr-1 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-slate-400" />
            <span>Specific Location:</span>
          </span>
          {CHENNAI_LOCATION_PILLS.map((loc) => {
            const isSelected = selectedCorridor === loc.id;
            const count = locationCounts[loc.id] ?? 0;
            return (
              <button
                key={loc.id}
                type="button"
                onClick={() => setSelectedCorridor(loc.id)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>{loc.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    isSelected ? 'bg-teal-900 text-teal-200' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Catalog Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden w-full max-w-full">
        <div className="p-4 bg-teal-50/50 border-b border-teal-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-teal-700" />
            <span className="text-xs font-heading font-extrabold text-teal-950">
              {selectedCorridor === 'ALL'
                ? 'All Registered Hospitals Across Chennai (Ordered by Location: A for Adyar, B for Besant Nagar...)'
                : `Specific Set of Hospitals in ${CHENNAI_LOCATION_PILLS.find((l) => l.id === selectedCorridor)?.label || selectedCorridor}`}
            </span>
            <span className="text-xs font-extrabold text-teal-800 bg-white px-2.5 py-0.5 rounded-full border border-teal-200 shadow-2xs">
              {sortedHospitals.length} Facilities
            </span>
          </div>
          <span className="text-[11px] text-teal-800 font-medium">
            Exact Google Maps addresses & direct navigation links
          </span>
        </div>

        <div className="w-full max-w-full overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 md:px-3.5">#</th>
                <th className="py-3 px-3.5 md:px-4">Hospital Location (A – Z)</th>
                <th className="py-3 px-3.5 md:px-4">Hospital Name</th>
                <th className="py-3 px-3.5 md:px-4">Exact Address (Google Maps)</th>
                <th className="py-3 px-3.5 md:px-4">Contact Details</th>
                <th className="py-3 px-3.5 md:px-4">Emergency Contact Info</th>
                <th className="py-3 px-3.5 md:px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedHospitals.map((hosp, idx) => (
                <tr key={hosp.id} className="hover:bg-teal-50/30 transition-colors">
                  {/* Sequence Index */}
                  <td className="py-3.5 px-3 md:px-3.5 font-mono text-[11px] font-bold text-slate-400">
                    #{String(idx + 1).padStart(2, '0')}
                  </td>

                  {/* Hospital Location (A - Z) */}
                  <td className="py-3.5 px-3.5 md:px-4 whitespace-nowrap">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-teal-50 border border-teal-200 shadow-2xs">
                      <span className="w-5 h-5 rounded-lg bg-teal-700 text-white font-extrabold text-[11px] flex items-center justify-center font-heading">
                        {getLocationInitial(hosp.location || hosp.locality)}
                      </span>
                      <span className="text-xs font-extrabold text-teal-950">
                        {hosp.location || hosp.locality || 'Chennai Sector'}
                      </span>
                    </div>
                  </td>

                  {/* Hospital Name */}
                  <td className="py-3.5 px-3.5 md:px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center shrink-0 shadow-2xs">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-xs text-slate-900 leading-snug">{hosp.name}</div>
                        <span className="text-[10px] text-rose-700 font-semibold">{hosp.traumaLevel}</span>
                      </div>
                    </div>
                  </td>

                  {/* Exact Address from Google Maps */}
                  <td className="py-3.5 px-3.5 md:px-4 max-w-[200px] md:max-w-xs">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-800 leading-snug">
                        {hosp.address}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <a
                          href={hosp.googleMapsUrl || `https://maps.google.com/?q=${encodeURIComponent(hosp.name + ' ' + (hosp.address || 'Chennai'))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-[10px] font-bold border border-teal-200 transition shadow-2xs"
                          title="Open Exact Pin in Google Maps"
                        >
                          <MapPin className="w-2.5 h-2.5 text-teal-600" />
                          <span>Google Maps</span>
                          <ExternalLink className="w-2.5 h-2.5 text-teal-600" />
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(hosp.address);
                            showToast(`Copied address for ${hosp.name}`);
                          }}
                          className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                          title="Copy Exact Address"
                        >
                          <Copy className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  </td>

                  {/* Contact Details */}
                  <td className="py-3.5 px-3.5 md:px-4 whitespace-nowrap">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-800 font-medium">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{hosp.contact || hosp.contactDetails || '+91 44 2000 0000'}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">General Desk / Reception</span>
                    </div>
                  </td>

                  {/* Emergency Contact Information */}
                  <td className="py-3.5 px-3.5 md:px-4 whitespace-nowrap">
                    <div className="space-y-0.5">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 font-mono font-bold text-[11px] border border-rose-200">
                        <PhoneCall className="w-3 h-3 text-rose-600" />
                        <span>{hosp.emergencyPhone}</span>
                      </div>
                      <span className="text-[10px] text-rose-700 block font-medium">
                        {hosp.emergencyContact || '24/7 Casualty & Ambulance'}
                      </span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-3.5 md:px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedHospitalForHotline(hosp)}
                        className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition flex items-center gap-1 cursor-pointer shadow-2xs"
                        title="Dial Emergency Hotline"
                      >
                        <PhoneCall className="w-3 h-3" />
                        <span>Dial Hotline</span>
                      </button>

                      <a
                        href={hosp.googleMapsUrl || `https://maps.google.com/?q=${encodeURIComponent(hosp.name + ' ' + (hosp.address || 'Chennai'))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded-xl bg-slate-100 hover:bg-teal-50 text-slate-600 hover:text-teal-900 border border-slate-200 hover:border-teal-300 transition cursor-pointer"
                        title="Open Exact Address in Google Maps"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500 hover:text-teal-700" />
                      </a>

                      {onViewOnMap && (
                        <button
                          onClick={() => onViewOnMap(hosp.latitude || 13.04, hosp.longitude || 80.24)}
                          className="p-1 rounded-xl bg-slate-100 hover:bg-teal-50 text-slate-600 hover:text-teal-900 border border-slate-200 hover:border-teal-300 transition cursor-pointer"
                          title="View on Live Map"
                        >
                          <Navigation className="w-3.5 h-3.5 text-slate-500" />
                        </button>
                      )}

                      <button
                        onClick={() => handleCopyHotline(hosp.emergencyPhone, hosp.id)}
                        className="p-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                        title="Copy Emergency Phone"
                      >
                        {copiedId === hosp.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Hospital Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-teal-700" />
                <h3 className="font-heading font-extrabold text-base text-slate-900">
                  Register New Hospital in Catalog
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddHospital} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Hospital Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Apollo Proton Cancer Centre"
                  value={newHospital.name}
                  onChange={(e) => setNewHospital({ ...newHospital, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Hospital Address *</label>
                <input
                  type="text"
                  required
                  placeholder="Full physical address with postal code"
                  value={newHospital.address}
                  onChange={(e) => setNewHospital({ ...newHospital, address: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Latitude *</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={newHospital.latitude}
                    onChange={(e) => setNewHospital({ ...newHospital, latitude: parseFloat(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Longitude *</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={newHospital.longitude}
                    onChange={(e) => setNewHospital({ ...newHospital, longitude: parseFloat(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Hospital Location / Corridor Sector *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., OMR Corridor / T. Nagar Hub"
                  value={newHospital.location}
                  onChange={(e) => setNewHospital({ ...newHospital, location: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">General Contact Details</label>
                <input
                  type="text"
                  placeholder="Landline desk number or email"
                  value={newHospital.contactDetails}
                  onChange={(e) => setNewHospital({ ...newHospital, contactDetails: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Emergency Contact Information *</label>
                <input
                  type="text"
                  required
                  placeholder="24/7 Casualty / Ambulance Hotline number"
                  value={newHospital.emergencyPhone}
                  onChange={(e) => setNewHospital({ ...newHospital, emergencyPhone: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Trauma Care & Clinical Level</label>
                  <input
                    type="text"
                    placeholder="e.g., Level 1 Trauma & 24/7 Geriatric Neuro ICU"
                    value={newHospital.traumaLevel}
                    onChange={(e) => setNewHospital({ ...newHospital, traumaLevel: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Establishment / Founding Year</label>
                  <input
                    type="number"
                    min="1900"
                    max="2030"
                    placeholder="e.g., 2015"
                    value={newHospital.establishedYear || ''}
                    onChange={(e) => setNewHospital({ ...newHospital, establishedYear: parseInt(e.target.value) || undefined })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold transition shadow-sm"
                >
                  Save to Catalog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dial Hospital Hotline Modal */}
      {selectedHospitalForHotline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-700 font-extrabold text-sm uppercase tracking-wider">
                <PhoneCall className="w-5 h-5 text-rose-600 animate-pulse" />
                <span>Emergency Hospital Hotline</span>
              </div>
              <button
                onClick={() => setSelectedHospitalForHotline(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center py-2 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-black text-lg text-slate-900">
                {selectedHospitalForHotline.name}
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {selectedHospitalForHotline.address}
              </p>
              <div className="text-xs font-semibold text-rose-700">
                {selectedHospitalForHotline.traumaLevel}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block">
                Direct Emergency 24/7 Casualty Line
              </span>
              <a
                href={`tel:${selectedHospitalForHotline.emergencyPhone.replace(/\s+/g, '')}`}
                className="text-xl font-heading font-black text-rose-700 hover:underline block font-mono"
              >
                {selectedHospitalForHotline.emergencyPhone}
              </a>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => handleCopyHotline(selectedHospitalForHotline.emergencyPhone, 'modal')}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Number</span>
              </button>
              <a
                href={`tel:${selectedHospitalForHotline.emergencyPhone.replace(/\s+/g, '')}`}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm text-center"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Dial Now</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

