# ============================================================
# Phase A — Onboarding & Intake Schemas
# ============================================================

from app.schemas.auth import (
    UserRole,
    SendOtpRequest,
    SendOtpResponse,
    VerifyOtpRequest,
    GoogleAuthRequest,
    UserResponse,
    TokenResponse,
)

from app.schemas.location import (
    LocationVerificationStatus,
    LocationVerifyRequest,
    LocationVerifyResponse,
    ElderLocationPersistRequest,
    ElderLocationResponse,
)

from app.schemas.elder import (
    MobilityLevel,
    PersonaStatus,
    ShiftPreference,
    ElderCreate,
    ElderUpdate,
    ElderResponse,
)

from app.schemas.assessment import (
    AssessmentStatus,
    AssessmentCreate,
    AssessmentResponse,
)


# ============================================================
# Phase B — Matching, Trial & Confirmation Schemas
# ============================================================

from app.schemas.caregiver import (
    CaregiverBase,
    CaregiverResponse,
    CaregiverMatchItem,
    CuratedMatchesResponse,
)

from app.schemas.assignment import (
    AssignmentCreate,
    AssignmentStatusUpdate,
    AssignmentResponse,
)

from app.schemas.call import (
    IntroCallScheduleRequest,
    IntroCallStatusUpdate,
    IntroCallResponse,
)

from app.schemas.payment import (
    PaymentOrderCreate,
    PaymentOrderResponse,
    PaymentVerifyRequest,
    PaymentVerifyResponse,
)

from app.schemas.sla import (
    SLAVersionResponse,
    SLAAcceptanceCreate,
    SLAAcceptanceResponse,
)


# ============================================================
# Phase C — Active Care & Remote Monitoring Schemas
# ============================================================

from app.schemas.shift import (
    CheckInRequest,
    CheckOutRequest,
    SupervisorOverrideRequest,
    ShiftResponse,
    ShiftDetailResponse,
    LiveShiftMonitorItem,
)

from app.schemas.care_log import (
    CareTaskUpdate,
    CareTaskItem,
    BatchSyncTaskRequest,
    TimelineItem,
)

from app.schemas.vital import (
    VitalReadingCreate,
    VitalReadingResponse,
    VitalAlertItem,
)

from app.schemas.incident import (
    SosTriggerRequest,
    IncidentActionRequest,
    IncidentResolveRequest,
    IncidentResponse,
    MediaUploadRequest,
    MediaResponse,
    ChatSendMessageRequest,
    ChatMessageItem,
)


# ============================================================
# Public Schema Exports
# ============================================================

__all__ = [
    # Phase A — Auth
    "UserRole",
    "SendOtpRequest",
    "SendOtpResponse",
    "VerifyOtpRequest",
    "GoogleAuthRequest",
    "UserResponse",
    "TokenResponse",

    # Phase A — Location
    "LocationVerificationStatus",
    "LocationVerifyRequest",
    "LocationVerifyResponse",
    "ElderLocationPersistRequest",
    "ElderLocationResponse",

    # Phase A — Elder Persona
    "MobilityLevel",
    "PersonaStatus",
    "ShiftPreference",
    "ElderCreate",
    "ElderUpdate",
    "ElderResponse",

    # Phase A — Assessment
    "AssessmentStatus",
    "AssessmentCreate",
    "AssessmentResponse",

    # Phase B — Caregiver
    "CaregiverBase",
    "CaregiverResponse",
    "CaregiverMatchItem",
    "CuratedMatchesResponse",

    # Phase B — Assignment
    "AssignmentCreate",
    "AssignmentStatusUpdate",
    "AssignmentResponse",

    # Phase B — Intro Call
    "IntroCallScheduleRequest",
    "IntroCallStatusUpdate",
    "IntroCallResponse",

    # Phase B — Payment
    "PaymentOrderCreate",
    "PaymentOrderResponse",
    "PaymentVerifyRequest",
    "PaymentVerifyResponse",

    # Phase B — SLA
    "SLAVersionResponse",
    "SLAAcceptanceCreate",
    "SLAAcceptanceResponse",

    # Phase C — Shifts & Attendance
    "CheckInRequest",
    "CheckOutRequest",
    "SupervisorOverrideRequest",
    "ShiftResponse",
    "ShiftDetailResponse",
    "LiveShiftMonitorItem",

    # Phase C — Care Tasks
    "CareTaskUpdate",
    "CareTaskItem",
    "BatchSyncTaskRequest",
    "TimelineItem",

    # Phase C — Vitals
    "VitalReadingCreate",
    "VitalReadingResponse",
    "VitalAlertItem",

    # Phase C — Incidents, Media & Chat
    "SosTriggerRequest",
    "IncidentActionRequest",
    "IncidentResolveRequest",
    "IncidentResponse",
    "MediaUploadRequest",
    "MediaResponse",
    "ChatSendMessageRequest",
    "ChatMessageItem",
]