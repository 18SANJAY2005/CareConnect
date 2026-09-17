from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.sla import (
    SLAAcceptanceCreate,
    SLAAcceptanceResponse,
    SLAVersionResponse,
)
from app.services.sla_service import (
    accept_assignment_sla,
    get_current_sla_version,
)


router = APIRouter(
    prefix="/sla",
    tags=["Service Level Agreement (SLA)"],
)


@router.get(
    "/current",
    response_model=SLAVersionResponse,
)
async def get_current_sla(
    db: AsyncSession = Depends(get_db),
):
    """Retrieves the active approved SLA version."""

    try:
        return await get_current_sla_version(db)

    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )


@router.post(
    "/assignments/{assignment_id}/accept",
    response_model=SLAAcceptanceResponse,
)
async def accept_sla(
    assignment_id: int,
    req: SLAAcceptanceCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Records explicit SLA acceptance and confirms service."""

    client_ip = (
        request.client.host
        if request.client
        else "127.0.0.1"
    )

    try:
        return await accept_assignment_sla(
            db,
            assignment_id,
            req,
            client_ip,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )
