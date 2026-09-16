from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.caregiver import Caregiver
from app.schemas.caregiver import CaregiverResponse, CuratedMatchesResponse
from app.services.matching_service import get_curated_caregivers_for_elder, seed_initial_data_if_empty

router = APIRouter(prefix="/caregivers", tags=["Caregivers & Matching"])


@router.get("/matches", response_model=CuratedMatchesResponse)
def get_curated_matches(
    elder_id: int = Query(1, description="Elder persona ID to match against"),
    db: Session = Depends(get_db)
):
    """Returns 2-3 curated, vetted caregiver candidates matching the elder persona."""
    try:
        return get_curated_caregivers_for_elder(db, elder_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{caregiver_id}", response_model=CaregiverResponse)
def get_caregiver_profile(caregiver_id: int, db: Session = Depends(get_db)):
    """Returns detailed sanitized profile for a specific caregiver."""
    seed_initial_data_if_empty(db)
    cg = db.query(Caregiver).filter(Caregiver.id == caregiver_id, Caregiver.is_active == True).first()
    if not cg:
        raise HTTPException(status_code=404, detail="Caregiver not found")
    return CaregiverResponse.model_validate(cg)


@router.get("/", response_model=List[CaregiverResponse])
def list_caregivers(
    locality: Optional[str] = None,
    language: Optional[str] = None,
    skill: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Returns active caregivers with optional filtering by locality, language, or specialty."""
    seed_initial_data_if_empty(db)
    query = db.query(Caregiver).filter(Caregiver.is_active == True)
    if locality:
        query = query.filter(Caregiver.locality.ilike(f"%{locality}%"))
    if language:
        query = query.filter(Caregiver.languages.ilike(f"%{language}%"))
    if skill:
        query = query.filter(Caregiver.skills.ilike(f"%{skill}%"))

    return [CaregiverResponse.model_validate(cg) for cg in query.all()]

