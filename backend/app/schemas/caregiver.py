from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class CaregiverBase(BaseModel):
    full_name: str
    headline: str
    photo_url: Optional[str] = None
    experience_years: int
    locality: str
    service_radius_km: float = 15.0
    primary_language: str
    languages: str
    skills: str
    specializations: str
    shift_types: str
    hourly_rate: float
    daily_rate: float
    rating: float
    review_count: int
    is_police_verified: bool = True
    is_clinical_certified: bool = True
    is_identity_verified: bool = True
    bio: Optional[str] = None


class CaregiverResponse(CaregiverBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class CaregiverMatchItem(BaseModel):
    caregiver: CaregiverResponse
    match_score: float
    match_percentage: int
    rationale: str
    matching_skills: List[str]
    matching_languages: List[str]
    locality_match: bool


class CuratedMatchesResponse(BaseModel):
    elder_id: str
    elder_name: str
    elder_locality: str
    required_care_tier: str
    total_candidates: int
    matches: List[CaregiverMatchItem]


class CaregiverEligibilityResponse(BaseModel):
    isProfileComplete: bool
    kycStatus: str
    rejectionReason: Optional[str] = None
    isAvailable: bool
    caregiverStatus: str
    isEligibleForWork: bool
    eligibilityState: str
    message: str


class CaregiverAvailabilityRequest(BaseModel):
    isAvailable: bool


class AvailableJobItem(BaseModel):
    id: str
    title: str
    elderName: str
    careType: str
    shiftDuration: str
    starts: str
    locality: str
    addressSnippet: Optional[str] = None
    approximateDistanceKm: float
    careNeeds: List[str] = []
    specialRequirements: List[str] = []
    compensation: str
    dailyRate: float
    status: str = "AVAILABLE"


class AcceptJobResponse(BaseModel):
    success: bool
    message: str
    assignmentId: int
    shiftId: str
    shift: dict
    elder: dict


class CompletedShiftItem(BaseModel):
    shiftId: str
    elderName: str
    date: str
    hours: str
    status: str
    earnings: float
    locality: str


class EarningsSummary(BaseModel):
    totalEarned: float
    shiftsCompleted: int
    pendingPayout: float
    dailyRate: float
    currency: str = "INR"


class WorkHistoryResponse(BaseModel):
    activeShift: Optional[dict] = None
    completedShifts: List[CompletedShiftItem] = []
    earnings: EarningsSummary

