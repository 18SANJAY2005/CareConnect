import React, { useState } from 'react';
import {
  ShieldCheck,
  MapPin,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Users,
  Key,
  Sliders,
  Bell,
  Globe,
  Smartphone,
  Check,
} from 'lucide-react';
import {
  initialOpsStaffMembers,
  rolePermissionsDefinitions,
  serviceableCorridors,
} from '../mockData';
import type {
  OpsRole,
  OpsStaffMember,
  OperatingSectorScope,
} from '../types';
import { AdminTeamAccessView } from './AdminTeamAccessView';

interface AdminSettingsAccessViewProps {
  onBackToDashboard?: () => void;
  activeRole?: OpsRole;
  onRoleChange?: (role: OpsRole) => void;
  activeSectorScope?: OperatingSectorScope;
  onSectorScopeChange?: (scope: OperatingSectorScope) => void;
}

export const AdminSettingsAccessView: React.FC<AdminSettingsAccessViewProps> = ({
  onBackToDashboard,
  activeRole = 'SUPER_ADMIN',
  onRoleChange,
  activeSectorScope = 'ALL',
  onSectorScopeChange,
}) => {
  const [settingsSubTab, setSettingsSubTab] = useState<'TEAM' | 'RBAC' | 'ZONES' | 'NOTIFICATIONS'>('TEAM');
  const [staffMembers, setStaffMembers] = useState<OpsStaffMember[]>(initialOpsStaffMembers);
  const [selectedStaffRoleFilter, setSelectedStaffRoleFilter] = useState<'ALL' | OpsRole>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Notification Rules state
  const [notificationRules, setNotificationRules] = useState([
    {
      id: 'rule_sos',
      title: 'Emergency SOS Critical Escalation',
      description: 'Trigger immediate priority siren on ops desk and automated SMS to emergency contacts when beneficiary triggers SOS.',
      channel: 'SMS + Push + Desk Siren',
      sla: '< 3 mins response SLA',
      enabled: true,
    },
    {
      id: 'rule_late_checkin',
      title: 'Attendant Late Check-In Auto-Alert',
      description: 'Flag supervisory corridor lead if caregiver fails to punch GPS geofenced check-in within 15 minutes of shift start.',
      channel: 'Operations Desk Alert',
      sla: '15 mins threshold',
      enabled: true,
    },
    {
      id: 'rule_geofence_breach',
      title: 'GPS Geofence Perimeter Anomaly Alert',
      description: 'Instantly notify regional coordinator if check-in occurs > 35m outside the registered beneficiary residence.',
      channel: 'Supervisor SMS + App Banner',
      sla: 'Real-time telemetry',
      enabled: true,
    },
    {
      id: 'rule_family_whatsapp',
      title: 'Family Daily Care & Vitals WhatsApp Digest',
      description: 'Automated digital dispatch of vitals handover, meals, and mobility logs to registered family sponsor upon shift sign-off.',
      channel: 'WhatsApp Business API',
      sla: 'Shift close dispatch',
      enabled: true,
    },
    {
      id: 'rule_vitals_threshold',
      title: 'Clinical Vitals Anomaly Flagging',
      description: 'Trigger mandatory clinical review if recorded Blood Pressure > 150/95 mmHg or SpO2 drops below 92%.',
      channel: 'Clinical Auditor Desk',
      sla: 'Immediate clinical review',
      enabled: true,
    },
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleNotificationRule = (ruleId: string) => {
    setNotificationRules((prev) =>
      prev.map((r) => {
        if (r.id === ruleId) {
          const next = !r.enabled;
          showToast(`Rule "${r.title}" ${next ? 'activated' : 'disabled'}.`);
          return { ...r, enabled: next };
        }
        return r;
      })
    );
  };

  const filteredStaff = staffMembers.filter((m) => {
    return selectedStaffRoleFilter === 'ALL' || m.role === selectedStaffRoleFilter;
  });

  const getRoleBadge = (role: OpsRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'REGIONAL_SUPERVISOR':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'CLINICAL_AUDITOR':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'BILLING_SPECIALIST':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const handleToggleStaffStatus = (id: string) => {
    setStaffMembers((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const nextStatus = m.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
          showToast(`Staff access for ${m.name} changed to ${nextStatus}.`);
          return { ...m, status: nextStatus };
        }
        return m;
      })
    );
  };

  const getActiveZoneLabel = () => {
    switch (activeSectorScope) {
      case 'ALL':
        return 'All Chennai Operating Corridors (Global)';
      case 'SOUTH_CHENNAI':
        return 'South Chennai Corridor (Adyar, Besant Nagar)';
      case 'ANNA_NAGAR':
        return 'Anna Nagar Central Zone';
      case 'MYLAPORE':
        return 'Mylapore Heritage Ward';
      case 'ADYAR_BESANT':
        return 'Adyar-Besant Nagar Sector';
      case 'VELACHERY':
        return 'Velachery Tech Corridor';
      case 'T_NAGAR':
        return 'T. Nagar Commercial Ward';
      case 'OMR':
        return 'OMR Expressway Sector (Peripheral)';
      default:
        return activeSectorScope;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Toast Notification */}
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
              Platform Settings & Governance
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="px-3.5 py-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>Active Tenancy: {getActiveZoneLabel().split('(')[0]}</span>
          </div>
        </div>
      </div>

      {/* Settings Sub-Tab Navigation Switcher */}
      <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs font-bold w-fit flex-wrap gap-1">
        <button
          onClick={() => setSettingsSubTab('TEAM')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer ${
            settingsSubTab === 'TEAM'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 text-teal-600" />
          <span>User Access & Team</span>
        </button>

        <button
          onClick={() => setSettingsSubTab('RBAC')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer ${
            settingsSubTab === 'RBAC'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Key className="w-4 h-4 text-teal-600" />
          <span>Role Capabilities Matrix</span>
        </button>

        <button
          onClick={() => setSettingsSubTab('ZONES')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer ${
            settingsSubTab === 'ZONES'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Globe className="w-4 h-4 text-emerald-600" />
          <span>Zone / Corridor Scopes</span>
        </button>

        <button
          onClick={() => setSettingsSubTab('NOTIFICATIONS')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer ${
            settingsSubTab === 'NOTIFICATIONS'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Bell className="w-4 h-4 text-rose-500" />
          <span>Notification Rules</span>
        </button>
      </div>

      {/* Sub-Tab 0: Administrative Staff & User Management */}
      {settingsSubTab === 'TEAM' && (
        <AdminTeamAccessView onBackToDashboard={onBackToDashboard} />
      )}

      {/* Sub-Tab 1: Role Access (RBAC) */}
      {settingsSubTab === 'RBAC' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Role Simulator Banner */}
          <div className="p-5 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-md space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center shrink-0">
                  <Key className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <div className="font-heading font-extrabold text-sm text-white flex items-center gap-2">
                    Active Staff Role Simulator
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      Live RBAC Sandbox
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {(
                  [
                    { id: 'SUPER_ADMIN', label: 'Super Admin' },
                    { id: 'REGIONAL_SUPERVISOR', label: 'Regional Supervisor' },
                    { id: 'CLINICAL_AUDITOR', label: 'Clinical Auditor' },
                    { id: 'BILLING_SPECIALIST', label: 'Billing Specialist' },
                  ] as const
                ).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      onRoleChange?.(r.id);
                      showToast(`Simulated role switched to ${r.label}`);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      activeRole === r.id
                        ? 'bg-teal-500 text-slate-950 font-extrabold shadow-xs'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RBAC Role Permissions Breakdown Matrix */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sliders className="w-4 h-4 text-teal-600" />
                <h3 className="font-heading font-extrabold text-sm text-slate-900">
                  Role Capabilities & Permissions Matrix
                </h3>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <th className="py-3 px-4">Role Title</th>
                    <th className="py-3 px-3 text-center">Clinical Charts</th>
                    <th className="py-3 px-3 text-center">Care Plans Edit</th>
                    <th className="py-3 px-3 text-center">Standby SLA Dispatch</th>
                    <th className="py-3 px-3 text-center">Roster & Shifts</th>
                    <th className="py-3 px-3 text-center">Pricing & Tariffs</th>
                    <th className="py-3 px-3 text-center">Caregiver Payouts</th>
                    <th className="py-3 px-3 text-center">Staff Governance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rolePermissionsDefinitions.map((def) => {
                    const isSelected = activeRole === def.role;
                    return (
                      <tr
                        key={def.role}
                        className={`transition-colors ${
                          isSelected ? 'bg-teal-50/50 font-bold' : 'hover:bg-slate-50/50'
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getRoleBadge(
                                def.role
                              )}`}
                            >
                              {def.title}
                            </span>
                            {isSelected && (
                              <span className="text-[10px] text-teal-800 font-black">
                                (Active Simulated Role)
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-normal mt-0.5 max-w-sm">
                            {def.description}
                          </div>
                        </td>

                        {/* Permission Flags */}
                        <td className="py-3.5 px-3 text-center">
                          {def.permissions.canViewClinicalCharts ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-300 inline" />
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          {def.permissions.canEditCarePlans ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-300 inline" />
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          {def.permissions.canDispatchStandby ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-300 inline" />
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          {def.permissions.canReassignRoster ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-300 inline" />
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          {def.permissions.canViewPricingAndTariffs ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-300 inline" />
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          {def.permissions.canApprovePayouts ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-300 inline" />
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          {def.permissions.canManageOpsStaff ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-300 inline" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Operations Staff Directory */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-teal-600" />
                <h3 className="font-heading font-extrabold text-sm text-slate-900">
                  Operations Staff Directory ({staffMembers.length} Members)
                </h3>
              </div>

              {/* Filter staff by role */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {(['ALL', 'SUPER_ADMIN', 'REGIONAL_SUPERVISOR', 'CLINICAL_AUDITOR', 'BILLING_SPECIALIST'] as const).map(
                  (r) => (
                    <button
                      key={r}
                      onClick={() => setSelectedStaffRoleFilter(r)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                        selectedStaffRoleFilter === r
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      {r === 'ALL'
                        ? 'All Roles'
                        : r === 'SUPER_ADMIN'
                        ? 'Super Admin'
                        : r === 'REGIONAL_SUPERVISOR'
                        ? 'Supervisors'
                        : r === 'CLINICAL_AUDITOR'
                        ? 'Auditors'
                        : 'Billing'}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <th className="py-3.5 px-4">Staff Member</th>
                    <th className="py-3.5 px-4">Assigned Role</th>
                    <th className="py-3.5 px-4">Operating Sector Scope</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4">Last Active</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStaff.map((staff) => (
                    <tr key={staff.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-xs">{staff.name}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{staff.roleTitle}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getRoleBadge(
                            staff.role
                          )}`}
                        >
                          {staff.role.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-xs text-slate-700 font-medium flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>{staff.assignedSector}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-[11px] text-slate-600">{staff.email}</div>
                        <div className="text-[10px] text-slate-400">{staff.phone}</div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 text-[11px] font-medium">
                        {staff.lastLogin}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            staff.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {staff.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleToggleStaffStatus(staff.id)}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition cursor-pointer ${
                            staff.status === 'ACTIVE'
                              ? 'bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200'
                              : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                        >
                          {staff.status === 'ACTIVE' ? 'Suspend Access' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Zone / Corridor Scopes */}
      {settingsSubTab === 'ZONES' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Location Tenancy Scoping Card */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-base text-slate-900">
                    Location-Based Scoping & Multi-Zone Tenancy
                  </h3>
                </div>
              </div>

              {/* Sector Scope Dropdown */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-slate-600">Active Scope:</span>
                <select
                  value={activeSectorScope}
                  onChange={(e) => {
                    const next = e.target.value as OperatingSectorScope;
                    onSectorScopeChange?.(next);
                    showToast(`Active geographic scope updated to ${e.target.value}`);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-bold text-xs focus:outline-hidden focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  <option value="ALL">Global: All Chennai Operating Sectors</option>
                  <option value="SOUTH_CHENNAI">South Chennai Corridor (Adyar, Besant Nagar)</option>
                  <option value="ANNA_NAGAR">Anna Nagar Central Zone</option>
                  <option value="MYLAPORE">Mylapore Heritage Ward</option>
                  <option value="ADYAR_BESANT">Adyar-Besant Nagar Sector</option>
                  <option value="VELACHERY">Velachery Tech Corridor</option>
                  <option value="T_NAGAR">T. Nagar Commercial Ward</option>
                  <option value="OMR">OMR Expressway Sector (Peripheral)</option>
                </select>
              </div>
            </div>

            {/* Current Active Zone Badge Banner */}
            <div className="p-4 rounded-2xl bg-teal-50/80 border border-teal-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-teal-900">
                  Currently Filtering Live Data By:
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-600 text-white font-extrabold text-xs">
                  {getActiveZoneLabel()}
                </span>
              </div>
              {activeSectorScope !== 'ALL' && (
                <button
                  onClick={() => {
                    onSectorScopeChange?.('ALL');
                    showToast('Reset to global view (All corridors)');
                  }}
                  className="text-xs font-bold text-teal-700 hover:text-teal-900 underline cursor-pointer"
                >
                  Reset to All Corridors
                </button>
              )}
            </div>

            {/* Clickable Corridor Hubs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
              {serviceableCorridors.map((c, i) => {
                const isSelected = activeSectorScope === c.sectorCode;
                return (
                  <div
                    key={i}
                    onClick={() => {
                      const nextCode = (isSelected ? 'ALL' : c.sectorCode) as OperatingSectorScope;
                      onSectorScopeChange?.(nextCode);
                      showToast(isSelected ? 'Switched to Global Scope' : `Scoped to ${c.name}`);
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer text-left space-y-2 select-none ${
                      isSelected
                        ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-500/30 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-teal-800 font-bold">
                        PIN: {c.pin}
                      </span>
                      {isSelected ? (
                        <span className="px-2 py-0.5 rounded-md bg-teal-600 text-white font-extrabold text-[10px] flex items-center gap-1">
                          <Check className="w-3 h-3 stroke-[3]" />
                          Active
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-bold hover:text-teal-700">
                          Click to Filter
                        </span>
                      )}
                    </div>

                    <div className="font-heading font-extrabold text-sm text-slate-900">
                      {c.name}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <span>{c.attendants} Attendants</span>
                      <span>•</span>
                      <span>{c.activeElders} Elders</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Notification Rules */}
      {settingsSubTab === 'NOTIFICATIONS' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-5">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="font-heading font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-rose-500" />
                <span>Automated Alert Triggers & Escalation Rules</span>
              </h3>
            </div>

            <div className="space-y-3">
              {notificationRules.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs ${
                    rule.enabled
                      ? 'bg-slate-50/70 border-slate-200'
                      : 'bg-slate-100/50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-extrabold text-sm text-slate-900">
                        {rule.title}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-bold">
                        {rule.sla}
                      </span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">{rule.description}</p>
                    <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 pt-0.5">
                      <Smartphone className="w-3 h-3 text-slate-400" />
                      <span>Channel: {rule.channel}</span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-3">
                    <span
                      className={`text-[11px] font-bold ${
                        rule.enabled ? 'text-emerald-700' : 'text-slate-400'
                      }`}
                    >
                      {rule.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleNotificationRule(rule.id)}
                      className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                        rule.enabled ? 'bg-teal-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                          rule.enabled ? 'right-1' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
