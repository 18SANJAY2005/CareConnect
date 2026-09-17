from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from app.core.database import Base


class CareAssignment(Base):
    __tablename__ = "care_assignments"

    id = Column(Integer, primary_key=True, index=True)
    elder_id = Column(Integer, ForeignKey("elders.id"), nullable=False)
    caregiver_id = Column(Integer, ForeignKey("caregivers.id"), nullable=False)
    sponsor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    shift_type = Column(String(100), default="Day 10-Hour")
    start_date = Column(String(50), nullable=True)  # YYYY-MM-DD
    status = Column(String(100), default="CAREGIVER_SELECTED")
    # Statuses: PENDING_MATCH, CAREGIVER_SELECTED, CALL_SCHEDULED, CALL_COMPLETED,
    # PAYMENT_PENDING, PAYMENT_CONFIRMED, SLA_PENDING, SLA_ACCEPTED, SERVICE_CONFIRMED
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
