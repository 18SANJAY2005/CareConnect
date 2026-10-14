from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base


class CareAssignment(Base):
    __tablename__ = "care_assignments"

    # ------------------------------------------------------------------
    # Primary key
    # ------------------------------------------------------------------
    # Phase B uses Integer IDs. Keep this unchanged for compatibility.
    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # ------------------------------------------------------------------
    # Existing Phase B fields
    # ------------------------------------------------------------------

    elder_id = Column(
        String(36),
        ForeignKey("elders.id"),
        nullable=False,
    )

    caregiver_id = Column(
        Integer,
        ForeignKey("caregivers.id"),
        nullable=False,
    )

    sponsor_id = Column(
        String(36),
        ForeignKey("users.id"),
        nullable=False,
    )

    shift_type = Column(
        String(100),
        default="Day 10-Hour",
    )

    start_date = Column(
        String(50),
        nullable=True,
    )

    status = Column(
        String(100),
        default="CAREGIVER_SELECTED",
    )

    # Phase B notes
    notes = Column(
        Text,
        nullable=True,
    )

    # ------------------------------------------------------------------
    # Phase D billing compatibility
    # ------------------------------------------------------------------

    monthly_rate = Column(
        Float,
        nullable=False,
        default=22000.0,
    )

    # ------------------------------------------------------------------
    # Assignment offer lifecycle & deadline fields
    # ------------------------------------------------------------------
    responseDeadline = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    declinedReason = Column(
        Text,
        nullable=True,
    )

    declinedAt = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    expiredAt = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ------------------------------------------------------------------
    # Timestamps
    # ------------------------------------------------------------------

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    # ------------------------------------------------------------------
    # Relationships
    # ------------------------------------------------------------------

    caregiver = relationship(
        "Caregiver",
        foreign_keys=[caregiver_id],
    )

    replacementRequests = relationship(
        "ReplacementRequest",
        back_populates="assignment",
        cascade="all, delete-orphan",
    )

    feedbacks = relationship(
        "CareFeedback",
        back_populates="assignment",
        cascade="all, delete-orphan",
    )

    invoices = relationship(
        "Invoice",
        back_populates="assignment",
    )

    # ------------------------------------------------------------------
    # Phase D compatibility properties
    # ------------------------------------------------------------------

    @property
    def elderId(self):
        return self.elder_id

    @elderId.setter
    def elderId(self, value):
        self.elder_id = value

    @property
    def caregiverId(self):
        return self.caregiver_id

    @caregiverId.setter
    def caregiverId(self, value):
        self.caregiver_id = value

    @property
    def familyUserId(self):
        return self.sponsor_id

    @familyUserId.setter
    def familyUserId(self, value):
        self.sponsor_id = value

    @property
    def shiftType(self):
        return self.shift_type

    @shiftType.setter
    def shiftType(self, value):
        self.shift_type = value

    @property
    def startDate(self):
        return self.start_date

    @startDate.setter
    def startDate(self, value):
        if value is None:
            self.start_date = None
        else:
            self.start_date = str(value)

    @property
    def monthlyRate(self):
        return self.monthly_rate

    @monthlyRate.setter
    def monthlyRate(self, value):
        self.monthly_rate = value

    @property
    def createdAt(self):
        return self.created_at

    @property
    def updatedAt(self):
        return self.updated_at