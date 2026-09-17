import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON
from app.core.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    actorUserId = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    entityType = Column(String(50), nullable=False, index=True)  # REPLACEMENT_REQUEST, INVOICE, RENEWAL, FEEDBACK, ASSIGNMENT
    entityId = Column(String(36), nullable=False, index=True)
    action = Column(String(50), nullable=False)                  # CREATED, STATUS_CHANGED, ASSIGNED, RESOLVED, PAID, CONFIRMED
    oldValue = Column(String(100), nullable=True)
    newValue = Column(String(100), nullable=True)
    auditMetadata = Column(JSON, nullable=True, default=dict)
    createdAt = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    recipientUserId = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    eventType = Column(String(50), nullable=False)  # REPLACEMENT_UPDATE, INVOICE_ISSUED, RENEWAL_DUE, PAYMENT_CONFIRMED, ISSUE_RESOLVED
    referenceType = Column(String(50), nullable=False)
    referenceId = Column(String(36), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    readAt = Column(DateTime(timezone=True), nullable=True)
    createdAt = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

