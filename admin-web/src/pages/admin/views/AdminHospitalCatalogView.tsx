import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  MapPin,
  Phone,
  Ambulance,
  Edit2,
  Trash2,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  X,
} from 'lucide-react';
import type { HospitalFacility } from '../types';
import { initialHospitalFacilities, serviceableCorridors } from '../mockData';

interface AdminHospitalCatalogViewProps {
  onBackToDashboard?: () => void;
  onViewOnMap?: (lat: number, lng: number) => void;
}

export const AdminHospitalCatalogView: React.FC<AdminHospitalCatalogViewProps> = ({
  onBackToDashboard,
  onViewOnMap,
}) => {
  const [hospitals, setHospitals] = useState<HospitalFacility[]>(initialHospitalFacilities);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState('ALL');

  // Modal State (Add / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHospital, setEditingHospital] = useState<HospitalFacility | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formArea, setFormArea] = useState('South Chennai Corridor (Adyar)');
  const [formLat, setFormLat] = useState('13.0067');
  const [formLng, setFormLng] = useState('80.2575');
  const [formStandardPhone, setFormStandardPhone] = useState('+91 44 ');
  const [formEmergencyPhone, setFormEmergencyPhone] = useState('+91 44 ');
  const [formTraumaLevel, setFormTraumaLevel] = useState('24/7 Emergency & Acute Cardiac Care');
  const [formAmbulanceAvailable, setFormAmbulanceAvailable] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingHospital(null);
    setFormName('');
    setFormAddress('');
    setFormArea('South Chennai Corridor (Adyar)');
    setFormLat('13.0067');
    setFormLng('80.2575');
    setFormStandardPhone('+91 44 ');
    setFormEmergencyPhone('+91 44 ');
    setFormTraumaLevel('24/7 Emergency & Acute Cardiac Care');
    setFormAmbulanceAvailable(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (hosp: HospitalFacility) => {
    setEditingHospital(hosp);
    setFormName(hosp.name);
    setFormAddress(hosp.address);
    setFormArea(hosp.area);
    setFormLat(hosp.latitude.toString());
    setFormLng(hosp.longitude.toString());
    setFormStandardPhone(hosp.standardPhone);
    setFormEmergencyPhone(hosp.emergencyPhone);
    setFormTraumaLevel(hosp.traumaLevel || '24/7 Emergency Care');
    setFormAmbulanceAvailable(hosp.ambulanceAvailable ?? true);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Handle Save (Add or Update)
  const handleSaveHospital = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Hospital Name is required.');
      return;
    }
    if (!formAddress.trim()) {
      setFormError('Full Address is required.');
      return;
    }
    const lat = parseFloat(formLat);
    const lng = parseFloat(formLng);
    if (isNaN(lat) || isNaN(lng)) {
      setFormError('Please enter valid decimal coordinates for Latitude and Longitude.');
      return;
    }
    if (!formEmergencyPhone.trim() || formEmergencyPhone.trim() === '+91 44') {
      setFormError('24/7 Emergency / Ambulance Desk Contact is required.');
      return;
    }

    if (editingHospital) {
      // Update
      setHospitals((prev) =>
        prev.map((h) =>
          h.id === editingHospital.id
            ? {
                ...h,
                name: formName.trim(),
                address: formAddress.trim(),
                area: formArea,
                latitude: lat,
                longitude: lng,
                standardPhone: formStandardPhone.trim(),
                emergencyPhone: formEmergencyPhone.trim(),
                traumaLevel: formTraumaLevel.trim(),
                ambulanceAvailable: formAmbulanceAvailable,
              }
            : h
        )
      );
      showToast(`Hospital "${formName.trim()}" updated successfully.`);
    } else {
      // Create
      const newHospital: HospitalFacility = {
        id: `hosp_${Date.now()}`,
        name: formName.trim(),
        address: formAddress.trim(),
        area: formArea,
        latitude: lat,
        longitude: lng,
        standardPhone: formStandardPhone.trim(),
        emergencyPhone: formEmergencyPhone.trim(),
        traumaLevel: formTraumaLevel.trim(),
        ambulanceAvailable: formAmbulanceAvailable,
      };
      setHospitals((prev) => [newHospital, ...prev]);
      showToast(`New network hospital "${newHospital.name}" added to emergency desk.`);
    }

    setIsModalOpen(false);
  };

  // Handle Delete
  const handleDeleteHospital = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove "${name}" from the hospital catalog?`)) {
      setHospitals((prev) => prev.filter((h) => h.id !== id));
      showToast(`Hospital "${name}" removed from platform directory.`);
    }
  };

  // Filtered List
  const filteredHospitals = useMemo(() => {
    return hospitals.filter((h) => {
      const matchesArea =
        selectedAreaFilter === 'ALL' ||
        h.area.toLowerCase().includes(selectedAreaFilter.toLowerCase());

      const q = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === '' ||
        h.name.toLowerCase().includes(q) ||
        h.address.toLowerCase().includes(q) ||
        h.area.toLowerCase().includes(q) ||
        h.emergencyPhone.includes(q) ||
        h.standardPhone.includes(q);

      return matchesArea && matchesSearch;
    });
  }, [hospitals, selectedAreaFilter, searchQuery]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 p-3.5 rounded-2xl bg-slate-900 text-white text-xs font-bold shadow-xl border border-slate-700 animate-fadeIn flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="px-3 py-2 rounded-2xl bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-slate-700 hover:text-teal-900 transition-all flex items-center gap-2 group text-xs font-bold shadow-2xs shrink-0 cursor-pointer"
              title="Return to Dashboard Overview"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 text-slate-500 group-hover:text-teal-700" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </button>
          )}
          <div>
            <h2 className="text-xl font-heading font-extrabold text-slate-900 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-rose-600" />
              <span>Hospital Catalog & Emergency Network</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Network healthcare facilities, coordinates, trauma response capabilities, and 24/7 ambulance desk hotlines.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Hospital</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Network Facilities
          </span>
          <div className="text-2xl font-black font-heading text-slate-900">
            {hospitals.length} Hospitals
          </div>
          <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            100% active emergency routing
          </p>
        </div>

        {/* KPI 2 */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            24/7 Ambulance Fleet
          </span>
          <div className="text-2xl font-black font-heading text-rose-800">
            {hospitals.filter((h) => h.ambulanceAvailable).length} Facilities
          </div>
          <p className="text-xs text-slate-500">
            Dedicated ALS/BLS ambulance desks
          </p>
        </div>

        {/* KPI 3 */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Average Transit SLA
          </span>
          <div className="text-2xl font-black font-heading text-teal-800">
            &lt; 12 Minutes
          </div>
          <p className="text-xs text-slate-500">
            Across 5 core Chennai care corridors
          </p>
        </div>

        {/* KPI 4 */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Trauma & Cardiac Care
          </span>
          <div className="text-2xl font-black font-heading text-slate-900">
            Apex Level 1
          </div>
          <p className="text-xs text-slate-500">
            Apollo, Kauvery, Fortis, MGM linked
          </p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[260px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search hospital name, address, phone or corridor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-rose-500 font-medium text-slate-800"
          />
        </div>

        {/* Corridor Area Filter */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-bold">Corridor:</span>
          <select
            value={selectedAreaFilter}
            onChange={(e) => setSelectedAreaFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:bg-white"
          >
            <option value="ALL">All Chennai Corridors</option>
            {serviceableCorridors.map((c) => (
              <option key={c.name} value={c.name.split(' ')[0]}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Hospital Facilities Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-heading font-extrabold text-sm text-slate-900">
              Network Healthcare Facilities Directory
            </h3>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-50 text-slate-700 border border-slate-200">
            Showing {filteredHospitals.length} of {hospitals.length} hospitals
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th className="py-3.5 px-4">Hospital Name & Level</th>
                <th className="py-3.5 px-4">Full Address & Corridor</th>
                <th className="py-3.5 px-4">Coordinates (Lat, Lng)</th>
                <th className="py-3.5 px-4">Standard Desk Contact</th>
                <th className="py-3.5 px-4">24/7 Emergency / Ambulance Desk</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredHospitals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    No hospital facilities found matching your search.
                  </td>
                </tr>
              ) : (
                filteredHospitals.map((hosp) => (
                  <tr key={hosp.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Hospital Name & Trauma Level */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{hosp.name}</span>
                      </div>
                      <div className="text-[10px] text-rose-700 font-medium mt-0.5">
                        {hosp.traumaLevel || '24/7 Emergency Care'}
                      </div>
                    </td>

                    {/* Full Address & Corridor */}
                    <td className="py-4 px-4">
                      <div className="text-slate-800 font-medium max-w-xs line-clamp-1">
                        {hosp.address}
                      </div>
                      <div className="text-[10px] text-teal-800 font-bold flex items-center gap-1 mt-0.5">
                        <MapPin className="w-2.5 h-2.5 text-teal-600" />
                        <span>{hosp.area}</span>
                      </div>
                    </td>

                    {/* Coordinates */}
                    <td className="py-4 px-4 whitespace-nowrap font-mono text-[11px] text-slate-600">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                        <span>{hosp.latitude.toFixed(4)}, {hosp.longitude.toFixed(4)}</span>
                      </div>
                      {onViewOnMap && (
                        <button
                          onClick={() => onViewOnMap(hosp.latitude, hosp.longitude)}
                          className="block text-[10px] text-teal-700 font-bold hover:underline mt-0.5 cursor-pointer"
                        >
                          Show on Map →
                        </button>
                      )}
                    </td>

                    {/* Standard Contact Number */}
                    <td className="py-4 px-4 whitespace-nowrap font-mono">
                      <a
                        href={`tel:${hosp.standardPhone}`}
                        className="inline-flex items-center gap-1 text-slate-800 hover:text-teal-700 font-semibold"
                      >
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{hosp.standardPhone}</span>
                      </a>
                    </td>

                    {/* 24/7 Emergency / Ambulance Desk Contact */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <a
                        href={`tel:${hosp.emergencyPhone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-mono font-bold text-xs transition"
                      >
                        <Ambulance className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                        <span>{hosp.emergencyPhone}</span>
                      </a>
                    </td>

                    {/* Actions: Edit / Delete */}
                    <td className="py-4 px-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(hosp)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-teal-800 hover:bg-slate-100 transition cursor-pointer"
                          title="Edit Hospital Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteHospital(hosp.id, hosp.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Delete from Catalog"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================
          MODAL: ADD / EDIT HOSPITAL
         ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-5 animate-scaleUp max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                  Hospital Catalog Manager
                </span>
                <h3 className="text-xl font-heading font-black text-slate-900 mt-1">
                  {editingHospital ? `Edit Hospital: ${editingHospital.name}` : '+ Add Healthcare Facility'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Message */}
            {formError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSaveHospital} className="space-y-4 text-xs">
              {/* Field 1: Hospital Name */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Hospital Facility Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fortis Malar Hospital"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Field 2: Full Address */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Full Physical Address *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. 52 1st Main Rd, Gandhi Nagar, Adyar, Chennai 600020"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Field 3: Corridor / Area */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Operating Corridor / Sector *</label>
                <select
                  value={formArea}
                  onChange={(e) => setFormArea(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                >
                  <option value="South Chennai Corridor (Adyar)">South Chennai Corridor (Adyar)</option>
                  <option value="Adyar-Besant Nagar Sector">Adyar-Besant Nagar Sector</option>
                  <option value="Anna Nagar Central Zone">Anna Nagar Central Zone</option>
                  <option value="Mylapore Heritage Ward">Mylapore Heritage Ward</option>
                  <option value="Velachery Tech Corridor">Velachery Tech Corridor</option>
                  <option value="T. Nagar Commercial Ward">T. Nagar Commercial Ward</option>
                  <option value="OMR Expressway Sector (Peripheral)">OMR Expressway Sector (Peripheral)</option>
                </select>
              </div>

              {/* Field 4: Coordinates (Lat, Lng) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Latitude (GPS) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 13.0067"
                    value={formLat}
                    onChange={(e) => setFormLat(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Longitude (GPS) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 80.2575"
                    value={formLng}
                    onChange={(e) => setFormLng(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Field 5: Contact Numbers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Standard Contact Number</label>
                  <input
                    type="text"
                    placeholder="+91 44 4289 2222"
                    value={formStandardPhone}
                    onChange={(e) => setFormStandardPhone(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-rose-800">24/7 Emergency / Ambulance Desk *</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 44 4289 2200"
                    value={formEmergencyPhone}
                    onChange={(e) => setFormEmergencyPhone(e.target.value)}
                    className="w-full px-3.5 py-2 bg-rose-50 border border-rose-200 rounded-xl font-mono font-bold text-rose-950 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Field 6: Trauma / Facility Level */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Emergency & Trauma Level</label>
                <input
                  type="text"
                  placeholder="e.g. 24/7 Emergency & Acute Cardiac Care"
                  value={formTraumaLevel}
                  onChange={(e) => setFormTraumaLevel(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Field 7: Ambulance Availability */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formAmbulanceAvailable}
                  onChange={(e) => setFormAmbulanceAvailable(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                <span className="font-bold text-slate-800">
                  Confirmed 24/7 ALS/BLS Ambulance Stationed at this facility
                </span>
              </label>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingHospital ? 'Save Changes' : 'Save to Directory'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
