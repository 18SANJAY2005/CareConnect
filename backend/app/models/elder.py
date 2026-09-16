from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Float
from sqlalchemy.sql import func
from app.core.database import Base


class Elder(Base):
    __tablename__ = "elders"

    id = Column(Integer, primary_key=True, index=True)
    sponsor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    full_name = Column(String(255), nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String(50), nullable=False)
    locality = Column(String(255), nullable=False)  # Chennai localities e.g. Adyar, Anna Nagar, Mylapore
    address = Column(Text, nullable=True)
    primary_language = Column(String(100), default="Tamil")
    secondary_language = Column(String(100), default="English")
    mobility_level = Column(String(100), default="Assisted Walking")  # Independent, Assisted Walking, Wheelchair, Bedridden
    medical_conditions = Column(Text, nullable=True)  # JSON or comma-separated: Dementia, Post-Stroke, Diabetes, Hypertension
    care_tier_needed = Column(String(100), default="Assisted Care")  # Companion, Assisted Care, Intensive Clinical
    shift_preference = Column(String(100), default="Day 10-Hour")  # Day 10-Hour, Night 12-Hour, 24/7 Live-in
    created_at = Column(DateTime(timezone=True), server_default=func.now())

