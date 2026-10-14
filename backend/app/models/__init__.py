from app.models.user import User
from app.models.elder import Elder
from app.models.location import ElderLocation, ServiceInterest
from app.models.assessment import HomeAssessmentRequest

# ============================================================
# Phase B models
# ============================================================

from app.models.caregiver import Caregiver
from app.models.caregiver_kyc import CaregiverKYC
from app.models.matching import CaregiverMatchResult
from app.models.assignment import CareAssignment
from app.models.call import IntroCall
from app.models.payment import PaymentOrder, Payment, PaymentEvent
from app.models.sla import SLAVersion, SLAAcceptance

# ============================================================
# Phase C models
# ============================================================

from app.models.shift import CareShift, AttendanceLog
from app.models.care_log import CareTask
from app.models.vital import VitalReading
from app.models.incident import Incident, CareMedia, ChatMessage

# ============================================================
# Phase D models
# ============================================================

from app.models.replacement import ReplacementRequest, ReplacementStatusHistory
from app.models.feedback import CareFeedback, OperationsIssue
from app.models.billing import Invoice, InvoiceLineItem, PaymentTransaction, BillingAdjustment
from app.models.renewal import Renewal
from app.models.audit import AuditLog, Notification
from app.models.user_consent import UserConsent
from app.models.payout import CaregiverPayout, CaregiverShiftEarning


__all__ = [
    # Phase A
    "User",
    "Elder",
    "ElderLocation",
    "ServiceInterest",
    "HomeAssessmentRequest",

    # Phase B
    "Caregiver",
    "CaregiverMatchResult",
    "CareAssignment",
    "IntroCall",
    "PaymentOrder",
    "Payment",
    "PaymentEvent",
    "SLAVersion",
    "SLAAcceptance",

    # Phase C
    "CareShift",
    "AttendanceLog",
    "CareTask",
    "VitalReading",
    "Incident",
    "CareMedia",
    "ChatMessage",

    # Phase D
    "ReplacementRequest",
    "ReplacementStatusHistory",
    "CareFeedback",
    "OperationsIssue",
    "Invoice",
    "InvoiceLineItem",
    "PaymentTransaction",
    "Renewal",
    "AuditLog",
    "Notification",
    "UserConsent",
    "CaregiverPayout",
    "CaregiverShiftEarning",
]