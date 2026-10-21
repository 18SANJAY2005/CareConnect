import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Activity,
  ShieldCheck,
  MapPin,
  FileSpreadsheet,
  AlertTriangle,
} from 'lucide-react';

interface AdminReportsViewProps {
  onBack?: () => void;
}

export const AdminReportsView: React.FC<AdminReportsViewProps> = ({
  onBack,
}) => {
  const [selectedRange, setSelectedRange] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'QUARTER'>('MONTH');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleExportCsv = () => {
    showToast('Exporting comprehensive operational attendance & clinical SLA report (CSV)...');
  };

  const handleExportPdf = () => {
    showToast('Generating executive governance audit summary (PDF)...');
  };

  const corridorMetrics = [
    {
      corridor: 'South Chennai Corridor (Adyar)',
      beneficiaries: 42,
      activeCaregivers: 38,
      completedShifts: 480,
      onTimeArrival: '99.2%',
      protocolCompliance: '94.8%',
      avgSosSla: '6.4 mins',
      status: 'OPTIMAL',
    },
    {
      corridor: 'Anna Nagar Central Zone',
      beneficiaries: 34,
      activeCaregivers: 30,
      completedShifts: 392,
      onTimeArrival: '98.6%',
      protocolCompliance: '92.1%',
      avgSosSla: '7.1 mins',
      status: 'OPTIMAL',
    },
    {
      corridor: 'Mylapore Heritage Ward',
      beneficiaries: 28,
      activeCaregivers: 26,
      completedShifts: 320,
      onTimeArrival: '97.8%',
      protocolCompliance: '95.4%',
      avgSosSla: '5.8 mins',
      status: 'OPTIMAL',
    },
    {
      corridor: 'Velachery Tech Corridor',
      beneficiaries: 31,
      activeCaregivers: 27,
      completedShifts: 345,
      onTimeArrival: '98.1%',
      protocolCompliance: '90.6%',
      avgSosSla: '7.8 mins',
      status: 'HEALTHY',
    },
    {
      corridor: 'T. Nagar Commercial Sector',
      beneficiaries: 22,
      activeCaregivers: 20,
      completedShifts: 248,
      onTimeArrival: '96.9%',
      protocolCompliance: '89.4%',
      avgSosSla: '8.2 mins',
      status: 'HEALTHY',
    },
  ];

  const protocolMetrics = [
    { category: 'Vital Signs Triage (BP, Pulse, SpO2, Temp)', executed: 1240, target: 1250, rate: 99.2, trend: '+0.8%' },
    { category: 'Medication Administration Handover', executed: 1180, target: 1200, rate: 98.3, trend: '+1.2%' },
    { category: 'Assisted Shower Bath & Skin Hygiene', executed: 890, target: 940, rate: 94.6, trend: '+2.1%' },
    { category: 'Bedside Transfer & Hallway Walking Mobility', executed: 780, target: 850, rate: 91.7, trend: '+0.4%' },
    { category: 'Diabetic Nutrition & Hydration Tracking', executed: 920, target: 980, rate: 93.8, trend: '+1.5%' },
  ];

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
            <h2 className="text-xl font-heading font-extrabold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-teal-700" />
              <span>Operational & Clinical Healthcare Reports</span>
            </h2>
          </div>
        </div>

        {/* Date Filters & Export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            {(
              [
                { id: 'TODAY', label: 'Today' },
                { id: 'WEEK', label: '7 Days' },
                { id: 'MONTH', label: 'Month-to-Date' },
                { id: 'QUARTER', label: 'Quarterly' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedRange(t.id)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  selectedRange === t.id
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCsv}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportPdf}
            className="px-3 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Audit PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Telemetry Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Shift Punctuality SLA
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-heading text-slate-900">98.4%</div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span>On-Time Arrival Rate</span>
            <span className="text-emerald-700 font-bold">+0.6% vs benchmark</span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Protocol Compliance
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-heading text-slate-900">94.2%</div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span>5,010 of 5,320 Tasks Logged</span>
            <span className="text-teal-800 font-bold">Grade A+ Audit</span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Geofence Accuracy
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-heading text-slate-900">99.8%</div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span>GPS Radius &lt; 35m</span>
            <span className="text-sky-700 font-bold">Zero Breaches</span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              SOS Emergency Response
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-heading text-slate-900">6.8 mins</div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span>Mean SLA Escalation</span>
            <span className="text-rose-700 font-bold">&lt; 10m target</span>
          </div>
        </div>
      </div>

      {/* Corridor Breakdown Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-heading font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-600" />
              <span>Corridor & Operating Hub Performance Matrix</span>
            </h3>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-50 text-slate-700 border border-slate-200">
            5 Hubs Active
          </span>
        </div>

        <div className="w-full max-w-full overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th className="py-3.5 px-4">Operating Corridor</th>
                <th className="py-3.5 px-4">Beneficiaries</th>
                <th className="py-3.5 px-4">Caregivers Active</th>
                <th className="py-3.5 px-4">Completed Shifts</th>
                <th className="py-3.5 px-4">On-Time Arrival</th>
                <th className="py-3.5 px-4">Protocol Compliance</th>
                <th className="py-3.5 px-4">Avg SOS Latency</th>
                <th className="py-3.5 px-4">Hub Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {corridorMetrics.map((row) => (
                <tr key={row.corridor} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">{row.corridor}</td>
                  <td className="py-3.5 px-4 text-slate-700 font-medium">{row.beneficiaries} Active</td>
                  <td className="py-3.5 px-4 text-teal-800 font-semibold">{row.activeCaregivers} Certified</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{row.completedShifts}</td>
                  <td className="py-3.5 px-4 font-semibold text-emerald-700">{row.onTimeArrival}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 font-bold text-teal-900 text-[11px]">
                      {row.protocolCompliance}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-800">{row.avgSosSla}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clinical Protocol Adherence Breakdown */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-4">
        <h3 className="font-heading font-extrabold text-sm text-slate-900 flex items-center gap-2">
          <Activity className="w-4 h-4 text-teal-600" />
          <span>Clinical Protocol Execution & Daily Tasks Audit</span>
        </h3>

        <div className="space-y-3">
          {protocolMetrics.map((p) => (
            <div key={p.category} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                <span className="font-bold text-slate-900">{p.category}</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 font-medium">
                    {p.executed} of {p.target} executed
                  </span>
                  <span className="font-bold text-teal-900 bg-teal-100 px-2 py-0.5 rounded-md font-mono">
                    {p.rate}%
                  </span>
                </div>
              </div>
              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-600 rounded-full transition-all duration-500"
                  style={{ width: `${p.rate}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
