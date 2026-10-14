import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship
from app.core.database import Base


class CaregiverPayout(Base):
    """
    Authoritative record of caregiver earnings payouts.
    Persisted, auditable financial records preventing duplicate payout creation
    and duplicate payment processing.
    """
    __tablename__ = "caregiver_payouts"

    id = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    payoutNumber = Column(
        String(50),
        nullable=False,
        unique=True,
        index=True,
    )  # e.g., PAY-2026-CH-1001

    caregiverId = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    periodStart = Column(DateTime(timezone=True), nullable=False)
    periodEnd = Column(DateTime(timezone=True), nullable=False)

    # Financial totals in INR
    totalEarned = Column(Float, nullable=False, default=0.0)
    deductionsAmount = Column(Float, nullable=False, default=0.0)  # TDS, platform fees
    netPayoutAmount = Column(Float, nullable=False, default=0.0)
    currency = Column(String(10), nullable=False, default="INR")

    # Statuses: PENDING, APPROVED, PROCESSING, PAID, REJECTED
    status = Column(
        String(50),
        nullable=False,
        default="PENDING",
        index=True,
    )

    providerReference = Column(String(100), nullable=True)  # Bank UTR / RazorpayX Payout ID
    approvedById = Column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    approvedAt = Column(DateTime(timezone=True), nullable=True)
    paidAt = Column(DateTime(timezone=True), nullable=True)

    notes = Column(Text, nullable=True)

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
    caregiver = relationship("User", foreign_keys=[caregiverId])
    approvedBy = relationship("User", foreign_keys=[approvedById])
    shiftEarnings = relationship(
        "CaregiverShiftEarning",
        back_populates="payout",
        cascade="all, delete-orphan",
    )


class CaregiverShiftEarning(Base):
    """
    Authoritative line item connecting a completed shift to a caregiver earning.
    Guarantees that a completed shift is earned once and reconciles against
    the CareShift and CareAssignment.
    """
    __tablename__ = "caregiver_shift_earnings"

    id = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    caregiverId = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    shiftId = Column(
        String(36),
        ForeignKey("shifts.id", ondelete="SET NULL"),
        nullable=True,
        unique=True,
        index=True,
    )
    assignmentId = Column(
        Integer,
        ForeignKey("care_assignments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    elderId = Column(
        String(36),
        ForeignKey("elders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    shiftDate = Column(DateTime(timezone=True), nullable=False)
    hoursWorked = Column(Float, nullable=False, default=8.0)
    dailyRate = Column(Float, nullable=False, default=2000.0)
    earnedAmount = Column(Float, nullable=False, default=2000.0)

    # Statuses: PENDING, APPROVED, INCLUDED_IN_PAYOUT, PAID
    status = Column(
        String(50),
        nullable=False,
        default="PENDING",
        index=True,
    )

    payoutId = Column(
        String(36),
        ForeignKey("caregiver_payouts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    notes = Column(Text, nullable=True)

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
    payout = relationship("CaregiverPayout", back_populates="shiftEarnings")
    shift = relationship("CareShift", foreign_keys=[shiftId])
    elder = relationship("Elder", foreign_keys=[elderId])
    caregiver = relationship("User", foreign_keys=[caregiverId])
