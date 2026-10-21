import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  UserPlus,
  MapPin,
  Phone,
  Eye,
  ArrowLeft,
  Building2,
  Tag,
  Gift,
  Check,
  Copy,
  X,
  ShieldCheck,
} from 'lucide-react';
import type { AdminElderItem } from '../types';
import { CARESEEKER_OFFERS } from '../mockData';

interface AdminEldersViewProps {
  elders: AdminElderItem[];
  onSelectElder: (elder: AdminElderItem) => void;
  onStatusChange: (elderId: string, newStatus: 'ACTIVE' | 'PENDING' | 'INACTIVE') => void;
  onAddElder?: () => void;
  onBack?: () => void;
}

export const AdminEldersView: React.FC<AdminEldersViewProps> = ({
  elders,
  onSelectElder,
  onStatusChange,
  onAddElder,
  onBack,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPin, setSelectedPin] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedMobility, setSelectedMobility] = useState('ALL');
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [isOffersModalOpen, setIsOffersModalOpen] = useState(false);
  const [copiedOfferCode, setCopiedOfferCode] = useState<string | null>(null);

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedOfferCode(code);
    setTimeout(() => setCopiedOfferCode(null), 2000);
  };

  // Extract unique PIN codes for filter
  const uniquePins = useMemo(() => {
    const pins = Array.from(new Set(elders.map((e) => e.postalCode))).filter(Boolean);
    return ['ALL', ...pins];
  }, [elders]);

  // Extract unique sectors / localities
  const uniqueSectors = useMemo(() => {
    const sectors = Array.from(new Set(elders.map((e) => e.locality))).filter(Boolean);
    return ['ALL', ...sectors];
  }, [elders]);

  // Extract unique mobility conditions
  const uniqueMobilityLevels = useMemo(() => {
    const levels = Array.from(new Set(elders.map((e) => e.mobilityLevel))).filter(Boolean);
    return ['ALL', ...levels];
  }, [elders]);

  // Filtered elders
  const filteredElders = useMemo(() => {
    return elders.filter((elder) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === '' ||
        elder.name.toLowerCase().includes(q) ||
        elder.locality.toLowerCase().includes(q) ||
        elder.sponsorName.toLowerCase().includes(q) ||
        (elder.medicalConditions && elder.medicalConditions.some((c) => c.toLowerCase().includes(q))) ||
        (elder.preferredHospital && elder.preferredHospital.name.toLowerCase().includes(q)) ||
        (elder.assignedCaregiverName &&
          elder.assignedCaregiverName.toLowerCase().includes(q));

      const matchesPin = selectedPin === 'ALL' || elder.postalCode === selectedPin;
      const matchesStatus = selectedStatus === 'ALL' || elder.status === selectedStatus;
      const matchesMobility = selectedMobility === 'ALL' || elder.mobilityLevel === selectedMobility;
      const matchesSector = selectedSector === 'ALL' || elder.locality === selectedSector;

      return matchesSearch && matchesPin && matchesStatus && matchesMobility && matchesSector;
    });
  }, [elders, searchQuery, selectedPin, selectedStatus, selectedMobility, selectedSector]);

  return (
    <div className="space-y-5 animate-fadeIn pb-12">
      {/* Top Controls Header */}
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
            <h2 className="text-xl font-heading font-extrabold text-slate-900">
              Careseekers Directory
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsOffersModalOpen(true)}
            className="px-4 py-2.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-900 rounded-2xl font-bold text-xs shadow-2xs flex items-center justify-center gap-2 transition active:scale-95"
            title="View Careseeker Exclusive Concessions & Promotional Subsidies"
          >
            <Tag className="w-4 h-4 text-teal-700" />
            <span>Careseeker Offers ({CARESEEKER_OFFERS.length})</span>
          </button>

          {onAddElder && (
            <button
              onClick={onAddElder}
              className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-2xl font-bold text-xs shadow-md flex items-center justify-center gap-2 transition active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Careseeker Profile</span>
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search careseeker, sector, condition, caregiver, or hospital..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-medium"
          />
        </div>

        {/* Sector / Corridor Filter */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-bold">Sector:</span>
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:bg-white max-w-[160px] truncate"
          >
            <option value="ALL">All Sectors</option>
            {uniqueSectors.filter((s) => s !== 'ALL').map((sec) => (
              <option key={sec} value={sec}>
                {sec}
              </option>
            ))}
          </select>
        </div>

        {/* Mobility Condition Filter */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-bold">Mobility:</span>
          <select
            value={selectedMobility}
            onChange={(e) => setSelectedMobility(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:bg-white max-w-[150px] truncate"
          >
            <option value="ALL">All Mobility</option>
            {uniqueMobilityLevels.filter((m) => m !== 'ALL').map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        {/* PIN Code Filter */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <span className="font-bold">PIN:</span>
          <select
            value={selectedPin}
            onChange={(e) => setSelectedPin(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:bg-white"
          >
            {uniquePins.map((pin) => (
              <option key={pin} value={pin}>
                {pin === 'ALL' ? 'All PINs' : pin}
              </option>
            ))}
          </select>
        </div>

        {/* Standardized Status Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setSelectedStatus('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              selectedStatus === 'ALL'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            All Status
          </button>
          <button
            type="button"
            onClick={() => setSelectedStatus('ACTIVE')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              selectedStatus === 'ACTIVE'
                ? 'bg-white text-emerald-800 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setSelectedStatus('PENDING')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              selectedStatus === 'PENDING'
                ? 'bg-white text-amber-800 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Pending
          </button>
          <button
            type="button"
            onClick={() => setSelectedStatus('INACTIVE')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              selectedStatus === 'INACTIVE'
                ? 'bg-white text-slate-800 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Inactive
          </button>
        </div>

        {/* Reset filter button if any applied */}
        {(searchQuery || selectedPin !== 'ALL' || selectedStatus !== 'ALL' || selectedMobility !== 'ALL' || selectedSector !== 'ALL') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedPin('ALL');
              setSelectedStatus('ALL');
              setSelectedMobility('ALL');
              setSelectedSector('ALL');
            }}
            className="text-xs font-bold text-teal-700 hover:text-teal-900 px-2 py-1"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Table Canvas */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="w-full max-w-full overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            {/* Table Header */}
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Careseeker Name & Demographics</th>
                <th className="py-3.5 px-4">Primary Family Contact</th>
                <th className="py-3.5 px-4">Service Address & PIN</th>
                <th className="py-3.5 px-4">Emergency Hospital Facility</th>
                <th className="py-3.5 px-4">Assigned Caregiver</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100">
              {filteredElders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No careseeker profiles match the selected search or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredElders.map((elder) => (
                  <tr
                    key={elder.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => onSelectElder(elder)}
                  >
                    {/* Elder Name & Demographics */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200/60 flex items-center justify-center font-heading font-extrabold text-teal-800 text-xs shadow-2xs">
                          {elder.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-heading font-extrabold text-sm text-slate-900 group-hover:text-teal-700 transition">
                            {elder.name}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {elder.age} yrs • {elder.gender} • {elder.mobilityLevel.replace(/_/g, ' ')}
                          </div>
                          {elder.appliedOffer && (
                            <div className="mt-1 flex items-center gap-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-900 text-[10px] font-bold">
                                <Tag className="w-2.5 h-2.5 text-teal-600" />
                                <span>{elder.appliedOffer.code} ({elder.appliedOffer.discountLabel})</span>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Primary Family Contact */}
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-800 text-xs">
                        {elder.sponsorName}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-teal-700 mt-0.5">
                        <Phone className="w-3 h-3" />
                        <span>{elder.sponsorPhone}</span>
                      </div>
                    </td>

                    {/* Address & PIN */}
                    <td className="py-4 px-6">
                      <div className="font-medium text-slate-800 text-xs max-w-[200px] truncate" title={elder.addressLine1}>
                        {elder.addressLine1}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5 font-mono">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{elder.locality} • {elder.postalCode}</span>
                      </div>
                    </td>

                    {/* Emergency Hospital Facility */}
                    <td className="py-4 px-6">
                      {elder.preferredHospital ? (
                        <div>
                          <div className="font-semibold text-slate-800 text-xs flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span className="truncate max-w-[170px]" title={elder.preferredHospital.name}>
                              {elder.preferredHospital.name}
                            </span>
                          </div>
                          <div className="text-[10px] text-rose-700 font-bold mt-0.5 flex items-center gap-1">
                            <span>{elder.preferredHospital.distanceKm} km</span>
                            <span>•</span>
                            <span>{elder.preferredHospital.etaMins}m ETA</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-slate-400 italic text-[11px] flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-300" />
                          <span>Auto-routing</span>
                        </div>
                      )}
                    </td>

                    {/* Assigned Caregiver */}
                    <td className="py-4 px-6">
                      {elder.assignedCaregiverName ? (
                        <div>
                          <div className="font-semibold text-slate-800 text-xs flex items-center gap-1">
                            <span>{elder.assignedCaregiverName}</span>
                            <span className="text-[10px] text-amber-600">⭐ {elder.assignedCaregiverRating || 4.8}</span>
                          </div>
                          <div className="text-[10px] text-emerald-700 font-bold mt-0.5">
                            {elder.shiftPreference.replace(/_/g, ' ')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={elder.status}
                        onChange={(e) => onStatusChange(elder.id, e.target.value as any)}
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full border cursor-pointer ${
                          elder.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : elder.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="PENDING">PENDING</option>
                        <option value="INACTIVE">INACTIVE</option>
                      </select>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectElder(elder);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs transition border border-teal-200/60 inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Profile</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <strong className="text-slate-700">{filteredElders.length}</strong> of{' '}
            <strong className="text-slate-700">{elders.length}</strong> registered careseekers
          </span>
          <span className="font-medium text-slate-400">
            Geofence corridor verification active
          </span>
        </div>
      </div>

      {/* Careseeker Exclusive Promotional Offers & Subsidies Modal */}
      {isOffersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div
            className="fixed inset-0"
            onClick={() => setIsOffersModalOpen(false)}
          />
          <div className="relative bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden z-10">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-heading font-extrabold text-white flex items-center gap-2">
                    <span>Careseeker Offers & Promotional Subsidies</span>
                    <span className="px-2 py-0.5 rounded-full bg-teal-400/20 text-teal-300 text-[10px] font-black tracking-wider uppercase">
                      Careseekers Exclusive
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Official family concessions, palliative care relief grants, and introductory vouchers.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOffersModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Exclusive Policy Notice */}
            <div className="px-6 py-3 bg-teal-50/70 border-b border-teal-100 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <p className="text-[11px] text-teal-900 leading-relaxed font-medium">
                <strong>Platform Exclusivity Rule:</strong> Promotional subsidies and discount vouchers are applicable strictly to Careseeker enrollment and invoice settlement. Caregiver shifts, attendance logs, and operational rosters are completely segregated and unaffected.
              </p>
            </div>

            {/* Scrollable Offers List */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {CARESEEKER_OFFERS.map((offer) => {
                const isCopied = copiedOfferCode === offer.code;
                return (
                  <div
                    key={offer.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-teal-300 hover:shadow-xs transition-all space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-900 font-extrabold text-xs">
                            {offer.discountLabel}
                          </span>
                          <h4 className="text-sm font-heading font-bold text-slate-900">
                            {offer.title}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {offer.description}
                        </p>
                      </div>

                      {/* Coupon Code Pill & Copy Button */}
                      <button
                        onClick={() => handleCopyCode(offer.code)}
                        className={`shrink-0 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition flex items-center gap-1.5 shadow-2xs ${
                          isCopied
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-slate-50 hover:bg-teal-50 text-slate-800 hover:text-teal-950 border-slate-200 hover:border-teal-300'
                        }`}
                        title="Click to copy voucher code"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>COPIED!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>{offer.code}</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                      <div>
                        <span className="font-bold text-slate-700">Eligibility: </span>
                        <span>{offer.eligibility}</span>
                      </div>
                      <div className="font-medium text-slate-400">
                        Valid until {offer.validUntil}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                To attach an offer to a specific elder, select them and apply in their profile drawer.
              </span>
              <button
                onClick={() => setIsOffersModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
              >
                Close Desk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
