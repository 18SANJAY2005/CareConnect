import React, { useState } from 'react';
import {
  Search,
  CheckCircle2,
  Shield,
  MapPin,
  ArrowLeft,
} from 'lucide-react';
import { initialAdminCarePlans } from '../mockData';
import type { AdminCarePlanItem } from '../types';

interface AdminCarePlansViewProps {
  onBackToDashboard?: () => void;
}

export const AdminCarePlansView: React.FC<AdminCarePlansViewProps> = ({ onBackToDashboard }) => {
  const [plans] = useState<AdminCarePlanItem[]>(initialAdminCarePlans);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState('ALL');

  const filteredPlans = plans.filter((plan) => {
    const matchesSearch =
      searchQuery === '' ||
      plan.elderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.locality.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.assignedCaregiver.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTier = selectedTier === 'ALL' || plan.careTier.includes(selectedTier);
    return matchesSearch && matchesTier;
  });

  return (
    <div className="space-y-5 animate-fadeIn pb-12">
      {/* Top Header */}
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
              Care Plans & Daily Routines
            </h2>
          </div>
        </div>

        <div className="px-3.5 py-1.5 rounded-2xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-teal-600" />
          <span>{plans.length} Certified Plans Active</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search care plans by elder, locality, or caregiver..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <span className="font-bold">Service:</span>
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:bg-white"
          >
            <option value="ALL">All Support Services</option>
            <option value="Mobility Assistance">Mobility Assistance</option>
            <option value="Medical Support">Medical Support</option>
            <option value="Medication Reminders">Medication Reminders</option>
            <option value="Continuous Monitoring">Continuous Monitoring</option>
          </select>
        </div>
      </div>

      {/* Cards of Care Plans */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredPlans.map((plan) => (
          <div
            key={plan.id}
            className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs hover:border-teal-300 hover:shadow-md transition-all space-y-4"
          >
            {/* Plan Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200/60">
                  {plan.careTier}
                </span>
                <h3 className="text-lg font-heading font-extrabold text-slate-900 mt-1">
                  {plan.elderName}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{plan.locality}</span>
                  <span>•</span>
                  <span className="font-semibold text-slate-700">{plan.mobilityStatus}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block px-3 py-1 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs">
                  {plan.shiftDuration}
                </span>
                <p className="text-[11px] text-teal-800 font-semibold mt-1">
                  Caregiver: {plan.assignedCaregiver}
                </p>
              </div>
            </div>

            {/* Daily Routine 4-part Timeline */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                Time-Slotted Daily Routine
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                  <span className="font-bold text-teal-900 block text-[11px]">🌅 Morning:</span>
                  <p className="text-slate-600 text-[11px] mt-0.5">{plan.dailyRoutine.morning}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                  <span className="font-bold text-amber-900 block text-[11px]">☀️ Afternoon:</span>
                  <p className="text-slate-600 text-[11px] mt-0.5">{plan.dailyRoutine.afternoon}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                  <span className="font-bold text-indigo-900 block text-[11px]">🌆 Evening:</span>
                  <p className="text-slate-600 text-[11px] mt-0.5">{plan.dailyRoutine.evening}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                  <span className="font-bold text-purple-900 block text-[11px]">🌙 Night:</span>
                  <p className="text-slate-600 text-[11px] mt-0.5">{plan.dailyRoutine.night}</p>
                </div>
              </div>
            </div>

            {/* Mandatory Care Tasks */}
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">
                Key Protocol Checklist
              </span>
              <ul className="space-y-1">
                {plan.keyTasks.map((task, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-slate-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{task}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Clinical & Care Notes */}
            {plan.notes && (
              <div className="p-3 rounded-2xl bg-teal-50/50 border border-teal-200/60 text-xs text-teal-950">
                <span className="font-bold block text-[11px] text-teal-900 mb-0.5">Clinical Protocol Note:</span>
                <p className="text-slate-700 leading-relaxed text-[11px]">{plan.notes}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
