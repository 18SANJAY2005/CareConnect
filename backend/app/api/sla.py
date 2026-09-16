from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.sla import SLAAcceptanceCreate, SLAAcceptanceResponse, SLAVersionResponse
from app.services.sla_service import accept_assignment_sla, get_current_sla_version

router = APIRouter(prefix="/sla", tags=["Service Level Agreement (SLA)"])


@router.get("/current", response_model=SLAVersionResponse)
def get_current_sla(db: Session = Depends(get_db)):
    """Retrieves the active, approved SLA Version 1.0 terms (DPDP Act 2023 compliant)."""
    try:
        return get_current_sla_version(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/assignments/{assignment_id}/accept", response_model=SLAAcceptanceResponse)
def accept_sla(
    assignment_id: int,
    req: SLAAcceptanceCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Submits explicit digital acceptance of the SLA, completing service confirmation."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    try:
        return accept_assignment_sla(db, assignment_id, req, client_ip)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

