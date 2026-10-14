import React from 'react';
import { AdminSettingsAccessView } from './AdminSettingsAccessView';
import type { OpsRole, OperatingSectorScope } from '../types';

interface AdminSettingsViewProps {
  onBackToDashboard?: () => void;
  activeRole?: OpsRole;
  onRoleChange?: (role: OpsRole) => void;
  activeSectorScope?: OperatingSectorScope;
  onSectorScopeChange?: (scope: OperatingSectorScope) => void;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = (props) => {
  return <AdminSettingsAccessView {...props} />;
};

export { AdminTeamAccessView } from './AdminTeamAccessView';

