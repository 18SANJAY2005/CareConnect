import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from app.core.database import Base


class UserConsent(Base):
    """
    Authoritative record of user disclosures and consents.
    Tracks consent version, timestamp, purpose, and user action.
    Separates required service-related communications from optional promotional consent.
    """
    __tablename__ = "user_consents"

    id = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    userId = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Consent types: SERVICE_COMMUNICATIONS, PROMOTIONAL_COMMUNICATIONS, TERMS_AND_CONDITIONS, DATA_COLLECTION_DISCLOSURE
    consentType = Column(
        String(50),
        nullable=False,
        index=True,
    )
    granted = Column(
        Boolean,
        nullable=False,
        default=True,
    )
    version = Column(
        String(20),
        nullable=False,
        default="1.0",
    )
    purpose = Column(
        Text,
        nullable=False,
    )
    # User action: SIGNUP_OPT_IN, SIGNUP_OPT_OUT, KYC_SUBMISSION, PROFILE_UPDATE
    userAction = Column(
        String(50),
        nullable=False,
        default="SIGNUP_OPT_IN",
    )
    ipAddress = Column(
        String(50),
        nullable=True,
    )
    userAgent = Column(
        String(255),
        nullable=True,
    )
    createdAt = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updatedAt = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
