from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict

class VitalReadingCreate(BaseModel):
    elderId: str
    shiftId: Optional[str] = None
    systolicBp: Optional[int] = None
    diastolicBp: Optional[int] = None
    pulse: Optional[int] = None
    bloodGlucose: Optional[float] = None
    glucoseContext: Optional[str] = "RANDOM" # FASTING, POST_PRANDIAL, RANDOM
    temperatureCelsius: Optional[float] = None
    source: str = "MANUAL" # MANUAL, DEVICE_SYNC
    notes: Optional[str] = None
    idempotencyKey: Optional[str] = None

class VitalReadingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    elderId: str
    shiftId: Optional[str] = None
    recordedById: str
    recordedAt: datetime
    systolicBp: Optional[int] = None
    diastolicBp: Optional[int] = None
    pulse: Optional[int] = None
    bloodGlucose: Optional[float] = None
    glucoseContext: Optional[str] = None
    temperatureCelsius: Optional[float] = None
    source: str
    isAbnormal: bool
    alertSeverity: str
    alertMessage: Optional[str] = None
    alertAcknowledged: bool
    notes: Optional[str] = None

class VitalAlertItem(BaseModel):
    id: str
    elderId: str
    elderName: str
    locality: str
    recordedAt: str
    severity: str
    message: Optional[str]
    readings: Dict[str, Any]
    recordedBy: str

