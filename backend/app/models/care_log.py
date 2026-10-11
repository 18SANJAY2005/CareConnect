import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base

class CareTask(Base):
    __tablename__ = "care_tasks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    shiftId = Column(String(36), ForeignKey("shifts.id", ondelete="CASCADE"), nullable=False, index=True)
    elderId = Column(String(36), ForeignKey("elders.id", ondelete="CASCADE"), nullable=False, index=True)
    caregiverId = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Time of day: MORNING, AFTERNOON, EVENING, NIGHT
    timeOfDay = Column(String(20), nullable=False, default="MORNING", index=True)
    
    # Category: BATHING, MEAL, MEDICATION_OBSERVATION, WATER_INTAKE, MOBILITY, REPOSITIONING, COGNITIVE, BOWEL_MOVEMENT, NOTES
    category = Column(String(50), nullable=False, index=True)
    taskName = Column(String(255), nullable=False)
    
    # Status: PENDING, COMPLETED, SKIPPED
    status = Column(String(50), nullable=False, default="PENDING", index=True)
    
    # Structured measurements/details e.g. {"waterMl": 250}, {"mealPercent": 85, "mealType": "Breakfast"}
    details = Column(JSON, nullable=False, default=dict)
    notes = Column(Text, nullable=True)
    
    recordedAt = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    idempotencyKey = Column(String(100), nullable=True, unique=True, index=True)
    
    createdAt = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updatedAt = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Supervisor correction workflow fields
    isSupervisorCorrection = Column(Boolean, default=False, nullable=False)
    correctionReason = Column(Text, nullable=True)
    correctedByUserId = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    correctedAt = Column(DateTime(timezone=True), nullable=True)
    originalStatus = Column(String(50), nullable=True)

    # Relationships
    shift = relationship("CareShift", back_populates="tasks")
    elder = relationship("Elder", foreign_keys=[elderId])
    caregiver = relationship("User", foreign_keys=[caregiverId])

