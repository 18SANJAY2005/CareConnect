import React, { useState } from 'react';
import { AdminServicesView } from './AdminServicesView';
import { AdminPricingView } from './AdminPricingView';
import { Stethoscope, Calculator } from 'lucide-react';

interface AdminServicesPricingViewProps {
  defaultSubTab?: 'SERVICES' | 'PRICING';
  onBack?: () => void;
}

export const AdminServicesPricingView: React.FC<AdminServicesPricingViewProps> = ({
  defaultSubTab = 'SERVICES',
  onBack,
}) => {
  const [subTab, setSubTab] = useState<'SERVICES' | 'PRICING'>(defaultSubTab);

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* View Switcher Sub-nav */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl w-fit border border-slate-200">
        <button
          onClick={() => setSubTab('SERVICES')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            subTab === 'SERVICES'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Stethoscope className="w-4 h-4 text-teal-600" />
          <span>4 Daily Care Types & Pricing</span>
        </button>

        <button
          onClick={() => setSubTab('PRICING')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            subTab === 'PRICING'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Calculator className="w-4 h-4 text-teal-600" />
          <span>Commercial Tariff Matrix & Simulator</span>
        </button>
      </div>

      {subTab === 'SERVICES' ? (
        <AdminServicesView onBack={onBack} />
      ) : (
        <AdminPricingView
          onBack={onBack}
          onNavigateToServices={() => setSubTab('SERVICES')}
        />
      )}
    </div>
  );
};
