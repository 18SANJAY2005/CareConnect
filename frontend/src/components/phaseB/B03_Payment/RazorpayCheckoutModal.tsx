import React, { useState } from 'react';
import { X, ShieldCheck, Check, Lock, Smartphone, CreditCard, Building } from 'lucide-react';
import type { PaymentOrder } from '../../../types';

interface RazorpayCheckoutModalProps {
  order: PaymentOrder;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentId: string, signature: string, method: string) => Promise<void>;
}

export const RazorpayCheckoutModal: React.FC<RazorpayCheckoutModalProps> = ({
  order,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [activeMethod, setActiveMethod] = useState<'UPI' | 'CARD' | 'NETBANKING'>('UPI');
  const [upiId, setUpiId] = useState<string>('sponsor@okaxis');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    // Simulate real Razorpay checkout handoff & cryptographic token generation
    setTimeout(async () => {
      const mockPaymentId = `pay_rzp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const mockSignature = `simulated_signature_valid_${order.provider_order_id}`;
      try {
        await onSuccess(mockPaymentId, mockSignature, activeMethod);
      } finally {
        setIsProcessing(false);
      }
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-outline-light/60 overflow-hidden flex flex-col">
        {/* Razorpay Brand Style Header */}
        <div className="bg-[#0c2340] text-white p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-extrabold text-lg text-white">
              ₹
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-bold tracking-tight">Razorpay Checkout</span>
                <span className="text-[10px] uppercase font-bold bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded">
                  Test Sandbox
                </span>
              </div>
              <p className="text-xs text-blue-200">CareConnect Advance Care Deposit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Order Amount Bar */}
        <div className="bg-surface p-4 border-b border-outline-light/30 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-on-surface-variant font-medium block">
              Order Reference:
            </span>
            <code className="text-xs font-mono font-bold text-on-surface">
              {order.provider_order_id}
            </code>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-on-surface-variant font-medium block">Total Payable:</span>
            <span className="text-xl font-extrabold text-primary font-heading">
              ₹{order.amount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="p-6 space-y-5">
          <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant block">
            Select Payment Mode
          </label>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setActiveMethod('UPI')}
              className={`p-3 rounded-xl border text-center flex flex-col items-center justify-center transition-all ${
                activeMethod === 'UPI'
                  ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20'
                  : 'border-outline-light/60 hover:bg-surface text-on-surface'
              }`}
            >
              <Smartphone className="w-5 h-5 mb-1 text-blue-600" />
              <span className="text-xs font-bold">UPI / QR</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMethod('CARD')}
              className={`p-3 rounded-xl border text-center flex flex-col items-center justify-center transition-all ${
                activeMethod === 'CARD'
                  ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20'
                  : 'border-outline-light/60 hover:bg-surface text-on-surface'
              }`}
            >
              <CreditCard className="w-5 h-5 mb-1 text-emerald-600" />
              <span className="text-xs font-bold">Cards</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMethod('NETBANKING')}
              className={`p-3 rounded-xl border text-center flex flex-col items-center justify-center transition-all ${
                activeMethod === 'NETBANKING'
                  ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20'
                  : 'border-outline-light/60 hover:bg-surface text-on-surface'
              }`}
            >
              <Building className="w-5 h-5 mb-1 text-purple-600" />
              <span className="text-xs font-bold">NetBanking</span>
            </button>
          </div>

          {activeMethod === 'UPI' && (
            <div className="p-4 bg-surface rounded-xl border border-outline-light/40 space-y-3">
              <span className="text-xs font-medium text-on-surface block">
                Instant UPI Payment (GPay, PhonePe, Paytm, BHIM):
              </span>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full h-11 px-3 text-sm rounded-lg border border-outline-light bg-white focus:border-blue-600 outline-none"
                placeholder="username@okaxis"
              />
              <p className="text-[11px] text-on-surface-variant flex items-center">
                <Check className="w-3.5 h-3.5 text-tertiary mr-1" />
                Zero transaction fees for UPI handles
              </p>
            </div>
          )}

          {activeMethod === 'CARD' && (
            <div className="p-4 bg-surface rounded-xl border border-outline-light/40 text-xs text-on-surface-variant space-y-2">
              <p className="font-semibold text-on-surface">Supported Cards:</p>
              <p>Visa, MasterCard, RuPay, and NRI International Debit/Credit Cards.</p>
              <p className="text-[11px] text-tertiary font-semibold flex items-center">
                <ShieldCheck className="w-3.5 h-3.5 mr-1" /> 256-bit TLS Tokenized via Razorpay
              </p>
            </div>
          )}

          {activeMethod === 'NETBANKING' && (
            <div className="p-4 bg-surface rounded-xl border border-outline-light/40 text-xs text-on-surface-variant space-y-2">
              <p className="font-semibold text-on-surface">Popular Banks:</p>
              <div className="flex flex-wrap gap-2 text-[11px] font-medium text-on-surface">
                <span className="px-2 py-1 bg-white rounded border">HDFC Bank</span>
                <span className="px-2 py-1 bg-white rounded border">ICICI Bank</span>
                <span className="px-2 py-1 bg-white rounded border">SBI</span>
                <span className="px-2 py-1 bg-white rounded border">Axis Bank</span>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2 text-xs text-on-surface-variant pt-2">
            <Lock className="w-4 h-4 text-tertiary flex-shrink-0" />
            <span>
              Payment is held securely in <strong>CareConnect Escrow</strong> and only disbursed post-trial.
            </span>
          </div>
        </div>

        {/* Action Button: 56px Touch Target */}
        <div className="p-5 bg-surface border-t border-outline-light/30">
          <button
            type="button"
            onClick={handleSimulatePayment}
            disabled={isProcessing}
            className="w-full touch-target-primary rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-heading font-bold text-base shadow-md transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center"
          >
            {isProcessing ? (
              <span>Authenticating with Razorpay Gateway...</span>
            ) : (
              <span>Authorize & Pay ₹{order.amount.toLocaleString('en-IN')}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
