from typing import Optional
from datetime import datetime, timezone
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_current_user, get_optional_current_user
from app.models.user import User
from app.models.elder import Elder
from app.models.location import ElderLocation
from app.schemas.location import (
    LocationVerifyRequest, LocationVerifyResponse,
    ElderLocationPersistRequest, ElderLocationResponse
)
from app.services.geo_service import GeoService
from app.services.persona_service import PersonaService

router = APIRouter(tags=["Geographic Verification"])

@router.post("/elder-locations/verify", response_model=LocationVerifyResponse)
@router.post("/locations/verify", response_model=LocationVerifyResponse)
async def verify_location(
    payload: LocationVerifyRequest,
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Validate Chennai locality, postal code, GPS coordinates, and serviceability.
    Server acts as sole source of truth; never trusts client-supplied serviceable flag.
    Supports unauthenticated pre-onboarding serviceability checks and authenticated sessions.
    """
    result = GeoService.verify_address(
        address_line_1=payload.addressLine1,
        locality=payload.locality,
        postal_code=payload.postalCode,
        city=payload.city,
        state=payload.state,
        latitude=payload.latitude,
        longitude=payload.longitude,
        simulate_state=payload.simulateState
    )
    return result

@router.patch("/elders/{elder_id}/location", response_model=ElderLocationResponse)
async def persist_elder_location(
    elder_id: str,
    payload: ElderLocationPersistRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Persist verified elder address and link to Elder profile.
    Re-validates serviceability server-side to guarantee integrity.
    """
    elder = await PersonaService.get_elder_for_sponsor(db, elder_id, current_user.id)
    
    # Server-side verification calculation
    geo_check = GeoService.verify_address(
        address_line_1=payload.addressLine1,
        locality=payload.locality,
        postal_code=payload.postalCode,
        city=payload.city,
        state=payload.state
    )
    
    # Look for existing location record for this elder
    result = await db.execute(
        select(ElderLocation).where(ElderLocation.elderId == elder.id).limit(1)
    )
    location = result.scalars().first()

    now_utc = datetime.now(timezone.utc)
    if not location:
        location = ElderLocation(
            elderId=elder.id,
            addressLine1=payload.addressLine1,
            addressLine2=payload.addressLine2,
            locality=payload.locality,
            city=payload.city,
            state=payload.state,
            postalCode=payload.postalCode,
            landmark=payload.landmark,
            latitude=geo_check["latitude"] or payload.latitude,
            longitude=geo_check["longitude"] or payload.longitude,
            verificationStatus=geo_check["verificationStatus"],
            serviceable=geo_check["serviceable"],
            verifiedAt=now_utc if geo_check["serviceable"] else None
        )
        db.add(location)
    else:
        location.addressLine1 = payload.addressLine1
        location.addressLine2 = payload.addressLine2
        location.locality = payload.locality
        location.city = payload.city
        location.state = payload.state
        location.postalCode = payload.postalCode
        location.landmark = payload.landmark
        location.latitude = geo_check["latitude"] or payload.latitude
        location.longitude = geo_check["longitude"] or payload.longitude
        location.verificationStatus = geo_check["verificationStatus"]
        location.serviceable = geo_check["serviceable"]
        location.verifiedAt = now_utc if geo_check["serviceable"] else None

    await db.commit()
    await db.refresh(location)

    # Link locationId on elder
    elder.locationId = location.id
    await db.commit()

    return location


class ServiceInterestRequest(BaseModel):
    phone: str
    fullName: Optional[str] = None
    email: Optional[str] = None
    postalCode: str
    locality: Optional[str] = None
    addressLine1: Optional[str] = None
    careTypeNeeded: Optional[str] = None
    notes: Optional[str] = None


@router.post("/locations/service-interest", status_code=status.HTTP_201_CREATED)
@router.post("/elder-locations/service-interest", status_code=status.HTTP_201_CREATED)
async def submit_service_interest(
    payload: ServiceInterestRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Capture contact and care-interest details when service is currently unavailable in user's area.
    Stored for future corridor expansion notification and marketing follow-up.
    """
    from app.models.location import ServiceInterest
    from app.core.phone_validator import validate_and_normalize_phone

    normalized_phone = validate_and_normalize_phone(payload.phone)

    lead = ServiceInterest(
        phone=normalized_phone,
        fullName=payload.fullName,
        email=payload.email,
        postalCode=payload.postalCode.strip(),
        locality=payload.locality,
        addressLine1=payload.addressLine1,
        careTypeNeeded=payload.careTypeNeeded,
        notes=payload.notes
    )
    db.add(lead)
    await db.commit()
    await db.refresh(lead)

    return {
        "success": True,
        "message": f"Thank you! Your interest for PIN {payload.postalCode} has been recorded. We will notify you when CareConnect launches in your area.",
        "id": lead.id,
        "phone": normalized_phone,
        "postalCode": lead.postalCode
    }

