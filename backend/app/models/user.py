import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.orm import relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    # Phase A fields
    role = Column(String(50), nullable=False, default="FAMILY_SPONSOR")
    fullName = Column(String(255), nullable=False)

    phone = Column(String(50), nullable=True, index=True)
    email = Column(String(255), nullable=True, index=True)
    authProvider = Column(
        String(50),
        nullable=False,
        default="PHONE_OTP",
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

    # Phase B compatibility fields
    name = Column(String(255), nullable=True)
    auth_method = Column(
        String(50),
        nullable=True,
        default="whatsapp_otp",
    )
    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    # Personal Information fields
    dob = Column(String(20), nullable=True)
    gender = Column(String(20), nullable=True)
    locality = Column(String(255), nullable=True)
    avatarUrl = Column(String(500), nullable=True)

    # Relationships
    elders = relationship(
        "Elder",
        foreign_keys="Elder.familyId",
        back_populates="family",
        cascade="all, delete-orphan",
    )

    assessments = relationship(
        "HomeAssessmentRequest",
        back_populates="requester",
    )

    @property
    def isProfileComplete(self) -> bool:
        """
        Determines whether the user's required basic profile info is complete.
        For caregivers, requires:
        - Non-empty, non-placeholder full name (min 2 chars)
        - Verified phone number
        - Date of birth (dob)
        - Gender
        For other roles, checks that fullName is set and not empty.
        """
        if not self.fullName or not self.fullName.strip():
            return False
        cleaned = self.fullName.strip().lower()
        if self.role == "CAREGIVER":
            if cleaned in ["", "caregiver", "new caregiver", "pending caregiver", "pending onboarding", "family sponsor"]:
                return False
            if len(self.fullName.strip()) < 2:
                return False
            if not self.dob or not str(self.dob).strip():
                return False
            if not self.gender or not str(self.gender).strip():
                return False
        if not self.phone or not self.phone.strip():
            return False
        return True
