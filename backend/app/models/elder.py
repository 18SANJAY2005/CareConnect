import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    String,
    Integer,
    Date,
    DateTime,
    ForeignKey,
    Text,
    JSON,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class Elder(Base):
    __tablename__ = "elders"

    # Primary key remains Phase A UUID
    id = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    # Phase A relationship
    familyId = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Phase A
    name = Column(String(255), nullable=False)

    dateOfBirth = Column(Date, nullable=True)
    age = Column(Integer, nullable=False, default=70)
    gender = Column(String(50), nullable=False, default="FEMALE")
    phoneNumber = Column(String(20), nullable=True)

    locationId = Column(String(36), nullable=True)

    # Phase B compatibility
    sponsor_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    full_name = Column(String(255), nullable=True)
    locality = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)

    primary_language = Column(
        String(100),
        nullable=True,
        default="Tamil",
    )

    secondary_language = Column(
        String(100),
        nullable=True,
        default="English",
    )

    # Phase A clinical/lifestyle persona
    mobilityLevel = Column(
        String(100),
        nullable=False,
        default="INDEPENDENT",
    )

    medicalConditions = Column(
        JSON,
        nullable=False,
        default=list,
    )

    careRequirements = Column(
        JSON,
        nullable=False,
        default=list,
    )

    medicalDevices = Column(
        JSON,
        nullable=False,
        default=list,
    )

    dietaryPreferences = Column(
        JSON,
        nullable=False,
        default=list,
    )

    languages = Column(
        JSON,
        nullable=False,
        default=list,
    )

    primaryLanguage = Column(
        String(100),
        nullable=False,
        default="Tamil",
    )

    lifestylePreferences = Column(
        JSON,
        nullable=False,
        default=list,
    )

    dailyRoutine = Column(
        JSON,
        nullable=True,
        default=dict,
    )

    shiftPreference = Column(
        String(100),
        nullable=False,
        default="EIGHT_HOUR_DAY",
    )

    additionalNotes = Column(
        Text,
        nullable=True,
    )

    personaStatus = Column(
        String(50),
        nullable=False,
        default="DRAFT",
    )

    # Phase B compatibility
    mobility_level = Column(
        String(100),
        nullable=True,
    )

    medical_conditions = Column(
        Text,
        nullable=True,
    )

    care_tier_needed = Column(
        String(100),
        nullable=True,
        default="Assisted Care",
    )

    shift_preference = Column(
        String(100),
        nullable=True,
    )

    createdAt = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    updatedAt = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    family = relationship(
        "User",
        foreign_keys=[familyId],
        back_populates="elders",
    )

    location = relationship(
        "ElderLocation",
        back_populates="elder",
        uselist=False,
        lazy="selectin",
        cascade="all, delete-orphan",
        primaryjoin="Elder.id == foreign(ElderLocation.elderId)",
    )

    assessments = relationship(
        "HomeAssessmentRequest",
        back_populates="elder",
        cascade="all, delete-orphan",
    )
