import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class Caregiver(Base):
    __tablename__ = "caregivers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    fullName = Column(String(255), nullable=False)
    phone = Column(String(30), nullable=False, unique=True, index=True)
    gender = Column(String(20), nullable=False, default="FEMALE")
    rating = Column(Float, nullable=False, default=4.8)
    experienceYears = Column(Integer, nullable=False, default=4)
    languages = Column(JSON, nullable=False, default=lambda: ["Tamil", "English"])
    specializations = Column(JSON, nullable=False, default=lambda: ["Elder Care", "Mobility Assistance", "Vitals Monitoring"])
    locality = Column(String(100), nullable=False, default="Adyar, Chennai")
    isBufferPool = Column(Boolean, nullable=False, default=False)
    status = Column(String(50), nullable=False, default="ON_DUTY")  # AVAILABLE, ON_DUTY, ON_LEAVE
    avatarUrl = Column(String(500), nullable=True)
    
    createdAt = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updatedAt = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    assignments = relationship("CareAssignment", back_populates="caregiver", foreign_keys="CareAssignment.caregiverId")


class CareAssignment(Base):
    __tablename__ = "care_assignments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    elderId = Column(String(36), ForeignKey("elders.id", ondelete="CASCADE"), nullable=False, index=True)
    caregiverId = Column(String(36), ForeignKey("caregivers.id", ondelete="RESTRICT"), nullable=False, index=True)
    familyUserId = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    shiftType = Column(String(50), nullable=False, default="EIGHT_HOUR_DAY")  # EIGHT_HOUR_DAY, TWELVE_HOUR_DAY_NIGHT, TWENTY_FOUR_HOUR_LIVE_IN
    startDate = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    endDate = Column(DateTime(timezone=True), nullable=True)
    
    status = Column(String(50), nullable=False, default="ACTIVE")  # ACTIVE, PAUSED, REPLACED, COMPLETED, CANCELLED
    monthlyRate = Column(Float, nullable=False, default=22000.0)  # INR base caregiver compensation
    
    createdAt = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updatedAt = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    caregiver = relationship("Caregiver", back_populates="assignments", foreign_keys=[caregiverId])
    replacementRequests = relationship("ReplacementRequest", back_populates="assignment", cascade="all, delete-orphan")
    feedbacks = relationship("CareFeedback", back_populates="assignment", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="assignment")

