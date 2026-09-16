from datetime import datetime
from sqlalchemy.orm import Session
from app.models.assignment import CareAssignment
from app.models.sla import SLAVersion, SLAAcceptance
from app.schemas.sla import SLAAcceptanceCreate, SLAAcceptanceResponse, SLAVersionResponse
from app.services.matching_service import seed_initial_data_if_empty


def get_current_sla_version(db: Session) -> SLAVersionResponse:
    """Returns the current approved version of the CareConnect SLA."""
    seed_initial_data_if_empty(db)
    sla = db.query(SLAVersion).filter(SLAVersion.version == "1.0", SLAVersion.is_active == 1).first()
    if not sla:
        sla = db.query(SLAVersion).first()
    return SLAVersionResponse.model_validate(sla)


def accept_assignment_sla(
    db: Session,
    assignment_id: int,
    req: SLAAcceptanceCreate,
    client_ip: str = "127.0.0.1"
) -> SLAAcceptanceResponse:
    """Records immutable explicit acceptance of SLA terms and activates service confirmation."""
    assignment = db.query(CareAssignment).filter(CareAssignment.id == assignment_id).first()
    if not assignment:
        raise ValueError(f"Assignment {assignment_id} not found")

    sla = db.query(SLAVersion).filter(SLAVersion.id == req.sla_version_id).first()
    if not sla:
        raise ValueError(f"SLA version {req.sla_version_id} not found")

    acceptance = SLAAcceptance(
        assignment_id=assignment_id,
        sponsor_id=req.sponsor_id,
        sla_version_id=sla.id,
        signer_name=req.signer_name,
        signer_relationship=req.signer_relationship,
        ip_address=client_ip,
        accepted_at=datetime.utcnow(),
        status="ACCEPTED"
    )
    db.add(acceptance)

    # Finalize assignment state
    assignment.status = "SERVICE_CONFIRMED"
    db.commit()
    db.refresh(acceptance)

    return SLAAcceptanceResponse(
        acceptance_id=acceptance.id,
        assignment_id=assignment.id,
        sla_version=sla.version,
        signer_name=acceptance.signer_name,
        status=acceptance.status,
        accepted_at=acceptance.accepted_at,
        message="SLA accepted successfully. Care service is officially confirmed!"
    )

