import React, { useState, useMemo } from 'react';
import {
  Search,
  TrendingUp,
  Percent,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Calculator,
} from 'lucide-react';
import { initialPricingTariffs } from '../mockData';
import type { PricingTariffItem } from '../types';

interface AdminPricingViewProps {
  onBackToDashboard?: () => void;
  onNavigateToServices?: () => void;
}

export const AdminPricingView: React.FC<AdminPricingViewProps> = ({
  onBackToDashboard,
  onNavigateToServices,
}) => {
  const [tariffs] = useState<PricingTariffItem[]>(initialPricingTariffs);
  const [searchQuery, setSearchQuery] = useState('');
  const [simulatedSector, setSimulatedSector] = useState<string>('Central Zone');
  const [marginPct, setMarginPct] = useState<number>(22.2);
  const [caregiverBasePayout, setCaregiverBasePayout] = useState<number>(1400);
  const [isSurgeActive, setIsSurgeActive] = useState<boolean>(false);

  const sectorMultipliers: Record<string, number> = {
    'Central Zone': 1.0,
    'South Chennai Corridor (Adyar)': 1.0,
    'Adyar-Besant Nagar Sector': 1.0,
    'Anna Nagar Central Zone': 1.0,
    'Mylapore Heritage Ward': 1.0,
    'Velachery Tech Corridor': 1.05,
    'OMR Expressway Sector (Peripheral)': 1.15,
  };

  const currentMultiplier = sectorMultipliers[simulatedSector] || 1.0;

  // Real-time Margin Calculator calculations
  const calcCaregiverPayout = Math.round(caregiverBasePayout * (isSurgeActive ? 1.15 : 1.0));
  const calcCareseekerShiftPrice = Math.round(
    (caregiverBasePayout / (1 - marginPct / 100)) * currentMultiplier * (isSurgeActive ? 1.25 : 1.0)
  );
  const calcPlatformTake = calcCareseekerShiftPrice - calcCaregiverPayout;
  const calcMonthlyTotal = calcCareseekerShiftPrice * 30;
  const calcEffectiveMargin = (
    (calcPlatformTake / calcCareseekerShiftPrice) *
    100
  ).toFixed(1);

  const filteredTariffs = useMemo(() => {
    return tariffs.filter((t) => {
      const match =
        searchQuery === '' ||
        t.serviceCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.duration.toLowerCase().includes(searchQuery.toLowerCase());
      return match;
    });
  }, [tariffs, searchQuery]);

  // Aggregate Metrics
  const avgShiftPrice = Math.round(
    tariffs.reduce((acc, t) => acc + t.careseekerShiftPrice, 0) / tariffs.length
  );
  const avgCaregiverPayout = Math.round(
    tariffs.reduce((acc, t) => acc + t.caregiverPayoutPerShift, 0) / tariffs.length
  );
  const avgMargin = (
    tariffs.reduce((acc, t) => acc + t.platformMarginPct, 0) / tariffs.length
  ).toFixed(1);

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
            <h2 className="text-xl font-heading font-extrabold text-slate-900 flex items-center gap-2">
              Commercial Pricing & Tariff Matrix
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {onNavigateToServices && (
            <button
              onClick={onNavigateToServices}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold text-xs transition flex items-center gap-1.5 shadow-2xs"
            >
              <span>Services Specifications</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="px-3.5 py-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>Audited Tariffs FY 2026-27</span>
          </div>
        </div>
      </div>

      {/* Top Economics Telemetry */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <span className="text-teal-600 font-bold">₹</span>
            <span>Avg Careseeker Tariff</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1 font-heading">
            ₹{avgShiftPrice.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Per 12-hr standard shift</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <span className="text-emerald-600 font-bold">₹</span>
            <span>Avg Caregiver Payout</span>
          </div>
          <div className="text-2xl font-black text-emerald-800 mt-1 font-heading">
            ₹{avgCaregiverPayout.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-emerald-700 font-medium">77.5% direct compensation</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Percent className="w-3.5 h-3.5 text-teal-600" />
            <span>Blended Platform Margin</span>
          </div>
          <div className="text-2xl font-black text-teal-800 mt-1 font-heading">
            {avgMargin}%
          </div>
          <span className="text-[10px] text-teal-700 font-medium">Covers operations & insurance</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
            <span>Emergency Surge Rate</span>
          </div>
          <div className="text-2xl font-black text-rose-700 mt-1 font-heading">
            +25.0%
          </div>
          <span className="text-[10px] text-rose-600 font-medium">For &lt;2hr SLA dispatches</span>
        </div>
      </div>

      {/* Location Multiplier Sandbox */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-teal-900 via-slate-900 to-teal-950 text-white border border-teal-800/40 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-extrabold uppercase tracking-wider border border-teal-400/30">
            <Calculator className="w-3 h-3" />
            <span>Location Multiplier Sandbox</span>
          </div>
          <h3 className="font-heading font-extrabold text-base text-white">
            Simulate Regional Tariffs by Operating Corridor
          </h3>
        </div>

        <div className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl border border-white/15 shrink-0">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
              Active Sector Simulation:
            </label>
            <select
              value={simulatedSector}
              onChange={(e) => setSimulatedSector(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-white text-xs font-bold rounded-xl px-3 py-1.5 mt-1 focus:outline-hidden focus:ring-2 focus:ring-teal-400"
            >
              {Object.keys(sectorMultipliers).map((sec) => (
                <option key={sec} value={sec}>
                  {sec} ({sectorMultipliers[sec]}x)
                </option>
              ))}
            </select>
          </div>
          <div className="text-right pl-3 border-l border-white/20">
            <span className="text-[10px] text-teal-300 font-bold block uppercase">Applied Multiplier</span>
            <span className="text-lg font-black font-heading text-white">{currentMultiplier}x</span>
          </div>
        </div>
      </div>

      {/* Interactive Platform Margin & Tariffs Calculator */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-base text-slate-900">
                Interactive Margin & Tariffs Calculator
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Simulated Location:</span>
            <span className="px-3 py-1 rounded-xl bg-slate-100 font-bold text-slate-800 text-xs">
              {simulatedSector} ({currentMultiplier}x)
            </span>
          </div>
        </div>

        {/* Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Margin Slider */}
          <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                Platform Take / Margin Rate:
              </label>
              <span className="font-mono font-black text-teal-800 text-sm">
                {marginPct}%
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="40"
              step="0.5"
              value={marginPct}
              onChange={(e) => setMarginPct(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
            />
          </div>

          {/* Attendant Base Remuneration Input */}
          <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <label className="text-xs font-bold text-slate-800 block">
              Attendant Base Payout (₹ / shift):
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                ₹
              </span>
              <input
                type="number"
                step="50"
                min="800"
                max="5000"
                value={caregiverBasePayout}
                onChange={(e) => setCaregiverBasePayout(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Emergency / Surcharge Toggle */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Emergency Surge Multiplier:
              </span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={isSurgeActive}
                onChange={(e) => setIsSurgeActive(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
              />
              <span className="text-xs font-bold text-slate-700">
                Activate Urgent Dispatch Surge (+25%)
              </span>
            </label>
          </div>
        </div>

        {/* Real-time Calculation Results Matrix */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 pt-2">
          <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 text-teal-950">
            <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 block">
              Careseeker Billing Tariff
            </span>
            <div className="text-2xl font-black font-heading text-teal-900 mt-1">
              ₹{calcCareseekerShiftPrice.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-teal-700 font-medium">Per 12-hour shift</span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-950">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">
              Attendant Net Remuneration
            </span>
            <div className="text-2xl font-black font-heading text-emerald-900 mt-1">
              ₹{calcCaregiverPayout.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-emerald-700 font-medium">Direct shift payout</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-slate-900">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
              Platform Gross Take Rate
            </span>
            <div className="text-2xl font-black font-heading text-slate-900 mt-1">
              ₹{calcPlatformTake.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-slate-600 font-bold">{calcEffectiveMargin}% realized margin</span>
          </div>

          <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 text-sky-950">
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-700 block">
              Projected Monthly Contract
            </span>
            <div className="text-2xl font-black font-heading text-sky-900 mt-1">
              ₹{calcMonthlyTotal.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-sky-700 font-medium">30 days comprehensive care</span>
          </div>
        </div>
      </div>

      {/* Search and Quick Filters */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[260px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tariffs by service code or plan name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-medium text-slate-800"
          />
        </div>
      </div>

      {/* Transparent Rate Matrix Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Service Code & Care Tier</th>
                <th className="py-3.5 px-4">Standard Duration</th>
                <th className="py-3.5 px-4">Careseeker Base Price</th>
                <th className="py-3.5 px-4">Simulated Regional Rate ({currentMultiplier}x)</th>
                <th className="py-3.5 px-4">Attendant Remuneration</th>
                <th className="py-3.5 px-4">Platform Margin</th>
                <th className="py-3.5 px-4">Emergency Surge Surcharge</th>
                <th className="py-3.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTariffs.map((tariff) => {
                const simulatedRate = Math.round(tariff.careseekerShiftPrice * currentMultiplier);
                const simulatedPayout = Math.round(tariff.caregiverPayoutPerShift * currentMultiplier);
                return (
                  <tr key={tariff.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Service Code & Name */}
                    <td className="py-4 px-4">
                      <div className="space-y-0.5">
                        <span className="px-2 py-0.5 rounded bg-teal-50 border border-teal-200 text-teal-900 font-mono font-bold text-[10px]">
                          {tariff.serviceCode}
                        </span>
                        <div className="font-bold text-slate-900 text-xs mt-1">
                          {tariff.serviceName}
                        </div>
                        <div className="text-[10px] text-slate-400 line-clamp-1">{tariff.notes}</div>
                      </div>
                    </td>

                    {/* Duration */}
                    <td className="py-4 px-4 font-medium text-slate-700 whitespace-nowrap">
                      {tariff.duration}
                    </td>

                    {/* Careseeker Base Price */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="font-extrabold text-slate-900 text-xs">
                        ₹{tariff.careseekerShiftPrice.toLocaleString('en-IN')}{' '}
                        <span className="text-[10px] font-normal text-slate-400">/shift</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        ₹{tariff.careseekerMonthlyPrice.toLocaleString('en-IN')}/mo
                      </div>
                    </td>

                    {/* Simulated Regional Rate */}
                    <td className="py-4 px-4 whitespace-nowrap bg-teal-50/40">
                      <div className="font-black text-teal-950 text-xs">
                        ₹{simulatedRate.toLocaleString('en-IN')}{' '}
                        <span className="text-[10px] font-bold text-teal-700">/shift</span>
                      </div>
                      <div className="text-[10px] text-teal-800 font-medium">
                        Payout: ₹{simulatedPayout.toLocaleString('en-IN')}
                      </div>
                    </td>

                    {/* Attendant Payout */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="font-extrabold text-emerald-800 text-xs">
                        ₹{tariff.caregiverPayoutPerShift.toLocaleString('en-IN')}{' '}
                        <span className="text-[10px] font-normal text-slate-400">/shift</span>
                      </div>
                      <div className="text-[10px] text-emerald-700 font-medium">
                        ₹{tariff.caregiverMonthlyPayout.toLocaleString('en-IN')}/mo
                      </div>
                    </td>

                    {/* Platform Margin % */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-teal-600 rounded-full"
                            style={{ width: `${tariff.platformMarginPct * 3}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-800 text-xs">
                          {tariff.platformMarginPct}%
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        ₹{tariff.careseekerShiftPrice - tariff.caregiverPayoutPerShift} retainage
                      </span>
                    </td>

                    {/* Surge Surcharge Rate */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-bold text-[11px]">
                        +{tariff.emergencySurchargeRate}% (+₹
                        {Math.round((tariff.careseekerShiftPrice * tariff.emergencySurchargeRate) / 100)}
                        )
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                        Active Tariff
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
