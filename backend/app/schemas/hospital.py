from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


class HospitalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    name: str
    address: str
    area: Optional[str] = None
    latitude: float
    longitude: float
    phone: str
    emergencyPhone: Optional[str] = Field(default=None, alias="emergency_phone")
    traumaLevel: Optional[str] = Field(default=None, alias="trauma_level")
    ambulanceAvailable: bool = Field(default=True, alias="ambulance_available")
    source: str = "DEMO_CORRIDOR_SEED_PENDING_REGULATORY_VALIDATION"
    verificationStatus: str = "PENDING_REGULATORY_VALIDATION"
    isActive: bool = Field(default=True, alias="is_active")
    createdAt: Optional[datetime] = Field(default=None, alias="created_at")
    updatedAt: Optional[datetime] = Field(default=None, alias="updated_at")


class NearbyHospitalItem(BaseModel):
    id: str
    name: str
    address: str
    area: Optional[str] = None
    locality: Optional[str] = None
    latitude: float
    longitude: float
    phone: str
    emergencyPhone: str
    distanceKm: float
    etaMins: Optional[int] = None
    traumaLevel: Optional[str] = None
    ambulanceAvailable: bool = True
    source: str = "DEMO_CORRIDOR_SEED_PENDING_REGULATORY_VALIDATION"
    verificationStatus: str = "PENDING_REGULATORY_VALIDATION"
    isActive: bool = True


class SelectPreferredHospitalRequest(BaseModel):
    hospitalId: Optional[str] = None


class PreferredHospitalDetailsResponse(BaseModel):
    elderId: str
    elderName: str
    preferredHospital: Optional[HospitalResponse] = None
    hasPreferredHospital: bool = False
    residenceCoordinates: Optional[dict] = None
    nearbyHospitals: List[NearbyHospitalItem] = []
    universalEmergencyNumbers: List[dict] = [
        {"service": "National Emergency Ambulance", "number": "108", "type": "AMBULANCE", "isUniversal": True},
        {"service": "Police & All-in-One Emergency", "number": "112", "type": "POLICE_DISASTER", "isUniversal": True},
        {"service": "District Disaster Helpline", "number": "1077", "type": "DISTRICT", "isUniversal": True},
    ]
