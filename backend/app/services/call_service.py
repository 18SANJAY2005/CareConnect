import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.assignment import CareAssignment
from app.models.call import IntroCall
from app.schemas.call import IntroCallScheduleRequest, IntroCallResponse


def schedule_intro_call(db: Session, req: IntroCallScheduleRequest) -> IntroCall:
    """Schedules a 10-minute introductory call using Jitsi Meet."""
    assignment = db.query(CareAssignment).filter(CareAssignment.id == req.assignment_id).first()
    if not assignment:
        raise ValueError(f"Assignment with id {req.assignment_id} not found")

    # Generate unique, professional Jitsi room ID
    room_uuid = uuid.uuid4().hex[:12]
    room_id = f"CareConnect-Intro-{assignment.id}-{room_uuid}"
    join_url = f"https://{settings.JITSI_DOMAIN}/{room_id}"

    # Check if a call already exists for this assignment
    intro_call = db.query(IntroCall).filter(IntroCall.assignment_id == req.assignment_id).first()
    if intro_call:
        intro_call.scheduled_at = req.scheduled_at
        intro_call.timezone = req.timezone
        intro_call.room_id = room_id
        intro_call.join_url = join_url
        intro_call.status = "SCHEDULED"
        intro_call.call_notes = req.call_notes
    else:
        intro_call = IntroCall(
            assignment_id=req.assignment_id,
            provider="JITSI",
            room_id=room_id,
            join_url=join_url,
            scheduled_at=req.scheduled_at,
            timezone=req.timezone,
            duration_minutes=10,
            status="SCHEDULED",
            provider_reference=f"jitsi-call-{room_uuid}",
            call_notes=req.call_notes
        )
        db.add(intro_call)

    # Update assignment state
    assignment.status = "CALL_SCHEDULED"
    db.commit()
    db.refresh(intro_call)
    return intro_call


def update_call_status(db: Session, call_id: int, status: str, notes: str = None) -> IntroCall:
    """Updates call state (IN_PROGRESS, COMPLETED, CANCELLED) and assignment lifecycle."""
    intro_call = db.query(IntroCall).filter(IntroCall.id == call_id).first()
    if not intro_call:
        raise ValueError(f"Intro call {call_id} not found")

    intro_call.status = status
    if notes:
        intro_call.call_notes = notes

    assignment = db.query(CareAssignment).filter(CareAssignment.id == intro_call.assignment_id).first()

    if status == "COMPLETED":
        intro_call.completed_at = datetime.utcnow()
        if assignment:
            assignment.status = "CALL_COMPLETED"
    elif status == "IN_PROGRESS":
        if assignment:
            assignment.status = "CALL_IN_PROGRESS"
    elif status == "CANCELLED":
        if assignment:
            assignment.status = "CALL_CANCELLED"

    db.commit()
    db.refresh(intro_call)
    return intro_call


def get_call_by_assignment(db: Session, assignment_id: int) -> IntroCall:
    return db.query(IntroCall).filter(IntroCall.assignment_id == assignment_id).first()

