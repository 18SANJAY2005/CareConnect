import React, { useState } from 'react';
import { CreditCard, ShieldCheck, CheckCircle2, ArrowRight, Lock } from 'lucide-react';
import type { Caregiver, PaymentOrder } from '../../../types';
import { RazorpayCheckoutModal } from './RazorpayCheckoutModal';

interface PaymentSummaryProps {
  caregiver: Caregiver;
  elderName: string;
  order: PaymentOrder | null;
  onInitiateOrder: () => Promise<void>;
  onPaymentSuccess: (paymentId: string, signature: string, method: string) => Promise<void>;
  isCreatingOrder: boolean;
}

export const PaymentSummary: React.FC<PaymentSummaryProps> = ({
  caregiver,
  elderName,
  order,
  onInitiateOrder,
  onPaymentSuccess,
  isCreatingOrder,
}) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const handleOpenCheckout = async () => {
    if (!order) {
      await onInitiateOrder();
    }
    setIsModalOpen(true);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
      {/* Title & Caregiver Context */}
      <div className="bg-surface-card p-6 sm:p-8 rounded-2xl border border-outline-light/50 shadow-card">
        <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-5">
          <img
            src={caregiver.photo_url}
            alt={caregiver.full_name}
            className="w-20 h-20 rounded-2xl object-cover border-2 border-primary/20 shadow-sm"
          />
          <div className="flex-1 text-center sm:text-left">
            <span className="inline-flex items-center text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full mb-1">
              <CreditCard className="w-3.5 h-3.5 mr-1" /> Sub-Phase B03: Advance Deposit & Escrow
            </span>
            <h2 className="text-2xl font-extrabold font-heading text-on-surface">
              7-Day Trial Care Deposit
            </h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Assigned to: <strong>{caregiver.full_name}</strong> for <strong>{elderName}</strong>
            </p>
          </div>
        </div>

        {/* Itemized Cost Breakdown */}
        <div className="mt-8 pt-6 border-t border-outline-light/40 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3">
            Itemized Deposit Breakdown
          </h4>

          <div className="flex items-center justify-between text-sm py-1">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-tertiary" />
              <span className="text-on-surface font-medium">
                7-Day In-Home Care Trial (Day 10-Hour Shift @ ₹2,000/day)
              </span>
            </div>
            <span className="font-bold text-on-surface font-heading">₹14,000.00</span>
          </div>

          <div className="flex items-center justify-between text-sm py-1">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-tertiary" />
              <span className="text-on-surface font-medium">
                Clinical Care Manager Supervision & Emergency Kit
              </span>
            </div>
            <span className="font-bold text-on-surface font-heading">₹1,000.00</span>
          </div>

          <div className="flex items-center justify-between text-sm py-1 text-on-surface-variant">
            <div className="flex items-center space-x-2">
              <span className="w-4 h-4" />
              <span>Platform Service Fee & GST</span>
            </div>
            <span className="font-semibold text-tertiary">Waived (Promotional)</span>
          </div>

          <div className="pt-4 mt-2 border-t border-outline-light/40 flex items-center justify-between">
            <div>
              <span className="text-base font-bold text-on-surface font-heading block">
                Total Advance Deposit:
              </span>
              <span className="text-xs text-on-surface-variant">
                Held via Razorpay Route Escrow
              </span>
            </div>
            <div className="text-right">
              <span className="text-3xl font-extrabold text-primary font-heading">
                ₹15,000.00
              </span>
              <span className="text-xs text-tertiary block font-semibold">100% Refund Protected</span>
            </div>
          </div>
        </div>
      </div>

      {/* Escrow & Trust Pillar Card */}
      <div className="bg-surface-container/60 p-5 rounded-2xl border border-outline-light/40 space-y-3">
        <div className="flex items-start space-x-3">
          <ShieldCheck className="w-6 h-6 text-tertiary flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-primary font-heading">
              How CareConnect Escrow Works:
            </h4>
            <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
              Your ₹15,000 deposit is not immediately transferred to the caregiver. It is held securely in an authorized settlement hold via Razorpay. If at any point during the 7-day trial you are dissatisfied or need to cancel, your unutilized balance is refunded directly to your payment source.
            </p>
          </div>
        </div>
      </div>

      {/* 56px Primary Action Button */}
      <div className="bg-surface-card p-6 rounded-2xl border border-outline-light/50 shadow-card flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2 text-xs text-on-surface-variant">
          <Lock className="w-4 h-4 text-tertiary" />
          <span>PCI-DSS compliant via Razorpay. Supports UPI, NetBanking, and NRI Cards.</span>
        </div>

        <button
          type="button"
          onClick={handleOpenCheckout}
          disabled={isCreatingOrder}
          className="touch-target-primary w-full sm:w-auto px-8 rounded-xl bg-primary hover:bg-primary-container text-white font-heading font-bold text-base shadow-md transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center"
        >
          {isCreatingOrder ? (
            <span>Initiating Razorpay Order...</span>
          ) : (
            <>
              <span>Pay Advance Deposit via Razorpay</span>
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </button>
      </div>

      {/* Razorpay Checkout Modal */}
      {order && (
        <RazorpayCheckoutModal
          order={order}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={async (paymentId, sig, method) => {
            setIsModalOpen(false);
            await onPaymentSuccess(paymentId, sig, method);
          }}
        />
      )}
    </div>
  );
};
