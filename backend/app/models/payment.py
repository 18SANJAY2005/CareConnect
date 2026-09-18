from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from app.core.database import Base


class PaymentOrder(Base):
    __tablename__ = "payment_orders"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("care_assignments.id"), nullable=False)
    sponsor_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    provider_order_id = Column(String(255), unique=True, index=True, nullable=False)
    amount = Column(Float, nullable=False)  # in INR
    currency = Column(String(10), default="INR")
    base_tier_amount = Column(Float, default=14000.0)  # 7-day trial deposit
    addon_amount = Column(Float, default=1000.0)       # medical kit / specialist support
    tax_amount = Column(Float, default=0.0)
    status = Column(String(50), default="CREATED")     # CREATED, ATTEMPTED, PAID, EXPIRED
    receipt = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("care_assignments.id"), nullable=False)
    sponsor_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    provider_order_id = Column(String(255), nullable=False)
    provider_payment_id = Column(String(255), unique=True, index=True, nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR")
    payment_method = Column(String(50), default="UPI")  # UPI, CARD, NETBANKING
    status = Column(String(50), default="CAPTURED")      # CAPTURED, FAILED, REFUNDED
    confirmed_at = Column(DateTime(timezone=True), server_default=func.now())
    signature = Column(String(500), nullable=True)


class PaymentEvent(Base):
    __tablename__ = "payment_events"

    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=True)
    provider_event_id = Column(String(255), unique=True, index=True, nullable=False)
    event_type = Column(String(100), nullable=False)
    payload_hash = Column(String(255), nullable=True)
    received_at = Column(DateTime(timezone=True), server_default=func.now())
