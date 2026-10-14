import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text, Boolean, Integer
from sqlalchemy.orm import relationship

from app.core.database import Base


class CareShift(Base):
    __tablename__ = "shifts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    elderId = Column(
        String(36),
        ForeignKey("elders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    caregiverId = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    shiftType = Column(String(50), nullable=False, default="EIGHT_HOUR_DAY")

    # Statuses:
    # SCHEDULED, CHECKED_IN, ACTIVE, LATE, MISSED, EXCEPTION, CHECKED_OUT
    status = Column(String(50), nullable=False, default="SCHEDULED", index=True)

    scheduledStart = Column(DateTime(timezone=True), nullable=False)
    scheduledEnd = Column(DateTime(timezone=True), nullable=False)

    geofenceRadiusMeters = Column(Float, nullable=False, default=200.0)
    supervisorNotes = Column(Text, nullable=True)

    # Visit Start OTP (sent to CareSeeker, verified by Caregiver at visit start)
    startOtp = Column(String(10), nullable=True)
    startOtpExpiresAt = Column(DateTime(timezone=True), nullable=True)
    startOtpUsed = Column(Boolean, nullable=False, default=False)
    startOtpAttempts = Column(Integer, nullable=False, default=0)

    # Visit Completion OTP (sent to CareSeeker, verified by Caregiver at visit completion)
    completionOtp = Column(String(10), nullable=True)
    completionOtpExpiresAt = Column(DateTime(timezone=True), nullable=True)
    completionOtpUsed = Column(Boolean, nullable=False, default=False)
    completionOtpAttempts = Column(Integer, nullable=False, default=0)

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
    elder = relationship("Elder", foreign_keys=[elderId])
    caregiver = relationship("User", foreign_keys=[caregiverId])

    attendanceLogs = relationship(
        "AttendanceLog",
        back_populates="shift",
        cascade="all, delete-orphan",
        order_by="AttendanceLog.createdAt.desc()",
    )

    tasks = relationship(
        "CareTask",
        back_populates="shift",
        cascade="all, delete-orphan",
    )

    vitals = relationship(
        "VitalReading",
        back_populates="shift",
        cascade="all, delete-orphan",
    )

    media = relationship(
        "CareMedia",
        back_populates="shift",
        cascade="all, delete-orphan",
    )

    incidents = relationship(
        "Incident",
        back_populates="shift",
        cascade="all, delete-orphan",
    )


class AttendanceLog(Base):
    __tablename__ = "attendance_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    shiftId = Column(
        String(36),
        ForeignKey("shifts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    caregiverId = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    checkInTime = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    checkOutTime = Column(DateTime(timezone=True), nullable=True)

    checkInLatitude = Column(Float, nullable=False)
    checkInLongitude = Column(Float, nullable=False)
    checkInDistanceMeters = Column(Float, nullable=False)

    # VERIFIED, OUT_OF_RANGE, SUPERVISOR_OVERRIDE, OTP_OVERRIDE
    verificationStatus = Column(
        String(50),
        nullable=False,
        default="VERIFIED",
        index=True,
    )

    # GPS, HOUSEHOLD_OTP, SUPERVISOR_CALL
    checkInMethod = Column(
        String(50),
        nullable=False,
        default="GPS",
    )

    checkOutLatitude = Column(Float, nullable=True)
    checkOutLongitude = Column(Float, nullable=True)
    checkOutSummary = Column(Text, nullable=True)

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
    shift = relationship(
        "CareShift",
        back_populates="attendanceLogs",
    )

    caregiver = relationship(
        "User",
        foreign_keys=[caregiverId],
    )
