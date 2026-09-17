import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class VitalReading(Base):
    __tablename__ = "vital_readings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    elderId = Column(String(36), ForeignKey("elders.id", ondelete="CASCADE"), nullable=False, index=True)
    shiftId = Column(String(36), ForeignKey("shifts.id", ondelete="SET NULL"), nullable=True, index=True)
    recordedById = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    recordedAt = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    # Cardiovascular
    systolicBp = Column(Integer, nullable=True)     # mmHg
    diastolicBp = Column(Integer, nullable=True)    # mmHg
    pulse = Column(Integer, nullable=True)          # bpm

    # Metabolic
    bloodGlucose = Column(Float, nullable=True)     # mg/dL
    # Context: FASTING, POST_PRANDIAL, RANDOM
    glucoseContext = Column(String(50), nullable=True, default="RANDOM")

    # Thermal
    temperatureCelsius = Column(Float, nullable=True) # Celsius

    # Source: MANUAL, DEVICE_SYNC
    source = Column(String(50), nullable=False, default="MANUAL")

    # Operational Alert Attributes (Never medical diagnoses)
    isAbnormal = Column(Boolean, nullable=False, default=False, index=True)
    # Severity: NORMAL, WARNING, CRITICAL
    alertSeverity = Column(String(20), nullable=False, default="NORMAL", index=True)
    alertMessage = Column(Text, nullable=True)
    
    # Alert Triage by Operations
    alertAcknowledged = Column(Boolean, nullable=False, default=False)
    acknowledgedById = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    acknowledgedAt = Column(DateTime(timezone=True), nullable=True)

    notes = Column(Text, nullable=True)
    idempotencyKey = Column(String(100), nullable=True, unique=True, index=True)

    createdAt = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updatedAt = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    shift = relationship("CareShift", back_populates="vitals")
    elder = relationship("Elder", foreign_keys=[elderId])
    recordedBy = relationship("User", foreign_keys=[recordedById])

