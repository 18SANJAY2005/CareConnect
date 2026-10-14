import React from 'react';
import { AdminSidebar } from './components/AdminSidebar';
import { AdminHeader } from './components/AdminHeader';
import type { AdminTab, AdminMetrics, OperatingSectorScope, OpsRole } from './types';

interface AdminLayoutProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  metrics: AdminMetrics;
  isSidebarCollapsed: boolean;
  onToggleCollapse: () => void;
  isRefreshing: boolean;
  onRefresh: () => void;
  onLogout: () => void;
  activeSectorScope?: OperatingSectorScope;
  onSectorScopeChange?: (scope: OperatingSectorScope) => void;
  activeRole?: OpsRole;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  activeTab,
  onSelectTab,
  metrics,
  isSidebarCollapsed,
  onToggleCollapse,
  isRefreshing,
  onRefresh,
  onLogout,
  activeSectorScope,
  onSectorScopeChange,
  activeRole,
  children,
}) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800">
      {/* 1. Left Navigation Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        openSosCount={metrics.openSosTickets}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={onToggleCollapse}
      />

      {/* 2. Main Scrollable Canvas */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navbar */}
        <AdminHeader
          activeTab={activeTab}
          metrics={metrics}
          isRefreshing={isRefreshing}
          onRefresh={onRefresh}
          onLogout={onLogout}
          onNavigateTab={onSelectTab}
          activeSectorScope={activeSectorScope}
          onSectorScopeChange={onSectorScopeChange}
          activeRole={activeRole}
        />

        {/* View Content Canvas */}
        <div className="p-6 flex-1 space-y-6 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

