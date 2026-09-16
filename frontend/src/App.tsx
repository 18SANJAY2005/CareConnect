import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { StepIndicator } from './components/StepIndicator';
import { CaregiverDiscovery } from './components/B01_Matching/CaregiverDiscovery';
import { IntroCallScheduler } from './components/B02_Call/IntroCallScheduler';
import { JitsiCallView } from './components/B02_Call/JitsiCallView';
import { PaymentSummary } from './components/B03_Payment/PaymentSummary';
import { SlaAcceptance } from './components/B04_SLA/SlaAcceptance';
import { ServiceConfirmation } from './components/Confirmation/ServiceConfirmation';
import { apiService } from './services/api';
import type {
  CareAssignment,
  CaregiverMatchItem,
  CuratedMatchesResponse,
  IntroCall,
  PaymentOrder,
  PaymentVerifyResponse,
  PhaseBStep,
  SLAAcceptanceResponse,
  SLAVersion,
} from './types';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<PhaseBStep>('matching');
  const [matchesData, setMatchesData] = useState<CuratedMatchesResponse | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<CaregiverMatchItem | null>(null);
  const [assignment, setAssignment] = useState<CareAssignment | null>(null);
  const [introCall, setIntroCall] = useState<IntroCall | null>(null);
  const [isCallInSession, setIsCallInSession] = useState<boolean>(false);
  const [paymentOrder, setPaymentOrder] = useState<PaymentOrder | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentVerifyResponse | null>(null);
  const [slaVersion, setSlaVersion] = useState<SLAVersion | null>(null);
  const [slaResult, setSlaResult] = useState<SLAAcceptanceResponse | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initial Load: Fetch B01 Curated Matches and SLA Version
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [matches, sla] = await Promise.all([
        apiService.getCuratedMatches(1),
        apiService.getCurrentSLA(),
      ]);
      setMatchesData(matches);
      setSlaVersion(sla);
      if (matches.matches.length > 0) {
        setSelectedMatch(matches.matches[0]);
      }
    } catch (err: any) {
      console.error('Failed to load initial data:', err);
      setErrorMessage(
        err.message || 'Unable to connect to CareConnect backend. Please ensure the server is running.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1 -> Step 2: Create Assignment and Proceed to Call Scheduler
  const handleProceedToCall = async () => {
    if (!selectedMatch || !matchesData) return;
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      const newAssignment = await apiService.createAssignment({
        elder_id: matchesData.elder_id,
        caregiver_id: selectedMatch.caregiver.id,
        sponsor_id: 1,
        shift_type: 'Day 10-Hour',
        notes: `Selected from B01 matching with ${selectedMatch.match_percentage}% score.`,
      });
      setAssignment(newAssignment);
      setCurrentStep('call');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create caregiver assignment.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Step 2: Schedule Jitsi Call
  const handleScheduleCall = async (scheduledAt: string, timezone: string, notes: string) => {
    if (!assignment) return;
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      const call = await apiService.scheduleIntroCall({
        assignment_id: assignment.id,
        scheduled_at: scheduledAt,
        timezone,
        call_notes: notes,
      });
      setIntroCall(call);
      setIsCallInSession(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to schedule Jitsi Meet introductory call.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Step 2 -> Step 3: Complete Call and Advance to Payment
  const handleCompleteCall = async () => {
    if (!introCall) return;
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      const completed = await apiService.updateCallStatus(introCall.id, 'COMPLETED');
      setIntroCall(completed);
      setCurrentStep('payment');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record call completion.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Step 3: Initiate Razorpay Order
  const handleInitiatePaymentOrder = async () => {
    if (!assignment) return;
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      const order = await apiService.createPaymentOrder({
        assignment_id: assignment.id,
        sponsor_id: 1,
        base_tier_amount: 14000.0,
        addon_amount: 1000.0,
        currency: 'INR',
      });
      setPaymentOrder(order);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create Razorpay payment order.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Step 3 -> Step 4: Verify Payment & Advance to SLA
  const handlePaymentSuccess = async (paymentId: string, signature: string, method: string) => {
    if (!assignment || !paymentOrder) return;
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      const result = await apiService.verifyPayment({
        assignment_id: assignment.id,
        sponsor_id: 1,
        provider_order_id: paymentOrder.provider_order_id,
        provider_payment_id: paymentId,
        signature,
        payment_method: method,
      });
      setPaymentResult(result);
      setCurrentStep('sla');
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment verification failed.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Step 4 -> Confirmation: Accept SLA and Confirm Service
  const handleAcceptSLA = async (signerName: string, relationship: string) => {
    if (!assignment || !slaVersion) return;
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      const result = await apiService.acceptSLA(assignment.id, {
        sla_version_id: slaVersion.id,
        sponsor_id: 1,
        signer_name: signerName,
        signer_relationship: relationship,
        confirmed_conduct_terms: true,
        confirmed_emergency_liability: true,
        confirmed_dpdp_consent: true,
      });
      setSlaResult(result);
      setCurrentStep('confirmation');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record SLA acceptance.');
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
    setCurrentStep('matching');
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Error Notification */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-error flex items-start space-x-3">
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

        {/* Loading Spinner */}
        {isLoading ? (
          <div className="p-16 text-center">
            <RefreshCw className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-bold font-heading text-on-surface">
              Connecting to CareConnect Platform...
            </h3>
            <p className="text-xs text-on-surface-variant mt-1">
              Synchronizing Phase A elder persona and verified Chennai caregiver pool.
            </p>
          </div>
        ) : (
          <>
            {/* Step Stepper Indicator */}
            <StepIndicator currentStep={currentStep} onSelectStep={setCurrentStep} />

            {/* B01: Curated Matching */}
            {currentStep === 'matching' && matchesData && (
              <CaregiverDiscovery
                matchesData={matchesData}
                selectedMatch={selectedMatch}
                onSelectMatch={(m) => setSelectedMatch(m)}
                onProceedToCall={handleProceedToCall}
              />
            )}

            {/* B02: 10-Min Intro Call */}
            {currentStep === 'call' && selectedMatch && (
              <>
                {!isCallInSession ? (
                  <IntroCallScheduler
                    caregiver={selectedMatch.caregiver}
                    elderName={matchesData?.elder_name || 'Elder'}
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

            {/* B03: Advance Deposit */}
            {currentStep === 'payment' && selectedMatch && (
              <PaymentSummary
                caregiver={selectedMatch.caregiver}
                elderName={matchesData?.elder_name || 'Elder'}
                order={paymentOrder}
                onInitiateOrder={handleInitiatePaymentOrder}
                onPaymentSuccess={handlePaymentSuccess}
                isCreatingOrder={isActionLoading}
              />
            )}

            {/* B04: SLA Acceptance */}
            {currentStep === 'sla' && selectedMatch && slaVersion && (
              <SlaAcceptance
                sla={slaVersion}
                caregiver={selectedMatch.caregiver}
                elderName={matchesData?.elder_name || 'Elder'}
                onAccept={handleAcceptSLA}
                isSubmitting={isActionLoading}
              />
            )}

            {/* Final Confirmation Dashboard */}
            {currentStep === 'confirmation' && selectedMatch && assignment && (
              <ServiceConfirmation
                assignment={assignment}
                caregiver={selectedMatch.caregiver}
                elderName={matchesData?.elder_name || 'Elder'}
                introCall={introCall}
                paymentResult={paymentResult}
                slaResult={slaResult}
                onReset={handleResetFlow}
              />
            )}
          </>
        )}
      </main>

      {/* Footer referencing DPDP Act 2023 */}
      <footer className="bg-surface-card border-t border-outline-light/40 py-6 text-center text-xs text-on-surface-variant">
        <p>© 2026 CareConnect Chennai. All rights reserved.</p>
        <p className="mt-1 text-[11px] text-on-surface-variant/75">
          Regulated under the Digital Personal Data Protection (DPDP) Act 2023. Data stored securely in GCP India (`asia-south1`).
        </p>
      </footer>
    </div>
  );
};
export default App;
