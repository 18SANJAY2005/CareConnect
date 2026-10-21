import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Boolean, DateTime, Text
from sqlalchemy.sql import func
from app.core.database import Base


class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    name = Column(String(255), nullable=False, index=True)
    address = Column(Text, nullable=False)
    area = Column(String(100), nullable=True)  # Corridor / Neighbourhood (e.g. Adyar, Alwarpet)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    phone = Column(String(50), nullable=False)  # Standard desk contact
    emergency_phone = Column(String(50), nullable=True)  # 24/7 Emergency / Ambulance Hotline
    trauma_level = Column(String(255), nullable=True)  # e.g., "Level 1 Trauma & Comprehensive Cardiology"
    ambulance_available = Column(Boolean, nullable=False, default=True)
    source = Column(String(100), nullable=False, default="CHENNAI_HEALTH_DIRECTORY")
    is_active = Column(Boolean, nullable=False, default=True, index=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
