import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  AdminTab,
  AdminElderItem,
  AdminCaregiverItem,
  AdminSosAlert,
  AdminMetrics,
} from './types';
import {
  initialAdminElders,
  initialAdminCaregivers,
  initialAdminSosAlerts,
  calculateAdminMetrics,
} from './mockData';
import { AdminSidebar } from './components/AdminSidebar';
import { AdminHeader } from './components/AdminHeader';
import { ElderDetailDrawer } from './components/ElderDetailDrawer';
import { CaregiverDetailDrawer } from './components/CaregiverDetailDrawer';
import { AdminOverviewView } from './views/AdminOverviewView';
import { AdminEldersView } from './views/AdminEldersView';
import { AdminCaregiversView } from './views/AdminCaregiversView';
import { AdminCarePlansView } from './views/AdminCarePlansView';
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
    if (typeof window === 'undefined') return 'OVERVIEW';
    const hash = window.location.hash.toLowerCase();
    if (hash.includes('elders')) return 'ELDERS';
    if (hash.includes('caregivers')) return 'CAREGIVERS';
    if (hash.includes('care-plans') || hash.includes('careplans')) return 'CARE_PLANS';
    if (hash.includes('map')) return 'MAP';
    if (hash.includes('sos')) return 'SOS';
    return 'OVERVIEW';
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
          isIdentityVerified: Boolean(cg.is_identity_verified ?? true),
          status: cg.status || 'AVAILABLE',
          hourlyRate: cg.hourly_rate || 150,
          dailyRate: cg.daily_rate || 1400,
        }));
        if (mappedCgs.length > 0) {
          setCaregivers(mappedCgs);
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
    } catch (err) {
      console.warn('Backend telemetries unavailable, using mock dataset:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadLiveData();
  }, [loadLiveData]);

  // Derived metrics
  const metrics: AdminMetrics = useMemo(() => {
    return calculateAdminMetrics(elders, caregivers, alerts);
  }, [elders, caregivers, alerts]);

  // Status changer for an elder
  const handleStatusChange = (elderId: string, newStatus: 'ACTIVE' | 'PENDING' | 'INACTIVE') => {
    setElders((prev) =>
      prev.map((e) => (e.id === elderId ? { ...e, status: newStatus } : e))
    );
    if (selectedElderForDrawer && selectedElderForDrawer.id === elderId) {
      setSelectedElderForDrawer((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  // Status changer for a caregiver
  const handleCaregiverStatusChange = (
    caregiverId: string,
    newStatus: 'AVAILABLE' | 'ON_DUTY' | 'ON_LEAVE'
  ) => {
    setCaregivers((prev) =>
      prev.map((c) => (c.id === caregiverId ? { ...c, status: newStatus } : c))
    );
    if (selectedCaregiverForDrawer && selectedCaregiverForDrawer.id === caregiverId) {
      setSelectedCaregiverForDrawer((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  // Reassign caregiver corridor
  const handleReassignCaregiverCorridor = (
    caregiverId: string,
    newCorridor: string
  ) => {
    setCaregivers((prev) =>
      prev.map((c) => (c.id === caregiverId ? { ...c, locality: newCorridor } : c))
    );
    if (selectedCaregiverForDrawer && selectedCaregiverForDrawer.id === caregiverId) {
      setSelectedCaregiverForDrawer((prev) => (prev ? { ...prev, locality: newCorridor } : null));
    }
  };

  // View elder profile from caregiver drawer
  const handleViewElderFromCaregiver = (elderName: string, elderId?: string) => {
    setSelectedCaregiverForDrawer(null);
    const targetElder = elders.find((e) => (elderId && e.id === elderId) || e.name === elderName);
    if (targetElder) {
      setSelectedElderForDrawer(targetElder);
    }
  };

  // Dispatch caregiver to SOS
  const handleDispatchCaregiverToSos = (_caregiver: AdminCaregiverItem) => {
    setSelectedCaregiverForDrawer(null);
    handleSelectTab('SOS');
  };

  // SOS Resolution
  const handleResolveAlert = async (alertId: string, resolutionNotes: string) => {
    setAlerts((prev) => {
      const updated = prev.map((a) =>
        a.id === alertId
          ? { ...a, status: 'RESOLVED' as const, resolutionNotes }
          : a
      );
      try {
        localStorage.setItem(SOS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Error saving resolved SOS alerts:', e);
      }
      return updated;
    });
    try {
      await api.resolveIncident(alertId, resolutionNotes);
    } catch {
      // Handled locally
    }
  };

  // Supervisor Dispatch
  const handleDispatchSupervisor = async (
    alertId: string,
    supervisorName: string,
    notes: string
  ) => {
    setAlerts((prev) => {
      const updated = prev.map((a) =>
        a.id === alertId
          ? {
              ...a,
              status: 'DISPATCHED' as const,
              dispatchedSupervisor: supervisorName,
              description: `${a.description} | Directive: ${notes}`,
            }
          : a
      );
      try {
        localStorage.setItem(SOS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Error saving dispatched SOS alerts:', e);
      }
      return updated;
    });
    try {
      await api.escalateIncident(alertId, `Dispatched: ${supervisorName}. Directive: ${notes}`);
    } catch {
      // Handled locally
    }
  };

  // Jump to Map from an Elder or SOS Alert
  const handleViewElderOnMap = (elder: AdminElderItem) => {
    setSelectedElderForDrawer(null);
    setFocusedCoordinates([elder.latitude, elder.longitude]);
    handleSelectTab('MAP');
  };

  const handleViewAlertOnMap = (lat: number, lng: number) => {
    setFocusedCoordinates([lat, lng]);
    handleSelectTab('MAP');
  };

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
    <div className="min-h-screen bg-slate-100/90 text-slate-900 flex antialiased">
      {/* 1. Left Sidebar Navigation */}
      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        openSosCount={metrics.openSosTickets}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* 2. Main Content Canvas */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        {/* Top Header */}
        <AdminHeader
          activeTab={activeTab}
          metrics={metrics}
          isRefreshing={isRefreshing}
          onRefresh={loadLiveData}
          onLogout={handleLogout}
          onNavigateTab={handleSelectTab}
        />

        {/* Viewport Content */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {activeTab === 'OVERVIEW' && (
            <AdminOverviewView
              metrics={metrics}
              elders={elders}
              caregivers={caregivers}
              alerts={alerts}
              onNavigateTab={handleSelectTab}
              onSelectElder={(e) => setSelectedElderForDrawer(e)}
            />
          )}

          {activeTab === 'ELDERS' && (
            <AdminEldersView
              elders={elders}
              onSelectElder={(e) => setSelectedElderForDrawer(e)}
              onStatusChange={handleStatusChange}
              onAddElder={onAddElderFromAdmin}
              onBackToDashboard={() => handleSelectTab('OVERVIEW')}
            />
          )}

          {activeTab === 'CAREGIVERS' && (
            <AdminCaregiversView
              caregivers={caregivers}
              onSelectCaregiver={(cg) => setSelectedCaregiverForDrawer(cg)}
              onStatusChange={handleCaregiverStatusChange}
              onBackToDashboard={() => handleSelectTab('OVERVIEW')}
            />
          )}

          {activeTab === 'CARE_PLANS' && (
            <AdminCarePlansView
              onBackToDashboard={() => handleSelectTab('OVERVIEW')}
            />
          )}

          {activeTab === 'MAP' && (
            <AdminLiveMapView
              elders={elders}
              caregivers={caregivers}
              alerts={alerts}
              focusedCoordinates={focusedCoordinates}
              onSelectElder={(e) => setSelectedElderForDrawer(e)}
              onSelectCaregiver={(cg) => setSelectedCaregiverForDrawer(cg)}
              onBackToDashboard={() => handleSelectTab('OVERVIEW')}
            />
          )}

          {activeTab === 'SOS' && (
            <AdminSosPanel
              alerts={alerts}
              onResolveAlert={handleResolveAlert}
              onDispatchSupervisor={handleDispatchSupervisor}
              onViewOnMap={handleViewAlertOnMap}
              onBackToDashboard={() => handleSelectTab('OVERVIEW')}
            />
          )}
        </main>
      </div>

      {/* Slide-over Profile Drawer (Elder) */}
      <ElderDetailDrawer
        elder={selectedElderForDrawer}
        onClose={() => setSelectedElderForDrawer(null)}
        onStatusChange={handleStatusChange}
        onViewOnMap={handleViewElderOnMap}
      />

      {/* Slide-over Profile Drawer (Caregiver) */}
      <CaregiverDetailDrawer
        caregiver={selectedCaregiverForDrawer}
        onClose={() => setSelectedCaregiverForDrawer(null)}
        onStatusChange={handleCaregiverStatusChange}
        onReassignCorridor={handleReassignCaregiverCorridor}
        onViewElder={handleViewElderFromCaregiver}
        onDispatchToSos={handleDispatchCaregiverToSos}
      />
    </div>
  );
};
