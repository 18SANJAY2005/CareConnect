import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class CaregiverKYC(Base):
    __tablename__ = "caregiver_kyc"

    id = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    caregiver_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    # Supported document types: AADHAAR, PAN, PASSPORT, DRIVING_LICENCE, VOTER_ID, OTHER
    document_type = Column(String(50), nullable=False)
    
    # Stored document number (sensitive - masked before serialization)
    document_number = Column(String(100), nullable=True)

    # Secure document storage reference / data URL / upload path
    document_storage_reference = Column(Text, nullable=True)

    # Status: PENDING, VERIFIED, REJECTED
    verification_status = Column(
        String(50),
        nullable=False,
        default="PENDING",
        index=True,
    )
    rejection_reason = Column(Text, nullable=True)

    verified_by_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    verified_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Relationships
    caregiver = relationship("User", foreign_keys=[caregiver_id])
    verified_by = relationship("User", foreign_keys=[verified_by_id])
