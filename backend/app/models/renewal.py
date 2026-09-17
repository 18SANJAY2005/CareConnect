import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class Renewal(Base):
    __tablename__ = "renewals"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    familyUserId = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    elderId = Column(String(36), ForeignKey("elders.id", ondelete="CASCADE"), nullable=False, index=True)
    assignmentId = Column(Integer, ForeignKey("care_assignments.id", ondelete="CASCADE"), nullable=False, index=True)

    currentPeriodEnd = Column(DateTime(timezone=True), nullable=False)
    requestedPeriodStart = Column(DateTime(timezone=True), nullable=False)
    requestedPeriodEnd = Column(DateTime(timezone=True), nullable=False)

    amount = Column(Float, nullable=False, default=29854.0)
    currency = Column(String(10), nullable=False, default="INR")

    # Status: PENDING, CONFIRMED, PAYMENT_PENDING, ACTIVE, FAILED, CANCELLED, EXPIRED
    status = Column(String(50), nullable=False, default="PENDING", index=True)

    autoDebitEnabled = Column(Boolean, nullable=False, default=False)
    autoDebitMandateId = Column(String(100), nullable=True)
    # Mandate Status: NOT_CONFIGURED, PENDING, ACTIVE, FAILED
    mandateStatus = Column(String(50), nullable=False, default="NOT_CONFIGURED")

    notes = Column(Text, nullable=True)
    paymentTransactionId = Column(String(36), ForeignKey("payment_transactions.id", ondelete="SET NULL"), nullable=True)

    createdAt = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updatedAt = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    assignment = relationship("CareAssignment")
    paymentTransaction = relationship("PaymentTransaction")

