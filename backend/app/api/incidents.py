from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.core.authorization import verify_elder_access
from app.models.user import User
from app.schemas.incident import (
    SosTriggerRequest, IncidentActionRequest, IncidentResolveRequest, IncidentResponse
)
from app.services.incident_service import IncidentService

router = APIRouter(prefix="/incidents", tags=["SOS & Emergency Escalation"])

@router.post("/sos", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
async def trigger_sos(
    payload: SosTriggerRequest,
    current_user: User = Depends(require_role(["CAREGIVER", "FAMILY_SPONSOR", "OPS_MANAGER", "ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Trigger emergency SOS. Creates a P1 Incident immediately and notifies Operations.
    Authoritative audit record created with caller details and GPS coordinates.
    Validates that the reporter is authorized for this elder before escalating.
    """
    await verify_elder_access(db, current_user, payload.elderId)

    incident = await IncidentService.trigger_sos(
        db=db,
        elder_id=payload.elderId,
        reported_by_id=current_user.id,
        shift_id=payload.shiftId,
        latitude=payload.latitude,
        longitude=payload.longitude,
        notes=payload.notes,
        idempotency_key=payload.idempotencyKey
    )
    return incident

@router.get("/desk", status_code=status.HTTP_200_OK)
async def get_incident_desk(
    status_filter: Optional[str] = None,
    current_user: User = Depends(require_role(["OPS_MANAGER", "ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """Operations Incident Desk: Triage active P1 emergency incidents in Chennai."""
    incidents = await IncidentService.get_incident_desk(db, status_filter)
    return incidents

@router.get("/elder/{elder_id}", response_model=List[IncidentResponse], status_code=status.HTTP_200_OK)
async def get_elder_incidents(
    elder_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve incidents for authorized family or caregiver remote visibility."""
    await verify_elder_access(db, current_user, elder_id)
    incidents = await IncidentService.get_elder_incidents(db, elder_id)
    return incidents

@router.post("/{incident_id}/acknowledge", response_model=IncidentResponse, status_code=status.HTTP_200_OK)
async def acknowledge_incident(
    incident_id: str,
    current_user: User = Depends(require_role(["OPS_MANAGER", "ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """Operations Care Manager acknowledges emergency incident."""
    incident = await IncidentService.acknowledge_incident(
        db=db,
        incident_id=incident_id,
        manager_id=current_user.id,
        manager_name=current_user.fullName
    )
    return incident

@router.post("/{incident_id}/escalate", response_model=IncidentResponse, status_code=status.HTTP_200_OK)
async def escalate_incident(
    incident_id: str,
    payload: IncidentActionRequest,
    current_user: User = Depends(require_role(["OPS_MANAGER", "ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """Log an escalation action taken by Operations (e.g. physician contact, ambulance alert)."""
    incident = await IncidentService.escalate_incident(
        db=db,
        incident_id=incident_id,
        manager_id=current_user.id,
        manager_name=current_user.fullName,
        action_taken=payload.actionTaken
    )
    return incident

@router.post("/{incident_id}/resolve", response_model=IncidentResponse, status_code=status.HTTP_200_OK)
async def resolve_incident(
    incident_id: str,
    payload: IncidentResolveRequest,
    current_user: User = Depends(require_role(["OPS_MANAGER", "ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """Resolve an incident and record resolution audit notes."""
    incident = await IncidentService.resolve_incident(
        db=db,
        incident_id=incident_id,
        manager_id=current_user.id,
        manager_name=current_user.fullName,
        resolution_notes=payload.resolutionNotes
    )
    return incident
