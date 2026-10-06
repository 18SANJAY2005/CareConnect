import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ShieldCheck,
  Star,
  Phone,
  Award,
  Layers,
  MapPin,
  ArrowLeft,
} from 'lucide-react';
import type { AdminCaregiverItem } from '../types';

interface AdminCaregiversViewProps {
  caregivers: AdminCaregiverItem[];
  onBackToDashboard?: () => void;
}

export const AdminCaregiversView: React.FC<AdminCaregiversViewProps> = ({
  caregivers,
  onBackToDashboard,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'BUFFER' | 'ON_DUTY'>('ALL');

  const filteredCaregivers = useMemo(() => {
    return caregivers.filter((c) => {
      const matchesSearch =
        searchQuery === '' ||
        c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.locality.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = selectedStatus === 'ALL' || c.status === selectedStatus;
      const matchesBuffer =
        selectedFilter === 'ALL' ||
        (selectedFilter === 'BUFFER' && c.isBufferPool) ||
        (selectedFilter === 'ON_DUTY' && c.status === 'ON_DUTY');

      return matchesSearch && matchesStatus && matchesBuffer;
    });
  }, [caregivers, searchQuery, selectedStatus, selectedFilter]);

  const onDutyCount = caregivers.filter((c) => c.status === 'ON_DUTY').length;
  const bufferCount = caregivers.filter((c) => c.isBufferPool && c.status === 'AVAILABLE').length;

  return (
    <div className="space-y-5 animate-fadeIn pb-12">
      {/* Header */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="px-3 py-2 rounded-2xl bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-slate-700 hover:text-teal-900 transition-all flex items-center gap-2 group text-xs font-bold shadow-2xs shrink-0"
              title="Return to Dashboard Overview"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 text-slate-500 group-hover:text-teal-700" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </button>
          )}
          <div>
            <h2 className="text-xl font-heading font-extrabold text-slate-900">
              Caregiver Network & Buffer Pool
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Monitor clinical certifications, identity verifications, live shift assignments, and SLA emergency buffer attendants.
            </p>
          </div>
        </div>

        {/* Quick Summary Badges */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-2xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-500" />
            <span>{onDutyCount} On Duty Now</span>
          </div>
          <div className="px-3 py-1.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>{bufferCount} Standby Buffer</span>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search caregiver name, skill, specialization, or corridor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-bold">Status:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:bg-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="ON_DUTY">On Duty</option>
            <option value="AVAILABLE">Available / Standby</option>
            <option value="ON_LEAVE">On Leave</option>
          </select>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setSelectedFilter('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              selectedFilter === 'ALL' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedFilter('ON_DUTY')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              selectedFilter === 'ON_DUTY' ? 'bg-white text-teal-800 shadow-2xs' : 'text-slate-500'
            }`}
          >
            On Duty
          </button>
          <button
            onClick={() => setSelectedFilter('BUFFER')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              selectedFilter === 'BUFFER' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-500'
            }`}
          >
            Buffer Pool
          </button>
        </div>
      </div>

      {/* Grid of Caregiver Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCaregivers.map((cg) => (
          <div
            key={cg.id}
            className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs hover:border-teal-300 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              {/* Header with Avatar & Status */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-700 text-white font-heading font-extrabold text-base flex items-center justify-center shadow-xs">
                    {cg.fullName.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-heading font-extrabold text-sm text-slate-900">
                      {cg.fullName}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {cg.experienceYears} Years Exp • {cg.gender}
                    </p>
                    <div className="flex items-center gap-1 text-[11px] text-amber-600 font-bold mt-0.5">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                      <span>{cg.rating.toFixed(2)} Rating</span>
                    </div>
                  </div>
                </div>

                <span
                  className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${
                    cg.status === 'ON_DUTY'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : cg.status === 'AVAILABLE'
                      ? 'bg-teal-50 text-teal-700 border border-teal-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {cg.status.replace('_', ' ')}
                </span>
              </div>

              {/* Corridor Locality & Active Elder */}
              <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <MapPin className="w-3.5 h-3.5 text-teal-700" />
                  <span className="font-bold">{cg.locality} Corridor</span>
                </div>
                {cg.activeElderName ? (
                  <div className="text-[11px] text-teal-900 font-medium">
                    Assigned to: <strong className="font-bold">{cg.activeElderName}</strong>
                  </div>
                ) : (
                  <div className="text-[11px] text-emerald-700 font-medium">
                    Ready for instant corridor assignment
                  </div>
                )}
              </div>

              {/* Verification Badges */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {cg.isIdentityVerified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-semibold">
                    <ShieldCheck className="w-3 h-3 text-teal-600" />
                    Identity Verified
                  </span>
                )}
                {cg.isClinicalCertified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold">
                    <Award className="w-3 h-3 text-emerald-600" />
                    Clinical Certified
                  </span>
                )}
                {cg.isBufferPool && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200 text-[10px] font-bold">
                    <Layers className="w-3 h-3 text-sky-600" />
                    SLA Buffer Standby
                  </span>
                )}
              </div>

              {/* Skills Tags */}
              <div className="mt-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Key Skills & Protocols
                </span>
                <div className="flex flex-wrap gap-1">
                  {cg.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer with Phone & Rates */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <a
                href={`tel:${cg.phone}`}
                className="font-bold text-teal-800 hover:underline flex items-center gap-1 text-[11px]"
              >
                <Phone className="w-3 h-3 text-teal-600" />
                <span>{cg.phone}</span>
              </a>
              <span className="font-semibold text-slate-600 text-[11px]">
                ₹{cg.dailyRate || 1400} / day
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
