from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class IntroCallScheduleRequest(BaseModel):
    assignment_id: int
    scheduled_at: datetime
    timezone: str = "Asia/Kolkata"
    call_notes: Optional[str] = None


class IntroCallStatusUpdate(BaseModel):
    status: str  # SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
    call_notes: Optional[str] = None


class IntroCallResponse(BaseModel):
    id: int
    assignment_id: int
    provider: str
    room_id: str
    join_url: str
    scheduled_at: datetime
    timezone: str
    duration_minutes: int
    status: str
    provider_reference: Optional[str] = None
    call_notes: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
