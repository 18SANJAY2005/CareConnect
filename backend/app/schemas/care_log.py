from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict

class CareTaskUpdate(BaseModel):
    status: str # COMPLETED, SKIPPED, PENDING
    details: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    idempotencyKey: Optional[str] = None

class CareTaskItem(BaseModel):
    id: str
    shiftId: str
    elderId: str
    caregiverId: str
    timeOfDay: str
    category: str
    taskName: str
    status: str
    details: Dict[str, Any]
    notes: Optional[str] = None
    recordedAt: Optional[str] = None

class BatchSyncTaskRequest(BaseModel):
    tasks: List[Dict[str, Any]]

class TimelineItem(BaseModel):
    id: str
    category: str
    taskName: str
    timeOfDay: str
    details: Dict[str, Any]
    notes: Optional[str] = None
    recordedAt: str
    caregiverName: str

