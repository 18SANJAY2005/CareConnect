import React from 'react';
import { AdminServicesView } from './AdminServicesView';

interface AdminServicesPricingViewProps {
  onBackToDashboard?: () => void;
  defaultSubTab?: string;
}

/**
 * Services Catalog View
 * Commercial Pricing and Tariff Matrix have been completely removed from the platform.
 */
export const AdminServicesPricingView: React.FC<AdminServicesPricingViewProps> = ({
  onBackToDashboard,
}) => {
  return (
    <div className="animate-fadeIn">
      <AdminServicesView onBackToDashboard={onBackToDashboard} />
    </div>
  );
};
