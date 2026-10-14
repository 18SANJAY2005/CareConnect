import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Phone,
  User,
  Activity,
  Clock,
  ExternalLink,
  Building2,
  Ambulance,
  CheckCircle2,
  AlertCircle,
  PhoneCall,
  Check,
  Tag,
  Trash2,
  ShieldCheck,
  HeartPulse,
  Pill,
  Eye,
} from 'lucide-react';
import type { AdminElderItem, NearbyHospital, CareseekerOffer } from '../types';
import { standardChennaiHospitals, sampleClinicalTasksElder1 } from '../mockData';

export const CARESEEKER_OFFERS: CareseekerOffer[] = [
  {
    id: 'off-1',
    code: 'WELCOME-CARE',
    title: 'First Month Family Welcome',
    discountLabel: '15% OFF',
    description: 'First-time booking on any 12h or 24h monthly care plan',
    eligibility: 'New Careseekers',
    validUntil: '31 Dec 2026',
  },
  {
    id: 'off-2',
    code: 'CHRONIC-RECOVERY',
    title: 'Post-Op & Rehab Concession',
    discountLabel: '₹2,500 OFF',
    description: 'Minimum 60-day commitment for post-hospitalization care',
    eligibility: 'Post-Surgery Plans',
    validUntil: '30 Nov 2026',
  },
  {
    id: 'off-3',
    code: 'FESTIVE-RESPITE',
    title: 'Weekend Family Respite Relief',
    discountLabel: '20% OFF',
    description: 'Valid for 4-hour or 8-hour short-duration respite blocks',
    eligibility: 'Respite Blocks',
    validUntil: '15 Dec 2026',
  },
  {
    id: 'off-4',
    code: 'SENIOR-GOLD',
    title: 'Annual Care Continuity Renewal',
    discountLabel: '₹5,000 OFF',
    description: 'Billed semi-annually or annually for chronic geriatric monitoring',
    eligibility: 'Annual Subscriptions',
    validUntil: '31 Mar 2027',
  },
];

export interface CareseekerDetailDrawerProps {
  elder: AdminElderItem | null;
  isOpen?: boolean;
  onClose: () => void;
  onStatusChange?: (elderId: string, newStatus: 'ACTIVE' | 'PENDING' | 'INACTIVE') => void;
  onViewOnMap?: (elder: AdminElderItem) => void;
  onUpdatePreferredHospital?: (elderId: string, hospital: NearbyHospital) => void;
  onUpdateOffer?: (elderId: string, offer: CareseekerOffer | null) => void;
}

export const CareseekerDetailDrawer: React.FC<CareseekerDetailDrawerProps> = ({
  elder,
  isOpen,
  onClose,
  onStatusChange,
  onViewOnMap,
  onUpdatePreferredHospital,
  onUpdateOffer,
}) => {
  const nearbyHospitalsList: NearbyHospital[] =
    elder?.nearbyHospitals && elder.nearbyHospitals.length > 0
      ? elder.nearbyHospitals
      : standardChennaiHospitals.ADYAR;

  const [selectedHospital, setSelectedHospital] = useState<NearbyHospital>(
    elder?.preferredHospital || nearbyHospitalsList[0]
  );
  const [hospitalSavedToast, setHospitalSavedToast] = useState(false);
  const [offerToast, setOfferToast] = useState<string | null>(null);

  useEffect(() => {
    if (elder) {
      const list =
        elder.nearbyHospitals && elder.nearbyHospitals.length > 0
          ? elder.nearbyHospitals
          : standardChennaiHospitals.ADYAR;
      setSelectedHospital(elder.preferredHospital || list[0]);
    }
  }, [elder]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!elder || (isOpen !== undefined && !isOpen)) return null;

  const handleSelectHospital = (hosp: NearbyHospital) => {
    setSelectedHospital(hosp);
    onUpdatePreferredHospital?.(elder.id, hosp);
    setHospitalSavedToast(true);
    setTimeout(() => setHospitalSavedToast(false), 2500);
  };

  const handleApplyOffer = (offer: CareseekerOffer) => {
    onUpdateOffer?.(elder.id, offer);
    setOfferToast(`Concession offer "${offer.code}" applied to careseeker profile!`);
    setTimeout(() => setOfferToast(null), 3000);
  };

  const handleRemoveOffer = () => {
    onUpdateOffer?.(elder.id, null);
    setOfferToast('Voucher removed from careseeker billing profile.');
    setTimeout(() => setOfferToast(null), 3000);
  };

  const tasks = elder.dailyTasks || sampleClinicalTasksElder1;
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
  const completionPercentage = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fadeIn">
      {/* Click outside to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Canvas */}
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 overflow-hidden animate-slideInRight">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-600/30 border border-teal-500/40 flex items-center justify-center text-teal-300 font-bold text-xl shadow-inner">
              {elder.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-heading font-extrabold text-white">{elder.name}</h2>
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    elder.status === 'ACTIVE'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : elder.status === 'PENDING'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {elder.status}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {elder.age} yrs • {elder.gender} • DOB: {elder.dateOfBirth || 'Not Specified'}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-teal-400 mt-1 font-medium">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>{elder.locality} • {elder.city}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-800 bg-slate-50/40">
          {/* Quick Actions Bar */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <div className="text-xs text-slate-600">
              <span className="font-bold text-slate-800">Change Status:</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onStatusChange?.(elder.id, 'ACTIVE')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                  elder.status === 'ACTIVE'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => onStatusChange?.(elder.id, 'PENDING')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                  elder.status === 'PENDING'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => onStatusChange?.(elder.id, 'INACTIVE')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                  elder.status === 'INACTIVE'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Inactive
              </button>
            </div>
          </div>

          {/* EMERGENCY HEALTHCARE FACILITY & NEAREST HOSPITAL ALLOCATION */}
          <div className="p-5 rounded-3xl bg-white border border-rose-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-900 font-extrabold text-xs uppercase tracking-wider">
                <Building2 className="w-4 h-4 text-rose-600" />
                <span>Medical Facilities & Emergency Routing</span>
              </div>
              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                <Ambulance className="w-3 h-3" />
                Rapid Trauma SLA
              </span>
            </div>

            {/* Currently Selected Primary Hospital Box */}
            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 block">
                    Preferred Emergency Facility
                  </span>
                  <div className="text-sm font-extrabold text-rose-950 mt-0.5 flex items-center gap-1.5">
                    <span>{selectedHospital.name}</span>
                    <span className="text-emerald-700 text-[10px] bg-emerald-100 px-1.5 py-0.2 rounded-md font-bold">
                      Designated
                    </span>
                  </div>
                  <p className="text-xs text-rose-900/80 mt-0.5">{selectedHospital.address}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-block px-2.5 py-1 bg-white border border-rose-200 text-rose-800 font-extrabold text-xs rounded-xl shadow-2xs">
                    {selectedHospital.distanceKm} km • {selectedHospital.etaMins}m ETA
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-rose-200/70 text-xs">
                <div className="text-[11px] font-semibold text-rose-900">
                  {selectedHospital.traumaLevel}
                </div>
                <a
                  href={`tel:${selectedHospital.emergencyPhone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-xs"
                >
                  <PhoneCall className="w-3 h-3" />
                  <span>Call Emergency: {selectedHospital.emergencyPhone}</span>
                </a>
              </div>
            </div>

            {/* Auto-detected 3 Nearest Hospitals Selector */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700">
                  Select or Switch Nearest Facility (Top 3 Auto-Detected):
                </span>
                {hospitalSavedToast && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md animate-fadeIn">
                    ✓ Preferred hospital saved
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {nearbyHospitalsList.map((hosp) => {
                  const isSelected = selectedHospital.id === hosp.id;
                  return (
                    <div
                      key={hosp.id}
                      onClick={() => handleSelectHospital(hosp)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-rose-50/80 border-rose-300 ring-1 ring-rose-300 shadow-2xs'
                          : 'bg-slate-50 border-slate-200 hover:bg-rose-50/40 hover:border-rose-200'
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {hosp.name}
                          </span>
                          {isSelected && (
                            <span className="px-1.5 py-0.2 bg-rose-600 text-white text-[9px] font-black rounded-md tracking-wider uppercase">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{hosp.locality || hosp.address}</p>
                        <div className="text-[10px] text-rose-800 font-semibold">
                          {hosp.distanceKm} km away • approx. {hosp.etaMins} mins via ambulance
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isSelected ? (
                          <span className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Primary ER Facility</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectHospital(hosp)}
                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-600 text-slate-700 hover:text-white border border-slate-300 hover:border-rose-600 font-bold text-[11px] transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>Set as Primary ER Facility</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Assigned Caregiver Card */}
          <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-800">
                Assigned Care Attendant
              </span>
              {elder.activeShiftStatus === 'ON_DUTY' && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Currently On Duty
                </span>
              )}
            </div>

            {elder.assignedCaregiverName ? (
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-heading font-extrabold text-sm text-slate-900">
                    {elder.assignedCaregiverName}
                  </h4>
                  <p className="text-xs text-slate-600">
                    Verified Attendant • Rating: ⭐ {elder.assignedCaregiverRating || 4.8}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-teal-900 bg-teal-100 px-2.5 py-1 rounded-xl">
                    {elder.shiftPreference.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic">No caregiver currently assigned.</div>
            )}
          </div>

          {/* CLINICAL SHIFT TASKS & PROTOCOL CHECKLIST */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-teal-600" />
                <span>Clinical Shift Tasks & Protocol Checklist</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-900 font-bold text-[10px]">
                {completedTasks}/{tasks.length} Completed ({completionPercentage}%)
              </span>
            </div>

            {/* Completion Progress Bar */}
            <div className="space-y-1">
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-600 rounded-full transition-all duration-500"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-3 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                    task.status === 'COMPLETED'
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : task.status === 'MISSED_FLAGGED' || task.status === 'Flagged'
                      ? 'bg-rose-50/50 border-rose-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {task.status === 'COMPLETED' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : task.status === 'MISSED_FLAGGED' || task.status === 'Flagged' ? (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                      )}
                      <span className="font-bold text-xs text-slate-900">{task.title}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        ({task.scheduledTime})
                      </span>
                    </div>
                    {task.completedAt && (
                      <div className="text-[10px] text-emerald-700 font-medium">
                        Completed at {task.completedAt} by {task.performedBy || 'Assigned Attendant'}
                      </div>
                    )}
                    {task.notes && (
                      <p className="text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-100 mt-1 italic">
                        "{task.notes}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Family Sponsor Info */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
              <User className="w-4 h-4 text-teal-700" />
              <span>Primary Family Sponsor</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <span className="text-slate-400 block text-[10px]">Contact Person</span>
                <span className="font-semibold text-slate-800">{elder.sponsorName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Phone Number</span>
                <a
                  href={`tel:${elder.sponsorPhone}`}
                  className="font-semibold text-teal-700 hover:underline flex items-center gap-1"
                >
                  <Phone className="w-3 h-3" />
                  {elder.sponsorPhone}
                </a>
              </div>
            </div>
          </div>

          {/* ACTIVE CARESEEKER OFFERS CARD */}
          <div className="p-5 rounded-3xl bg-white border border-teal-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-teal-900 font-extrabold text-xs uppercase tracking-wider">
                <Tag className="w-4 h-4 text-teal-700" />
                <span>Active Careseeker Offers</span>
              </div>
              <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                Careseeker Exclusive
              </span>
            </div>

            {offerToast && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs animate-fadeIn flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{offerToast}</span>
              </div>
            )}

            {/* Dropdown Selector to Toggle / Apply Active Offer */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">
                Select Applied Promotional Concession:
              </label>
              <select
                value={elder.appliedOffer?.id || ''}
                onChange={(e) => {
                  const selected = CARESEEKER_OFFERS.find((o) => o.id === e.target.value) || null;
                  if (selected) {
                    handleApplyOffer(selected);
                  } else {
                    handleRemoveOffer();
                  }
                }}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-teal-200 bg-teal-50/40 text-slate-900 font-semibold focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 cursor-pointer shadow-2xs"
              >
                <option value="">-- No Offer Applied (Standard Tariff Billing) --</option>
                {CARESEEKER_OFFERS.map((offer) => (
                  <option key={offer.id} value={offer.id}>
                    {offer.code} — {offer.discountLabel} ({offer.title})
                  </option>
                ))}
              </select>
            </div>

            {/* Currently Applied Voucher Highlight */}
            {elder.appliedOffer ? (
              <div className="p-4 rounded-2xl bg-teal-50/80 border border-teal-200/80 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-teal-700 text-white font-black text-xs shadow-2xs">
                        {elder.appliedOffer.discountLabel}
                      </span>
                      <span className="font-mono font-bold text-xs text-slate-900 bg-white px-2 py-0.5 rounded border border-teal-200">
                        {elder.appliedOffer.code}
                      </span>
                    </div>
                    <div className="font-bold text-xs text-slate-900">
                      {elder.appliedOffer.title}
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {elder.appliedOffer.description}
                    </p>
                  </div>
                  <button
                    onClick={handleRemoveOffer}
                    className="p-1.5 rounded-xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition"
                    title="Remove voucher"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-[10px] text-teal-800 font-medium pt-1 border-t border-teal-200/60 flex items-center justify-between">
                  <span>Applied to family care billing • {elder.appliedOffer.eligibility}</span>
                  <span className="font-bold text-teal-900">Active on Account</span>
                </div>
              </div>
            ) : null}

            {/* Interactive Offer Cards List */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-600 block">
                Available Platform Offers ({CARESEEKER_OFFERS.length}):
              </span>
              <div className="space-y-2">
                {CARESEEKER_OFFERS.map((offer) => {
                  const isCurrent = elder.appliedOffer?.id === offer.id;
                  return (
                    <div
                      key={offer.id}
                      className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-teal-50/90 border-teal-300 shadow-2xs'
                          : 'bg-slate-50 border-slate-200 hover:border-teal-200'
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] ${
                            isCurrent
                              ? 'bg-teal-700 text-white'
                              : 'bg-teal-100 text-teal-900'
                          }`}>
                            {offer.discountLabel}
                          </span>
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {offer.title}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Code: {offer.code} • {offer.eligibility}
                        </div>
                      </div>

                      {isCurrent ? (
                        <button
                          onClick={handleRemoveOffer}
                          className="shrink-0 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition"
                        >
                          Remove
                        </button>
                      ) : (
                        <button
                          onClick={() => handleApplyOffer(offer)}
                          className="shrink-0 px-3 py-1.5 rounded-xl bg-white hover:bg-teal-600 text-teal-900 hover:text-white border border-teal-200 hover:border-teal-600 font-bold text-xs transition shadow-2xs"
                        >
                          Apply Offer
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-start gap-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-700 shrink-0 mt-0.5" />
              <span>
                <strong>Caregiver Safeguard:</strong> Promotional discounts and subsidies are strictly restricted to Careseeker checkout and family billing. Caregiver shift compensation, hourly tariffs, and allowances are fully preserved and decoupled.
              </span>
            </div>
          </div>

          {/* Location & Coordinates */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <MapPin className="w-4 h-4 text-teal-700" />
                <span>Service Address & GPS Coordinates</span>
              </div>
              {onViewOnMap && (
                <button
                  onClick={() => onViewOnMap(elder)}
                  className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                >
                  <span>View on Map</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
            <p className="text-xs text-slate-700">{elder.addressLine1}</p>
            <div className="flex items-center gap-3 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl font-mono">
              <div>
                Lat: <span className="font-semibold text-slate-700">{elder.latitude.toFixed(4)}</span>
              </div>
              <div>
                Lng: <span className="font-semibold text-slate-700">{elder.longitude.toFixed(4)}</span>
              </div>
              <div className="ml-auto font-sans font-bold text-emerald-700">Geofenced</div>
            </div>
          </div>

          {/* Daily Life Support Requirements (Careseeker App Sync) */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <ShieldCheck className="w-4 h-4 text-teal-700" />
                <span>Daily Life Support Requirements</span>
              </div>
              <span className="text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                Careseeker App Booked
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(elder.careRequirements || ['Mobility Assistance', 'Medication Reminders']).map((req, idx) => {
                const isMobility = req.toLowerCase().includes('mobility');
                const isMedical = req.toLowerCase().includes('medical');
                const isMedication = req.toLowerCase().includes('medication');

                const IconComponent = isMobility
                  ? Activity
                  : isMedical
                  ? HeartPulse
                  : isMedication
                  ? Pill
                  : Eye;

                const colorClasses = isMobility
                  ? 'bg-teal-50 border-teal-200 text-teal-900'
                  : isMedical
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : isMedication
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-blue-50 border-blue-200 text-blue-900';

                const iconColor = isMobility
                  ? 'text-teal-700'
                  : isMedical
                  ? 'text-rose-700'
                  : isMedication
                  ? 'text-amber-700'
                  : 'text-blue-700';

                const description = isMobility
                  ? 'Walking, transfers & stability'
                  : isMedical
                  ? 'Vitals, dressing & hygiene'
                  : isMedication
                  ? 'Timely prescribed dosing'
                  : 'Safety & fall observation';

                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border ${colorClasses} flex items-start gap-2.5`}
                  >
                    <IconComponent className={`w-4 h-4 ${iconColor} shrink-0 mt-0.5`} />
                    <div>
                      <div className="text-xs font-bold leading-tight">{req}</div>
                      <div className="text-[10px] opacity-80 mt-0.5">{description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Clinical Profile & Mobility */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
              <Activity className="w-4 h-4 text-teal-700" />
              <span>Clinical Profile & Mobility</span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Mobility Level
              </span>
              <span className="inline-block px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-semibold text-slate-800">
                {elder.mobilityLevel.replace(/_/g, ' ')}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Medical Conditions
              </span>
              <div className="flex flex-wrap gap-1.5">
                {elder.medicalConditions.map((cond, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium"
                  >
                    {cond}
                  </span>
                ))}
              </div>
            </div>

            {elder.medicalDevices && elder.medicalDevices.length > 0 && (
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Medical Devices
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {elder.medicalDevices.map((dev, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium"
                    >
                      {dev}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {elder.lastVitals && (
              <div className="p-2.5 rounded-xl bg-teal-50/60 border border-teal-200/60 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-teal-800 font-bold block">Latest Vitals</span>
                  <span className="font-extrabold text-teal-950">
                    BP {elder.lastVitals.bp || '120/80'} • Pulse {elder.lastVitals.pulse || 72} bpm
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">{elder.lastVitals.recordedAt}</span>
              </div>
            )}
          </div>

          {/* Daily Routine Snapshot */}
          {elder.dailyRoutine && (
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <Clock className="w-4 h-4 text-teal-700" />
                <span>Daily Care Routine</span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-600">
                {Object.entries(elder.dailyRoutine).map(([key, val]) => (
                  <div key={key} className="flex justify-between py-0.5 border-b border-slate-100 last:border-0">
                    <span className="font-medium capitalize text-slate-500">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </span>
                    <span className="text-slate-800 font-semibold text-right max-w-[60%]">{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Notes */}
          {elder.additionalNotes && (
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 text-xs space-y-1">
              <span className="font-bold text-amber-900 block">Caregiver & Dietary Notes:</span>
              <p className="text-amber-800 leading-relaxed">{elder.additionalNotes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Aliases for backward compatibility
export const ElderDetailDrawer = CareseekerDetailDrawer;
export type ElderDetailDrawerProps = CareseekerDetailDrawerProps;
