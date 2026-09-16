from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime
from sqlalchemy.sql import func
from app.core.database import Base


class Caregiver(Base):
    __tablename__ = "caregivers"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False)
    headline = Column(String(255), nullable=False)
    photo_url = Column(String(500), nullable=True)
    experience_years = Column(Integer, default=3)
    locality = Column(String(255), nullable=False)  # Base locality in Chennai
    service_radius_km = Column(Float, default=15.0)
    primary_language = Column(String(100), default="Tamil")
    languages = Column(String(255), default="Tamil, English")  # Comma-separated
    skills = Column(Text, default="Assisted Mobility, Vitals Monitoring, Medication Management")  # Comma-separated
    specializations = Column(Text, default="Elder Companion Care")  # e.g. Dementia, Stroke Care, Bedridden
    shift_types = Column(String(255), default="Day 10-Hour, Night 12-Hour")
    hourly_rate = Column(Float, default=250.0)  # INR
    daily_rate = Column(Float, default=2000.0)  # INR
    rating = Column(Float, default=4.9)
    review_count = Column(Integer, default=18)
    
    # Verification Status Badges (Sanitized - no government document IDs exposed)
    is_police_verified = Column(Boolean, default=True)
    is_clinical_certified = Column(Boolean, default=True)
    is_identity_verified = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    
    bio = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

