from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.caregiver import CaregiverResponse


class AssignmentCreate(BaseModel):
    elder_id: int
    caregiver_id: int
    sponsor_id: int
    shift_type: str = "Day 10-Hour"
    start_date: Optional[str] = None
    notes: Optional[str] = None


class AssignmentStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None


class AssignmentResponse(BaseModel):
    id: int
    elder_id: int
    caregiver_id: int
    sponsor_id: int
    shift_type: str
    start_date: Optional[str] = None
    status: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    caregiver: Optional[CaregiverResponse] = None

    model_config = ConfigDict(from_attributes=True)

