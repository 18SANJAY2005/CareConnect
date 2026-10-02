import re
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator


VALID_DOCUMENT_TYPES = [
    "AADHAAR",
    "PAN",
    "PASSPORT",
    "DRIVING_LICENCE",
    "VOTER_ID",
    "OTHER",
]

VALID_STATUSES = ["PENDING", "VERIFIED", "REJECTED"]


def mask_document_number(doc_type: str, number: Optional[str]) -> str:
    """Mask sensitive document number to protect PII according to DPDP standards."""
    if not number:
        return "********"
    cleaned = re.sub(r"[\s\-]", "", number)
    if len(cleaned) <= 4:
        return "****"
    
    last4 = cleaned[-4:]
    dtype = (doc_type or "").upper()
    if dtype == "AADHAAR":
        return f"XXXX-XXXX-{last4}"
    elif dtype == "PAN":
        return f"XXXXXX{last4}"
    else:
        return f"{'*' * (len(cleaned) - 4)}{last4}"


class KycSubmitRequest(BaseModel):
    document_type: str
    document_number: str
    document_storage_reference: Optional[str] = None

    @field_validator("document_type")
    @classmethod
    def validate_document_type(cls, v: str) -> str:
        upper = v.upper()
        if upper not in VALID_DOCUMENT_TYPES:
            raise ValueError(
                f"Invalid document type '{v}'. Allowed types: {', '.join(VALID_DOCUMENT_TYPES)}"
            )
        return upper

    @field_validator("document_number")
    @classmethod
    def validate_document_number(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Document number cannot be empty.")
        if len(cleaned) < 4:
            raise ValueError("Document number is too short.")
        return cleaned


class KycStatusUpdateRequest(BaseModel):
    verification_status: str
    rejection_reason: Optional[str] = None

    @field_validator("verification_status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        upper = v.upper()
        if upper not in VALID_STATUSES:
            raise ValueError(f"Status must be one of: {', '.join(VALID_STATUSES)}")
        return upper


class KycResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    caregiver_id: str
    document_type: str
    masked_document_number: str
    document_storage_reference: Optional[str] = None
    verification_status: str
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
