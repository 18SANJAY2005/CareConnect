from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assignment import CareAssignment
from app.models.sla import SLAVersion, SLAAcceptance
from app.schemas.sla import (
    SLAAcceptanceCreate,
    SLAAcceptanceResponse,
    SLAVersionResponse,
)
from app.services.matching_service import seed_initial_data_if_empty


async def get_current_sla_version(
    db: AsyncSession,
) -> SLAVersionResponse:
    """Returns the current approved version of the CareConnect SLA."""

    await seed_initial_data_if_empty(db)

    result = await db.execute(
        select(SLAVersion).where(
            SLAVersion.version == "1.0",
            SLAVersion.is_active.is_(True),
        ).limit(1)
    )

    sla = result.scalars().first()

    if not sla:
        result = await db.execute(
            select(SLAVersion).limit(1)
        )
        sla = result.scalars().first()

    if not sla:
        raise ValueError("No active SLA version found")

    return SLAVersionResponse.model_validate(sla)


async def accept_assignment_sla(
    db: AsyncSession,
    assignment_id: int,
    req: SLAAcceptanceCreate,
    client_ip: str = "127.0.0.1",
) -> SLAAcceptanceResponse:
    """Records explicit SLA acceptance and confirms the service."""

    # ---------------------------------------------------------
    # Find assignment
    # ---------------------------------------------------------
    result = await db.execute(
        select(CareAssignment).where(
            CareAssignment.id == assignment_id
        )
    )

    assignment = result.scalar_one_or_none()

    if not assignment:
        raise ValueError(
            f"Assignment {assignment_id} not found"
        )

    # ---------------------------------------------------------
    # Find SLA version
    # ---------------------------------------------------------
    result = await db.execute(
        select(SLAVersion).where(
            SLAVersion.id == req.sla_version_id
        )
    )

    sla = result.scalar_one_or_none()

    if not sla:
        raise ValueError(
            f"SLA version {req.sla_version_id} not found"
        )

    # ---------------------------------------------------------
    # Create immutable acceptance record
    # ---------------------------------------------------------
    acceptance = SLAAcceptance(
        assignment_id=assignment_id,
        sponsor_id=req.sponsor_id,
        sla_version_id=sla.id,
        signer_name=req.signer_name,
        signer_relationship=req.signer_relationship,
        ip_address=client_ip,
        accepted_at=datetime.now(timezone.utc),
        status="ACCEPTED",
    )

    db.add(acceptance)

    # ---------------------------------------------------------
    # Finalize assignment lifecycle
    # ---------------------------------------------------------
    assignment.status = "SERVICE_CONFIRMED"

    await db.commit()
    await db.refresh(acceptance)

    return SLAAcceptanceResponse(
        acceptance_id=acceptance.id,
        assignment_id=assignment.id,
        sla_version=sla.version,
        signer_name=acceptance.signer_name,
        status=acceptance.status,
        accepted_at=acceptance.accepted_at,
        message=(
            "SLA accepted successfully. "
            "Care service is officially confirmed!"
        ),
    )
