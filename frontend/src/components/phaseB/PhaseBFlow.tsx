import React, { useEffect, useState } from "react";
import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";

import { StepIndicator } from "./StepIndicator";

import { CaregiverDiscovery } from "./B01_Matching/CaregiverDiscovery";
import { IntroCallScheduler } from "./B02_Call/IntroCallScheduler";
import { JitsiCallView } from "./B02_Call/JitsiCallView";
import { PaymentSummary } from "./B03_Payment/PaymentSummary";
import { SlaAcceptance } from "./B04_SLA/SlaAcceptance";
import { ServiceConfirmation } from "./Confirmation/ServiceConfirmation";

import { api } from "../../services/api";

import type {
  User,
  Elder,
  CareAssignment,
  CaregiverMatchItem,
  CuratedMatchesResponse,
  IntroCall,
  PaymentOrder,
  PaymentVerifyResponse,
  PhaseBStep,
  SLAAcceptanceResponse,
  SLAVersion,
} from "../../types";

interface PhaseBFlowProps {
  user: User;
  elder: Elder;
  onBackToDashboard?: () => void;
}

export const PhaseBFlow: React.FC<PhaseBFlowProps> = ({
  user,
  elder,
  onBackToDashboard,
}) => {
  const [currentStep, setCurrentStep] = useState<PhaseBStep>("matching");

  const [matchesData, setMatchesData] = useState<CuratedMatchesResponse | null>(
    null,
  );

  const [selectedMatch, setSelectedMatch] = useState<CaregiverMatchItem | null>(
    null,
  );

  const [assignment, setAssignment] = useState<CareAssignment | null>(null);

  const [introCall, setIntroCall] = useState<IntroCall | null>(null);

  const [isCallInSession, setIsCallInSession] = useState(false);

  const [paymentOrder, setPaymentOrder] = useState<PaymentOrder | null>(null);

  const [paymentResult, setPaymentResult] =
    useState<PaymentVerifyResponse | null>(null);

  const [slaVersion, setSlaVersion] = useState<SLAVersion | null>(null);

  const [slaResult, setSlaResult] = useState<SLAAcceptanceResponse | null>(
    null,
  );

  const [isLoading, setIsLoading] = useState(true);

  const [isActionLoading, setIsActionLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /*
   * Phase B starts using the real Phase A elder UUID.
   */
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [matches, sla] = await Promise.all([
          api.getCuratedMatches(elder.id),
          api.getCurrentSLA(),
        ]);

        setMatchesData(matches);
        setSlaVersion(sla);

        if (matches.matches.length > 0) {
          setSelectedMatch(matches.matches[0]);
        }
      } catch (err: unknown) {
        console.error("Failed to load Phase B initial data:", err);

        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Unable to connect to the CareConnect backend.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [elder.id]);

  /*
   * B01 -> B02
   *
   * Uses the authenticated sponsor UUID and
   * Phase A elder UUID.
   */
  const handleProceedToCall = async () => {
    if (!selectedMatch || !matchesData) {
      return;
    }

    setIsActionLoading(true);
    setErrorMessage(null);

    try {
      const newAssignment = await api.createAssignment({
        elder_id: elder.id,
        caregiver_id: Number(selectedMatch.caregiver.id),
        sponsor_id: user.id,
        shift_type: elder.shiftPreference,
        notes: `Selected from B01 matching with ${selectedMatch.match_percentage}% score.`,
      });

      setAssignment(newAssignment);
      setCurrentStep("call");
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to create caregiver assignment.",
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  /*
   * B02 — Schedule introductory call
   */
  const handleScheduleCall = async (
    scheduledAt: string,
    timezone: string,
    notes: string,
  ) => {
    if (!assignment) {
      return;
    }

    setIsActionLoading(true);
    setErrorMessage(null);

    try {
      const call = await api.scheduleIntroCall({
        assignment_id: Number(assignment.id),
        scheduled_at: scheduledAt,
        timezone,
        call_notes: notes,
      });

      setIntroCall(call);
      setIsCallInSession(true);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to schedule the introductory call.",
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  /*
   * B02 -> B03
   */
  const handleCompleteCall = async () => {
    if (!introCall) {
      return;
    }

    setIsActionLoading(true);
    setErrorMessage(null);

    try {
      const completed = await api.updateCallStatus(introCall.id, "COMPLETED");

      setIntroCall(completed);
      setCurrentStep("payment");
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to record call completion.",
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  /*
   * B03 — Create Razorpay payment order
   */
  const handleInitiatePaymentOrder = async () => {
    if (!assignment) {
      return;
    }

    setIsActionLoading(true);
    setErrorMessage(null);

    try {
      const order = await api.createPaymentOrder({
        assignment_id: Number(assignment.id),
        sponsor_id: user.id,
        base_tier_amount: 14000,
        addon_amount: 1000,
        currency: "INR",
      });

      setPaymentOrder(order);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to create Razorpay payment order.",
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  /*
   * B03 -> B04
   */
  const handlePaymentSuccess = async (
    paymentId: string,
    signature: string,
    method: string,
  ) => {
    if (!assignment || !paymentOrder) {
      return;
    }

    setIsActionLoading(true);
    setErrorMessage(null);

    try {
      const result = await api.verifyPayment({
        assignment_id: Number(assignment.id),
        sponsor_id: user.id,
        provider_order_id: paymentOrder.provider_order_id,
        provider_payment_id: paymentId,
        signature,
        payment_method: method,
      });

      setPaymentResult(result);
      setCurrentStep("sla");
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Payment verification failed.",
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  /*
   * B04 -> Confirmation
   */
  const handleAcceptSLA = async (signerName: string, relationship: string) => {
    if (!assignment || !slaVersion) {
      return;
    }

    setIsActionLoading(true);
    setErrorMessage(null);

    try {
      const result = await api.acceptSLA(Number(assignment.id), {
        sla_version_id: slaVersion.id,
        sponsor_id: user.id,
        signer_name: signerName,
        signer_relationship: relationship,
        confirmed_conduct_terms: true,
        confirmed_emergency_liability: true,
        confirmed_dpdp_consent: true,
      });

      setSlaResult(result);
      setCurrentStep("confirmation");
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to record SLA acceptance.",
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResetFlow = () => {
    setAssignment(null);
    setIntroCall(null);
    setIsCallInSession(false);
    setPaymentOrder(null);
    setPaymentResult(null);
    setSlaResult(null);
    setCurrentStep("matching");
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {onBackToDashboard && (
        <div className="bg-slate-100 border-b border-slate-200 px-4 sm:px-8 py-2.5 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="flex items-center gap-1.5 font-bold text-teal-800 hover:text-teal-950 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>← Back to Phase A (Dashboard & Intake Summary)</span>
          </button>
          <span className="text-slate-500 text-[11px] hidden sm:inline">
            Phase B: Caregiver Matching & Service Confirmation
          </span>
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />

            <div className="flex-1 text-sm font-medium">{errorMessage}</div>

            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs font-bold uppercase underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="p-16 text-center">
            <RefreshCw className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />

            <h3 className="text-lg font-bold font-heading text-on-surface">
              Connecting to CareConnect Platform...
            </h3>

            <p className="text-xs text-on-surface-variant mt-1">
              Loading caregiver matches for {elder.name}.
            </p>
          </div>
        ) : (
          <>
            <StepIndicator
              currentStep={currentStep}
              onSelectStep={setCurrentStep}
            />

            {currentStep === "matching" && matchesData && (
              <CaregiverDiscovery
                matchesData={matchesData}
                selectedMatch={selectedMatch}
                onSelectMatch={(match) => setSelectedMatch(match)}
                onProceedToCall={handleProceedToCall}
              />
            )}

            {currentStep === "call" && selectedMatch && (
              <>
                {!isCallInSession ? (
                  <IntroCallScheduler
                    caregiver={selectedMatch.caregiver}
                    elderName={elder.name}
                    onSchedule={handleScheduleCall}
                    isSubmitting={isActionLoading}
                  />
                ) : (
                  introCall && (
                    <JitsiCallView
                      introCall={introCall}
                      caregiver={selectedMatch.caregiver}
                      onCompleteCall={handleCompleteCall}
                      onReschedule={() => setIsCallInSession(false)}
                      isCompleting={isActionLoading}
                    />
                  )
                )}
              </>
            )}

            {currentStep === "payment" && selectedMatch && (
              <PaymentSummary
                caregiver={selectedMatch.caregiver}
                elderName={elder.name}
                order={paymentOrder}
                onInitiateOrder={handleInitiatePaymentOrder}
                onPaymentSuccess={handlePaymentSuccess}
                isCreatingOrder={isActionLoading}
              />
            )}

            {currentStep === "sla" && selectedMatch && slaVersion && (
              <SlaAcceptance
                sla={slaVersion}
                caregiver={selectedMatch.caregiver}
                elderName={elder.name}
                onAccept={handleAcceptSLA}
                isSubmitting={isActionLoading}
              />
            )}

            {currentStep === "confirmation" && selectedMatch && assignment && (
              <ServiceConfirmation
                assignment={assignment}
                caregiver={selectedMatch.caregiver}
                elderName={elder.name}
                introCall={introCall}
                paymentResult={paymentResult}
                slaResult={slaResult}
                onReset={handleResetFlow}
                onBackToDashboard={onBackToDashboard}
              />
            )}
          </>
        )}
      </main>

      <footer className="bg-surface-card border-t border-outline-light/40 py-6 text-center text-xs text-on-surface-variant">
        <p>© 2026 CareConnect. All rights reserved.</p>

        <p className="mt-1 text-[11px] text-on-surface-variant/75">
          Data Privacy & Elder Health Data Protection • Encrypted Healthcare
          Infrastructure
        </p>
      </footer>
    </div>
  );
};

export default PhaseBFlow;
