import React, { useState, useMemo } from 'react';
import {
  Search,
  ShieldCheck,
  Activity,
  HeartPulse,
  Pill,
  Eye,
  Clock,
  CheckCircle2,
  ArrowLeft,
  ChevronRight,
  BadgeCheck,
  Sparkles,
  Layers,
  MapPin,
  Check,
} from 'lucide-react';
import { PLATFORM_SERVICES } from '../mockData';
import type { PlatformService } from '../types';

interface AdminServicesViewProps {
  onBackToDashboard?: () => void;
}

// Detailed everyday tasks and specifications for the 4 Daily Life Support Options
const SERVICE_DETAILS: Record<
  string,
  {
    tasks: string[];
    beneficiaries: string[];
    caregiverCompetency: string;
    corridorAvailability: string;
  }
> = {
  'SVC-MOBILITY': {
    tasks: [
      'Escorted corridor, garden, and indoor walking assistance',
      'Safe bed-to-chair, wheelchair, and commode transfer support',
      'Posture correction, walker guidance, and balance stabilization',
      'Active fall risk neutralization and obstruction removal',
    ],
    beneficiaries: [
      'Seniors with arthritis or reduced mobility',
      'Post-rehabilitation walking escort',
      'Elders using walkers, canes, or wheelchairs',
    ],
    caregiverCompetency: 'Certified in geriatric transfer ergonomics & fall-prevention mechanics',
    corridorAvailability: 'Active across all Chennai corridors with immediate dispatch',
  },
  'SVC-MEDICAL': {
    tasks: [
      'Twice-daily BP, Pulse, SpO2, and temperature charting',
      'Clean hygiene oversight and non-invasive dressing support',
      'Daily vitals log synchronization with family sponsor and portal',
      'Assistance with digital monitoring devices (glucose meter, oximeter)',
    ],
    beneficiaries: [
      'Elders with hypertension or diabetes management',
      'Post-hospitalization recovery oversight',
      'Routine vitals tracking and wellness compliance',
    ],
    caregiverCompetency: 'Accredited in vital signs charting, hygiene safety, and clinical triage escalation',
    corridorAvailability: 'Available for 8h, 12h, and 24h continuous shifts in all sectors',
  },
  'SVC-MEDICATION': {
    tasks: [
      'Timely medicine intake reminders according to physician instructions',
      'Synchronization of medication schedules with meals and hydration',
      'Daily medication compliance checklist and family handover log',
      'Advance tracking for medicine box refills and prescription renewal alerts',
    ],
    beneficiaries: [
      'Seniors managing multiple daily prescriptions',
      'Elders prone to missed or double doses',
      'Families seeking verified adherence logs',
    ],
    caregiverCompetency: 'Trained in prescription schedule compliance and dosage timing protocol',
    corridorAvailability: 'Integrated into all attendant shifts across all operating zones',
  },
  'SVC-MONITORING': {
    tasks: [
      'Attentive continuous bedside and room observation for safety',
      'Rapid alert escalation for sudden changes in responsiveness or gait',
      'Seamless link to CareConnect Emergency SOS Incident Desk',
      'Corridor supervisor backup linkage and rapid emergency triage',
    ],
    beneficiaries: [
      'High fall risk elders during day and night hours',
      'Seniors living alone requiring attentive vigilance',
      'Elders requiring emergency-ready rapid response oversight',
    ],
    caregiverCompetency: 'Emergency drill certified with direct SOS hotline escalation authority',
    corridorAvailability: 'Full 24/7 day and night-watch coverage in all serviceable corridors',
  },
};

export const AdminServicesView: React.FC<AdminServicesViewProps> = ({
  onBackToDashboard,
}) => {
  const [services] = useState<PlatformService[]>(PLATFORM_SERVICES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedServiceForModal, setSelectedServiceForModal] = useState<PlatformService | null>(null);

  const filteredServices = useMemo(() => {
    return services.filter((svc) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === '' ||
        svc.code.toLowerCase().includes(q) ||
        svc.title.toLowerCase().includes(q) ||
        svc.description.toLowerCase().includes(q);

      const matchesType =
        selectedType === 'ALL' || svc.icon === selectedType;

      return matchesSearch && matchesType;
    });
  }, [services, searchQuery, selectedType]);

  const getServiceIcon = (icon: PlatformService['icon']) => {
    switch (icon) {
      case 'mobility':
        return Activity;
      case 'medical':
        return HeartPulse;
      case 'medication':
        return Pill;
      case 'monitoring':
        return Eye;
      default:
        return Activity;
    }
  };

  const getServiceTheme = (icon: PlatformService['icon']) => {
    switch (icon) {
      case 'mobility':
        return {
          bgBadge: 'bg-teal-50 border-teal-200 text-teal-800',
          iconBg: 'bg-teal-100 text-teal-700',
          cardHover: 'hover:border-teal-300',
          accent: 'text-teal-700',
          chip: 'bg-teal-50 text-teal-900 border-teal-200',
        };
      case 'medical':
        return {
          bgBadge: 'bg-rose-50 border-rose-200 text-rose-800',
          iconBg: 'bg-rose-100 text-rose-700',
          cardHover: 'hover:border-rose-300',
          accent: 'text-rose-700',
          chip: 'bg-rose-50 text-rose-900 border-rose-200',
        };
      case 'medication':
        return {
          bgBadge: 'bg-amber-50 border-amber-200 text-amber-800',
          iconBg: 'bg-amber-100 text-amber-700',
          cardHover: 'hover:border-amber-300',
          accent: 'text-amber-700',
          chip: 'bg-amber-50 text-amber-900 border-amber-200',
        };
      case 'monitoring':
        return {
          bgBadge: 'bg-blue-50 border-blue-200 text-blue-800',
          iconBg: 'bg-blue-100 text-blue-700',
          cardHover: 'hover:border-blue-300',
          accent: 'text-blue-700',
          chip: 'bg-blue-50 text-blue-900 border-blue-200',
        };
      default:
        return {
          bgBadge: 'bg-slate-50 border-slate-200 text-slate-800',
          iconBg: 'bg-slate-100 text-slate-700',
          cardHover: 'hover:border-slate-300',
          accent: 'text-slate-700',
          chip: 'bg-slate-50 text-slate-900 border-slate-200',
        };
    }
  };

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
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-heading font-extrabold text-slate-900">
                Services Catalog
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold">
                Careseeker App Aligned
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>{services.length} Daily Life Support Options</span>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-teal-600" />
            <span>Platform Services</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1 font-heading">
            {services.length} Options
          </div>
          <div className="text-[10px] text-teal-700 font-semibold mt-1">
            Active in Careseeker App
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Careseeker Sync</span>
          </div>
          <div className="text-2xl font-black text-teal-800 mt-1 font-heading">
            100% Aligned
          </div>
          <div className="text-[10px] text-slate-500 font-semibold mt-1">
            Direct onboarding match
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-teal-600" />
            <span>Shift Flexibility</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1 font-heading">
            8h • 12h • 24h
          </div>
          <div className="text-[10px] text-slate-500 font-semibold mt-1">
            Day, night & live-in
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-teal-600" />
            <span>Corridor Coverage</span>
          </div>
          <div className="text-2xl font-black text-emerald-800 mt-1 font-heading">
            All Corridors
          </div>
          <div className="text-[10px] text-emerald-700 font-semibold mt-1">
            Chennai serviceability 100%
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[260px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search daily life support options (e.g. Mobility, Medical, Reminders)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-medium text-slate-800 placeholder-slate-400"
          />
        </div>

        {/* Option Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All Services' },
            { id: 'mobility', label: 'Mobility' },
            { id: 'medical', label: 'Medical' },
            { id: 'medication', label: 'Medication' },
            { id: 'monitoring', label: 'Monitoring' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedType(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                selectedType === cat.id
                  ? 'bg-teal-800 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Services Grid (Strictly 4 Daily Life Support Options) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredServices.map((svc) => {
          const IconComponent = getServiceIcon(svc.icon);
          const theme = getServiceTheme(svc.icon);
          const details = SERVICE_DETAILS[svc.code] || {
            tasks: [svc.description],
            beneficiaries: ['Frail seniors & elders'],
            caregiverCompetency: 'Background checked & certified caregiver',
            corridorAvailability: 'Operational across all corridors',
          };

          return (
            <div
              key={svc.id}
              className={`p-6 rounded-3xl bg-white border border-slate-200 ${theme.cardHover} hover:shadow-md transition-all flex flex-col justify-between group space-y-4`}
            >
              {/* Top Bar: Icon, Code & Status */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl ${theme.iconBg} flex items-center justify-center shrink-0 shadow-inner`}>
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <div>
                      <span className={`px-2.5 py-0.5 rounded-lg border font-mono text-[11px] font-bold ${theme.bgBadge}`}>
                        {svc.code}
                      </span>
                      <h3 className="font-heading font-extrabold text-slate-900 text-base mt-1 group-hover:text-teal-900 transition leading-snug">
                        {svc.title}
                      </h3>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>{svc.status}</span>
                  </span>
                </div>

                {/* Primary Description */}
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {svc.description}
                </p>
              </div>

              {/* Core Daily Support Scope */}
              <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Daily Living Tasks Included:
                </div>
                <ul className="space-y-1.5">
                  {details.tasks.map((task, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-700 text-[11px]">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${theme.accent} shrink-0 mt-0.5`} />
                      <span className="leading-snug">{task}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Footer: Careseeker Alignment & Details Trigger */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                  <BadgeCheck className="w-3.5 h-3.5 text-teal-600" />
                  <span>Careseeker App Onboarding Option</span>
                </div>

                <button
                  onClick={() => setSelectedServiceForModal(svc)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-teal-700 hover:text-white text-slate-700 text-xs font-bold transition flex items-center gap-1 group/btn"
                  title="View Specification"
                >
                  <span>Details</span>
                  <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredServices.length === 0 && (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h4 className="font-heading font-extrabold text-slate-800 text-base">No services found</h4>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your search criteria or filter.</p>
        </div>
      )}

      {/* Detail Specification Modal */}
      {selectedServiceForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(() => {
                  const IconComp = getServiceIcon(selectedServiceForModal.icon);
                  return (
                    <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 font-bold">
                      <IconComp className="w-5 h-5" />
                    </div>
                  );
                })()}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 font-mono text-xs font-bold">
                      {selectedServiceForModal.code}
                    </span>
                    <span className="text-xs text-emerald-400 font-bold">
                      ● {selectedServiceForModal.status}
                    </span>
                  </div>
                  <h3 className="font-heading font-extrabold text-lg text-white mt-1">
                    {selectedServiceForModal.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedServiceForModal(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
              {/* Service description card */}
              <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80 space-y-1">
                <div className="font-bold text-teal-950 text-xs">Careseeker Booking Description</div>
                <p className="text-slate-700 leading-relaxed text-xs">
                  {selectedServiceForModal.description}
                </p>
              </div>

              {/* Tasks checklist */}
              {SERVICE_DETAILS[selectedServiceForModal.code] && (
                <div className="space-y-2">
                  <div className="font-extrabold uppercase tracking-wider text-[11px] text-slate-400">
                    Daily Caregiving Procedures Covered:
                  </div>
                  <div className="space-y-2">
                    {SERVICE_DETAILS[selectedServiceForModal.code].tasks.map((task, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5"
                      >
                        <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                        <span className="font-medium text-slate-800">{task}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Caregiver Competency Mandate */}
              {SERVICE_DETAILS[selectedServiceForModal.code] && (
                <div className="space-y-1.5">
                  <div className="font-extrabold uppercase tracking-wider text-[11px] text-slate-400">
                    Caregiver Verification Mandate:
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                    <BadgeCheck className="w-5 h-5 text-teal-600 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900 text-xs">
                        {SERVICE_DETAILS[selectedServiceForModal.code].caregiverCompetency}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Aadhaar verified, background checked, and skill evaluated before corridor assignment.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Beneficiary Fit */}
              {SERVICE_DETAILS[selectedServiceForModal.code] && (
                <div className="space-y-1.5">
                  <div className="font-extrabold uppercase tracking-wider text-[11px] text-slate-400">
                    Recommended Senior Profiles:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SERVICE_DETAILS[selectedServiceForModal.code].beneficiaries.map((rec, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[11px]"
                      >
                        {rec}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">
                Corridor Dispatch: <strong className="text-slate-800">100% Operational</strong>
              </span>
              <button
                onClick={() => setSelectedServiceForModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition"
              >
                Close Specification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
