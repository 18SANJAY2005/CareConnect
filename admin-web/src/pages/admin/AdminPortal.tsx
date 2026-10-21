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
import { AdminHospitalCatalogView } from './views/AdminHospitalCatalogView';
import { AdminPayoutHistoryView } from './views/AdminPayoutHistoryView';
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
    if (hash.includes('hospitals') || hash.includes('hospital')) return 'HOSPITALS';
    if (hash.includes('elders') || hash.includes('careseekers')) return 'ELDERS';
    if (hash.includes('caregivers')) return 'CAREGIVERS';
    if (hash.includes('attendance')) return 'ATTENDANCE';
    if (hash.includes('payouts') || hash.includes('payout')) return 'PAYOUTS';
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
      const results = await Promise.allSettled([
        api.listElders(),
        api.getAllCaregivers(),
        api.getIncidentDesk(),
      ]);

      // 1. Elders
      if (results[0].status === 'fulfilled' && Array.isArray(results[0].value) && results[0].value.length > 0) {
        const liveElders = results[0].value;
        setElders((prev) => {
          // Merge live elders with existing mock elders
          const mappedLive: AdminElderItem[] = liveElders.map((e: any, idx: number) => ({
            id: e.id,
            name: e.name,
            age: e.age || 70,
            gender: e.gender || 'FEMALE',
            dateOfBirth: e.dateOfBirth || '1954-05-15',
            sponsorName: 'Verified Family Contact',
            sponsorPhone: '+91 98400 99881',
            sponsorRelation: 'Primary Sponsor',
            addressLine1: e.location?.addressLine1 || 'Verified Chennai Residence',
            locality: e.location?.locality || 'Adyar',
            city: e.location?.city || 'Chennai',
            postalCode: e.location?.postalCode || '600020',
            latitude: e.location?.latitude || (13.0067 + idx * 0.01),
            longitude: e.location?.longitude || (80.2575 + idx * 0.01),
            assignedCaregiverName: 'Priya Sundaram',
            assignedCaregiverRating: 4.9,
            status: e.personaStatus === 'SAVED' ? 'ACTIVE' : 'PENDING',
            mobilityLevel: e.mobilityLevel || 'CANE_WALKER',
            medicalConditions: e.medicalConditions || ['Hypertension'],
            medicalDevices: e.medicalDevices || [],
            dietaryPreferences: e.dietaryPreferences || ['Vegetarian'],
            languages: e.languages || ['Tamil', 'English'],
            primaryLanguage: e.primaryLanguage || 'Tamil',
            shiftPreference: e.shiftPreference || 'TWELVE_HOUR_DAY_NIGHT',
            dailyRoutine: e.dailyRoutine || { wakeTime: '06:30', bedTime: '21:30' },
            additionalNotes: e.additionalNotes || 'Directly loaded from CareConnect backend.',
            activeShiftStatus: 'ON_DUTY',
            lastVitals: { bp: '126/82', pulse: 76, recordedAt: 'Today, 08:30 AM' },
          }));

          // Deduplicate by ID
          const existingIds = new Set(mappedLive.map((m) => m.id));
          const rest = prev.filter((p) => !existingIds.has(p.id));
          return [...mappedLive, ...rest];
        });
      }

      // 2. Caregivers
      if (results[1].status === 'fulfilled' && Array.isArray(results[1].value) && results[1].value.length > 0) {
        const liveCgs = results[1].value;
        const mappedCgs: AdminCaregiverItem[] = liveCgs.map((cg: any) => ({
          id: String(cg.id),
          userId: cg.userId ? String(cg.userId) : String(cg.id),
          fullName: cg.fullName || cg.full_name || 'Caregiver',
          phone: cg.phone || '+91 98402 11223',
          gender: cg.gender || 'Female',
          rating: cg.rating || 4.8,
          experienceYears: cg.experienceYears || cg.experience_years || 4,
          locality: cg.locality || 'Adyar',
          primaryLanguage: cg.primary_language || 'Tamil',
          languages: Array.isArray(cg.languages) ? cg.languages : [cg.languages || 'Tamil'],
          skills: Array.isArray(cg.skills) ? cg.skills : ['Elder Care', 'Patient Care Assistance'],
          specializations: Array.isArray(cg.specializations) ? cg.specializations : ['Geriatric Care'],
          isBufferPool: Boolean(cg.isBufferPool),
          isPoliceVerified: Boolean(cg.is_police_verified ?? true),
          isClinicalCertified: Boolean(cg.is_clinical_certified ?? true),
          isIdentityVerified: Boolean(cg.isIdentityVerified ?? cg.is_identity_verified ?? (cg.kycStatus === 'VERIFIED')),
          status: cg.status || 'AVAILABLE',
          isProfileComplete: Boolean(cg.isProfileComplete ?? true),
          kycStatus: (cg.kycStatus || (cg.isIdentityVerified ? 'VERIFIED' : 'PENDING')) as any,
          documentType: cg.documentType || 'AADHAAR',
          maskedDocumentNumber: cg.maskedDocumentNumber,
          documentStorageReference: cg.documentStorageReference,
          rejectionReason: cg.rejectionReason,
          kycCreatedAt: cg.kycCreatedAt,
          kycUpdatedAt: cg.kycUpdatedAt,
        }));
        if (mappedCgs.length > 0) {
          setCaregivers((prev) => {
            const liveIds = new Set(mappedCgs.map((c) => c.id));
            const livePhones = new Set(mappedCgs.map((c) => c.phone));
            const rest = prev.filter((p) => !liveIds.has(p.id) && !livePhones.has(p.phone));
            return [...mappedCgs, ...rest];
          });
        }
      }

      // 3. Incidents / SOS
      if (results[2].status === 'fulfilled' && Array.isArray(results[2].value) && results[2].value.length > 0) {
        const liveIncidents = results[2].value;
        setAlerts((currentAlerts) => {
          const resolvedSet = new Set(
            currentAlerts.filter((a) => a.status === 'RESOLVED').map((a) => a.id)
          );
          const mappedAlerts: AdminSosAlert[] = liveIncidents.map((inc: any) => ({
            id: inc.id,
            elderId: inc.elderId || 'eld_unknown',
            elderName: inc.elderName || 'CareConnect Beneficiary',
            elderAge: 75,
            locality: inc.locality || 'Central Chennai',
            postalCode: '600020',
            latitude: inc.locationCoordinates?.latitude || 13.0067,
            longitude: inc.locationCoordinates?.longitude || 80.2575,
            emergencyContact: 'Family Primary Contact',
            emergencyPhone: '+91 98401 23456',
            assignedCaregiver: inc.reportedBy || 'Corridor Care Attendant',
            priority: inc.priority || 'P1',
            status: resolvedSet.has(inc.id)
              ? 'RESOLVED'
              : inc.status === 'RESOLVED'
              ? 'RESOLVED'
              : inc.status === 'ACKNOWLEDGED'
              ? 'DISPATCHED'
              : 'OPEN',
            title: inc.title || 'Emergency Care Alert',
            description: inc.description || 'Emergency notification logged by attendant.',
            triggeredAt: new Date(inc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            resolutionNotes: inc.resolutionNotes,
          }));

          const liveIds = new Set(mappedAlerts.map((m) => m.id));
          const unrepresented = currentAlerts.filter((c) => !liveIds.has(c.id));
          const merged = [...mappedAlerts, ...unrepresented];
          try {
            localStorage.setItem(SOS_STORAGE_KEY, JSON.stringify(merged));
          } catch (e) {
            console.warn('Error saving merged SOS alerts:', e);
          }
          return merged;
        });
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

  // Handle KYC verification / rejection from Admin
  const handleKycStatusChange = useCallback(
    async (
      caregiverId: string,
      newStatus: 'VERIFIED' | 'REJECTED',
      rejectionReason?: string
    ) => {
      const targetCg = caregivers.find(
        (c) => c.id === caregiverId || c.userId === caregiverId
      );
      const targetId = targetCg?.userId || caregiverId;

      const res = await api.updateCaregiverKycStatus(targetId, {
        verification_status: newStatus,
        rejection_reason: rejectionReason,
      });

      setCaregivers((prev) =>
        prev.map((c) => {
          if (c.id === caregiverId || c.userId === caregiverId) {
            return {
              ...c,
              kycStatus: newStatus,
              isIdentityVerified: newStatus === 'VERIFIED',
              rejectionReason: newStatus === 'REJECTED' ? rejectionReason : undefined,
              kycUpdatedAt: new Date().toISOString(),
            };
          }
          return c;
        })
      );

      if (
        selectedCaregiverForDrawer &&
        (selectedCaregiverForDrawer.id === caregiverId ||
          selectedCaregiverForDrawer.userId === caregiverId)
      ) {
        setSelectedCaregiverForDrawer((prev) =>
          prev
            ? {
                ...prev,
                kycStatus: newStatus,
                isIdentityVerified: newStatus === 'VERIFIED',
                rejectionReason: newStatus === 'REJECTED' ? rejectionReason : undefined,
                kycUpdatedAt: new Date().toISOString(),
              }
            : null
        );
      }

      return res;
    },
    [caregivers, selectedCaregiverForDrawer]
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
    <div className="relative h-screen w-full max-w-full overflow-hidden bg-slate-50 text-slate-800">
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
              onSelectCaregiverByName={(cgName) => {
                const found = caregivers.find(
                  (c) => c.fullName.toLowerCase() === cgName.toLowerCase()
                );
                if (found) setSelectedCaregiverForDrawer(found);
              }}
            />
          )}

          {activeTab === 'ELDERS' && (
            <AdminEldersView
              elders={displayedElders}
              onSelectElder={(e) => setSelectedElderForDrawer(e)}
              onStatusChange={handleStatusChange}
              onAddElder={onAddElderFromAdmin}
              onBack={() => handleSelectTab('OVERVIEW')}
            />
          )}

          {activeTab === 'CAREGIVERS' && (
            <AdminCaregiversView
              caregivers={displayedCaregivers}
              onSelectCaregiver={(cg) => setSelectedCaregiverForDrawer(cg)}
              onStatusChange={handleCaregiverStatusChange}
              onKycStatusChange={handleKycStatusChange}
              onBack={() => handleSelectTab('OVERVIEW')}
            />
          )}

          {activeTab === 'ATTENDANCE' && (
            <AdminAttendanceView
              onBack={() => handleSelectTab('OVERVIEW')}
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

          {activeTab === 'PAYOUTS' && (
            <AdminPayoutHistoryView
              onBack={() => handleSelectTab('OVERVIEW')}
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

          {activeTab === 'HOSPITALS' && (
            <AdminHospitalCatalogView
              onBack={() => handleSelectTab('OVERVIEW')}
              onViewOnMap={(lat, lng) => {
                setFocusedCoordinates([lat, lng]);
                handleSelectTab('MAP');
              }}
            />
          )}

          {(activeTab === 'SERVICES_PRICING' || activeTab === 'SERVICES' || activeTab === 'PRICING' || activeTab === 'CARE_PLANS') && (
            <AdminServicesPricingView
              onBack={() => handleSelectTab('OVERVIEW')}
              defaultSubTab={activeTab === 'PRICING' ? 'PRICING' : 'SERVICES'}
            />
          )}

          {activeTab === 'REPORTS' && (
            <AdminReportsView
              onBack={() => handleSelectTab('OVERVIEW')}
            />
          )}

          {(activeTab === 'SETTINGS' || activeTab === 'SETTINGS_ACCESS') && (
            <AdminSettingsView
              onBack={() => handleSelectTab('OVERVIEW')}
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
              onBack={() => handleSelectTab('OVERVIEW')}
            />
          )}

          {activeTab === 'SOS' && (
            <AdminSosPanel
              alerts={displayedAlerts}
              elders={displayedElders}
              onResolveAlert={handleResolveAlert}
              onDispatchSupervisor={handleDispatchSupervisor}
              onViewOnMap={handleViewAlertOnMap}
              onBack={() => handleSelectTab('OVERVIEW')}
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
          onKycStatusChange={handleKycStatusChange}
          onReassignCorridor={handleReassignCorridor}
          onViewElder={handleViewElderFromCaregiver}
          onDispatchToSos={handleDispatchCaregiverToSos}
        />
      )}
    </div>
  );
};
