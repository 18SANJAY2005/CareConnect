from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.call import IntroCall
from app.schemas.call import (
    IntroCallScheduleRequest,
    IntroCallStatusUpdate,
    IntroCallResponse,
)
from app.services.call_service import schedule_intro_call, update_call_status, get_call_by_assignment

router = APIRouter(prefix="/intro-calls", tags=["Introductory Call (Jitsi Meet)"])


@router.post("", response_model=IntroCallResponse)
def schedule_call(req: IntroCallScheduleRequest, db: Session = Depends(get_db)):
    """Schedules a 10-minute moderated introductory video/audio call with Jitsi Meet."""
    try:
        call = schedule_intro_call(db, req)
        return IntroCallResponse.model_validate(call)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{call_id}", response_model=IntroCallResponse)
def get_call_details(call_id: int, db: Session = Depends(get_db)):
    """Returns call room URL, schedule, and live status."""
    call = db.query(IntroCall).filter(IntroCall.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Intro call not found")
    return IntroCallResponse.model_validate(call)


@router.get("/by-assignment/{assignment_id}", response_model=IntroCallResponse)
def get_call_for_assignment(assignment_id: int, db: Session = Depends(get_db)):
    """Finds scheduled call associated with a specific care assignment."""
    call = get_call_by_assignment(db, assignment_id)
    if not call:
        raise HTTPException(status_code=404, detail="No intro call found for this assignment")
    return IntroCallResponse.model_validate(call)


@router.patch("/{call_id}/status", response_model=IntroCallResponse)
def update_status(call_id: int, req: IntroCallStatusUpdate, db: Session = Depends(get_db)):
    """Updates call status (e.g., IN_PROGRESS or COMPLETED)."""
    try:
        call = update_call_status(db, call_id, req.status, req.call_notes)
        return IntroCallResponse.model_validate(call)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

