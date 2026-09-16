from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from app.core.database import Base


class IntroCall(Base):
    __tablename__ = "intro_calls"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("care_assignments.id"), nullable=False)
    provider = Column(String(50), default="JITSI")  # Configured provider: JITSI
    room_id = Column(String(255), nullable=False, unique=True)
    join_url = Column(String(500), nullable=False)
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    timezone = Column(String(50), default="Asia/Kolkata")
    duration_minutes = Column(Integer, default=10)
    status = Column(String(50), default="SCHEDULED")  # SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
    provider_reference = Column(String(255), nullable=True)
    call_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

