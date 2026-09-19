import React, { useState, useEffect } from 'react';
import type { Invoice } from '../../types';
import { api } from '../../services/api';
import { 
  ReceiptIndianRupee, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  CreditCard, 
  ShieldCheck, 
  Loader2,
  Calendar
} from 'lucide-react';

export const BillingDashboard: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      const data = await api.listInvoices();
      setInvoices(data);
      if (data.length > 0 && !selectedInvoice) {
        setSelectedInvoice(data[0]);
      } else if (selectedInvoice) {
        const updated = data.find(i => i.id === selectedInvoice.id);
        if (updated) setSelectedInvoice(updated);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load invoices.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handlePay = async () => {
    if (!selectedInvoice) return;
    setIsPaying(true);
    setError(null);
    setPaymentSuccess(false);

    try {
      // 1. Initiate Razorpay order intent
      const intent = await api.initiateInvoicePayment(selectedInvoice.id);

      // 2. Mock Razorpay Checkout confirmation
      setTimeout(async () => {
        try {
          const paidInvoice = await api.confirmInvoicePayment(selectedInvoice.id, {
            razorpayPaymentId: `pay_${Date.now()}`,
            razorpayOrderId: intent.orderId,
            razorpaySignature: 'sig_verified_ok'
          });
          setSelectedInvoice(paidInvoice);
          setPaymentSuccess(true);
          fetchInvoices();
        } catch (err: any) {
          setError(err.message || 'Payment confirmation failed.');
        } finally {
          setIsPaying(false);
        }
      }, 1200);

    } catch (err: any) {
      setError(err.message || 'Failed to initiate payment.');
      setIsPaying(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-teal-700" />
        <span className="text-xs font-semibold">Loading invoices...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
            <ReceiptIndianRupee className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Monthly Billing & Itemized Invoices</h2>
            <p className="text-xs text-slate-500">Transparent CareConnect Fee Breakdown • 18% GST Compliant</p>
          </div>
        </div>

        {selectedInvoice && (
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download / Print Invoice</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {paymentSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <span className="font-bold block text-sm">Payment Successful!</span>
            <span>Your payment has been reconciled. Official tax receipt generated below.</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Invoices List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block px-1">
            Billing Statements ({invoices.length})
          </span>

          {invoices.length === 0 ? (
            <div className="p-6 text-center rounded-2xl bg-white border border-slate-200 text-slate-400 text-xs">
              No invoices issued yet.
            </div>
          ) : (
            invoices.map(inv => {
              const isSelected = selectedInvoice?.id === inv.id;
              const isPaid = inv.status === 'PAID';
              return (
                <button
                  key={inv.id}
                  onClick={() => {
                    setSelectedInvoice(inv);
                    setPaymentSuccess(false);
                  }}
                  className={`w-full p-4 rounded-2xl border text-left transition ${
                    isSelected
                      ? 'bg-teal-50/50 border-teal-700 ring-2 ring-teal-700/20 shadow-sm'
                      : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-bold text-xs text-slate-900 font-mono">{inv.invoiceNumber}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isPaid 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-amber-100 text-amber-900'
                    }`}>
                      {inv.status}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center gap-1 mb-2">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>
                      {new Date(inv.billingPeriodStart).toLocaleDateString([], { month: 'short', day: 'numeric' })} – {new Date(inv.billingPeriodEnd).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  <div className="text-sm font-bold text-slate-900 font-mono">
                    ₹{inv.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Right Column: Invoice Detail & Line Items (8 cols) */}
        <div className="lg:col-span-8">
          {selectedInvoice ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
              
              {/* Invoice Title & Metadata */}
              <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-teal-700">CareConnect Tax Invoice</div>
                  <h3 className="text-xl font-bold text-slate-900 font-mono mt-0.5">{selectedInvoice.invoiceNumber}</h3>
                  <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                    <div>GSTIN: <span className="font-mono text-slate-700">33AAACC1234F1Z5</span> (Tamil Nadu)</div>
                    <div>Due Date: <strong className="text-slate-700">{new Date(selectedInvoice.dueDate).toLocaleDateString([], { dateStyle: 'medium' })}</strong></div>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    selectedInvoice.status === 'PAID'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-900'
                  }`}>
                    {selectedInvoice.status}
                  </span>
                  {selectedInvoice.transactions?.[0]?.providerPaymentId && (
                    <div className="text-[10px] font-mono text-slate-400">
                      Txn: {selectedInvoice.transactions[0].providerPaymentId}
                    </div>
                  )}
                </div>
              </div>

              {/* Itemized Line Items Table */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Itemized Service Charges
                </span>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Description</th>
                        <th className="p-3 text-center">Qty</th>
                        <th className="p-3 text-right">Unit Rate</th>
                        <th className="p-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {selectedInvoice.lineItems.map(item => (
                        <tr key={item.id}>
                          <td className="p-3 font-medium text-slate-900">{item.description}</td>
                          <td className="p-3 text-center text-slate-500">{item.quantity}</td>
                          <td className="p-3 text-right font-mono">₹{item.unitAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="p-3 text-right font-mono font-bold">₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Calculations Box */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Caregiver Base Compensation:</span>
                  <span className="font-mono">₹{selectedInvoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>CareConnect Management & Supervision (15%):</span>
                  <span className="font-mono">₹{selectedInvoice.agencyFee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Goods & Services Tax (GST 18%):</span>
                  <span className="font-mono">₹{selectedInvoice.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900">
                  <span>Total Amount Payable:</span>
                  <span className="font-mono text-base text-teal-900">
                    ₹{selectedInvoice.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Payment Action or Receipt Status */}
              {selectedInvoice.status !== 'PAID' ? (
                <div className="pt-2 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Razorpay 256-bit Encrypted • Supports UPI, Cards, NetBanking</span>
                  </div>

                  <button
                    onClick={handlePay}
                    disabled={isPaying}
                    className="min-h-[52px] px-7 py-3 bg-teal-900 hover:bg-teal-800 text-white font-bold text-xs rounded-xl transition shadow flex items-center gap-2 shrink-0 disabled:opacity-50"
                  >
                    {isPaying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing with Razorpay...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        <span>Pay ₹{selectedInvoice.totalAmount.toLocaleString('en-IN')} Now</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Payment Reconciled via Razorpay Gateway</span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-700">
                    {selectedInvoice.transactions?.[0]?.paidAt 
                      ? new Date(selectedInvoice.transactions[0].paidAt).toLocaleDateString([], { dateStyle: 'medium' })
                      : 'Settled'}
                  </span>
                </div>
              )}

            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 text-slate-400 text-xs">
              Select an invoice from the list to view itemized details.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
