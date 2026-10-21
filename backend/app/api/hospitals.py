from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.core.authorization import verify_elder_access
from app.models.user import User
from app.models.elder import Elder
from app.models.hospital import Hospital
from app.models.location import ElderLocation
from app.services.hospital_service import HospitalService
from app.schemas.hospital import (
    HospitalResponse,
    NearbyHospitalItem,
    SelectPreferredHospitalRequest,
    PreferredHospitalDetailsResponse,
)

router = APIRouter(prefix="/hospitals", tags=["Shared Hospital Catalog & Emergency Access"])


@router.get("", response_model=List[HospitalResponse])
async def list_hospitals(
    search: Optional[str] = Query(None, description="Search by name, address, or corridor"),
    area: Optional[str] = Query(None, description="Filter by area / corridor"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Search or list active verified hospitals in the shared catalog.
    Accessible to authorized Care Seekers, Caregivers, and Administrators.
    """
    return await HospitalService.list_hospitals(db, search=search, area=area, limit=limit, offset=offset)


@router.get("/nearby", response_model=List[NearbyHospitalItem])
async def get_nearby_hospitals(
    lat: Optional[float] = Query(None, ge=-90.0, le=90.0, description="Latitude"),
    lng: Optional[float] = Query(None, ge=-180.0, le=180.0, description="Longitude"),
    latitude: Optional[float] = Query(None, ge=-90.0, le=90.0, description="Latitude alias"),
    longitude: Optional[float] = Query(None, ge=-180.0, le=180.0, description="Longitude alias"),
    radius_km: float = Query(15.0, gt=0, le=50.0, description="Search radius in kilometers"),
    limit: int = Query(10, ge=1, le=25),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Find active emergency hospitals nearby valid GPS coordinates.
    Bounded and sorted strictly by Haversine proximity.
    """
    actual_lat = lat if lat is not None else latitude
    actual_lng = lng if lng is not None else longitude
    if actual_lat is None or actual_lng is None:
        raise HTTPException(status_code=400, detail="Latitude and longitude coordinates are required.")

    return await HospitalService.get_nearby_hospitals(
        db=db,
        lat=actual_lat,
        lng=actual_lng,
        radius_km=radius_km,
        limit=limit,
    )


@router.get("/{hospital_id}", response_model=HospitalResponse)
async def get_hospital_details(
    hospital_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch details of a single hospital by ID."""
    hospital = await HospitalService.get_hospital_by_id(db, hospital_id)
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found in catalog.")
    return hospital


@router.get("/elder/{elder_id}/emergency-context", response_model=PreferredHospitalDetailsResponse)
async def get_elder_emergency_hospital_context(
    elder_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve the care seeker's preferred hospital and nearby emergency hospitals for an elder.
    STRICT AUTHORIZATION:
    - Family Sponsor (owner of elder)
    - Assigned Caregiver (currently assigned via shift or established assignment)
    - Admin / Operations Desk
    Unrelated caregivers are strictly denied (HTTP 403).
    """
    elder = await verify_elder_access(db, current_user, elder_id)

    # 1. Fetch preferred hospital if selected
    preferred_hosp = None
    if elder.preferred_hospital_id:
        preferred_hosp = await HospitalService.get_hospital_by_id(db, elder.preferred_hospital_id)
        if preferred_hosp and not preferred_hosp.is_active:
            preferred_hosp = None

    # 2. Get residence coordinates from ElderLocation or default Chennai centroid
    loc_res = await db.execute(select(ElderLocation).where(ElderLocation.elderId == elder.id))
    location = loc_res.scalars().first()

    lat = location.latitude if location and location.latitude else 13.0067
    lng = location.longitude if location and location.longitude else 80.2575

    residence_coords = {
        "latitude": lat,
        "longitude": lng,
        "locality": location.locality if location else elder.locality or "Chennai",
        "hasGps": bool(location and location.latitude and location.longitude),
    }

    # 3. Find nearby hospitals around elder's residence
    nearby = await HospitalService.get_nearby_hospitals(db, lat=lat, lng=lng, radius_km=15.0, limit=6)

    return PreferredHospitalDetailsResponse(
        elderId=elder.id,
        elderName=elder.name,
        preferredHospital=preferred_hosp,
        hasPreferredHospital=bool(preferred_hosp),
        residenceCoordinates=residence_coords,
        nearbyHospitals=[NearbyHospitalItem(**h) for h in nearby],
    )


@router.put("/elder/{elder_id}/preferred", response_model=PreferredHospitalDetailsResponse)
async def update_elder_preferred_hospital(
    elder_id: str,
    payload: SelectPreferredHospitalRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Select or update the preferred hospital for an elder profile.
    AUTHORIZATION:
    - Only the authorized Family Sponsor (elder owner) or Admin/Ops may change the preferred hospital.
    - Caregivers cannot alter the family's preferred hospital choice.
    """
    elder = await verify_elder_access(db, current_user, elder_id)

    # Only family sponsor or admin can change the elder's preferred hospital
    if current_user.role == "CAREGIVER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Caregivers are not permitted to change a family's preferred hospital selection.",
        )

    updated_elder = await HospitalService.set_elder_preferred_hospital(
        db=db,
        elder_id=elder_id,
        hospital_id=payload.hospitalId,
    )

    # Return refreshed context
    return await get_elder_emergency_hospital_context(elder_id, db, current_user)
