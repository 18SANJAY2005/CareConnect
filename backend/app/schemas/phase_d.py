from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

# --- Caregiver & Assignment Schemas ---
class CaregiverResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    fullName: str
    phone: str
    gender: str
    rating: float
    experienceYears: int
    languages: List[str]
    specializations: List[str]
    locality: str
    isBufferPool: bool
    status: str
    avatarUrl: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime


class CareAssignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    elderId: str
    caregiverId: str
    familyUserId: str
    shiftType: str
    startDate: datetime
    endDate: Optional[datetime] = None
    status: str
    monthlyRate: float
    caregiver: Optional[CaregiverResponse] = None
    createdAt: datetime
    updatedAt: datetime


# --- D01: Caregiver Replacement Schemas ---
class ReplacementHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    replacementRequestId: str
    oldStatus: Optional[str] = None
    newStatus: str
    changedByUserId: Optional[str] = None
    note: Optional[str] = None
    createdAt: datetime


class ReplacementRequestCreate(BaseModel):
    assignmentId: str
    reasonCode: str = Field(..., description="ILLNESS, ABSENCE, PERFORMANCE, COMMUNICATION, LANGUAGE_OR_CULTURE, SAFETY_CONCERN, CHANGED_CARE_NEEDS, OTHER")
    notes: Optional[str] = None
    priority: str = Field(default="NORMAL", description="LOW, NORMAL, HIGH, URGENT")
    requestedStartAt: Optional[datetime] = None


class ReplacementRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    assignmentId: str
    familyUserId: str
    elderId: str
    currentCaregiverId: str
    substituteCaregiverId: Optional[str] = None
    reasonCode: str
    notes: Optional[str] = None
    priority: str
    requestedStartAt: Optional[datetime] = None
    status: str
    assignedOperationsUserId: Optional[str] = None
    resolutionNotes: Optional[str] = None
    resolvedAt: Optional[datetime] = None
    createdAt: datetime
    updatedAt: datetime
    currentCaregiver: Optional[CaregiverResponse] = None
    substituteCaregiver: Optional[CaregiverResponse] = None
    history: List[ReplacementHistoryResponse] = []


class ReplacementStatusUpdate(BaseModel):
    status: str = Field(..., description="ACKNOWLEDGED, UNDER_REVIEW, REPLACEMENT_SEARCH, ASSIGNED, SCHEDULED, RESOLVED, REJECTED, CANCELLED")
    note: Optional[str] = None
    resolutionNotes: Optional[str] = None


class SubstituteAssignRequest(BaseModel):
    substituteCaregiverId: str
    note: Optional[str] = "Substitute caregiver assigned from Chennai buffer pool"


# --- D02: Feedback & QA Schemas ---
class CareFeedbackCreate(BaseModel):
    assignmentId: str
    caregiverRating: int = Field(..., ge=1, le=5)
    serviceRating: int = Field(..., ge=1, le=5)
    tags: List[str] = Field(default_factory=list)
    comment: Optional[str] = None
    seniorFeedback: Optional[str] = None
    visibility: str = Field(default="PRIVATE_OPS_ONLY")


class CareFeedbackResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    assignmentId: str
    familyUserId: str
    caregiverId: str
    elderId: str
    caregiverRating: int
    serviceRating: int
    tags: List[str]
    comment: Optional[str] = None
    seniorFeedback: Optional[str] = None
    visibility: str
    createdAt: datetime
    updatedAt: datetime


class OperationsIssueResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    sourceType: str
    sourceId: str
    priority: str
    status: str
    ownerUserId: Optional[str] = None
    summary: str
    resolutionNotes: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime
    resolvedAt: Optional[datetime] = None


class OperationsIssueUpdate(BaseModel):
    status: str
    resolutionNotes: Optional[str] = None
    ownerUserId: Optional[str] = None


# --- D03: Billing & Invoicing Schemas ---
class InvoiceLineItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    itemType: str
    description: str
    quantity: int
    unitAmount: float
    amount: float
    itemMetadata: Optional[Dict[str, Any]] = None


class PaymentTransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    invoiceId: str
    provider: str
    providerPaymentId: Optional[str] = None
    amount: float
    currency: str
    status: str
    failureReason: Optional[str] = None
    paidAt: Optional[datetime] = None
    createdAt: datetime


class InvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    invoiceNumber: str
    familyUserId: str
    elderId: str
    assignmentId: Optional[str] = None
    billingPeriodStart: datetime
    billingPeriodEnd: datetime
    subtotal: float
    agencyFee: float
    addonsAmount: float
    taxAmount: float
    discountAmount: float
    totalAmount: float
    currency: str
    dueDate: datetime
    status: str
    providerReference: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime
    lineItems: List[InvoiceLineItemResponse] = []
    transactions: List[PaymentTransactionResponse] = []


class PaymentIntentResponse(BaseModel):
    orderId: str
    amount: float
    currency: str
    keyId: str
    invoiceId: str


class PaymentConfirmRequest(BaseModel):
    razorpayPaymentId: str
    razorpayOrderId: str
    razorpaySignature: str


# --- D04: Renewal & Auto-Debit Schemas ---
class RenewalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    familyUserId: str
    elderId: str
    assignmentId: str
    currentPeriodEnd: datetime
    requestedPeriodStart: datetime
    requestedPeriodEnd: datetime
    amount: float
    currency: str
    status: str
    autoDebitEnabled: bool
    autoDebitMandateId: Optional[str] = None
    mandateStatus: str
    notes: Optional[str] = None
    paymentTransactionId: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime


class RenewalConfirmRequest(BaseModel):
    notes: Optional[str] = None


class MandateToggleRequest(BaseModel):
    enable: bool


class RenewalChangeRequest(BaseModel):
    action: str = Field(..., description="CHANGE_PLAN or CANCEL_SERVICE")
    reason: str
    preferredPlan: Optional[str] = None


# --- Cross-Cutting Schemas ---
class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    actorUserId: Optional[str] = None
    entityType: str
    entityId: str
    action: str
    oldValue: Optional[str] = None
    newValue: Optional[str] = None
    auditMetadata: Optional[Dict[str, Any]] = None
    createdAt: datetime


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    recipientUserId: str
    eventType: str
    referenceType: str
    referenceId: str
    title: str
    message: str
    readAt: Optional[datetime] = None
    createdAt: datetime

