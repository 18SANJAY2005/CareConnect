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
    elder_id: int
    elder_name: str
    elder_locality: str
    required_care_tier: str
    total_candidates: int
    matches: List[CaregiverMatchItem]

