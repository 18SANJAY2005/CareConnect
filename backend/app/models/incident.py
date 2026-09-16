import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    elderId = Column(String(36), ForeignKey("elders.id", ondelete="CASCADE"), nullable=False, index=True)
    shiftId = Column(String(36), ForeignKey("shifts.id", ondelete="SET NULL"), nullable=True, index=True)
    reportedById = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Priority: P1 (Critical/SOS), P2 (High), P3 (Medium)
    priority = Column(String(10), nullable=False, default="P1", index=True)
    # Type: SOS, MEDICAL, FALL, ABSENCE, OTHER
    incidentType = Column(String(50), nullable=False, default="SOS", index=True)
    # Status: OPEN, ACKNOWLEDGED, ESCALATING, RESOLVED
    status = Column(String(50), nullable=False, default="OPEN", index=True)

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    locationCoordinates = Column(JSON, nullable=True, default=dict)

    acknowledgedById = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    acknowledgedAt = Column(DateTime(timezone=True), nullable=True)

    resolutionNotes = Column(Text, nullable=True)
    resolvedById = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolvedAt = Column(DateTime(timezone=True), nullable=True)

    # Audit Trail: list of [{"timestamp": "...", "actor": "...", "action": "...", "note": "..."}]
    timeline = Column(JSON, nullable=False, default=list)

    createdAt = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    updatedAt = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    shift = relationship("CareAssignment", back_populates="incidents")
    elder = relationship("Elder", foreign_keys=[elderId])
    reportedBy = relationship("User", foreign_keys=[reportedById])


class CareMedia(Base):
    __tablename__ = "care_media"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    elderId = Column(String(36), ForeignKey("elders.id", ondelete="CASCADE"), nullable=False, index=True)
    shiftId = Column(String(36), ForeignKey("shifts.id", ondelete="SET NULL"), nullable=True, index=True)
    uploadedById = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    mediaUrl = Column(String(500), nullable=False)
    mediaType = Column(String(20), nullable=False, default="PHOTO") # PHOTO, VIDEO
    category = Column(String(50), nullable=False, default="GENERAL") # MEAL, ACTIVITY, WALK, HEALTH, GENERAL
    caption = Column(Text, nullable=True)
    
    # APPROVED, PENDING_APPROVAL
    status = Column(String(50), nullable=False, default="APPROVED", index=True)

    createdAt = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    shift = relationship("CareAssignment", back_populates="media")
    elder = relationship("Elder", foreign_keys=[elderId])
    uploadedBy = relationship("User", foreign_keys=[uploadedById])


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    elderId = Column(String(36), ForeignKey("elders.id", ondelete="CASCADE"), nullable=False, index=True)
    senderId = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    recipientId = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    # Channel: FAMILY_COORDINATOR, CAREGIVER_COORDINATOR
    channel = Column(String(50), nullable=False, default="FAMILY_COORDINATOR", index=True)
    content = Column(Text, nullable=False)

    isRead = Column(Boolean, nullable=False, default=False)
    readAt = Column(DateTime(timezone=True), nullable=True)

    createdAt = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    # Relationships
    elder = relationship("Elder", foreign_keys=[elderId])
    sender = relationship("User", foreign_keys=[senderId])

