from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime
from sqlalchemy.sql import func
from app.core.database import Base


class Caregiver(Base):
    __tablename__ = "caregivers"

    # Keep Phase B integer primary key
    id = Column(Integer, primary_key=True, index=True)

    # Existing Phase B fields
    full_name = Column(String(255), nullable=False)
    headline = Column(String(255), nullable=False)
    photo_url = Column(String(500), nullable=True)

    experience_years = Column(Integer, default=3)
    locality = Column(String(255), nullable=False)
    service_radius_km = Column(Float, default=15.0)

    primary_language = Column(String(100), default="Tamil")
    languages = Column(String(255), default="Tamil, English")
    skills = Column(
        Text,
        default="Assisted Mobility, Vitals Monitoring, Medication Management",
    )
    specializations = Column(
        Text,
        default="Elder Companion Care",
    )
    shift_types = Column(
        String(255),
        default="Day 10-Hour, Night 12-Hour",
    )

    hourly_rate = Column(Float, default=250.0)
    daily_rate = Column(Float, default=2000.0)

    rating = Column(Float, default=4.9)
    review_count = Column(Integer, default=18)

    is_police_verified = Column(Boolean, default=True)
    is_clinical_certified = Column(Boolean, default=True)
    is_identity_verified = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)

    bio = Column(Text, nullable=True)

    # Phase D compatibility fields
    phone = Column(String(30), nullable=True, unique=True, index=True)
    gender = Column(String(20), nullable=False, default="FEMALE")
    dob = Column(String(20), nullable=True)
    isBufferPool = Column(Boolean, nullable=False, default=False)
    status = Column(String(50), nullable=False, default="AVAILABLE")
    avatarUrl = Column(String(500), nullable=True)
    qualifications = Column(String(500), nullable=True, default=None)

    # Expanded Caregiver Profile fields
    educational_qualifications = Column(Text, nullable=True)
    certifications = Column(Text, nullable=True)
    previous_experience = Column(Text, nullable=True)
    preferred_care_types = Column(Text, nullable=True)
    work_preferences = Column(Text, nullable=True)
    preferred_hours = Column(String(100), nullable=True)
    performance_metrics = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    # ------------------------------------------------------------------
    # Phase D compatibility properties
    # ------------------------------------------------------------------

    @property
    def fullName(self):
        return self.full_name

    @fullName.setter
    def fullName(self, value):
        self.full_name = value

    @property
    def experienceYears(self):
        return self.experience_years

    @experienceYears.setter
    def experienceYears(self, value):
        self.experience_years = value

    @property
    def createdAt(self):
        return self.created_at

    @property
    def updatedAt(self):
        return self.updated_at

    @property
    def languagesList(self):
        if isinstance(self.languages, list):
            return self.languages

        if not self.languages:
            return []

        return [
            item.strip()
            for item in self.languages.split(",")
            if item.strip()
        ]

    @property
    def specializationsList(self):
        if isinstance(self.specializations, list):
            return self.specializations

        if not self.specializations:
            return []

        return [
            item.strip()
            for item in self.specializations.split(",")
            if item.strip()
        ]

    @property
    def avatarUrlValue(self):
        return self.avatarUrl or self.photo_url