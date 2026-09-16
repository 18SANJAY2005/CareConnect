from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class CheckInRequest(BaseModel):
    latitude: float
    longitude: float
    overrideCode: Optional[str] = None
    method: str = "GPS"

class CheckOutRequest(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    summary: Optional[str] = None

class SupervisorOverrideRequest(BaseModel):
    reason: str

class ShiftResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    elderId: str
    caregiverId: str
    shiftType: str
    status: str
    scheduledStart: datetime
    scheduledEnd: datetime
    geofenceRadiusMeters: float
    supervisorNotes: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime

class ShiftDetailResponse(BaseModel):
    shift: ShiftResponse
    elderName: str
    locality: str
    caregiverName: str
    elderLatitude: float
    elderLongitude: float
    lastCheckInTime: Optional[str] = None
    distanceMeters: Optional[float] = None
    verificationStatus: Optional[str] = None

class LiveShiftMonitorItem(BaseModel):
    shiftId: str
    status: str
    shiftType: str
    scheduledStart: Optional[str] = None
    scheduledEnd: Optional[str] = None
    elderId: str
    elderName: str
    locality: str
    caregiverId: str
    caregiverName: str
    checkInTime: Optional[str] = None
    distanceMeters: Optional[float] = None
    verificationStatus: Optional[str] = None
    supervisorNotes: Optional[str] = None

