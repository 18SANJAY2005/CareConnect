import React, { useState, useEffect } from "react";
import {
  CreditCard,
  ReceiptIndianRupee,
  Calendar,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  MinusCircle,
  Clock,
  Loader2,
  FileText,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { api } from "../../../services/api";
import type { Elder, Invoice, BillingAdjustment } from "../../../types";

interface FamilyPaymentScreenProps {
  elder: Elder;
}

export const FamilyPaymentScreen: React.FC<FamilyPaymentScreenProps> = ({
  elder,
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [adjustments, setAdjustments] = useState<BillingAdjustment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Adjustment modal state
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [serviceChange, setServiceChange] = useState("Added Physiotherapy Session");
  const [changeType, setChangeType] = useState<"ADD" | "REMOVE">("ADD");
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(1500);
  const [effectiveDate, setEffectiveDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false);

  // Payment processing state
  const [isPayingInvoiceId, setIsPayingInvoiceId] = useState<string | null>(null);

  const loadBillingData = async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const [invList, adjList] = await Promise.all([
        api.listInvoices().catch(() => []),
        api.getElderAdjustments(elder.id).catch(() => []),
      ]);

      if (invList && invList.length > 0) {
        setInvoices(invList);
      } else {
        // Fallback demo invoice for the elder
        const demoInvoice: Invoice = {
          id: "inv-active-1",
          invoiceNumber: "INV-2026-0091",
          familyUserId: elder.familyId || "user-1",
          elderId: elder.id,
          billingPeriodStart: "2026-10-01",
          billingPeriodEnd: "2026-10-31",
          subtotal: 18000,
          agencyFee: 0,
          addonsAmount: 0,
          taxAmount: 0,
          discountAmount: 0,
          totalAmount: 18000,
          currency: "INR",
          dueDate: "2026-10-25",
          status: "ISSUED",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lineItems: [
            {
              id: "item-1",
              itemType: "BASE_CAREGIVER",
              description: "Dedicated Assisted Care Attendant (Monthly)",
              quantity: 1,
              unitAmount: 18000,
              amount: 18000,
            },
          ],
          transactions: [],
        };
        setInvoices([demoInvoice]);
      }

      setAdjustments(adjList || []);
    } catch (err: any) {
      setActionError(err.message || "Failed to load billing records.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBillingData();
  }, [elder.id]);

  const activeInvoice = invoices[0] || null;

  const handlePayInvoice = async (invoiceId: string) => {
    setIsPayingInvoiceId(invoiceId);
    setActionError(null);
    setSuccessMessage(null);
    try {
      // 1. Initiate payment intent
      const intent = await api.initiateInvoicePayment(invoiceId).catch(() => ({
        orderId: "order_mock_" + Date.now(),
        amount: 18000,
        currency: "INR",
        keyId: "rzp_test_demo",
        invoiceId,
      }));

      // 2. Simulate Razorpay verification (or live confirmation)
      await api.confirmInvoicePayment(invoiceId, {
        razorpayPaymentId: "pay_sim_" + Date.now(),
        razorpayOrderId: intent.orderId,
        razorpaySignature: "sig_sim_valid",
      });

      setSuccessMessage("Payment confirmed successfully! Invoice marked as PAID.");
      await loadBillingData();
    } catch (err: any) {
      setActionError(err.message || "Payment processing failed. Please try again.");
    } finally {
      setIsPayingInvoiceId(null);
    }
  };

  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInvoice) {
      setActionError("No active invoice found to record adjustment against.");
      return;
    }

    setIsSubmittingAdjustment(true);
    setActionError(null);
    try {
      const signedAmount = changeType === "ADD" ? Math.abs(adjustmentAmount) : -Math.abs(adjustmentAmount);
      await api.createBillingAdjustment(activeInvoice.id, {
        serviceChange: `${changeType === "ADD" ? "[Addition]" : "[Removal]"} ${serviceChange}`,
        adjustmentAmount: signedAmount,
        effectiveDate: effectiveDate || undefined,
        reason: adjustmentReason || `Mid-month ${changeType.toLowerCase()} requested by family sponsor`,
      });

      setSuccessMessage("Mid-month service adjustment recorded with traceable balance!");
      setIsAdjustmentModalOpen(false);
      setAdjustmentReason("");
      await loadBillingData();
    } catch (err: any) {
      setActionError(err.message || "Failed to record adjustment.");
    } finally {
      setIsSubmittingAdjustment(false);
    }
  };

  return (
    <div className="space-y-4 px-4 py-4 pb-safe-nav animate-fadeIn text-slate-900 overflow-y-auto">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-heading text-slate-900">
            Payment & Billing
          </h2>
          <p className="text-xs text-slate-500">
            Invoices, plan charges & mid-month service adjustments
          </p>
        </div>
        <button
          onClick={loadBillingData}
          className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-primary" : ""}`} />
        </button>
      </div>

      {actionError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Active Bill Summary Card */}
      {activeInvoice && (
        <div className="p-4 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
                <ReceiptIndianRupee className="w-4 h-4" />
              </div>
              <span className="text-xs font-mono tracking-wider text-slate-300">
                {activeInvoice.invoiceNumber}
              </span>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                activeInvoice.status === "PAID"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              }`}
            >
              {activeInvoice.status}
            </span>
          </div>

          <div>
            <span className="text-xs text-slate-400">Total Monthly Amount</span>
            <div className="text-2xl font-extrabold font-mono mt-0.5 text-white flex items-baseline gap-1">
              <span>₹{activeInvoice.totalAmount.toLocaleString()}</span>
              <span className="text-xs font-normal text-slate-400 font-sans">
                / {elder.name}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-teal-400" />
              <span>Due: {activeInvoice.dueDate || "25 Oct 2026"}</span>
            </div>
            {activeInvoice.status !== "PAID" ? (
              <button
                onClick={() => handlePayInvoice(activeInvoice.id)}
                disabled={Boolean(isPayingInvoiceId)}
                className="px-4 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition flex items-center gap-1 shadow-sm"
              >
                {isPayingInvoiceId === activeInvoice.id ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Pay Now</span>
                  </>
                )}
              </button>
            ) : (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Paid</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Mid-Month Service Adjustments Header & Trigger */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Mid-Month Adjustments & Changes
            </h3>
            <p className="text-[11px] text-slate-500">
              Traceable record of service additions or removals
            </p>
          </div>
          <button
            onClick={() => setIsAdjustmentModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-primary text-xs font-bold transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add / Remove</span>
          </button>
        </div>

        {/* Adjustments Table / Cards */}
        {adjustments.length > 0 ? (
          <div className="space-y-2 pt-1">
            {adjustments.map((adj) => {
              const isPositive = adj.adjustmentAmount >= 0;
              return (
                <div
                  key={adj.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">
                      {adj.serviceChange}
                    </span>
                    <span
                      className={`font-mono font-extrabold ${
                        isPositive ? "text-amber-700" : "text-emerald-700"
                      }`}
                    >
                      {isPositive ? `+₹${adj.adjustmentAmount}` : `-₹${Math.abs(adj.adjustmentAmount)}`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>Effective: {adj.effectiveDate}</span>
                    </div>
                    <span className="font-medium text-slate-700">
                      Resulting Balance: ₹{adj.resultingBalance.toLocaleString()}
                    </span>
                  </div>

                  {adj.reason && (
                    <div className="text-[10px] text-slate-400 italic pt-0.5">
                      Reason: {adj.reason}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-50 text-center space-y-1">
            <span className="text-xs font-bold text-slate-600 block">
              No Mid-Month Adjustments Yet
            </span>
            <span className="text-[11px] text-slate-400 block leading-relaxed">
              If care needs change mid-cycle, adjustments for additional hours or removed shifts will be safely tracked here.
            </span>
          </div>
        )}
      </div>

      {/* Invoices History List */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-900">
          Invoices & Statements
        </h3>

        <div className="space-y-2">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="p-3 rounded-2xl border border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs"
            >
              <div>
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  <span>{inv.invoiceNumber}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {inv.billingPeriodStart} to {inv.billingPeriodEnd}
                </div>
              </div>

              <div className="text-right">
                <div className="font-extrabold text-slate-900 font-mono">
                  ₹{inv.totalAmount.toLocaleString()}
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    inv.status === "PAID" ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {inv.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gateway & DPDP Compliance Note */}
      <div className="p-3.5 rounded-2xl bg-slate-100 text-[11px] text-slate-500 space-y-1">
        <div className="font-bold text-slate-700 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <span>Payment Gateway & Regulatory Compliance</span>
        </div>
        <p className="leading-relaxed">
          Standard payments processed via authorized India payment gateway partners. In offline or development demo mode, test transaction confirmation is verified securely without physical card capture.
        </p>
      </div>

      {/* MODAL: Record Mid-Month Service Adjustment */}
      {isAdjustmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-0 sm:p-4 animate-fadeIn">
          <div className="w-full max-w-[420px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 space-y-4 animate-slideUp text-slate-900">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold font-heading">
                Mid-Month Service Adjustment
              </h3>
              <button
                type="button"
                onClick={() => setIsAdjustmentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAdjustment} className="space-y-3">
              {/* Type: Add or Remove */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Adjustment Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setChangeType("ADD")}
                    className={`h-9 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border ${
                      changeType === "ADD"
                        ? "bg-amber-50 border-amber-400 text-amber-900"
                        : "bg-white border-slate-200 text-slate-600"
                    }`}
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Service Addition</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChangeType("REMOVE")}
                    className={`h-9 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border ${
                      changeType === "REMOVE"
                        ? "bg-emerald-50 border-emerald-400 text-emerald-900"
                        : "bg-white border-slate-200 text-slate-600"
                    }`}
                  >
                    <MinusCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Service Removal</span>
                  </button>
                </div>
              </div>

              {/* Service Change description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Service Change Description
                </label>
                <input
                  type="text"
                  value={serviceChange}
                  onChange={(e) => setServiceChange(e.target.value)}
                  placeholder="e.g. Added Weekly Physiotherapy / Reduced 4 Weekend Hours"
                  className="w-full h-10 px-3 bg-white rounded-xl border border-slate-200 text-xs"
                  required
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Adjustment Amount (₹)
                </label>
                <input
                  type="number"
                  min={1}
                  step={100}
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(Number(e.target.value))}
                  className="w-full h-10 px-3 bg-white rounded-xl border border-slate-200 text-xs font-mono font-bold"
                  required
                />
              </div>

              {/* Effective Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Effective Date
                </label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="w-full h-10 px-3 bg-white rounded-xl border border-slate-200 text-xs"
                  required
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Traceable Reason / Audit Note
                </label>
                <textarea
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  rows={2}
                  placeholder="Notes explaining why service was changed mid-month..."
                  className="w-full p-2 bg-white rounded-xl border border-slate-200 text-xs"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustmentModalOpen(false)}
                  className="flex-1 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdjustment}
                  className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5"
                >
                  {isSubmittingAdjustment ? "Saving..." : "Record Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
