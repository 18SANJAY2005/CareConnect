import React, { useState } from 'react';
import { FileCheck, ShieldCheck, CheckSquare, Square, ArrowRight } from 'lucide-react';
import type { SLAVersion, Caregiver } from '../../../types';

interface SlaAcceptanceProps {
  sla: SLAVersion;
  caregiver: Caregiver;
  elderName: string;
  onAccept: (signerName: string, relationship: string) => Promise<void>;
  isSubmitting: boolean;
}

export const SlaAcceptance: React.FC<SlaAcceptanceProps> = ({
  sla,
  caregiver,
  elderName,
  onAccept,
  isSubmitting,
}) => {
  const [signerName, setSignerName] = useState<string>('');
  const [relationship, setRelationship] = useState<string>('Son (Primary Sponsor)');
  const [agreeConduct, setAgreeConduct] = useState<boolean>(true);
  const [agreeEmergency, setAgreeEmergency] = useState<boolean>(true);
  const [agreeDPDP, setAgreeDPDP] = useState<boolean>(true);

  const canSubmit = agreeConduct && agreeEmergency && agreeDPDP && signerName.trim().length > 2;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onAccept(signerName, relationship);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-surface-card p-6 sm:p-8 rounded-2xl border border-outline-light/50 shadow-card">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-tertiary-light text-tertiary text-xs font-bold uppercase mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Sub-Phase B04: Service Level Agreement Sign-off</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-on-surface">
              {sla.title}
            </h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Binding Service Agreement for caregiver <strong>{caregiver.full_name}</strong> attending to <strong>{elderName}</strong>.
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs text-on-surface-variant block">Agreement Version</span>
            <span className="text-xl font-extrabold font-heading text-primary bg-surface-container px-3 py-1 rounded-lg inline-block mt-1">
              Version {sla.version}
            </span>
          </div>
        </div>
      </div>

      {/* Scrollable Terms Viewer */}
      <div className="bg-surface-card p-6 sm:p-8 rounded-2xl border border-outline-light/50 shadow-card space-y-6">
        <h3 className="text-lg font-bold font-heading text-primary border-b border-outline-light/30 pb-3">
          SLA Terms & Regulatory Standards
        </h3>

        {/* Section 1: Professional Code of Conduct */}
        <div className="p-4 rounded-xl bg-surface border border-outline-light/40 space-y-2">
          <h4 className="text-sm font-bold text-on-surface font-heading flex items-center">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center mr-2">
              1
            </span>
            Professional Code of Conduct & Dignity Standards
          </h4>
          <p className="text-xs text-on-surface-variant leading-relaxed whitespace-pre-line pl-8">
            {sla.code_of_conduct}
          </p>
        </div>

        {/* Section 2: Shift Hours & 48-Hour Notice Policy */}
        <div className="p-4 rounded-xl bg-surface border border-outline-light/40 space-y-2">
          <h4 className="text-sm font-bold text-on-surface font-heading flex items-center">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center mr-2">
              2
            </span>
            48-Hour Notice Policy & 2-Hour Rapid Replacement
          </h4>
          <p className="text-xs text-on-surface-variant leading-relaxed whitespace-pre-line pl-8">
            {sla.notice_periods}
          </p>
        </div>

        {/* Section 3: Emergency Liability & Escalation */}
        <div className="p-4 rounded-xl bg-surface border border-outline-light/40 space-y-2">
          <h4 className="text-sm font-bold text-on-surface font-heading flex items-center">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center mr-2">
              3
            </span>
            Emergency Protocols & Clinical Boundaries
          </h4>
          <p className="text-xs text-on-surface-variant leading-relaxed whitespace-pre-line pl-8">
            {sla.emergency_liability}
          </p>
        </div>

        {/* Section 4: India DPDP Act 2023 Compliance */}
        <div className="p-4 rounded-xl bg-tertiary-light/40 border border-tertiary/20 space-y-2">
          <h4 className="text-sm font-bold text-tertiary font-heading flex items-center">
            <span className="w-6 h-6 rounded-full bg-tertiary text-white text-xs flex items-center justify-center mr-2">
              4
            </span>
            India DPDP Act 2023 Compliance & Elder Health Data Protection
          </h4>
          <p className="text-xs text-on-surface-variant leading-relaxed whitespace-pre-line pl-8">
            {sla.dpdp_compliance_terms}
          </p>
        </div>
      </div>

      {/* Explicit Digital Acceptance Form */}
      <form onSubmit={handleSubmit} className="bg-surface-card p-6 sm:p-8 rounded-2xl border border-outline-light/50 shadow-card space-y-6">
        <h3 className="text-lg font-bold font-heading text-on-surface border-b border-outline-light/30 pb-3">
          Digital Sign-off & Audit Acknowledgement
        </h3>

        {/* Mandatory Checkbox 1: Code of Conduct */}
        <div
          onClick={() => setAgreeConduct(!agreeConduct)}
          className="flex items-start space-x-3 p-3 rounded-xl hover:bg-surface cursor-pointer select-none transition-colors"
        >
          <div className="mt-0.5 text-primary">
            {agreeConduct ? (
              <CheckSquare className="w-5 h-5 text-primary" />
            ) : (
              <Square className="w-5 h-5 text-outline" />
            )}
          </div>
          <span className="text-xs sm:text-sm text-on-surface leading-normal">
            I have reviewed and agree to the <strong>Caregiver Code of Conduct</strong> and understand clinical boundaries regarding oral medications.
          </span>
        </div>

        {/* Mandatory Checkbox 2: Emergency Protocols */}
        <div
          onClick={() => setAgreeEmergency(!agreeEmergency)}
          className="flex items-start space-x-3 p-3 rounded-xl hover:bg-surface cursor-pointer select-none transition-colors"
        >
          <div className="mt-0.5 text-primary">
            {agreeEmergency ? (
              <CheckSquare className="w-5 h-5 text-primary" />
            ) : (
              <Square className="w-5 h-5 text-outline" />
            )}
          </div>
          <span className="text-xs sm:text-sm text-on-surface leading-normal">
            I acknowledge the <strong>Emergency Escalation Protocol (108 Ambulance + Care Manager alert)</strong> and the 48-hour schedule change notice terms.
          </span>
        </div>

        {/* Mandatory Checkbox 3: India DPDP Act 2023 */}
        <div
          onClick={() => setAgreeDPDP(!agreeDPDP)}
          className="flex items-start space-x-3 p-3 rounded-xl hover:bg-surface cursor-pointer select-none transition-colors"
        >
          <div className="mt-0.5 text-primary">
            {agreeDPDP ? (
              <CheckSquare className="w-5 h-5 text-primary" />
            ) : (
              <Square className="w-5 h-5 text-outline" />
            )}
          </div>
          <span className="text-xs sm:text-sm text-on-surface leading-normal">
            I grant explicit consent under <strong>India's Digital Personal Data Protection (DPDP) Act 2023</strong> for caregiver check-in geofencing and encrypted vitals logging in GCP India (`asia-south1`).
          </span>
        </div>

        {/* Signer Identity Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-outline-light/30">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
              Signer Legal Full Name:
            </label>
            <input
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              required
              className="w-full h-12 px-3 rounded-xl border border-outline-light focus:border-primary bg-surface font-semibold text-sm outline-none"
              placeholder="e.g. Ramesh Krishnan"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
              Relationship to Elder:
            </label>
            <input
              type="text"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              required
              className="w-full h-12 px-3 rounded-xl border border-outline-light focus:border-primary bg-surface font-semibold text-sm outline-none"
              placeholder="e.g. Son / Primary Sponsor"
            />
          </div>
        </div>

        {/* 56px Action Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className="w-full touch-target-primary rounded-xl bg-primary hover:bg-primary-container text-white font-heading font-bold text-base shadow-md transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSubmitting ? (
              <span>Recording Immutable SLA Acceptance...</span>
            ) : (
              <>
                <FileCheck className="w-5 h-5 mr-2 text-emerald-300" />
                <span>Sign SLA & Confirm Care Service (v{sla.version})</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
