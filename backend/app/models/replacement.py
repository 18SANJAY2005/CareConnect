import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class ReplacementRequest(Base):
    __tablename__ = "replacement_requests"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    assignmentId = Column(String(36), ForeignKey("care_assignments.id", ondelete="CASCADE"), nullable=False, index=True)
    familyUserId = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    elderId = Column(String(36), ForeignKey("elders.id", ondelete="CASCADE"), nullable=False, index=True)
    currentCaregiverId = Column(String(36), ForeignKey("caregivers.id", ondelete="RESTRICT"), nullable=False)
    substituteCaregiverId = Column(String(36), ForeignKey("caregivers.id", ondelete="SET NULL"), nullable=True)

    # Reasons: ILLNESS, ABSENCE, PERFORMANCE, COMMUNICATION, LANGUAGE_OR_CULTURE, SAFETY_CONCERN, CHANGED_CARE_NEEDS, OTHER
    reasonCode = Column(String(50), nullable=False)
    notes = Column(Text, nullable=True)
    priority = Column(String(20), nullable=False, default="NORMAL")  # LOW, NORMAL, HIGH, URGENT
    requestedStartAt = Column(DateTime(timezone=True), nullable=True)

    # Statuses: SUBMITTED, ACKNOWLEDGED, UNDER_REVIEW, REPLACEMENT_SEARCH, ASSIGNED, SCHEDULED, RESOLVED, REJECTED, CANCELLED
    status = Column(String(50), nullable=False, default="SUBMITTED", index=True)

    assignedOperationsUserId = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolutionNotes = Column(Text, nullable=True)
    resolvedAt = Column(DateTime(timezone=True), nullable=True)

    createdAt = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updatedAt = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    assignment = relationship("CareAssignment", back_populates="replacementRequests")
    currentCaregiver = relationship("Caregiver", foreign_keys=[currentCaregiverId])
    substituteCaregiver = relationship("Caregiver", foreign_keys=[substituteCaregiverId])
    history = relationship("ReplacementStatusHistory", back_populates="replacementRequest", cascade="all, delete-orphan", order_by="ReplacementStatusHistory.createdAt")


class ReplacementStatusHistory(Base):
    __tablename__ = "replacement_status_history"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    replacementRequestId = Column(String(36), ForeignKey("replacement_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    oldStatus = Column(String(50), nullable=True)
    newStatus = Column(String(50), nullable=False)
    changedByUserId = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    note = Column(Text, nullable=True)
    createdAt = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationship
    replacementRequest = relationship("ReplacementRequest", back_populates="history")

