import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    invoiceNumber = Column(String(50), nullable=False, unique=True, index=True)  # e.g., INV-2026-CH-1001
    familyUserId = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    elderId = Column(String(36), ForeignKey("elders.id", ondelete="CASCADE"), nullable=False, index=True)
    assignmentId = Column(Integer, ForeignKey("care_assignments.id", ondelete="SET NULL"), nullable=True, index=True)

    billingPeriodStart = Column(DateTime(timezone=True), nullable=False)
    billingPeriodEnd = Column(DateTime(timezone=True), nullable=False)
    
    # Financials (all in INR by default, trusted backend math)
    subtotal = Column(Float, nullable=False, default=22000.0)      # Base caregiver compensation
    agencyFee = Column(Float, nullable=False, default=3300.0)      # 15% CareConnect management fee
    addonsAmount = Column(Float, nullable=False, default=0.0)      # Consumables, physiotherapy, etc.
    taxAmount = Column(Float, nullable=False, default=4554.0)      # 18% GST on (subtotal + fee + addons)
    discountAmount = Column(Float, nullable=False, default=0.0)
    totalAmount = Column(Float, nullable=False, default=29854.0)   # Total payable
    currency = Column(String(10), nullable=False, default="INR")

    dueDate = Column(DateTime(timezone=True), nullable=False)
    # Statuses: DRAFT, ISSUED, PENDING, PAID, OVERDUE, FAILED, CANCELLED
    status = Column(String(50), nullable=False, default="ISSUED", index=True)

    providerReference = Column(String(100), nullable=True)  # Razorpay order ID or invoice ID

    createdAt = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updatedAt = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    assignment = relationship("CareAssignment", back_populates="invoices")
    lineItems = relationship("InvoiceLineItem", back_populates="invoice", cascade="all, delete-orphan")
    transactions = relationship("PaymentTransaction", back_populates="invoice", cascade="all, delete-orphan")
    adjustments = relationship("BillingAdjustment", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceLineItem(Base):
    __tablename__ = "invoice_line_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    invoiceId = Column(String(36), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # itemType: BASE_CAREGIVER, AGENCY_FEE, ADDON_PHYSIOTHERAPY, ADDON_CONSUMABLES, TAX, DISCOUNT
    itemType = Column(String(50), nullable=False)
    description = Column(String(255), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    unitAmount = Column(Float, nullable=False)
    amount = Column(Float, nullable=False)
    itemMetadata = Column(JSON, nullable=True, default=dict)

    # Relationship
    invoice = relationship("Invoice", back_populates="lineItems")


class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    invoiceId = Column(String(36), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    provider = Column(String(50), nullable=False, default="RAZORPAY")
    providerPaymentId = Column(String(100), nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), nullable=False, default="INR")
    
    # Status: INITIATED, PENDING, SUCCESS, FAILED
    status = Column(String(50), nullable=False, default="INITIATED")
    failureReason = Column(Text, nullable=True)
    paidAt = Column(DateTime(timezone=True), nullable=True)

    createdAt = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updatedAt = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationship
    invoice = relationship("Invoice", back_populates="transactions")


class BillingAdjustment(Base):
    __tablename__ = "billing_adjustments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    invoiceId = Column(String(36), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    elderId = Column(String(36), ForeignKey("elders.id", ondelete="CASCADE"), nullable=False, index=True)
    familyUserId = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    effectiveDate = Column(DateTime(timezone=True), nullable=False)
    serviceChange = Column(String(255), nullable=False)  # e.g., "Added Physiotherapy Add-on", "Removed Night Coverage"
    changeType = Column(String(50), nullable=False)      # "ADDITION" | "REMOVAL"
    adjustmentAmount = Column(Float, nullable=False)     # e.g. +3500.0 or -2000.0
    previousBalance = Column(Float, nullable=False)
    resultingBalance = Column(Float, nullable=False)
    notes = Column(Text, nullable=True)

    createdAt = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationship
    invoice = relationship("Invoice", back_populates="adjustments")

