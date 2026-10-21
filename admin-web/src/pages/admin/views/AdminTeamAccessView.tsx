import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  ShieldCheck,
  Shield,
  MapPin,
  Mail,
  Phone,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  AlertTriangle,
  Compass,
  FileCheck,
  Headphones,
} from 'lucide-react';
import type { AdminRole, AdminUser } from '../types';
import { initialAdminUsers } from '../mockData';

interface AdminTeamAccessViewProps {
  // Navigation handled via sidebar
}

const AVAILABLE_LOCATIONS = [
  'All Corridors',
  'South Chennai Corridor (Adyar)',
  'Adyar-Besant Nagar Sector',
  'Anna Nagar Central Zone',
  'Mylapore Heritage Ward',
  'Velachery Tech Corridor',
  'T. Nagar Commercial Ward',
  'OMR Expressway Sector (Peripheral)',
];

const ROLE_DEFINITIONS: Record<
  AdminRole,
  {
    icon: React.ElementType;
    badgeClass: string;
    description: string;
    accessSummary: string[];
  }
> = {
  'Super Admin': {
    icon: ShieldCheck,
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    description: 'Unconstrained global access across platform settings, billing tariffs, catalog, and administrative staff management.',
    accessSummary: ['Full System Configuration', 'Services Catalog & Policies', 'Staff RBAC & Onboarding', 'All Regional Telemetry'],
  },
  'Operations Dispatcher': {
    icon: Compass,
    badgeClass: 'bg-teal-100 text-teal-800 border-teal-200',
    description: 'Active operations orchestration: Live Map corridor monitoring, caregiver roster allocations, shift handoffs, and SOS dispatch.',
    accessSummary: ['Live Map & Fleet Telemetry', 'Caregiver Roster Assignment', 'Emergency SOS Rapid Dispatch', 'Shift Attendance Oversight'],
  },
  'Triage & Support Desk': {
    icon: Headphones,
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
    description: 'Incident escalation desk and family communication: SOS alerts review, emergency facility coordination, and customer support.',
    accessSummary: ['Emergency SOS Desk', 'Careseeker Directory (Read-only)', 'Hospital Contact Escalation', 'Family Inquiries & Tickets'],
  },
  'Auditor / Compliance': {
    icon: FileCheck,
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'Clinical protocol auditing and operational verification: caregiver biometric KYC, shift geofence telemetry, and task checklists.',
    accessSummary: ['Clinical Task Checklists', 'Geofence Compliance Audits', 'Caregiver KYC Credentials', 'Operational Shift Reports'],
  },
};

export const AdminTeamAccessView: React.FC<AdminTeamAccessViewProps> = () => {
  const [users, setUsers] = useState<AdminUser[]>(initialAdminUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'All' | AdminRole>('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'All' | 'Active' | 'Invited' | 'Suspended'>('All');
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<AdminRole>('Operations Dispatcher');
  const [formLocations, setFormLocations] = useState<string[]>(['South Chennai Corridor (Adyar)']);
  const [formStatus, setFormStatus] = useState<'Active' | 'Invited' | 'Suspended'>('Active');
  const [formError, setFormError] = useState<string | null>(null);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Open modal for Create
  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormRole('Operations Dispatcher');
    setFormLocations(['South Chennai Corridor (Adyar)']);
    setFormStatus('Active');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (user: AdminUser) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPhone(user.phone);
    setFormRole(user.role);
    setFormLocations([...user.assignedLocations]);
    setFormStatus(user.status);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Toggle Location in form
  const handleToggleLocation = (loc: string) => {
    if (loc === 'All Corridors') {
      if (formLocations.includes('All Corridors')) {
        setFormLocations([]);
      } else {
        setFormLocations(['All Corridors']);
      }
      return;
    }

    let updated = formLocations.filter((l) => l !== 'All Corridors');
    if (updated.includes(loc)) {
      updated = updated.filter((l) => l !== loc);
    } else {
      updated.push(loc);
    }

    if (updated.length === 0) {
      updated = ['All Corridors'];
    }
    setFormLocations(updated);
  };

  // Save / Submit Modal
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Please enter the administrative user name.');
      return;
    }
    if (!formEmail.trim() || !formEmail.includes('@')) {
      setFormError('Please enter a valid official email address.');
      return;
    }
    if (formLocations.length === 0) {
      setFormError('Please select at least one assigned location scope.');
      return;
    }

    if (editingUser) {
      // Update existing
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? {
                ...u,
                name: formName.trim(),
                email: formEmail.trim(),
                phone: formPhone.trim() || '+91 98400 00000',
                role: formRole,
                assignedLocations: formLocations,
                status: formStatus,
              }
            : u
        )
      );
      showToast(`Updated administrative permissions for ${formName.trim()}.`);
    } else {
      // Create new
      const newUser: AdminUser = {
        id: `adm_${Date.now()}`,
        name: formName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim() || '+91 98400 00000',
        role: formRole,
        assignedLocations: formLocations,
        status: formStatus,
        lastActive: formStatus === 'Active' ? 'Just now' : undefined,
        createdAt: new Date().toISOString().split('T')[0],
      };
      setUsers((prev) => [newUser, ...prev]);
      showToast(`Staff invitation sent to ${newUser.email} with role "${formRole}".`);
    }

    setIsModalOpen(false);
  };

  // Toggle user status
  const handleToggleUserStatus = (user: AdminUser) => {
    const nextStatus: 'Active' | 'Suspended' = user.status === 'Active' ? 'Suspended' : 'Active';
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u))
    );
    showToast(`Access status for ${user.name} changed to ${nextStatus}.`);
  };

  // Delete user
  const handleDeleteUser = (userId: string, userName: string) => {
    if (window.confirm(`Are you sure you want to revoke administrative access for ${userName}?`)) {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      showToast(`Administrative profile for ${userName} has been removed.`);
    }
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === '' ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.assignedLocations.some((l) => l.toLowerCase().includes(q));

      const matchesRole = selectedRoleFilter === 'All' || u.role === selectedRoleFilter;
      const matchesStatus = selectedStatusFilter === 'All' || u.status === selectedStatusFilter;
      const matchesLocation =
        selectedLocationFilter === 'All' ||
        u.assignedLocations.includes('All Corridors') ||
        u.assignedLocations.includes(selectedLocationFilter);

      return matchesSearch && matchesRole && matchesStatus && matchesLocation;
    });
  }, [users, searchQuery, selectedRoleFilter, selectedStatusFilter, selectedLocationFilter]);

  // Metrics summary
  const metrics = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((u) => u.status === 'Active').length,
      invited: users.filter((u) => u.status === 'Invited').length,
      suspended: users.filter((u) => u.status === 'Suspended').length,
    };
  }, [users]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-slate-900 text-white text-xs font-bold shadow-2xl border border-slate-700 animate-fadeIn flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Controls Header */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-heading font-extrabold text-slate-900 flex items-center gap-2">
                <span>Administrative Staff & User Access</span>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-900 text-[11px] font-black uppercase tracking-wider">
                  RBAC Console
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage operational personnel, grant role-based authorization levels, and restrict corridor location scopes.
              </p>
            </div>
          </div>
        </div>

        {/* Invite / Add Button */}
        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-bold text-xs shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition active:scale-95 shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite Administrative Staff</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Staff Members
          </span>
          <div className="text-2xl font-heading font-black text-slate-900">{metrics.total}</div>
          <span className="text-[10px] text-slate-500">Provisioned accounts</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
            Active On Platform
          </span>
          <div className="text-2xl font-heading font-black text-emerald-700">{metrics.active}</div>
          <span className="text-[10px] text-emerald-600">Full authenticated access</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
            Pending Invitations
          </span>
          <div className="text-2xl font-heading font-black text-amber-600">{metrics.invited}</div>
          <span className="text-[10px] text-amber-600">Awaiting user activation</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">
            Suspended Access
          </span>
          <div className="text-2xl font-heading font-black text-rose-600">{metrics.suspended}</div>
          <span className="text-[10px] text-rose-600">Locked / Revoked sessions</span>
        </div>
      </div>

      {/* Role Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(Object.keys(ROLE_DEFINITIONS) as AdminRole[]).map((role) => {
          const config = ROLE_DEFINITIONS[role];
          const Icon = config.icon;
          const userCount = users.filter((u) => u.role === role).length;
          return (
            <div
              key={role}
              className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${config.badgeClass}`}>
                      {role}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 font-mono">
                    {userCount} user{userCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {config.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  Permissions Scope:
                </span>
                <ul className="text-[10px] text-slate-600 space-y-0.5">
                  {config.accessSummary.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-teal-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search and Filters Toolbar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search staff by name, email, role, or assigned corridor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-medium"
          />
        </div>

        {/* Role Filter */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <span className="font-bold">Role:</span>
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:bg-white"
          >
            <option value="All">All Roles</option>
            <option value="Super Admin">Super Admin</option>
            <option value="Operations Dispatcher">Operations Dispatcher</option>
            <option value="Triage & Support Desk">Triage & Support Desk</option>
            <option value="Auditor / Compliance">Auditor / Compliance</option>
          </select>
        </div>

        {/* Location Scope Filter */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-bold">Location:</span>
          <select
            value={selectedLocationFilter}
            onChange={(e) => setSelectedLocationFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:bg-white max-w-[170px] truncate"
          >
            <option value="All">All Corridors</option>
            {AVAILABLE_LOCATIONS.filter((l) => l !== 'All Corridors').map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {(['All', 'Active', 'Invited', 'Suspended'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                selectedStatusFilter === st
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Clear Filters */}
        {(searchQuery || selectedRoleFilter !== 'All' || selectedStatusFilter !== 'All' || selectedLocationFilter !== 'All') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedRoleFilter('All');
              setSelectedStatusFilter('All');
              setSelectedLocationFilter('All');
            }}
            className="text-xs font-bold text-teal-700 hover:text-teal-900 px-2 py-1"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Staff Directory Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="w-full max-w-full overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Administrative Staff Member</th>
                <th className="py-3.5 px-4">Assigned Permission Role</th>
                <th className="py-3.5 px-4">Assigned Location Scopes</th>
                <th className="py-3.5 px-4">Access Status</th>
                <th className="py-3.5 px-4">Last Active</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    No administrative staff match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const roleConfig = ROLE_DEFINITIONS[user.role];
                  const RoleIcon = roleConfig?.icon || Shield;
                  const initials = user.name
                    .split(/\s+/)
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & Contact */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 text-teal-800 font-heading font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                            {initials}
                          </div>
                          <div>
                            <div className="font-heading font-extrabold text-sm text-slate-900">
                              {user.name}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-slate-400" />
                                {user.email}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1 font-mono">
                                <Phone className="w-3 h-3 text-slate-400" />
                                {user.phone}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Assigned Role */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                            roleConfig?.badgeClass || 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          <RoleIcon className="w-3.5 h-3.5" />
                          <span>{user.role}</span>
                        </span>
                      </td>

                      {/* Location Scopes */}
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {user.assignedLocations.map((loc, i) => (
                            <span
                              key={i}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold ${
                                loc === 'All Corridors'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200/70'
                              }`}
                            >
                              <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[140px]">{loc.split('(')[0]}</span>
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            user.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : user.status === 'Invited'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {user.status}
                        </span>
                      </td>

                      {/* Last Active */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="text-xs text-slate-700 font-medium">
                          {user.lastActive || <span className="text-slate-400 italic">Never signed in</span>}
                        </div>
                        <div className="text-[10px] text-slate-400">Created: {user.createdAt}</div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(user)}
                            className="p-2 rounded-xl bg-slate-50 hover:bg-teal-50 text-slate-600 hover:text-teal-900 border border-slate-200 hover:border-teal-200 transition"
                            title="Edit User Permissions"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleToggleUserStatus(user)}
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition ${
                              user.status === 'Active'
                                ? 'bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 border-slate-200 hover:border-rose-200'
                                : 'bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border-slate-200 hover:border-emerald-200'
                            }`}
                            title="Toggle active/suspended access"
                          >
                            {user.status === 'Active' ? 'Suspend' : 'Activate'}
                          </button>

                          <button
                            onClick={() => handleDeleteUser(user.id, user.name)}
                            className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition"
                            title="Revoke and remove staff access"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <strong className="text-slate-700">{filteredUsers.length}</strong> of{' '}
            <strong className="text-slate-700">{users.length}</strong> administrative users
          </span>
          <span className="font-medium text-slate-400">
            Role changes apply immediately upon next session handshake
          </span>
        </div>
      </div>

      {/* Add / Edit Administrative User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="fixed inset-0" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden z-10">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-heading font-extrabold text-white">
                    {editingUser ? 'Edit Staff Permissions' : 'Invite Administrative User'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Assign granular operational capabilities and geographic corridor restrictions.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmitForm} className="p-6 overflow-y-auto space-y-4 flex-1">
              {formError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Radhika Parthasarathy"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-medium"
                />
              </div>

              {/* Email & Phone Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Official Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="radhika.p@careconnect.in"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98400 12345"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-medium"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Assigned Administrative Role <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Object.keys(ROLE_DEFINITIONS) as AdminRole[]).map((r) => {
                    const isSelected = formRole === r;
                    const config = ROLE_DEFINITIONS[r];
                    const Icon = config.icon;
                    return (
                      <div
                        key={r}
                        onClick={() => setFormRole(r)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-teal-50 border-teal-500 ring-1 ring-teal-500 shadow-2xs'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                            <Icon className="w-3.5 h-3.5 text-teal-700" />
                            <span>{r}</span>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-teal-700" />}
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight">
                          {config.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Geographic Corridor Locations Scope */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 block">
                    Assigned Location Scopes <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {formLocations.includes('All Corridors')
                      ? 'Global Access'
                      : `${formLocations.length} Corridors Selected`}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-2 rounded-2xl bg-slate-50 border border-slate-200">
                  {AVAILABLE_LOCATIONS.map((loc) => {
                    const isChecked = formLocations.includes(loc);
                    return (
                      <label
                        key={loc}
                        onClick={() => handleToggleLocation(loc)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium cursor-pointer flex items-center justify-between transition ${
                          isChecked
                            ? 'bg-teal-600 text-white font-bold shadow-2xs'
                            : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                        }`}
                      >
                        <span className="truncate">{loc}</span>
                        {isChecked && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Account Status */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Account Status</label>
                <div className="flex items-center gap-2">
                  {(['Active', 'Invited', 'Suspended'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setFormStatus(st)}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl border transition ${
                        formStatus === st
                          ? st === 'Active'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : st === 'Invited'
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-rose-600 text-white border-rose-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition active:scale-95"
                >
                  {editingUser ? 'Save Permissions' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
