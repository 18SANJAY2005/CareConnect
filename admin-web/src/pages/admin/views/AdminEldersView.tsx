import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  UserPlus,
  MapPin,
  Phone,
  Eye,
  ArrowLeft,
} from 'lucide-react';
import type { AdminElderItem } from '../types';

interface AdminEldersViewProps {
  elders: AdminElderItem[];
  onSelectElder: (elder: AdminElderItem) => void;
  onStatusChange: (elderId: string, newStatus: 'ACTIVE' | 'PENDING' | 'INACTIVE') => void;
  onAddElder?: () => void;
  onBackToDashboard?: () => void;
}

export const AdminEldersView: React.FC<AdminEldersViewProps> = ({
  elders,
  onSelectElder,
  onStatusChange,
  onAddElder,
  onBackToDashboard,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPin, setSelectedPin] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Extract unique PIN codes for filter
  const uniquePins = useMemo(() => {
    const pins = Array.from(new Set(elders.map((e) => e.postalCode))).filter(Boolean);
    return ['ALL', ...pins];
  }, [elders]);

  // Filtered elders
  const filteredElders = useMemo(() => {
    return elders.filter((elder) => {
      const matchesSearch =
        searchQuery === '' ||
        elder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        elder.locality.toLowerCase().includes(searchQuery.toLowerCase()) ||
        elder.sponsorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (elder.assignedCaregiverName &&
          elder.assignedCaregiverName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesPin = selectedPin === 'ALL' || elder.postalCode === selectedPin;
      const matchesStatus = selectedStatus === 'ALL' || elder.status === selectedStatus;

      return matchesSearch && matchesPin && matchesStatus;
    });
  }, [elders, searchQuery, selectedPin, selectedStatus]);

  return (
    <div className="space-y-5 animate-fadeIn pb-12">
      {/* Top Controls Header */}
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
              Careseekers Directory
            </h2>
          </div>
        </div>

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

      {/* Search and Filters Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by careseeker name, locality, caregiver, or sponsor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {/* PIN Code Filter */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-bold">PIN Code:</span>
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
        {(searchQuery || selectedPin !== 'ALL' || selectedStatus !== 'ALL') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedPin('ALL');
              setSelectedStatus('ALL');
            }}
            className="text-xs font-bold text-teal-700 hover:text-teal-900 px-2 py-1"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Table Canvas */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            {/* Table Header */}
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                <th className="py-4 px-6">Careseeker Name & Demographics</th>
                <th className="py-4 px-6">Primary Family Contact</th>
                <th className="py-4 px-6">Service Address & PIN</th>
                <th className="py-4 px-6">Assigned Caregiver</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100">
              {filteredElders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
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
    </div>
  );
};
