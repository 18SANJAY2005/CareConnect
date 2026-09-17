import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    String,
    Integer,
    DateTime,
    ForeignKey,
    Text,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class ReplacementRequest(Base):
    __tablename__ = "replacement_requests"

    # ============================================================
    # Primary Key
    # ============================================================

    id = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    # ============================================================
    # References
    # ============================================================

    # Phase B CareAssignment.id is Integer
    assignmentId = Column(
        Integer,
        ForeignKey(
            "care_assignments.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    # User.id is UUID String
    familyUserId = Column(
        String(36),
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    # Elder.id is UUID String
    elderId = Column(
        String(36),
        ForeignKey(
            "elders.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    # Phase B Caregiver.id is Integer
    currentCaregiverId = Column(
        Integer,
        ForeignKey(
            "caregivers.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
    )

    # Phase B Caregiver.id is Integer
    substituteCaregiverId = Column(
        Integer,
        ForeignKey(
            "caregivers.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    # ============================================================
    # Replacement Request Details
    # ============================================================

    reasonCode = Column(
        String(50),
        nullable=False,
    )

    notes = Column(
        Text,
        nullable=True,
    )

    # LOW, NORMAL, HIGH, URGENT
    priority = Column(
        String(20),
        nullable=False,
        default="NORMAL",
    )

    requestedStartAt = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ============================================================
    # Replacement Lifecycle
    # ============================================================

    status = Column(
        String(50),
        nullable=False,
        default="SUBMITTED",
        index=True,
    )

    # Operations user is a User UUID
    assignedOperationsUserId = Column(
        String(36),
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    resolutionNotes = Column(
        Text,
        nullable=True,
    )

    resolvedAt = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ============================================================
    # Timestamps
    # ============================================================

    createdAt = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    updatedAt = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # ============================================================
    # Relationships
    # ============================================================

    assignment = relationship(
        "CareAssignment",
        back_populates="replacementRequests",
    )

    currentCaregiver = relationship(
        "Caregiver",
        foreign_keys=[currentCaregiverId],
    )

    substituteCaregiver = relationship(
        "Caregiver",
        foreign_keys=[substituteCaregiverId],
    )

    history = relationship(
        "ReplacementStatusHistory",
        back_populates="replacementRequest",
        cascade="all, delete-orphan",
        order_by="ReplacementStatusHistory.createdAt",
    )


class ReplacementStatusHistory(Base):
    __tablename__ = "replacement_status_history"

    # ============================================================
    # Primary Key
    # ============================================================

    id = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    # ============================================================
    # Replacement Request Reference
    # ============================================================

    replacementRequestId = Column(
        String(36),
        ForeignKey(
            "replacement_requests.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    # ============================================================
    # Status Information
    # ============================================================

    oldStatus = Column(
        String(50),
        nullable=True,
    )

    newStatus = Column(
        String(50),
        nullable=False,
    )

    # User.id is UUID String
    changedByUserId = Column(
        String(36),
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    note = Column(
        Text,
        nullable=True,
    )

    # ============================================================
    # Timestamp
    # ============================================================

    createdAt = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # ============================================================
    # Relationship
    # ============================================================

    replacementRequest = relationship(
        "ReplacementRequest",
        back_populates="history",
    )