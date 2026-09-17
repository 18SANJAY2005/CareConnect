import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    String,
    Integer,
    DateTime,
    ForeignKey,
    Text,
    JSON,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class CareFeedback(Base):
    __tablename__ = "care_feedback"

    # Phase D feedback ID remains UUID
    id = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

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

    # Phase B Caregiver.id is Integer
    caregiverId = Column(
        Integer,
        ForeignKey(
            "caregivers.id",
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

    # ------------------------------------------------------------------
    # Ratings
    # ------------------------------------------------------------------

    caregiverRating = Column(
        Integer,
        nullable=False,
    )

    serviceRating = Column(
        Integer,
        nullable=False,
    )

    # Example:
    # ["Punctuality", "Communication", "Care Quality"]
    tags = Column(
        JSON,
        nullable=False,
        default=list,
    )

    comment = Column(
        Text,
        nullable=True,
    )

    # Senior's own feedback/reactions
    seniorFeedback = Column(
        Text,
        nullable=True,
    )

    # PRIVATE_OPS_ONLY or SHARED
    visibility = Column(
        String(50),
        nullable=False,
        default="PRIVATE_OPS_ONLY",
    )

    # ------------------------------------------------------------------
    # Timestamps
    # ------------------------------------------------------------------

    createdAt = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    updatedAt = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # ------------------------------------------------------------------
    # Relationships
    # ------------------------------------------------------------------

    assignment = relationship(
        "CareAssignment",
        back_populates="feedbacks",
    )

    caregiver = relationship(
        "Caregiver",
        foreign_keys=[caregiverId],
    )


class OperationsIssue(Base):
    __tablename__ = "operations_issues"

    # UUID
    id = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    # FEEDBACK, REPLACEMENT, MANUAL
    sourceType = Column(
        String(50),
        nullable=False,
        default="FEEDBACK",
    )

    sourceId = Column(
        String(36),
        nullable=False,
        index=True,
    )

    # LOW, NORMAL, HIGH, URGENT
    priority = Column(
        String(20),
        nullable=False,
        default="NORMAL",
    )

    # OPEN, IN_PROGRESS, WAITING_FOR_FAMILY,
    # WAITING_FOR_OPERATIONS, RESOLVED, CLOSED
    status = Column(
        String(50),
        nullable=False,
        default="OPEN",
        index=True,
    )

    # User.id is UUID String
    ownerUserId = Column(
        String(36),
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    summary = Column(
        String(255),
        nullable=False,
    )

    resolutionNotes = Column(
        Text,
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

    resolvedAt = Column(
        DateTime(timezone=True),
        nullable=True,
    )