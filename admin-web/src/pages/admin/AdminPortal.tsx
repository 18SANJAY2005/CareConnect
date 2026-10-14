import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  AdminTab,
  AdminElderItem,
  AdminCaregiverItem,
  AdminSosAlert,
  AdminMetrics,
  OpsRole,
  OperatingSectorScope,
  NearbyHospital,
  CareseekerOffer,
} from './types';
import {
  initialAdminElders,
  initialAdminCaregivers,
  initialAdminSosAlerts,
  calculateAdminMetrics,
} from './mockData';
import { CareseekerDetailDrawer } from './components/CareseekerDetailDrawer';
import { CaregiverDetailDrawer } from './components/CaregiverDetailDrawer';
import { AdminLayout } from './AdminLayout';
import { AdminOverviewView } from './views/AdminOverviewView';
import { AdminEldersView } from './views/AdminEldersView';
import { AdminCaregiversView } from './views/AdminCaregiversView';
import { AdminAttendanceView } from './views/AdminAttendanceView';
import { AdminServicesPricingView } from './views/AdminServicesPricingView';
import { AdminReportsView } from './views/AdminReportsView';
import { AdminSettingsView } from './views/AdminSettingsView';
import { AdminLiveMapView } from './views/AdminLiveMapView';
import { AdminSosPanel } from './views/AdminSosPanel';
import { AdminLogin, ADMIN_AUTH_KEY } from './AdminLogin';
import { api } from '../../services/api';

const SOS_STORAGE_KEY = 'careconnect_admin_sos_alerts';

interface AdminPortalProps {
  onExit?: () => void;
  onAddElderFromAdmin?: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  onAddElderFromAdmin,
}) => {
  // Sync tab with URL hash if present
  const getTabFromHash = (): AdminTab => {
    if (typeof window === 'undefined') return 'MAP';
    const hash = window.location.hash.toLowerCase();
    if (hash.includes('map')) return 'MAP';
    if (hash.includes('sos')) return 'SOS';
    if (hash.includes('elders') || hash.includes('careseekers')) return 'ELDERS';
    if (hash.includes('caregivers')) return 'CAREGIVERS';
    if (hash.includes('attendance')) return 'ATTENDANCE';
    if (hash.includes('services-pricing') || hash.includes('services') || hash.includes('pricing') || hash.includes('catalog'))
      return 'SERVICES_PRICING';
    if (hash.includes('reports') || hash.includes('analytics')) return 'REPORTS';
    if (hash.includes('access') || hash.includes('settings') || hash.includes('governance')) return 'SETTINGS';
    if (hash.includes('care-plans') || hash.includes('careplans')) return 'SERVICES_PRICING';
    if (hash.includes('overview') || hash.includes('dashboard')) return 'OVERVIEW';
    return 'MAP';
  };

  // Authentication Guard State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = localStorage.getItem(ADMIN_AUTH_KEY);
      if (!stored) return false;
      const parsed = JSON.parse(stored);
      return Boolean(parsed?.isAuthenticated);
    } catch {
      return false;
    }
  });

  const handleLogout = useCallback(() => {
    try {
      localStorage.removeItem(ADMIN_AUTH_KEY);
    } catch (e) {
      console.warn('Error clearing admin session:', e);
    }
    setIsAdminAuthenticated(false);
  }, []);

  const [activeTab, setActiveTab] = useState<AdminTab>(getTabFromHash);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // RBAC & Location Tenancy Scoping
  const [activeRole, setActiveRole] = useState<OpsRole>('SUPER_ADMIN');
  const [activeSectorScope, setActiveSectorScope] = useState<OperatingSectorScope>('ALL');

  // Core Data States
  const [elders, setElders] = useState<AdminElderItem[]>(initialAdminElders);
  const [caregivers, setCaregivers] = useState<AdminCaregiverItem[]>(initialAdminCaregivers);
  const [alerts, setAlerts] = useState<AdminSosAlert[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(SOS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Error loading persisted SOS alerts:', e);
      }
    }
    return initialAdminSosAlerts;
  });

  // Active Drawers / Map Focus
  const [selectedElderForDrawer, setSelectedElderForDrawer] = useState<AdminElderItem | null>(null);
  const [selectedCaregiverForDrawer, setSelectedCaregiverForDrawer] = useState<AdminCaregiverItem | null>(null);
  const [focusedCoordinates, setFocusedCoordinates] = useState<[number, number] | null>(null);

  // Change tab and sync hash
  const handleSelectTab = useCallback((tab: AdminTab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const hashSuffix = tab === 'OVERVIEW' ? '' : `/${tab.toLowerCase().replace('_', '-')}`;
      window.history.replaceState(null, '', `#admin${hashSuffix}`);
    }
  }, []);

  // Listen to hash changes if user uses browser history
  useEffect(() => {
    const onHashChange = () => {
      const tab = getTabFromHash();
      setActiveTab(tab);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Fetch Live Data from Backend with Mock Fallback
  const loadLiveData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const eldersRes = await api.listElders().catch(() => null);
      if (eldersRes && Array.isArray(eldersRes) && eldersRes.length > 0) {
        const mappedElders: AdminElderItem[] = eldersRes.map((e: any, idx: number) => ({
          id: e.id || `eld_live_${idx}`,
          name: e.name || 'Elder Beneficiary',
          age: e.age || 75,
          gender: e.gender || 'FEMALE',
          sponsorName: e.sponsor_name || e.emergency_contact_name || 'Family Sponsor',
          sponsorPhone: e.sponsor_phone || e.emergency_contact_phone || '+91 98400 00000',
          sponsorRelation: 'Family Sponsor',
          addressLine1: e.address || 'Chennai Address',
          locality: e.locality || 'South Chennai Corridor (Adyar)',
          city: 'Chennai',
          postalCode: e.postal_code || '600020',
          latitude: e.latitude || 13.0067,
          longitude: e.longitude || 80.2575,
          assignedCaregiverName: e.assigned_caregiver_name || 'Priya Sundaram',
          status: e.status === 'ACTIVE' ? 'ACTIVE' : 'ACTIVE',
          mobilityLevel: e.mobility_level || 'CANE_WALKER',
          medicalConditions: e.medical_conditions || ['Hypertension'],
          medicalDevices: e.medical_devices || [],
          dietaryPreferences: e.dietary_preferences || ['Vegetarian'],
          languages: ['Tamil', 'English'],
          primaryLanguage: 'Tamil',
          shiftPreference: 'TWELVE_HOUR_DAY_NIGHT',
          activeShiftStatus: 'ON_DUTY',
          lastVitals: {
            bp: '128/82',
            pulse: 74,
            recordedAt: 'Today, 08:30 AM',
          },
        }));
        setElders(mappedElders);
      }

      const caregiversRes = await api.getAllCaregivers().catch(() => null);
      if (caregiversRes && Array.isArray(caregiversRes) && caregiversRes.length > 0) {
        const mappedCg: AdminCaregiverItem[] = caregiversRes.map((c: any, idx: number) => ({
          id: c.id || `cg_live_${idx}`,
          fullName: c.full_name || c.name || 'Care Attendant',
          phone: c.phone || '+91 98400 11111',
          gender: c.gender || 'Female',
          rating: c.rating || 4.8,
          experienceYears: c.experience_years || 5,
          locality: c.locality || 'South Chennai Corridor (Adyar)',
          primaryLanguage: 'Tamil',
          languages: Array.isArray(c.languages)
            ? c.languages
            : typeof c.languages === 'string'
            ? c.languages.split(',').map((s: string) => s.trim()).filter(Boolean)
            : ['Tamil', 'English'],
          skills: Array.isArray(c.skills)
            ? c.skills
            : typeof c.skills === 'string'
            ? c.skills.split(',').map((s: string) => s.trim()).filter(Boolean)
            : ['Assisted Daily Living (ADL)', 'Vitals Triage'],
          specializations: Array.isArray(c.specializations)
            ? c.specializations
            : typeof c.specializations === 'string'
            ? c.specializations.split(',').map((s: string) => s.trim()).filter(Boolean)
            : ['Assisted Daily Living (ADL) Support'],
          isBufferPool: Boolean(c.is_buffer_pool),
          isStandbyReserve: Boolean(c.is_buffer_pool),
          isPoliceVerified: true,
          isClinicalCertified: true,
          isIdentityVerified: true,
          status: c.status === 'ON_DUTY' ? 'ON_DUTY' : 'AVAILABLE',
          rosterStatus: c.status === 'ON_DUTY' ? 'ACTIVE_SHIFT' : 'STANDBY_RESERVE',
        }));
        setCaregivers(mappedCg);
      }
    } catch (e) {
      console.warn('Backend live sync failed, continuing with cached operational state:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLiveData();
  }, [loadLiveData]);

  // Persist alerts to localStorage
  const persistAlerts = useCallback((updatedAlerts: AdminSosAlert[]) => {
    setAlerts(updatedAlerts);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(SOS_STORAGE_KEY, JSON.stringify(updatedAlerts));
      } catch (e) {
        console.warn('Could not persist alerts to localStorage:', e);
      }
    }
  }, []);

  // Multi-Zone Tenancy Scoping Filters
  const matchesSectorScope = useCallback(
    (locality: string, scope: OperatingSectorScope) => {
      if (scope === 'ALL') return true;
      const loc = locality.toLowerCase();
      switch (scope) {
        case 'SOUTH_CHENNAI':
          return loc.includes('south chennai') || loc.includes('adyar') || loc.includes('thiruvanmiyur');
        case 'ANNA_NAGAR':
          return loc.includes('anna nagar') || loc.includes('shenoy');
        case 'MYLAPORE':
          return loc.includes('mylapore') || loc.includes('mandaveli') || loc.includes('alwarpet');
        case 'ADYAR_BESANT':
          return loc.includes('besant') || loc.includes('adyar');
        case 'VELACHERY':
          return loc.includes('velachery') || loc.includes('guindy');
        case 'T_NAGAR':
          return loc.includes('t. nagar') || loc.includes('t nagar') || loc.includes('kodambakkam');
        case 'OMR':
          return loc.includes('omr') || loc.includes('thoraipakkam') || loc.includes('perungudi');
        default:
          return true;
      }
    },
    []
  );

  const displayedElders = useMemo(() => {
    return elders.filter((e) => matchesSectorScope(e.locality, activeSectorScope));
  }, [elders, activeSectorScope, matchesSectorScope]);

  const displayedCaregivers = useMemo(() => {
    return caregivers.filter((c) => matchesSectorScope(c.locality, activeSectorScope));
  }, [caregivers, activeSectorScope, matchesSectorScope]);

  const displayedAlerts = useMemo(() => {
    return alerts.filter((a) => matchesSectorScope(a.locality, activeSectorScope));
  }, [alerts, activeSectorScope, matchesSectorScope]);

  // Metrics calculation
  const metrics: AdminMetrics = useMemo(() => {
    return calculateAdminMetrics(displayedElders, displayedCaregivers, displayedAlerts);
  }, [displayedElders, displayedCaregivers, displayedAlerts]);

  // Status Change Handlers
  const handleStatusChange = useCallback(
    (elderId: string, newStatus: 'ACTIVE' | 'PENDING' | 'INACTIVE') => {
      setElders((prev) =>
        prev.map((e) => (e.id === elderId ? { ...e, status: newStatus } : e))
      );
    },
    []
  );

  const handleCaregiverStatusChange = useCallback(
    (caregiverId: string, newStatus: 'AVAILABLE' | 'ON_DUTY' | 'ON_LEAVE' | 'ON_HANDOFF') => {
      setCaregivers((prev) =>
        prev.map((c) =>
          c.id === caregiverId
            ? {
                ...c,
                status: newStatus,
                rosterStatus:
                  newStatus === 'ON_DUTY'
                    ? 'ACTIVE_SHIFT'
                    : newStatus === 'ON_HANDOFF'
                    ? 'ON_HANDOFF'
                    : newStatus === 'AVAILABLE'
                    ? 'STANDBY_RESERVE'
                    : 'OFF_DUTY',
              }
            : c
        )
      );
    },
    []
  );

  const handleReassignCorridor = useCallback((caregiverId: string, newCorridor: string) => {
    setCaregivers((prev) =>
      prev.map((c) => (c.id === caregiverId ? { ...c, locality: newCorridor } : c))
    );
  }, []);

  const handleResolveAlert = useCallback(
    (alertId: string, resolutionNotes: string) => {
      const updated = alerts.map((a) =>
        a.id === alertId
          ? {
              ...a,
              status: 'RESOLVED' as const,
              resolutionNotes,
            }
          : a
      );
      persistAlerts(updated);
    },
    [alerts, persistAlerts]
  );

  const handleDispatchSupervisor = useCallback(
    (alertId: string, supervisorName: string, notes: string) => {
      const updated = alerts.map((a) =>
        a.id === alertId
          ? {
              ...a,
              status: 'DISPATCHED' as const,
              dispatchedSupervisor: supervisorName,
              resolutionNotes: notes,
            }
          : a
      );
      persistAlerts(updated);
    },
    [alerts, persistAlerts]
  );

  const handleViewAlertOnMap = useCallback((lat: number, lng: number) => {
    setFocusedCoordinates([lat, lng]);
    handleSelectTab('MAP');
  }, [handleSelectTab]);

  const handleViewElderFromCaregiver = useCallback(
    (elderName: string, elderId?: string) => {
      setSelectedCaregiverForDrawer(null);
      const targetElder = elders.find(
        (e) => (elderId && e.id === elderId) || e.name.toLowerCase() === elderName.toLowerCase()
      );
      if (targetElder) {
        setSelectedElderForDrawer(targetElder);
      } else {
        handleSelectTab('ELDERS');
      }
    },
    [elders, handleSelectTab]
  );

  const handleDispatchCaregiverToSos = useCallback(
    (cg: AdminCaregiverItem) => {
      const openAlert = alerts.find((a) => a.status === 'OPEN');
      if (openAlert) {
        handleDispatchSupervisor(
          openAlert.id,
          `${cg.fullName} (Standby Attendant - ${cg.locality})`,
          'Direct SLA rapid replacement dispatched from Standby Reserve Hub.'
        );
      }
      setSelectedCaregiverForDrawer(null);
      handleSelectTab('SOS');
    },
    [alerts, handleDispatchSupervisor, handleSelectTab]
  );

  const handleUpdatePreferredHospital = useCallback(
    (elderId: string, hospital: NearbyHospital) => {
      setElders((prev) =>
        prev.map((e) => (e.id === elderId ? { ...e, preferredHospital: hospital } : e))
      );
      if (selectedElderForDrawer && selectedElderForDrawer.id === elderId) {
        setSelectedElderForDrawer((prev) => (prev ? { ...prev, preferredHospital: hospital } : null));
      }
    },
    [selectedElderForDrawer]
  );

  const handleUpdateElderOffer = useCallback(
    (elderId: string, offer: CareseekerOffer | null) => {
      setElders((prev) =>
        prev.map((e) => (e.id === elderId ? { ...e, appliedOffer: offer || undefined } : e))
      );
      if (selectedElderForDrawer && selectedElderForDrawer.id === elderId) {
        setSelectedElderForDrawer((prev) =>
          prev ? { ...prev, appliedOffer: offer || undefined } : null
        );
      }
    },
    [selectedElderForDrawer]
  );

  if (!isAdminAuthenticated) {
    return (
      <AdminLogin
        onLoginSuccess={() => {
          setIsAdminAuthenticated(true);
        }}
      />
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-50 text-slate-800">
      <AdminLayout
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        metrics={metrics}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isRefreshing={isRefreshing}
        onRefresh={loadLiveData}
        onLogout={handleLogout}
        activeSectorScope={activeSectorScope}
        onSectorScopeChange={setActiveSectorScope}
        activeRole={activeRole}
      >
        {activeTab === 'OVERVIEW' && (
            <AdminOverviewView
              metrics={metrics}
              elders={displayedElders}
              caregivers={displayedCaregivers}
              alerts={displayedAlerts}
              onNavigateTab={handleSelectTab}
              onSelectElder={(e) => setSelectedElderForDrawer(e)}
            />
          )}

          {activeTab === 'ELDERS' && (
            <AdminEldersView
              elders={displayedElders}
              onSelectElder={(e) => setSelectedElderForDrawer(e)}
              onStatusChange={handleStatusChange}
              onAddElder={onAddElderFromAdmin}
              onBackToDashboard={() => handleSelectTab('OVERVIEW')}
            />
          )}

          {activeTab === 'CAREGIVERS' && (
            <AdminCaregiversView
              caregivers={displayedCaregivers}
              onSelectCaregiver={(cg) => setSelectedCaregiverForDrawer(cg)}
              onStatusChange={handleCaregiverStatusChange}
              onBackToDashboard={() => handleSelectTab('OVERVIEW')}
            />
          )}

          {activeTab === 'ATTENDANCE' && (
            <AdminAttendanceView
              onBackToDashboard={() => handleSelectTab('OVERVIEW')}
              onSelectCaregiverByName={(cgName) => {
                const found = caregivers.find(
                  (c) => c.fullName.toLowerCase() === cgName.toLowerCase()
                );
                if (found) setSelectedCaregiverForDrawer(found);
              }}
              onSelectElderByName={(eName) => {
                const found = elders.find(
                  (e) => e.name.toLowerCase() === eName.toLowerCase()
                );
                if (found) setSelectedElderForDrawer(found);
              }}
            />
          )}

          {(activeTab === 'SERVICES_PRICING' || activeTab === 'SERVICES' || activeTab === 'PRICING' || activeTab === 'CARE_PLANS') && (
            <AdminServicesPricingView
              onBackToDashboard={() => handleSelectTab('OVERVIEW')}
              defaultSubTab={activeTab === 'PRICING' ? 'PRICING' : 'SERVICES'}
            />
          )}

          {activeTab === 'REPORTS' && (
            <AdminReportsView
              onBackToDashboard={() => handleSelectTab('OVERVIEW')}
            />
          )}

          {(activeTab === 'SETTINGS' || activeTab === 'SETTINGS_ACCESS') && (
            <AdminSettingsView
              onBackToDashboard={() => handleSelectTab('OVERVIEW')}
              activeRole={activeRole}
              onRoleChange={setActiveRole}
              activeSectorScope={activeSectorScope}
              onSectorScopeChange={setActiveSectorScope}
            />
          )}

          {activeTab === 'MAP' && (
            <AdminLiveMapView
              elders={displayedElders}
              caregivers={displayedCaregivers}
              alerts={displayedAlerts}
              focusedCoordinates={focusedCoordinates}
              onSelectElder={(e) => setSelectedElderForDrawer(e)}
              onSelectCaregiver={(cg) => setSelectedCaregiverForDrawer(cg)}
              onBackToDashboard={() => handleSelectTab('OVERVIEW')}
            />
          )}

          {activeTab === 'SOS' && (
            <AdminSosPanel
              alerts={displayedAlerts}
              onResolveAlert={handleResolveAlert}
              onDispatchSupervisor={handleDispatchSupervisor}
              onViewOnMap={handleViewAlertOnMap}
              onBackToDashboard={() => handleSelectTab('OVERVIEW')}
            />
          )}
      </AdminLayout>

      {/* Slide-over Profile Drawer (Careseeker) */}
      {selectedElderForDrawer && (
        <CareseekerDetailDrawer
          elder={selectedElderForDrawer}
          isOpen={Boolean(selectedElderForDrawer)}
          onClose={() => setSelectedElderForDrawer(null)}
          onStatusChange={handleStatusChange}
          onUpdatePreferredHospital={handleUpdatePreferredHospital}
          onUpdateOffer={handleUpdateElderOffer}
        />
      )}

      {/* Slide-over Profile Drawer (Caregiver) */}
      {selectedCaregiverForDrawer && (
        <CaregiverDetailDrawer
          caregiver={selectedCaregiverForDrawer}
          isOpen={Boolean(selectedCaregiverForDrawer)}
          onClose={() => setSelectedCaregiverForDrawer(null)}
          onStatusChange={handleCaregiverStatusChange}
          onReassignCorridor={handleReassignCorridor}
          onViewElder={handleViewElderFromCaregiver}
          onDispatchToSos={handleDispatchCaregiverToSos}
        />
      )}
    </div>
  );
};
