from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SLAVersionResponse(BaseModel):
    id: int
    version: str
    title: str
    summary: str
    code_of_conduct: str
    notice_periods: str
    emergency_liability: str
    dpdp_compliance_terms: str
    effective_from: datetime

    model_config = ConfigDict(from_attributes=True)


class SLAAcceptanceCreate(BaseModel):
    sla_version_id: int
    sponsor_id: str
    signer_name: str
    signer_relationship: str = "Primary Sponsor / Family"
    confirmed_conduct_terms: bool = True
    confirmed_emergency_liability: bool = True
    confirmed_dpdp_consent: bool = True


class SLAAcceptanceResponse(BaseModel):
    acceptance_id: int
    assignment_id: int
    sla_version: str
    signer_name: str
    status: str
    accepted_at: datetime
    message: str

    model_config = ConfigDict(from_attributes=True)
