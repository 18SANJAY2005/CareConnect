import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class CareFeedback(Base):
    __tablename__ = "care_feedback"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    assignmentId = Column(String(36), ForeignKey("care_assignments.id", ondelete="CASCADE"), nullable=False, index=True)
    familyUserId = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    caregiverId = Column(String(36), ForeignKey("caregivers.id", ondelete="CASCADE"), nullable=False, index=True)
    elderId = Column(String(36), ForeignKey("elders.id", ondelete="CASCADE"), nullable=False, index=True)

    caregiverRating = Column(Integer, nullable=False)  # 1 to 5
    serviceRating = Column(Integer, nullable=False)    # 1 to 5
    tags = Column(JSON, nullable=False, default=list)   # ["Punctuality", "Communication", "Care Quality", "Professionalism", "Reliability"]
    comment = Column(Text, nullable=True)
    seniorFeedback = Column(Text, nullable=True)        # Senior's own quotes/reactions captured
    visibility = Column(String(50), nullable=False, default="PRIVATE_OPS_ONLY")  # PRIVATE_OPS_ONLY, SHARED

    createdAt = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updatedAt = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    assignment = relationship("CareAssignment", back_populates="feedbacks")
    caregiver = relationship("Caregiver")


class OperationsIssue(Base):
    __tablename__ = "operations_issues"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sourceType = Column(String(50), nullable=False, default="FEEDBACK")  # FEEDBACK, REPLACEMENT, MANUAL
    sourceId = Column(String(36), nullable=False, index=True)
    priority = Column(String(20), nullable=False, default="NORMAL")       # LOW, NORMAL, HIGH, URGENT
    status = Column(String(50), nullable=False, default="OPEN", index=True)  # OPEN, IN_PROGRESS, WAITING_FOR_FAMILY, WAITING_FOR_OPERATIONS, RESOLVED, CLOSED
    ownerUserId = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    summary = Column(String(255), nullable=False)
    resolutionNotes = Column(Text, nullable=True)
    createdAt = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updatedAt = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    resolvedAt = Column(DateTime(timezone=True), nullable=True)

