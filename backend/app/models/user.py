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
