from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict

class SosTriggerRequest(BaseModel):
    elderId: str
    shiftId: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    notes: Optional[str] = None
    idempotencyKey: Optional[str] = None

class IncidentActionRequest(BaseModel):
    actionTaken: str

class IncidentResolveRequest(BaseModel):
    resolutionNotes: str

class IncidentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    elderId: str
    shiftId: Optional[str] = None
    reportedById: str
    priority: str
    incidentType: str
    status: str
    title: str
    description: str
    locationCoordinates: Dict[str, Any]
    timeline: List[Dict[str, Any]]
    createdAt: datetime
    acknowledgedAt: Optional[datetime] = None
    resolvedAt: Optional[datetime] = None
    resolutionNotes: Optional[str] = None

class MediaUploadRequest(BaseModel):
    elderId: str
    shiftId: Optional[str] = None
    mediaUrl: str
    mediaType: str = "PHOTO" # PHOTO, VIDEO
    category: str = "GENERAL" # MEAL, ACTIVITY, WALK, HEALTH, GENERAL
    caption: Optional[str] = None

class MediaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    elderId: str
    shiftId: Optional[str] = None
    uploadedById: str
    mediaUrl: str
    mediaType: str
    category: str
    caption: Optional[str] = None
    status: str
    createdAt: datetime

class ChatSendMessageRequest(BaseModel):
    elderId: str
    channel: str = "FAMILY_COORDINATOR" # FAMILY_COORDINATOR, CAREGIVER_COORDINATOR
    content: str
    recipientId: Optional[str] = None

class ChatMessageItem(BaseModel):
    id: str
    elderId: str
    senderId: str
    senderName: str
    senderRole: str
    channel: str
    content: str
    isRead: bool
    createdAt: str

