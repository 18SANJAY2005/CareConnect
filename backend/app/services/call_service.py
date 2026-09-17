import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.assignment import CareAssignment
from app.models.call import IntroCall
from app.schemas.call import IntroCallScheduleRequest


async def schedule_intro_call(
    db: AsyncSession,
    req: IntroCallScheduleRequest,
) -> IntroCall:
    """Schedules a 10-minute introductory call using Jitsi Meet."""

    result = await db.execute(
        select(CareAssignment).where(
            CareAssignment.id == req.assignment_id
        )
    )
    assignment = result.scalar_one_or_none()

    if not assignment:
        raise ValueError(
            f"Assignment with id {req.assignment_id} not found"
        )

    # Generate unique Jitsi room ID
    room_uuid = uuid.uuid4().hex[:12]
    room_id = f"CareConnect-Intro-{assignment.id}-{room_uuid}"
    join_url = f"https://{settings.JITSI_DOMAIN}/{room_id}"

    # Check whether a call already exists
    result = await db.execute(
        select(IntroCall).where(
            IntroCall.assignment_id == req.assignment_id
        )
    )
    intro_call = result.scalar_one_or_none()

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
            call_notes=req.call_notes,
        )
        db.add(intro_call)

    assignment.status = "CALL_SCHEDULED"

    await db.commit()
    await db.refresh(intro_call)

    return intro_call


async def update_call_status(
    db: AsyncSession,
    call_id: int,
    status: str,
    notes: str | None = None,
) -> IntroCall:
    """Updates call state and assignment lifecycle."""

    result = await db.execute(
        select(IntroCall).where(
            IntroCall.id == call_id
        )
    )
    intro_call = result.scalar_one_or_none()

    if not intro_call:
        raise ValueError(
            f"Intro call {call_id} not found"
        )

    intro_call.status = status

    if notes:
        intro_call.call_notes = notes

    result = await db.execute(
        select(CareAssignment).where(
            CareAssignment.id == intro_call.assignment_id
        )
    )
    assignment = result.scalar_one_or_none()

    if status == "COMPLETED":
        intro_call.completed_at = datetime.now(timezone.utc)

        if assignment:
            assignment.status = "CALL_COMPLETED"

    elif status == "IN_PROGRESS":
        if assignment:
            assignment.status = "CALL_IN_PROGRESS"

    elif status == "CANCELLED":
        if assignment:
            assignment.status = "CALL_CANCELLED"

    await db.commit()
    await db.refresh(intro_call)

    return intro_call


async def get_call_by_assignment(
    db: AsyncSession,
    assignment_id: int,
) -> IntroCall | None:
    """Returns the introductory call associated with an assignment."""

    result = await db.execute(
        select(IntroCall).where(
            IntroCall.assignment_id == assignment_id
        )
    )

    return result.scalar_one_or_none()
