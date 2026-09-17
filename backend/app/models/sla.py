from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.sql import func
from app.core.database import Base


class SLAVersion(Base):
    __tablename__ = "sla_versions"

    id = Column(Integer, primary_key=True, index=True)
    version = Column(String(50), unique=True, nullable=False)  # e.g., "1.0"
    title = Column(String(255), nullable=False)
    summary = Column(Text, nullable=False)
    code_of_conduct = Column(Text, nullable=False)
    notice_periods = Column(Text, nullable=False)
    emergency_liability = Column(Text, nullable=False)
    dpdp_compliance_terms = Column(Text, nullable=False)
    effective_from = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Integer, default=1)


class SLAAcceptance(Base):
    __tablename__ = "sla_acceptances"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("care_assignments.id"), nullable=False)
    sponsor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sla_version_id = Column(Integer, ForeignKey("sla_versions.id"), nullable=False)
    signer_name = Column(String(255), nullable=False)
    signer_relationship = Column(String(100), default="Primary Sponsor / Family")
    ip_address = Column(String(100), nullable=True)
    accepted_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(50), default="ACCEPTED")
