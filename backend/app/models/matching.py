from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from app.core.database import Base


class CaregiverMatchResult(Base):
    __tablename__ = "caregiver_match_results"

    id = Column(Integer, primary_key=True, index=True)
    elder_id = Column(String(36), ForeignKey("elders.id"), nullable=False)
    caregiver_id = Column(Integer, ForeignKey("caregivers.id"), nullable=False)
    match_score = Column(Float, nullable=False)  # 0 to 100
    criteria_snapshot = Column(Text, nullable=True)  # JSON string of matching factors
    rationale = Column(Text, nullable=True)  # Human-readable rationale
    status = Column(String(50), default="ACTIVE")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
